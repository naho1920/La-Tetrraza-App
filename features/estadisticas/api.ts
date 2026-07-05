import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { UserDoc } from "@/features/auth/types";
import { listAllMembershipsWithAlumno } from "@/features/membresias/api";
import { calcularEstadoMembresia } from "@/features/membresias/estado";
import { listAchievementsByEstado, listPinesPendientes } from "@/features/medallas/api";
import { listFormsByEstado } from "@/features/nutricion/api";
import type { Booking, ClassSession } from "@/features/reservas/types";

function mesISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function ultimosMeses(cantidad: number): string[] {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (cantidad - 1 - i), 1);
    return mesISO(d);
  });
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------- Dashboard ----------

export interface ClaseDeHoy {
  session: ClassSession;
}

export async function getClasesDeHoy(): Promise<ClaseDeHoy[]> {
  const hoy = toISODate(new Date());
  const snap = await getDocs(query(collection(db, "classSessions"), where("fecha", "==", hoy)));
  const sessions = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClassSession, "id">) }));
  return sessions.sort((a, b) => a.hora.localeCompare(b.hora)).map((session) => ({ session }));
}

export interface Alertas {
  nutricionPendientes: number;
  medallasPorValidar: number;
  pinesPendientes: number;
  membresiasPorVencer: number;
}

export async function getAlertas(): Promise<Alertas> {
  const [pendientes, enRevision, medallasPendientes, pines, memberships] = await Promise.all([
    listFormsByEstado("pendiente"),
    listFormsByEstado("en_revision"),
    listAchievementsByEstado("pendiente"),
    listPinesPendientes(),
    listAllMembershipsWithAlumno(),
  ]);

  const membresiasPorVencer = memberships.filter((m) => {
    const estado = calcularEstadoMembresia(m.membership.fechaFin);
    return estado === "por_vencer" || estado === "vencida";
  }).length;

  return {
    nutricionPendientes: pendientes.length + enRevision.length,
    medallasPorValidar: medallasPendientes.length,
    pinesPendientes: pines.length,
    membresiasPorVencer,
  };
}

export interface MetricasMes {
  asistenciasTotales: number;
  alumnoMasConstante: { nombre: string; asistencias: number } | null;
  medallasDesbloqueadas: number;
  alumnosActivos: number;
}

export async function getMetricasDelMes(): Promise<MetricasMes> {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

  const bookingsSnap = await getDocs(
    query(
      collection(db, "bookings"),
      where("asistio", "==", true),
      where("fecha", ">=", toISODate(inicioMes)),
      where("fecha", "<=", toISODate(finMes))
    )
  );
  const bookings = bookingsSnap.docs.map((d) => d.data() as Booking);

  const asistenciasPorAlumno = new Map<string, number>();
  for (const b of bookings) {
    asistenciasPorAlumno.set(b.uid, (asistenciasPorAlumno.get(b.uid) ?? 0) + 1);
  }

  let topUid: string | null = null;
  let topAsistencias = 0;
  for (const [uid, count] of asistenciasPorAlumno) {
    if (count > topAsistencias) {
      topUid = uid;
      topAsistencias = count;
    }
  }

  let alumnoMasConstante: { nombre: string; asistencias: number } | null = null;
  if (topUid) {
    const userSnap = await getDoc(doc(db, "users", topUid));
    alumnoMasConstante = {
      nombre: userSnap.exists() ? (userSnap.data() as UserDoc).nombre : topUid,
      asistencias: topAsistencias,
    };
  }

  const achievementsSnap = await getDocs(
    query(collection(db, "achievements"), where("estado", "==", "validado"))
  );
  const medallasDesbloqueadas = achievementsSnap.docs.filter((d) => {
    const validadoAt = d.data().validadoAt as { toDate?: () => Date } | null;
    const fecha = validadoAt?.toDate?.();
    return fecha && fecha >= inicioMes && fecha <= finMes;
  }).length;

  const usersSnap = await getDocs(query(collection(db, "users"), where("aprobado", "==", true)));
  const alumnosActivos = usersSnap.docs.filter((d) => (d.data() as UserDoc).rol === "alumno").length;

  return {
    asistenciasTotales: bookings.length,
    alumnoMasConstante,
    medallasDesbloqueadas,
    alumnosActivos,
  };
}

// ---------- Estadísticas ----------

export interface AsistenciaPorHorario {
  hora: string;
  asistencias: number;
}

/** Agrupa las asistencias del mes en curso por horario, para ver qué clases están más llenas. */
export async function getAsistenciaPorHorario(): Promise<AsistenciaPorHorario[]> {
  const hoy = new Date();
  const inicioMes = toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const finMes = toISODate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));

  const snap = await getDocs(
    query(
      collection(db, "bookings"),
      where("asistio", "==", true),
      where("fecha", ">=", inicioMes),
      where("fecha", "<=", finMes)
    )
  );

  const porHora = new Map<string, number>();
  for (const d of snap.docs) {
    const booking = d.data() as Booking;
    if (!booking.hora) continue;
    porHora.set(booking.hora, (porHora.get(booking.hora) ?? 0) + 1);
  }

  return Array.from(porHora.entries())
    .map(([hora, asistencias]) => ({ hora, asistencias }))
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

export interface PuntoMensual {
  mes: string; // "YYYY-MM"
  valor: number;
}

/** Total acumulado de alumnos aprobados, mes a mes (crecimiento del box). */
export async function getEvolucionAlumnos(meses = 6): Promise<PuntoMensual[]> {
  const snap = await getDocs(query(collection(db, "users"), where("aprobado", "==", true)));
  const fechas = snap.docs
    .map((d) => (d.data() as UserDoc).fechaIngreso as { toDate?: () => Date } | null)
    .map((f) => f?.toDate?.())
    .filter((f): f is Date => Boolean(f));

  const meses6 = ultimosMeses(meses);
  return meses6.map((mes) => ({
    mes,
    valor: fechas.filter((f) => mesISO(f) <= mes).length,
  }));
}

/** Medallas validadas por mes (no acumulado). */
export async function getMedallasPorMes(meses = 6): Promise<PuntoMensual[]> {
  const snap = await getDocs(query(collection(db, "achievements"), where("estado", "==", "validado")));
  const fechas = snap.docs
    .map((d) => d.data().validadoAt as { toDate?: () => Date } | null)
    .map((f) => f?.toDate?.())
    .filter((f): f is Date => Boolean(f));

  const meses6 = ultimosMeses(meses);
  return meses6.map((mes) => ({
    mes,
    valor: fechas.filter((f) => mesISO(f) === mes).length,
  }));
}
