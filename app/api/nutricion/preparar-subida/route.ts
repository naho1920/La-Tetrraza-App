import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { excedeLimite, RESPUESTA_LIMITE } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOCS_BUCKET } from "@/lib/supabase/client";

/**
 * Paso 1 de 2 para subir un plan: genera una URL firmada de Supabase Storage
 * y NO recibe el PDF. Los serverless functions de Vercel tienen un límite de
 * ~4.5 MB de body — cualquier PDF más pesado hacía que Vercel rechazara la
 * petición antes de que este código corriera, devolviendo una página de
 * error HTML en vez de JSON ("Unexpected token '<'"). Con este flujo el
 * navegador sube el archivo directo a Supabase (ver /api/nutricion/confirmar-plan
 * para el paso 2), sin pasar por esta función.
 */
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
  if (decoded.admin !== true) {
    return NextResponse.json({ error: "Solo la admin puede subir planes." }, { status: 403 });
  }

  if (excedeLimite(`preparar-subida:${decoded.uid}`, 10)) {
    return NextResponse.json(RESPUESTA_LIMITE, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const uid = body?.uid;
  const formId = body?.formId;
  const nombreArchivo = body?.nombreArchivo;

  if (typeof uid !== "string" || typeof formId !== "string" || typeof nombreArchivo !== "string") {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }
  if (!nombreArchivo.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "El archivo debe ser un PDF." }, { status: 400 });
  }

  const formSnap = await adminDb.collection("nutritionForms").doc(formId).get();
  if (!formSnap.exists || formSnap.data()?.uid !== uid) {
    return NextResponse.json(
      { error: "Formulario no encontrado o no pertenece a ese alumno." },
      { status: 404 },
    );
  }

  const nombreLimpio = nombreArchivo.replace(/[^a-zA-Z0-9.-]/g, "_");
  const archivoPath = `nutrition-plans/${uid}/${Date.now()}-${nombreLimpio}`;

  const { data, error } = await supabaseAdmin.storage
    .from(DOCS_BUCKET)
    .createSignedUploadUrl(archivoPath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "No se pudo preparar la subida." }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path: data.path });
}
