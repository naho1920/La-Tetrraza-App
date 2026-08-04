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

import { auth, db } from "@/lib/firebase/client";
import { getCountFromServer, getDoc, getDocs } from "@/lib/firestore-safe";
import { AVATARS_BUCKET, supabase } from "@/lib/supabase/client";
import { nombreArchivoSeguro } from "@/lib/utils";
import type { UserDoc } from "@/features/auth/types";

export type PerfilFormValues = Pick<
  UserDoc,
  | "nombre"
  | "fechaNac"
  | "sexo"
  | "nivel"
  | "estaturaCm"
  | "cuelloCm"
  | "cinturaCm"
  | "piernaCm"
  | "brazoCm"
  | "alergias"
  | "lesiones"
  | "meta"
  | "telefono"
  | "contactoEmergencia"
>;

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function updateProfile(uid: string, values: PerfilFormValues) {
  await updateDoc(doc(db, "users", uid), { ...values });
}

export async function addWeightLog(uid: string, pesoKg: number) {
  await addDoc(collection(db, "users", uid, "weightLogs"), {
    pesoKg,
    fecha: serverTimestamp(),
  });
}

export interface WeightLog {
  id: string;
  pesoKg: number;
  fecha: { toDate: () => Date } | null;
}

export async function getLatestWeightLog(uid: string): Promise<WeightLog | null> {
  const q = query(
    collection(db, "users", uid, "weightLogs"),
    orderBy("fecha", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  return { id: first.id, ...(first.data() as Omit<WeightLog, "id">) };
}

export async function getWeightLogs(uid: string): Promise<WeightLog[]> {
  const q = query(collection(db, "users", uid, "weightLogs"), orderBy("fecha", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WeightLog, "id">) }));
}

/**
 * Total de clases a las que la coach marcó asistencia.
 *
 * Usa `getCountFromServer`: antes traía TODOS los documentos de asistencia del
 * alumno solo para devolver `snap.size` — con un año de uso son cientos de
 * lecturas para obtener un único número, y crecía sin techo. El agregado se
 * cuenta en el servidor y factura como una sola lectura.
 */
export async function contarClasesAsistidas(uid: string): Promise<number> {
  const q = query(
    collection(db, "bookings"),
    where("uid", "==", uid),
    where("asistio", "==", true)
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

/**
 * La foto sube directo del navegador a Supabase Storage con una URL firmada,
 * nunca pasa por una función de Vercel: una foto de celular sin comprimir
 * fácilmente supera el límite de ~4.5 MB de body de Vercel, que rechaza la
 * petición con una página de error HTML en vez de JSON.
 */
/**
 * Cada paso queda envuelto y etiquetado: storage-js relanza sin envolver
 * cualquier error que no sea un StorageError suyo (p. ej. un TypeError nativo
 * del navegador al construir el request), y por eso el mensaje que llegaba a
 * pantalla siempre era el texto crudo del navegador sin decir en qué parte
 * fallaba. Envolver TODO el flujo, no solo la subida, es la única forma de
 * saber con certeza cuál paso es el que realmente revienta en el celular.
 */
export async function subirFotoPerfil(uid: string, archivo: File): Promise<string> {
  let paso = "preparando el archivo en el navegador";
  try {
    const token = await auth.currentUser?.getIdToken();
    const archivoSeguro = new File([archivo], nombreArchivoSeguro(archivo.name), {
      type: archivo.type,
    });

    paso = "pidiendo permiso de subida al servidor";
    const prepRes = await fetch("/api/perfil/preparar-avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify({ contentType: archivo.type, size: archivo.size }),
    });
    const prep = await prepRes.json();
    if (!prepRes.ok) throw new Error(prep.error ?? "No se pudo preparar la subida.");

    const { path, token: uploadToken } = prep as { path: string; token: string };

    paso = "subiendo el archivo a Supabase";
    const uploadResult = await supabase.storage
      .from(AVATARS_BUCKET)
      .uploadToSignedUrl(path, uploadToken, archivoSeguro, { contentType: archivo.type });
    if (uploadResult.error) throw new Error(uploadResult.error.message);

    paso = "guardando la foto en tu perfil";
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    await updateDoc(doc(db, "users", uid), { foto: url });
    return url;
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    console.error(`[subirFotoPerfil] falló ${paso}:`, err);
    throw new Error(`No se pudo subir la foto (falló ${paso}): ${detalle}`);
  }
}
