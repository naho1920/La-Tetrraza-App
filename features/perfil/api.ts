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
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { UserDoc } from "@/features/auth/types";

export type PerfilFormValues = Pick<
  UserDoc,
  | "nombre"
  | "fechaNac"
  | "sexo"
  | "estaturaCm"
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
