import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { getCountFromServer, getDoc, getDocs } from "@/lib/firestore-safe";
import type { ActivityLog, DiarioAchievement, NivelDiario, TrackingMetric } from "./types";

// --- Time helpers ---

export function secsToDisplay(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// --- TrackingMetrics ---

export async function listActiveMetrics(): Promise<TrackingMetric[]> {
  // Sin where+orderBy compuesto para no requerir índice compuesto.
  const q = query(collection(db, "trackingMetrics"), orderBy("orden", "asc"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as TrackingMetric))
    .filter((m) => m.activa);
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

export async function updateActivityLog(
  id: string,
  data: Pick<ActivityLog, "valor" | "valorDisplay" | "nota">
): Promise<void> {
  await updateDoc(doc(db, "activityLogs", id), {
    valor: data.valor,
    valorDisplay: data.valorDisplay,
    nota: data.nota ?? null,
  });
}

export async function deleteActivityLog(id: string): Promise<void> {
  await deleteDoc(doc(db, "activityLogs", id));
}

export async function listLogsForUser(uid: string): Promise<ActivityLog[]> {
  // Sin orderBy compuesto para no requerir índice. Se ordena client-side.
  const q = query(
    collection(db, "activityLogs"),
    where("uid", "==", uid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ActivityLog))
    .sort((a, b) => {
      const ta = a.creadoAt?.toDate().getTime() ?? 0;
      const tb = b.creadoAt?.toDate().getTime() ?? 0;
      return tb - ta;
    });
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

/** Perfil solo necesita el número de logros del diario, no los documentos. */
export async function contarDiarioAchievements(uid: string): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, "diarioAchievements"), where("uid", "==", uid))
  );
  return snap.data().count;
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

  // Los niveles alcanzados son independientes entre sí (bronce/plata/oro no
  // dependen uno del otro), así que se resuelven en paralelo: antes eran
  // hasta 3 vueltas secuenciales de getDoc+setDoc (6 round trips) para
  // guardar un solo registro que cruza varios umbrales a la vez.
  const nuevos = await Promise.all(
    reached.map(async (nivel) => {
      const id = achievementId(uid, metric.id, nivel);
      const existing = await getDoc(doc(db, "diarioAchievements", id));
      if (existing.exists()) return null;

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
      return { id, ...payload, creadoAt: null } as DiarioAchievement;
    })
  );

  return nuevos.filter((a): a is DiarioAchievement => a !== null);
}
