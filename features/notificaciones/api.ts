import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { listActivatedUsers, listSolicitudesPendientes } from "@/features/admin/api";
import type { UserDoc } from "@/features/auth/types";
import {
  getSkill,
  listAchievementsByEstado,
  listAchievementsForUser,
  listPinesPendientes,
} from "@/features/medallas/api";
import type { Skill } from "@/features/medallas/types";
import { getMembershipForUser, listAllMembershipsWithAlumno } from "@/features/membresias/api";
import { calcularEstadoMembresia } from "@/features/membresias/estado";
import { getPlanesForUser, listFormsByEstado } from "@/features/nutricion/api";
import type { Booking, ClassSession } from "@/features/reservas/types";

export type IconoNotificacion =
  | "acceso"
  | "medalla"
  | "nutricion"
  | "pin"
  | "membresia"
  | "clase";

export interface Notificacion {
  id: string;
  icono: IconoNotificacion;
  titulo: string;
  detalle: string | null;
  href: string;
  /** Para ordenar de más reciente a más antigua; null va al final. */
  fecha: Date | null;
}

/** Ventana de las notificaciones informativas del alumno (eventos pasados). */
const DIAS_VENTANA = 14;

function ordenar(items: Notificacion[]): Notificacion[] {
  return items.sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0));
}

function fechaLegible(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ---------- Coach ----------

export async function getNotificacionesCoach(): Promise<Notificacion[]> {
  const [solicitudes, medallasPendientes, pines, formsPendientes, formsRevision, memberships, users] =
    await Promise.all([
      listSolicitudesPendientes(),
      listAchievementsByEstado("pendiente"),
      listPinesPendientes(),
      listFormsByEstado("pendiente"),
      listFormsByEstado("en_revision"),
      listAllMembershipsWithAlumno(),
      listActivatedUsers(),
    ]);

  const usuariosPorUid = new Map(users.map((u) => [u.uid, u]));
  const nombreDe = (uid: string) => usuariosPorUid.get(uid)?.nombre ?? "Un alumno";

  // Nombres de medallas: solo se leen las skills que aparecen en pendientes/pins.
  const skillIds = [...new Set([...medallasPendientes, ...pines].map((a) => a.skillId))];
  const skills = await Promise.all(skillIds.map((id) => getSkill(id)));
  const skillsPorId = new Map<string, Skill>();
  for (const skill of skills) if (skill) skillsPorId.set(skill.id, skill);
  const medallaDe = (skillId: string) => skillsPorId.get(skillId)?.nombreMedalla ?? "una medalla";

  const items: Notificacion[] = [];

  for (const s of solicitudes) {
    items.push({
      id: `acceso-${s.uid}`,
      icono: "acceso",
      titulo: `${s.nombre} quiere unirse a La Terraza`,
      detalle: `${s.email} — dale acceso desde Alumnos`,
      href: "/alumnos/nuevo",
      fecha: s.solicitadoAt?.toDate() ?? null,
    });
  }

  for (const a of medallasPendientes) {
    items.push({
      id: `medalla-${a.id}`,
      icono: "medalla",
      titulo: `${nombreDe(a.uid)} registró un logro`,
      detalle: `Medalla "${medallaDe(a.skillId)}" — valídala para entregarla`,
      href: "/medallas-admin",
      fecha: a.fechaLogro ? new Date(`${a.fechaLogro}T12:00:00`) : null,
    });
  }

  for (const f of formsPendientes.concat(formsRevision)) {
    items.push({
      id: `nutricion-${f.id}`,
      icono: "nutricion",
      titulo: `${nombreDe(f.uid)} espera su plan de nutrición`,
      detalle: f.estado === "pendiente" ? "Formulario nuevo por revisar" : "Formulario en revisión",
      href: "/nutricion-admin",
      fecha: f.createdAt?.toDate() ?? null,
    });
  }

  for (const p of pines) {
    items.push({
      id: `pin-${p.id}`,
      icono: "pin",
      titulo: `Entregar pin a ${nombreDe(p.uid)}`,
      detalle: `Medalla "${medallaDe(p.skillId)}" ya validada 📍`,
      href: "/medallas-admin",
      fecha: p.validadoAt?.toDate() ?? null,
    });
  }

  for (const m of memberships) {
    const estado = calcularEstadoMembresia(m.membership.fechaFin);
    if (estado === "activa") continue;
    items.push({
      id: `membresia-${m.membership.id}`,
      icono: "membresia",
      titulo:
        estado === "por_vencer"
          ? `La membresía de ${m.alumno?.nombre ?? "un alumno"} está por vencer`
          : `La membresía de ${m.alumno?.nombre ?? "un alumno"} venció`,
      detalle: `Vence el ${fechaLegible(m.membership.fechaFin)}`,
      href: "/membresias",
      fecha: new Date(`${m.membership.fechaFin}T12:00:00`),
    });
  }

  return ordenar(items);
}

// ---------- Alumno ----------

export async function getNotificacionesAlumno(uid: string): Promise<Notificacion[]> {
  const desde = new Date(Date.now() - DIAS_VENTANA * 24 * 60 * 60 * 1000);
  const hoyISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [achievements, planes, membership, bookingsSnap] = await Promise.all([
    listAchievementsForUser(uid),
    getPlanesForUser(uid).catch(() => []),
    getMembershipForUser(uid).catch(() => null),
    getDocs(
      query(
        collection(db, "bookings"),
        where("uid", "==", uid),
        where("estado", "==", "reservado")
      )
    ),
  ]);

  const items: Notificacion[] = [];

  // Medallas validadas o rechazadas recientemente.
  const recientes = achievements.filter((a) => {
    const fecha = a.validadoAt?.toDate();
    return fecha && fecha >= desde && (a.estado === "validado" || a.estado === "rechazado");
  });
  const skills = await Promise.all([...new Set(recientes.map((a) => a.skillId))].map((id) => getSkill(id)));
  const skillsPorId = new Map<string, Skill>();
  for (const skill of skills) if (skill) skillsPorId.set(skill.id, skill);

  for (const a of recientes) {
    const nombre = skillsPorId.get(a.skillId)?.nombreMedalla ?? "tu medalla";
    items.push({
      id: `medalla-${a.id}`,
      icono: "medalla",
      titulo:
        a.estado === "validado"
          ? `¡Medalla "${nombre}" desbloqueada! 🎉`
          : `Tu logro de "${nombre}" no fue validado`,
      detalle:
        a.estado === "validado"
          ? a.pinEntregado
            ? "Ya tienes tu pin físico 📍"
            : "Pasa por el box a recibir tu pin 📍"
          : "Habla con tu coach para intentarlo de nuevo 💪",
      href: "/medallas",
      fecha: a.validadoAt?.toDate() ?? null,
    });
  }

  // Plan de nutrición enviado recientemente.
  for (const plan of planes) {
    const fecha = plan.enviadoAt?.toDate();
    if (!fecha || fecha < desde) continue;
    items.push({
      id: `plan-${plan.id}`,
      icono: "nutricion",
      titulo: "¡Tu plan alimenticio está listo! 🥗",
      detalle: "Ábrelo o descárgalo desde Nutrición",
      href: "/nutricion",
      fecha,
    });
  }

  // Membresía por vencer o vencida.
  if (membership) {
    const estado = calcularEstadoMembresia(membership.fechaFin);
    if (estado !== "activa") {
      items.push({
        id: `membresia-${membership.id}`,
        icono: "membresia",
        titulo:
          estado === "por_vencer"
            ? "Tu membresía está por vencer"
            : "Tu membresía venció — recuerda renovarla 💜",
        detalle: `Vence el ${fechaLegible(membership.fechaFin)}`,
        href: "/membresia",
        fecha: new Date(`${membership.fechaFin}T12:00:00`),
      });
    }
  }

  // Clases futuras que tenías reservadas y fueron canceladas.
  const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }));
  const proximas = bookings.filter((b) => (b.fecha ?? "") >= hoyISO);
  const sesiones = await Promise.all(
    proximas.map(async (b) => {
      const snap = await getDoc(doc(db, "classSessions", b.sessionId));
      return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<ClassSession, "id">) } as ClassSession) : null;
    })
  );
  sesiones.forEach((session) => {
    if (!session || session.estado !== "cancelada") return;
    items.push({
      id: `clase-${session.id}`,
      icono: "clase",
      titulo: `La clase de las ${session.hora} fue cancelada`,
      detalle: `${fechaLegible(session.fecha)} · ${session.nombre} — elige otra clase`,
      href: "/horarios",
      fecha: new Date(`${session.fecha}T${session.hora}:00`),
    });
  });

  return ordenar(items);
}

export async function getNotificaciones(userDoc: UserDoc): Promise<Notificacion[]> {
  return userDoc.rol === "admin"
    ? getNotificacionesCoach()
    : getNotificacionesAlumno(userDoc.uid);
}
