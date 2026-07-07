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
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
import { DOCS_BUCKET, supabase } from "@/lib/supabase/client";
import type { Achievement, EstadoAchievement, Skill } from "./types";

async function authHeader(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" };
}

export async function subirVideo(uid: string, archivo: File): Promise<string> {
  const res = await fetch("/api/medallas/solicitar-subida-video", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ uid }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo preparar la subida.");

  const { error } = await supabase.storage
    .from(DOCS_BUCKET)
    .uploadToSignedUrl(data.path, data.token, archivo);
  if (error) throw new Error(error.message);

  return data.path as string;
}

export async function obtenerUrlVideo(videoPath: string): Promise<string> {
  const res = await fetch(`/api/medallas/ver-video?path=${encodeURIComponent(videoPath)}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo abrir el video.");
  return data.url as string;
}

export async function listSkills(): Promise<Skill[]> {
  // Se ordena en el cliente: where("activa") + orderBy("orden") exigiría un
  // índice compuesto en Firestore y, si falta, la consulta falla en silencio
  // y la vitrina se queda vacía.
  const q = query(collection(db, "skills"), where("activa", "==", true));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Skill, "id">) }))
    .sort((a, b) => a.orden - b.orden);
}

export async function listAllSkillsAdmin(): Promise<Skill[]> {
  const snap = await getDocs(query(collection(db, "skills"), orderBy("orden")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Skill, "id">) }));
}

export async function createSkill(skill: Omit<Skill, "id">) {
  await addDoc(collection(db, "skills"), skill);
}

export async function updateSkill(id: string, data: Partial<Omit<Skill, "id">>) {
  await updateDoc(doc(db, "skills", id), data);
}

export async function listAchievementsForUser(uid: string): Promise<Achievement[]> {
  const q = query(collection(db, "achievements"), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Achievement, "id">) }));
}

export async function claimAchievement(
  uid: string,
  skillId: string,
  nivel: string,
  fechaLogro: string,
  videoPath: string | null
) {
  await addDoc(collection(db, "achievements"), {
    uid,
    skillId,
    nivel,
    fechaLogro,
    videoPath,
    estado: "pendiente" as EstadoAchievement,
    pinEntregado: false,
    celebrado: false,
    validadoPor: null,
    validadoAt: null,
  });
}

export async function marcarCelebrado(id: string) {
  await updateDoc(doc(db, "achievements", id), { celebrado: true });
}

export async function getSkill(id: string): Promise<Skill | null> {
  const snap = await getDoc(doc(db, "skills", id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Skill, "id">) }) : null;
}

export async function getUncelebratedValidated(uid: string): Promise<Achievement | null> {
  const q = query(
    collection(db, "achievements"),
    where("uid", "==", uid),
    where("estado", "==", "validado"),
    where("celebrado", "==", false),
    limit(1)
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? ({ id: first.id, ...(first.data() as Omit<Achievement, "id">) }) : null;
}

// ---------- Admin ----------

export async function listAchievementsByEstado(estado: EstadoAchievement): Promise<Achievement[]> {
  const snap = await getDocs(query(collection(db, "achievements"), where("estado", "==", estado)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Achievement, "id">) }));
}

export async function listPinesPendientes(): Promise<Achievement[]> {
  const q = query(
    collection(db, "achievements"),
    where("estado", "==", "validado"),
    where("pinEntregado", "==", false)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Achievement, "id">) }));
}

export async function validarAchievement(id: string, adminUid: string, aprobado: boolean) {
  await updateDoc(doc(db, "achievements", id), {
    estado: aprobado ? "validado" : "rechazado",
    validadoPor: adminUid,
    validadoAt: serverTimestamp(),
  });
}

export async function marcarPinEntregado(id: string) {
  await updateDoc(doc(db, "achievements", id), { pinEntregado: true });
}

/**
 * Otorga una medalla directamente, sin pasar por el reclamo del alumno.
 * Reemplaza a la Cloud Function de Constancia (Mes Perfecto, Centenaria/o,
 * Un Año, Fundador/a) ahora que esas se asignan a mano desde el panel; id
 * determinístico para no crear la misma medalla dos veces por error.
 */
export async function otorgarMedallaManual(
  adminUid: string,
  uid: string,
  skillId: string,
  nivel: string
) {
  const id = `${uid}_${skillId}_${nivel}`;
  await setDoc(doc(db, "achievements", id), {
    uid,
    skillId,
    nivel,
    fechaLogro: new Date().toISOString().slice(0, 10),
    videoPath: null,
    estado: "validado",
    pinEntregado: false,
    celebrado: false,
    validadoPor: adminUid,
    validadoAt: serverTimestamp(),
  });
}
