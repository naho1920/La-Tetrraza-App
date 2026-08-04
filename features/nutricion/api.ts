import {
  addDoc,
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { conCache, invalidarCache } from "@/lib/cache";
import { auth, db } from "@/lib/firebase/client";
import { getDocs } from "@/lib/firestore-safe";
import { DOCS_BUCKET, supabase } from "@/lib/supabase/client";
import { nombreArchivoSeguro } from "@/lib/utils";
import type { EstadoNutricion, NutritionForm, NutritionPlan } from "./types";

async function authHeader(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token ?? ""}` };
}

export async function getFormForUser(uid: string): Promise<NutritionForm | null> {
  const q = query(
    collection(db, "nutritionForms"),
    where("uid", "==", uid),
    orderBy("version", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? ({ id: first.id, ...(first.data() as Omit<NutritionForm, "id">) }) : null;
}

/**
 * Devuelve el borrador activo (no enviado) del alumno, o crea uno nuevo.
 *
 * Al crear una versión nueva (porque la anterior ya se envió), las respuestas
 * arrancan desde las de la ÚLTIMA versión enviada, no en blanco — `prellenado`
 * solo pisa los campos que vienen del perfil (nombre, fecha de nacimiento,
 * estatura), que pueden haber cambiado. Así, si el alumno solo actualiza su
 * formulario porque cambió de objetivo, no tiene que volver a escribir
 * alergias, lesiones, ni el resto de respuestas que siguen siendo válidas.
 */
export async function getOrCreateDraftForm(
  uid: string,
  prellenado: Record<string, string>
): Promise<NutritionForm> {
  const ultimo = await getFormForUser(uid);
  if (ultimo && !ultimo.enviado) return ultimo;

  const nuevo = {
    uid,
    respuestas: { ...ultimo?.respuestas, ...prellenado },
    version: (ultimo?.version ?? 0) + 1,
    enviado: false,
    estado: "pendiente" as EstadoNutricion,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "nutritionForms"), nuevo);
  return { id: ref.id, ...nuevo, createdAt: { toDate: () => new Date() } };
}

export async function saveFormDraft(formId: string, respuestas: Record<string, string>) {
  await updateDoc(doc(db, "nutritionForms", formId), { respuestas });
}

export async function submitForm(formId: string) {
  await updateDoc(doc(db, "nutritionForms", formId), { enviado: true });
  invalidarCache("nutricion:");
}

// ---------- Admin ----------

// Cacheada porque el Home de la coach la pide dos veces en paralelo (una desde
// getAlertas para el badge, otra desde las notificaciones) con los mismos
// argumentos.
export async function listFormsByEstado(estado: EstadoNutricion): Promise<NutritionForm[]> {
  return conCache(`nutricion:forms-${estado}`, async () => {
    const q = query(
      collection(db, "nutritionForms"),
      where("estado", "==", estado),
      where("enviado", "==", true),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NutritionForm, "id">) }));
  });
}

export async function marcarEnRevision(form: NutritionForm) {
  if (form.estado !== "pendiente") return;
  await updateDoc(doc(db, "nutritionForms", form.id), { estado: "en_revision" });
  invalidarCache("nutricion:");
}

export async function getPlanesForUser(uid: string): Promise<NutritionPlan[]> {
  const q = query(
    collection(db, "nutritionPlans"),
    where("uid", "==", uid),
    orderBy("enviadoAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NutritionPlan, "id">) }));
}

// ---------- Subida / descarga de PDF (vía Supabase Storage) ----------

const MAX_BYTES_PLAN = 20 * 1024 * 1024;

/**
 * El PDF sube directo del navegador a Supabase Storage con una URL firmada
 * (preparar-subida) y solo después se confirma en Firestore (confirmar-plan).
 * Antes el PDF entero pasaba por una función serverless de Vercel, que tiene
 * un límite de ~4.5 MB de body — cualquier archivo más pesado hacía que
 * Vercel rechazara la petición con una página de error HTML en vez de JSON.
 */
export async function subirPlan(uid: string, formId: string, notas: string, archivo: File) {
  if (archivo.size > MAX_BYTES_PLAN) {
    throw new Error("El PDF no puede pesar más de 20 MB.");
  }

  const archivoSeguro = new File([archivo], nombreArchivoSeguro(archivo.name), {
    type: archivo.type,
  });

  const prepRes = await fetch("/api/nutricion/preparar-subida", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ uid, formId, nombreArchivo: archivoSeguro.name }),
  });
  const prep = await prepRes.json();
  if (!prepRes.ok) throw new Error(prep.error ?? "No se pudo preparar la subida.");

  const { path, token } = prep as { path: string; token: string };

  const { error: uploadError } = await supabase.storage
    .from(DOCS_BUCKET)
    .uploadToSignedUrl(path, token, archivoSeguro, { contentType: "application/pdf" });
  if (uploadError) throw new Error(uploadError.message || "No se pudo subir el archivo.");

  const confirmRes = await fetch("/api/nutricion/confirmar-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ uid, formId, archivoPath: path, notas }),
  });
  const data = await confirmRes.json();
  if (!confirmRes.ok) throw new Error(data.error ?? "No se pudo confirmar el plan.");
  invalidarCache("nutricion:");
  return data as { ok: true; planId: string };
}

export async function obtenerUrlPlan(archivoPath: string): Promise<string> {
  const res = await fetch(`/api/nutricion/ver-plan?path=${encodeURIComponent(archivoPath)}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo abrir el plan.");
  return data.url as string;
}
