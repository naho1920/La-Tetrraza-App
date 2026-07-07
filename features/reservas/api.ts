import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { UserDoc } from "@/features/auth/types";
import { addDays, puedeCancelar, toISODate } from "./date-utils";
import type { Booking, ClassSession, ClassTemplate } from "./types";

// ---------- Plantillas (admin) ----------

export async function listTemplates(): Promise<ClassTemplate[]> {
  // Se ordena en el cliente: un orderBy doble (diaSemana + hora) exige un
  // índice compuesto en Firestore y, si falta, la consulta entera falla en
  // silencio — el horario "desaparecía" de la UI aunque estaba guardado.
  const snap = await getDocs(collection(db, "classTemplates"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ClassTemplate, "id">) }))
    .sort((a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora));
}

export async function createTemplate(data: Omit<ClassTemplate, "id">) {
  await addDoc(collection(db, "classTemplates"), data);
}

export async function updateTemplate(id: string, data: Partial<Omit<ClassTemplate, "id">>) {
  await updateDoc(doc(db, "classTemplates", id), data);
}

export async function toggleTemplateActiva(id: string, activa: boolean) {
  await updateDoc(doc(db, "classTemplates", id), { activa });
}

export async function deleteTemplate(id: string) {
  await deleteDoc(doc(db, "classTemplates", id));
}

/** Crea varias plantillas de una vez (configuración rápida del horario semanal). */
export async function createTemplatesBulk(items: Omit<ClassTemplate, "id">[]) {
  const batch = writeBatch(db);
  for (const item of items) {
    batch.set(doc(collection(db, "classTemplates")), item);
  }
  await batch.commit();
}

// ---------- Sesiones (admin) ----------

export async function createOneOffSession(
  data: Omit<ClassSession, "id" | "cuposOcupados" | "estado" | "templateId">
) {
  await addDoc(collection(db, "classSessions"), {
    ...data,
    cuposOcupados: 0,
    estado: "programada",
    templateId: null,
  });
}

export async function updateSession(id: string, data: Partial<Omit<ClassSession, "id">>) {
  await updateDoc(doc(db, "classSessions", id), data);
}

export async function cancelSession(id: string) {
  await updateDoc(doc(db, "classSessions", id), { estado: "cancelada" });
}

/**
 * Genera las `classSessions` de las fechas indicadas a partir de las
 * `classTemplates` activas. Reemplaza a la Cloud Function programada
 * (que requeriría el plan Blaze): la admin elige los días desde el
 * calendario. Id determinístico (`${templateId}_${fecha}`), así que
 * correrla varias veces no duplica ni resetea cupos ya reservados.
 */
export async function generarSesionesParaFechas(fechasISO: string[]): Promise<number> {
  const templates = await listTemplates();
  const activas = templates.filter((t) => t.activa);

  let creadas = 0;
  for (const fechaISO of fechasISO) {
    const fecha = new Date(`${fechaISO}T00:00:00`);
    for (const template of activas) {
      if (fecha.getDay() !== template.diaSemana) continue;

      const sessionRef = doc(db, "classSessions", `${template.id}_${fechaISO}`);
      const existente = await getDoc(sessionRef);
      if (existente.exists()) continue;

      await setDoc(sessionRef, {
        fecha: fechaISO,
        hora: template.hora,
        nombre: template.nombre,
        capacidad: template.capacidad,
        cuposOcupados: 0,
        estado: "programada",
        templateId: template.id,
      });
      creadas += 1;
    }
  }
  return creadas;
}

/** Genera las sesiones de los próximos `dias` (atajo sobre `generarSesionesParaFechas`). */
export async function generarSesionesDesdePlantillas(dias = 7): Promise<number> {
  const hoy = new Date();
  const fechas = Array.from({ length: dias }, (_, i) => toISODate(addDays(hoy, i)));
  return generarSesionesParaFechas(fechas);
}

// ---------- Sesiones (alumno, tiempo real) ----------

export function subscribeToWeekSessions(
  desde: string,
  hasta: string,
  cb: (sessions: ClassSession[]) => void
): Unsubscribe {
  // Solo orderBy("fecha") (mismo campo del filtro): agregar orderBy("hora")
  // exigiría un índice compuesto y sin él la suscripción falla en silencio.
  // La hora se ordena en el cliente.
  const q = query(
    collection(db, "classSessions"),
    where("fecha", ">=", desde),
    where("fecha", "<=", hasta),
    orderBy("fecha")
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<ClassSession, "id">) }))
          .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
      );
    },
    (err) => console.error("subscribeToWeekSessions:", err)
  );
}

export function subscribeToUserBookings(
  uid: string,
  cb: (bookings: Booking[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "bookings"),
    where("uid", "==", uid),
    where("estado", "==", "reservado")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) })));
  });
}

// ---------- Reservar / cancelar (alumno) ----------

export async function reservarCupo(
  sessionId: string,
  uid: string,
  alumno?: { nombre: string; foto: string | null }
) {
  const sessionRef = doc(db, "classSessions", sessionId);
  const bookingRef = doc(db, "bookings", `${sessionId}_${uid}`);

  await runTransaction(db, async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    const bookingSnap = await tx.get(bookingRef);

    if (!sessionSnap.exists()) throw new Error("La clase ya no existe.");
    const session = sessionSnap.data() as Omit<ClassSession, "id">;

    if (session.estado !== "programada") throw new Error("Esta clase fue cancelada.");
    if (session.cuposOcupados >= session.capacidad) throw new Error("Ya no hay cupos disponibles.");
    if (bookingSnap.exists() && (bookingSnap.data() as Booking).estado === "reservado") {
      throw new Error("Ya tienes una reserva para esta clase.");
    }

    tx.set(bookingRef, {
      sessionId,
      uid,
      estado: "reservado",
      asistio: null,
      creadoAt: serverTimestamp(),
      // Denormalizado desde la sesión para poder consultar asistencia por
      // rango de fechas sin tener que leer cada classSession una por una.
      fecha: session.fecha,
      hora: session.hora,
      // Denormalizado desde el perfil: así los demás alumnos pueden ver
      // quiénes van a la clase sin necesitar acceso a users/.
      alumnoNombre: alumno?.nombre ?? null,
      alumnoFoto: alumno?.foto ?? null,
    });
    tx.update(sessionRef, { cuposOcupados: session.cuposOcupados + 1 });
  });
}

export async function cancelarReserva(sessionId: string, uid: string) {
  const sessionRef = doc(db, "classSessions", sessionId);
  const bookingRef = doc(db, "bookings", `${sessionId}_${uid}`);

  await runTransaction(db, async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    const bookingSnap = await tx.get(bookingRef);

    if (!sessionSnap.exists() || !bookingSnap.exists()) throw new Error("No se encontró la reserva.");
    const session = sessionSnap.data() as Omit<ClassSession, "id">;
    const booking = bookingSnap.data() as Booking;

    if (booking.estado !== "reservado") throw new Error("Esta reserva ya está cancelada.");
    if (!puedeCancelar(session)) {
      throw new Error("Ya no puedes cancelar: falta menos del límite permitido para esta clase.");
    }

    tx.update(bookingRef, { estado: "cancelado" });
    tx.update(sessionRef, { cuposOcupados: Math.max(0, session.cuposOcupados - 1) });
  });
}

// ---------- Admin: inscritos y asistencia ----------

export interface BookingConAlumno {
  booking: Booking;
  alumno: Pick<UserDoc, "uid" | "nombre" | "foto"> | null;
}

export async function listBookingsForSession(sessionId: string): Promise<BookingConAlumno[]> {
  const snap = await getDocs(
    query(
      collection(db, "bookings"),
      where("sessionId", "==", sessionId),
      where("estado", "==", "reservado")
    )
  );
  const bookings = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }));

  const alumnos = await Promise.all(
    bookings.map(async (b) => {
      // Reservas nuevas traen el nombre denormalizado; no hace falta leer users/.
      if (b.alumnoNombre) {
        return { uid: b.uid, nombre: b.alumnoNombre, foto: b.alumnoFoto ?? null };
      }
      // Reservas antiguas: solo la admin puede leer users/ — para un alumno
      // la lectura falla por rules y mostramos un nombre genérico.
      try {
        const userSnap = await getDoc(doc(db, "users", b.uid));
        if (!userSnap.exists()) return null;
        const user = userSnap.data() as UserDoc;
        return { uid: user.uid, nombre: user.nombre, foto: user.foto };
      } catch {
        return null;
      }
    })
  );

  return bookings.map((booking, i) => ({ booking, alumno: alumnos[i] }));
}

export async function marcarAsistencia(bookingId: string, asistio: boolean) {
  await updateDoc(doc(db, "bookings", bookingId), { asistio });
}

// ---------- Home del alumno ----------

export async function getUpcomingBookingsForUser(
  uid: string,
  hoyISO: string
): Promise<Array<{ booking: Booking; session: ClassSession }>> {
  const q = query(
    collection(db, "bookings"),
    where("uid", "==", uid),
    where("estado", "==", "reservado")
  );
  const snap = await getDocs(q);
  const bookings = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }));

  const sessions = await Promise.all(
    bookings.map(async (b) => {
      const sessionSnap = await getDoc(doc(db, "classSessions", b.sessionId));
      return sessionSnap.exists()
        ? ({ id: sessionSnap.id, ...(sessionSnap.data() as Omit<ClassSession, "id">) } as ClassSession)
        : null;
    })
  );

  return bookings
    .map((booking, i) => ({ booking, session: sessions[i] }))
    .filter(
      (item): item is { booking: Booking; session: ClassSession } =>
        item.session !== null && item.session.estado === "programada" && item.session.fecha >= hoyISO
    )
    .sort((a, b) => (a.session.fecha + a.session.hora).localeCompare(b.session.fecha + b.session.hora))
    .slice(0, 3);
}
