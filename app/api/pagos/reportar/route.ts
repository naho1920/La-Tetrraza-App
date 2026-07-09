import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { excedeLimite, RESPUESTA_LIMITE } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOCS_BUCKET } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

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

  if (excedeLimite(`reportar-pago:${decoded.uid}`, 10)) {
    return NextResponse.json(RESPUESTA_LIMITE, { status: 429 });
  }

  const formData = await request.formData();
  const notaRaw = formData.get("nota");
  const file = formData.get("archivo");
  const nota = typeof notaRaw === "string" ? notaRaw.trim() : "";
  const archivo = file instanceof File ? file : null;

  if (!archivo && !nota) {
    return NextResponse.json({ error: "Agrega una nota o un comprobante." }, { status: 400 });
  }
  if (archivo) {
    if (!TIPOS_PERMITIDOS.has(archivo.type)) {
      return NextResponse.json({ error: "El comprobante debe ser JPG, PNG, WebP o PDF." }, { status: 400 });
    }
    if (archivo.size > MAX_BYTES) {
      return NextResponse.json({ error: "El comprobante no puede pesar más de 5 MB." }, { status: 400 });
    }
  }

  let archivoPath: string | null = null;
  if (archivo) {
    const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    archivoPath = `payment-receipts/${decoded.uid}/${Date.now()}-${nombreLimpio}`;
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(DOCS_BUCKET)
      .upload(archivoPath, bytes, { contentType: archivo.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  }

  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const nombreAlumno = userSnap.exists ? ((userSnap.data()?.nombre as string | undefined) ?? decoded.uid) : decoded.uid;

  const reportRef = await adminDb.collection("paymentReports").add({
    uid: decoded.uid,
    nombreAlumno,
    nota,
    archivoPath,
    estado: "pendiente",
    createdAt: FieldValue.serverTimestamp(),
    revisadoPor: null,
    revisadoAt: null,
  });

  return NextResponse.json({ ok: true, reportId: reportRef.id });
}
