import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";
import { excedeLimite, RESPUESTA_LIMITE } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Bucket público solo para avatares: son fotos que la app muestra a otros
 * alumnos (listas de clase, panel de la coach), así que no necesitan URLs
 * firmadas. Los documentos sensibles siguen en el bucket privado.
 */
const AVATARS_BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(AVATARS_BUCKET);
  if (data) return;
  await supabaseAdmin.storage.createBucket(AVATARS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...TIPOS_PERMITIDOS],
  });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  if (excedeLimite(`subir-avatar:${decoded.uid}`, 5)) {
    return NextResponse.json(RESPUESTA_LIMITE, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("archivo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.has(file.type)) {
    return NextResponse.json({ error: "La foto debe ser JPG, PNG o WebP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La foto no puede pesar más de 2 MB." }, { status: 400 });
  }

  await ensureBucket();

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${decoded.uid}/avatar.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(AVATARS_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  // El query param rompe la caché del navegador al reemplazar la foto.
  return NextResponse.json({ url: `${data.publicUrl}?v=${Date.now()}` });
}
