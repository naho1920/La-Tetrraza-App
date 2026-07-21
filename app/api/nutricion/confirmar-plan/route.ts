import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { excedeLimite, RESPUESTA_LIMITE } from "@/lib/rate-limit";

/**
 * Paso 2 de 2: se llama solo después de que el navegador subió el PDF
 * directo a Supabase con la URL firmada de /api/nutricion/preparar-subida.
 * Registra el plan en Firestore y marca el formulario como enviado.
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

  if (excedeLimite(`confirmar-plan:${decoded.uid}`, 10)) {
    return NextResponse.json(RESPUESTA_LIMITE, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const uid = body?.uid;
  const formId = body?.formId;
  const archivoPath = body?.archivoPath;
  const notas = body?.notas;

  if (typeof uid !== "string" || typeof formId !== "string" || typeof archivoPath !== "string") {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }
  // El path lo generamos nosotros en preparar-subida con este prefijo exacto;
  // si no calza, alguien está mandando un path arbitrario.
  if (!archivoPath.startsWith(`nutrition-plans/${uid}/`)) {
    return NextResponse.json({ error: "Ruta de archivo inválida." }, { status: 400 });
  }

  const formSnap = await adminDb.collection("nutritionForms").doc(formId).get();
  if (!formSnap.exists || formSnap.data()?.uid !== uid) {
    return NextResponse.json(
      { error: "Formulario no encontrado o no pertenece a ese alumno." },
      { status: 404 },
    );
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
