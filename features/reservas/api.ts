import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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

import { conCache, invalidarCache } from "@/lib/cache";
import { db } from "@/lib/firebase/client";
import { getDoc, getDocs } from "@/lib/firestore-safe";
import type { UserDoc } from "@/features/auth/types";
import { addDays, esClasePasada, puedeCancelar, toISODate } from "./date-utils";
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

export async function createTemplate(data: Omit<ClassTemplate, "id">): Promise<ClassTemplate> {
  const ref = await addDoc(collection(db, "classTemplates"), data);
  return { id: ref.id, ...data };
}

export async function updateTemplate(id: string, data: Partial<Omit<ClassTemplate, "id">>) {
  await updateDoc(doc(db, "classTemplates", id), data);
}

export async function deleteTemplate(id: string) {
  await deleteDoc(doc(db, "classTemplates", id));
}

/** Crea varias plantillas de una vez (configuración rápida del horario semanal). */
export async function createTemplatesBulk(
  items: Omit<ClassTemplate, "id">[]
): Promise<ClassTemplate[]> {
  const batch = writeBatch(db);
  const refs = items.map((item) => {
    const ref = doc(collection(db, "classTemplates"));
    batch.set(ref, item);
    return ref;
  });
  await batch.commit();
  return items.map((item, i) => ({ id: refs[i].id, ...item }));
}

/** Borra TODAS las plantillas del horario semanal, para empezar de cero. */
export async function deleteAllTemplates(): Promise<void> {
  const snap = await getDocs(collection(db, "classTemplates"));
  const batch = writeBatch(db);
  for (const d of snap.docs) batch.delete(d.ref);
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
    if (esClasePasada(session)) throw new Error("Esta clase ya comenzó, no se puede reservar.");
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
  invalidarCache(`reservas:futuras-${uid}-`);
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
    if (esClasePasada(session)) throw new Error("Esta clase ya comenzó, no se puede cancelar.");
    if (!puedeCancelar(session)) {
      throw new Error("Ya no puedes cancelar: falta menos del límite permitido para esta clase.");
    }

    tx.update(bookingRef, { estado: "cancelado" });
    tx.update(sessionRef, { cuposOcupados: Math.max(0, session.cuposOcupados - 1) });
  });
  invalidarCache(`reservas:futuras-${uid}-`);
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

/**
 * Reservas activas y futuras de un alumno (sin límite: quien llama decide
 * cuántas necesita — `getUpcomingBookingsForUser` corta a un margen chico,
 * las notificaciones quieren verlas todas para detectar cancelaciones).
 *
 * Antes cada consumidor traía TODAS las reservas históricas del alumno (sin
 * filtro de fecha) — con un año de reservas eran ~200 documentos para mostrar
 * 3 tarjetas, y crecía cada semana porque una reserva pasada nunca cambia de
 * `estado: "reservado"`. `fecha` ya está denormalizada en el booking desde
 * que existe esta función (ver `reservarCupo`), así que el filtro va directo
 * en la consulta.
 *
 * Requiere el índice compuesto `bookings: uid + estado + fecha` (ver
 * firestore.indexes.json). Mientras ese índice no esté listo, Firestore
 * rechaza la consulta con `failed-precondition`; el fallback repite el
 * comportamiento anterior (traer las reservas activas y filtrar la fecha en
 * el cliente) para que el Home y las notificaciones nunca se rompan por el
 * orden en que se despliegan las cosas. Una vez confirmado el índice en
 * producción, el fallback se puede borrar.
 */
export async function getReservasFuturasDelAlumno(uid: string, hoyISO: string): Promise<Booking[]> {
  // El Home del alumno y la campanita de notificaciones llaman esto en
  // paralelo al montarse juntas: se comparte la petición en vez de duplicarla.
  return conCache(`reservas:futuras-${uid}-${hoyISO}`, () => fetchReservasFuturasDelAlumno(uid, hoyISO));
}

async function fetchReservasFuturasDelAlumno(uid: string, hoyISO: string): Promise<Booking[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, "bookings"),
        where("uid", "==", uid),
        where("estado", "==", "reservado"),
        where("fecha", ">=", hoyISO),
        orderBy("fecha")
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }));
  } catch {
    const snap = await getDocs(
      query(collection(db, "bookings"), where("uid", "==", uid), where("estado", "==", "reservado"))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }))
      .filter((b) => (b.fecha ?? "") >= hoyISO)
      .sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
  }
}

// Cuántas reservas futuras se leen para armar las 3 tarjetas: si alguna
// resulta cancelada se sigue completando hasta 3 sin una segunda vuelta a
// Firestore.
const MARGEN_CANCELADAS = 5;

export async function getUpcomingBookingsForUser(
  uid: string,
  hoyISO: string
): Promise<Array<{ booking: Booking; session: ClassSession }>> {
  const todas = await getReservasFuturasDelAlumno(uid, hoyISO);
  const bookings = todas.slice(0, MARGEN_CANCELADAS);

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
        item.session !== null && item.session.estado === "programada"
    )
    .sort((a, b) => (a.session.fecha + a.session.hora).localeCompare(b.session.fecha + b.session.hora))
    .slice(0, 3);
}
