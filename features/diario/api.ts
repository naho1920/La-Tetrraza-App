import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { ActivityLog, DiarioAchievement, NivelDiario, TrackingMetric } from "./types";

// --- Time helpers ---

export function secsToDisplay(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// --- TrackingMetrics ---

export async function listActiveMetrics(): Promise<TrackingMetric[]> {
  const q = query(
    collection(db, "trackingMetrics"),
    where("activa", "==", true),
    orderBy("orden", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackingMetric));
}

export async function listAllMetricsAdmin(): Promise<TrackingMetric[]> {
  const q = query(collection(db, "trackingMetrics"), orderBy("orden", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackingMetric));
}

export async function createMetric(
  data: Omit<TrackingMetric, "id" | "creadoAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "trackingMetrics"), {
    ...data,
    creadoAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMetric(
  id: string,
  data: Partial<Omit<TrackingMetric, "id" | "creadoAt">>
): Promise<void> {
  await updateDoc(doc(db, "trackingMetrics", id), data);
}

export async function deleteMetric(id: string): Promise<void> {
  await deleteDoc(doc(db, "trackingMetrics", id));
}

// --- ActivityLogs ---

export async function addActivityLog(
  data: Omit<ActivityLog, "id" | "creadoAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "activityLogs"), {
    ...data,
    creadoAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listLogsForUser(uid: string): Promise<ActivityLog[]> {
  const q = query(
    collection(db, "activityLogs"),
    where("uid", "==", uid),
    orderBy("creadoAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog));
}

// --- DiarioAchievements ---

const achievementId = (uid: string, metricId: string, nivel: NivelDiario) =>
  `${uid}_${metricId}_${nivel}`;

export async function listDiarioAchievementsForUser(
  uid: string
): Promise<DiarioAchievement[]> {
  const q = query(
    collection(db, "diarioAchievements"),
    where("uid", "==", uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiarioAchievement));
}

/** Checks which thresholds the new value crosses and grants any new achievements. Returns only newly created ones. */
export async function checkAndGrantAchievements(
  uid: string,
  metric: TrackingMetric,
  valor: number,
  valorDisplay: string,
  fecha: string
): Promise<DiarioAchievement[]> {
  const levels: NivelDiario[] = ["bronce", "plata", "oro"];

  const reached = levels.filter((nivel) => {
    const threshold = metric.umbrales[nivel];
    return metric.direccion === "mayor_es_mejor"
      ? valor >= threshold
      : valor <= threshold && threshold > 0;
  });

  const newAchievements: DiarioAchievement[] = [];

  for (const nivel of reached) {
    const id = achievementId(uid, metric.id, nivel);
    const existing = await getDoc(doc(db, "diarioAchievements", id));
    if (!existing.exists()) {
      const payload = {
        uid,
        metricId: metric.id,
        metricNombre: metric.nombre,
        nivel,
        valor,
        valorDisplay,
        fecha,
        creadoAt: serverTimestamp(),
      };
      await setDoc(doc(db, "diarioAchievements", id), payload);
      newAchievements.push({ id, ...payload, creadoAt: null });
    }
  }

  return newAchievements;
}
