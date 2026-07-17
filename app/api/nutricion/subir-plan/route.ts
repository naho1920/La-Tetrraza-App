import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { excedeLimite, RESPUESTA_LIMITE } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOCS_BUCKET } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;

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

  if (excedeLimite(`subir-plan:${decoded.uid}`, 10)) {
    return NextResponse.json(RESPUESTA_LIMITE, { status: 429 });
  }

  const formData = await request.formData();
  const uid = formData.get("uid");
  const formId = formData.get("formId");
  const notas = formData.get("notas");
  const file = formData.get("archivo");

  if (typeof uid !== "string" || typeof formId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "El archivo debe ser un PDF." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El PDF no puede pesar más de 10 MB." }, { status: 400 });
  }

  // TASK-059: verificar que el formulario pertenezca al alumno indicado antes
  // de asociar el plan, para evitar que un error humano vincule un plan al
  // alumno equivocado.
  const formSnap = await adminDb.collection("nutritionForms").doc(formId).get();
  if (!formSnap.exists || formSnap.data()?.uid !== uid) {
    return NextResponse.json(
      { error: "Formulario no encontrado o no pertenece a ese alumno." },
      { status: 404 },
    );
  }

  const nombreLimpio = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const archivoPath = `nutrition-plans/${uid}/${Date.now()}-${nombreLimpio}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCS_BUCKET)
    .upload(archivoPath, bytes, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const planRef = await adminDb.collection("nutritionPlans").add({
    formId,
    uid,
    archivoPath,
    notas: typeof notas === "string" ? notas : "",
    enviadoAt: FieldValue.serverTimestamp(),
  });

  await adminDb.collection("nutritionForms").doc(formId).update({ estado: "plan_enviado" });

  return NextResponse.json({ ok: true, planId: planRef.id });
}
