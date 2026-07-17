import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
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

/** Total de clases a las que la coach marcó asistencia. */
export async function contarClasesAsistidas(uid: string): Promise<number> {
  const q = query(
    collection(db, "bookings"),
    where("uid", "==", uid),
    where("asistio", "==", true)
  );
  const snap = await getDocs(q);
  return snap.size;
}

/**
 * Sube la foto al bucket público de avatares (vía API route con service
 * role) y guarda la URL en el perfil. Gratis: usa el mismo Supabase Storage
 * que ya tenemos para videos y planes.
 */
export async function subirFotoPerfil(uid: string, archivo: File): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  const formData = new FormData();
  formData.append("archivo", archivo);

  const res = await fetch("/api/perfil/subir-avatar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token ?? ""}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir la foto.");

  await updateDoc(doc(db, "users", uid), { foto: data.url });
  return data.url as string;
}
