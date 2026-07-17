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
import { toISODate } from "@/lib/date";
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
    // TASK-051: enviar el contentType real del archivo para que la ruta
    // valide el MIME type y use la extensión correcta en el path de Supabase.
    body: JSON.stringify({ uid, contentType: archivo.type }),
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

/**
 * TASK-062: ID determinístico `{uid}_{skillId}_{nivel}` con setDoc para que
 * dos pestañas abiertas a la vez no generen dos reclamos del mismo logro.
 * TASK-063: acepta `pesoAlReclamo` (peso corporal del alumno) para que la
 * admin vea el umbral real (multiplicador × peso corporal) al validar.
 * Solo se incluyen los campos que las Firestore Security Rules permiten crear
 * al alumno — los campos admin (pinEntregado, celebrado, validadoPor, validadoAt)
 * se omiten aquí y el Admin SDK los añade al validar.
 */
export async function claimAchievement(
  uid: string,
  skillId: string,
  nivel: string,
  fechaLogro: string,
  videoPath: string | null,
  pesoLevantadoKg: number | null = null,
  pesoAlReclamo: number | null = null,
  tiempoLogrado: string | null = null,
) {
  const id = `${uid}_${skillId}_${nivel}`;
  await setDoc(doc(db, "achievements", id), {
    uid,
    skillId,
    nivel,
    fechaLogro,
    videoPath,
    pesoLevantadoKg,
    pesoAlReclamo,
    tiempoLogrado,
    estado: "pendiente" as EstadoAchievement,
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
    limit(1),
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
    where("pinEntregado", "==", false),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Achievement, "id">) }));
}

/**
 * TASK-064: cascada de niveles — al validar un nivel superior se auto-completan
 * los inferiores si no existen ya (o están rechazados). Así quien levanta 2×BW
 * no necesita reclamar bronce y plata por separado.
 */
export async function validarAchievement(id: string, adminUid: string, aprobado: boolean) {
  const ahora = serverTimestamp();

  await updateDoc(doc(db, "achievements", id), {
    estado: aprobado ? "validado" : "rechazado",
    validadoPor: adminUid,
    validadoAt: ahora,
  });

  if (!aprobado) return;

  // Leer el achievement que se acaba de validar para derivar la cascada.
  const snap = await getDoc(doc(db, "achievements", id));
  if (!snap.exists()) return;
  const a = snap.data() as Omit<Achievement, "id">;

  const skillSnap = await getDoc(doc(db, "skills", a.skillId));
  if (!skillSnap.exists()) return;
  const skill = skillSnap.data() as Omit<Skill, "id">;

  const niveles = skill.nivelesDisponibles;
  const nivelIdx = niveles.indexOf(a.nivel);
  if (nivelIdx <= 0) return; // bronce o base: no hay niveles inferiores que completar

  // Crear en cascada todos los niveles anteriores que no estén ya validados.
  const ahora2 = toISODate(new Date());
  for (let i = 0; i < nivelIdx; i++) {
    const nivelInferior = niveles[i];
    const idInferior = `${a.uid}_${a.skillId}_${nivelInferior}`;
    const existeSnap = await getDoc(doc(db, "achievements", idInferior));

    if (existeSnap.exists() && existeSnap.data()?.estado === "validado") continue;

    await setDoc(doc(db, "achievements", idInferior), {
      uid: a.uid,
      skillId: a.skillId,
      nivel: nivelInferior,
      fechaLogro: a.fechaLogro ?? ahora2,
      videoPath: null,
      pesoLevantadoKg: a.pesoLevantadoKg,
      pesoAlReclamo: a.pesoAlReclamo ?? null,
      tiempoLogrado: a.tiempoLogrado,
      estado: "validado",
      pinEntregado: false,
      celebrado: false,
      validadoPor: adminUid,
      validadoAt: ahora,
    });
  }
}

/**
 * TASK-065: todos los achievements de Fuerza que tienen `pesoLevantadoKg`
 * registrado. Sirve para la vista admin "quién está cerca de qué medalla".
 */
export async function listAchievementsConPeso(): Promise<Achievement[]> {
  const snap = await getDocs(
    query(collection(db, "achievements"), where("pesoLevantadoKg", "!=", null))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Achievement, "id">) }));
}

export async function marcarPinEntregado(id: string) {
  await updateDoc(doc(db, "achievements", id), { pinEntregado: true });
}

/**
 * Otorga una medalla directamente sin pasar por el reclamo del alumno.
 * Útil para la admin en casos puntuales. Las medallas de Constancia (Mes
 * Perfecto, Centenaria/o, Un Año, Fundador/a) las gestiona el cron automático
 * en `functions/src/medallasConstancia.ts` — no usar esta función para eso.
 * ID determinístico `{uid}_{skillId}_{nivel}` para evitar duplicados.
 */
export async function otorgarMedallaManual(
  adminUid: string,
  uid: string,
  skillId: string,
  nivel: string,
) {
  const id = `${uid}_${skillId}_${nivel}`;
  await setDoc(doc(db, "achievements", id), {
    uid,
    skillId,
    nivel,
    fechaLogro: toISODate(new Date()),
    videoPath: null,
    pesoLevantadoKg: null,
    pesoAlReclamo: null,
    tiempoLogrado: null,
    estado: "validado",
    pinEntregado: false,
    celebrado: false,
    validadoPor: adminUid,
    validadoAt: serverTimestamp(),
  });
}
