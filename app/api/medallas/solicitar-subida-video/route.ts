import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";
import { excedeLimite, RESPUESTA_LIMITE } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOCS_BUCKET } from "@/lib/supabase/client";

// TASK-051: tipos de video permitidos y su extensión de archivo.
// Se rechaza cualquier MIME type distinto antes de generar la signed URL.
const TIPOS_VIDEO: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
};

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

  if (excedeLimite(`subida-video:${decoded.uid}`, 5)) {
    return NextResponse.json(RESPUESTA_LIMITE, { status: 429 });
  }

  const body = await request.json();
  const { uid, contentType } = body as { uid?: string; contentType?: string };

  if (typeof uid !== "string") {
    return NextResponse.json({ error: "Falta el uid." }, { status: 400 });
  }
  if (decoded.admin !== true && decoded.uid !== uid) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // TASK-051: validar el tipo de archivo antes de emitir la signed URL.
  const ext = contentType ? TIPOS_VIDEO[contentType] : undefined;
  if (!ext) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido. Se aceptan: mp4, mov, webm, m4v." },
      { status: 400 },
    );
  }

  const path = `achievement-videos/${uid}/${Date.now()}.${ext}`;
  const { data, error } = await supabaseAdmin.storage.from(DOCS_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo preparar la subida." }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token, signedUrl: data.signedUrl });
}
