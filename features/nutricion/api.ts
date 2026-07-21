import {
  addDoc,
  collection,
  getDocs,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
import { DOCS_BUCKET, supabase } from "@/lib/supabase/client";
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

/** Devuelve el borrador activo (no enviado) del alumno, o crea uno nuevo. */
export async function getOrCreateDraftForm(
  uid: string,
  prellenado: Record<string, string>
): Promise<NutritionForm> {
  const ultimo = await getFormForUser(uid);
  if (ultimo && !ultimo.enviado) return ultimo;

  const nuevo = {
    uid,
    respuestas: prellenado,
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
}

// ---------- Admin ----------

export async function listFormsByEstado(estado: EstadoNutricion): Promise<NutritionForm[]> {
  const q = query(
    collection(db, "nutritionForms"),
    where("estado", "==", estado),
    where("enviado", "==", true),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NutritionForm, "id">) }));
}

export async function marcarEnRevision(form: NutritionForm) {
  if (form.estado !== "pendiente") return;
  await updateDoc(doc(db, "nutritionForms", form.id), { estado: "en_revision" });
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

/**
 * Nombres de archivo con espacios, acentos o paréntesis rompen la codificación
 * del multipart/form-data (el navegador lanza "The string did not match the
 * expected pattern."). Se renombra a un nombre ASCII-seguro antes de enviarlo.
 */
function nombreArchivoSeguro(nombre: string): string {
  const sinAcentos = nombre.normalize("NFD").replace(/\p{Mn}/gu, "");
  return sinAcentos.replace(/[^a-zA-Z0-9.-]/g, "_");
}

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
