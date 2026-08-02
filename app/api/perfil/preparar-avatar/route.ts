import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";
import { excedeLimite, RESPUESTA_LIMITE } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AVATARS_BUCKET } from "@/lib/supabase/client";

/**
 * Bucket público solo para avatares: son fotos que la app muestra a otros
 * alumnos (listas de clase, panel de la coach), así que no necesitan URLs
 * firmadas para VER la imagen. Los documentos sensibles siguen en el bucket
 * privado.
 *
 * La SUBIDA en cambio sí usa URL firmada: una foto de celular sin comprimir
 * fácilmente pesa más que el límite de ~4.5 MB de body que aceptan las
 * funciones serverless de Vercel, que rechazan la petición con una página de
 * error HTML antes de que este código llegue a correr ("Unexpected token
 * '<'..." / "The string did not match the expected pattern."). Con esto el
 * navegador sube la foto directo a Supabase Storage, sin pasar por Vercel.
 */
const MAX_BYTES = 8 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Si el bucket ya existía (de antes de subir el límite a 8 MB), `createBucket`
 * nunca corría de nuevo y el bucket se quedaba con su configuración vieja
 * (2 MB) — Supabase rechazaba la subida aunque nuestro propio código ya
 * permitiera 8 MB. `updateBucket` sincroniza la config existente también.
 */
async function ensureBucket(): Promise<string | null> {
  const config = {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...TIPOS_PERMITIDOS],
  };
  const { data } = await supabaseAdmin.storage.getBucket(AVATARS_BUCKET);
  const { error } = data
    ? await supabaseAdmin.storage.updateBucket(AVATARS_BUCKET, config)
    : await supabaseAdmin.storage.createBucket(AVATARS_BUCKET, config);
  return error?.message ?? null;
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

  if (excedeLimite(`preparar-avatar:${decoded.uid}`, 10)) {
    return NextResponse.json(RESPUESTA_LIMITE, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const contentType = body?.contentType;
  const size = body?.size;

  if (typeof contentType !== "string" || !TIPOS_PERMITIDOS.has(contentType)) {
    return NextResponse.json({ error: "La foto debe ser JPG, PNG o WebP." }, { status: 400 });
  }
  if (typeof size === "number" && size > MAX_BYTES) {
    return NextResponse.json({ error: "La foto no puede pesar más de 8 MB." }, { status: 400 });
  }

  try {
    const bucketError = await ensureBucket();
    if (bucketError) {
      return NextResponse.json({ error: `No se pudo preparar el almacenamiento: ${bucketError}` }, { status: 500 });
    }

    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `${decoded.uid}/avatar.${extension}`;

    const { data, error } = await supabaseAdmin.storage
      .from(AVATARS_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });

    if (error || !data) {
      return NextResponse.json(
        { error: `No se pudo generar el link de subida: ${error?.message ?? "error desconocido"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: data.token, path: data.path });
  } catch (err) {
    return NextResponse.json(
      { error: `Error inesperado al preparar la subida: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
