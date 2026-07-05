import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (!getApps().length) initializeApp();
const db = getFirestore();

// Ids del catálogo (functions/scripts/seed-skills.ts usa el slug `arte` como
// id del doc) para las 4 medallas automáticas del pilar Constancia.
const SKILL_MES_PERFECTO = "mes-perfecto";
const SKILL_CENTENARIA = "centenaria";
const SKILL_UN_ANIO = "un-anio";
const SKILL_FUNDADOR = "fundador";

const MIN_CLASES_MES_PERFECTO = 8;
const MIN_CLASES_CENTENARIA = 100;
const MAX_FUNDADORES = 20;

interface UserRow {
  uid: string;
  fechaIngreso: Date | null;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function otorgarSiNoExiste(id: string, uid: string, skillId: string) {
  const ref = db.collection("achievements").doc(id);
  const existente = await ref.get();
  if (existente.exists) return;

  await ref.set({
    uid,
    skillId,
    nivel: "base",
    fechaLogro: toISODate(new Date()),
    videoPath: null,
    estado: "validado",
    pinEntregado: false,
    celebrado: false,
    validadoPor: "sistema",
    validadoAt: FieldValue.serverTimestamp(),
  });
}

/** Cuenta bookings del alumno con `asistio:true`, sin importar la fecha. */
async function contarAsistenciasTotales(uid: string): Promise<number> {
  const snap = await db
    .collection("bookings")
    .where("uid", "==", uid)
    .where("asistio", "==", true)
    .count()
    .get();
  return snap.data().count;
}

/** true si el alumno tuvo >= MIN_CLASES_MES_PERFECTO asistencias y 0 faltas en [desde, hasta]. */
async function fueMesPerfecto(uid: string, desdeISO: string, hastaISO: string): Promise<boolean> {
  const bookingsSnap = await db.collection("bookings").where("uid", "==", uid).get();
  const sessionFechaCache = new Map<string, string | null>();

  async function fechaDeSesion(sessionId: string): Promise<string | null> {
    if (sessionFechaCache.has(sessionId)) return sessionFechaCache.get(sessionId)!;
    const sessionDoc = await db.collection("classSessions").doc(sessionId).get();
    const fecha = sessionDoc.exists ? (sessionDoc.data()!.fecha as string) : null;
    sessionFechaCache.set(sessionId, fecha);
    return fecha;
  }

  let asistencias = 0;
  let faltas = 0;

  for (const bookingDoc of bookingsSnap.docs) {
    const booking = bookingDoc.data() as { sessionId: string; asistio: boolean | null };
    if (booking.asistio === null || booking.asistio === undefined) continue;

    const fecha = await fechaDeSesion(booking.sessionId);
    if (!fecha || fecha < desdeISO || fecha > hastaISO) continue;

    if (booking.asistio) asistencias += 1;
    else faltas += 1;
  }

  return asistencias >= MIN_CLASES_MES_PERFECTO && faltas === 0;
}

/**
 * Revisa diariamente las medallas automáticas del pilar Constancia:
 * Mes Perfecto (el día 1, sobre el mes recién cerrado), Centenaria/o
 * (100 asistencias históricas), Un Año en La Terraza (aniversario de
 * `fechaIngreso`) y Fundador/a (primeros 20 alumnos aprobados). Cada una se
 * otorga con un id determinístico para no duplicar en reintentos.
 */
export const medallasConstancia = onSchedule(
  { schedule: "0 4 * * *", timeZone: "America/Guayaquil" },
  async () => {
    const usersSnap = await db.collection("users").where("aprobado", "==", true).get();
    const hoy = new Date();

    const usuarios: UserRow[] = usersSnap.docs.map((d) => {
      const data = d.data();
      const fechaIngreso = data.fechaIngreso instanceof Timestamp ? data.fechaIngreso.toDate() : null;
      return { uid: d.id, fechaIngreso };
    });

    // Fundador/a: primeros MAX_FUNDADORES alumnos aprobados por fechaIngreso.
    const fundadores = usuarios
      .filter((u) => u.fechaIngreso !== null)
      .sort((a, b) => a.fechaIngreso!.getTime() - b.fechaIngreso!.getTime())
      .slice(0, MAX_FUNDADORES);
    for (const u of fundadores) {
      await otorgarSiNoExiste(`${u.uid}_${SKILL_FUNDADOR}`, u.uid, SKILL_FUNDADOR);
    }

    // Un Año en La Terraza: aniversario (mismo mes/día, al menos 1 año).
    for (const u of usuarios) {
      if (!u.fechaIngreso) continue;
      const cumpleAnio =
        u.fechaIngreso.getMonth() === hoy.getMonth() && u.fechaIngreso.getDate() === hoy.getDate();
      const yaPasoUnAnio = hoy.getFullYear() > u.fechaIngreso.getFullYear();
      if (cumpleAnio && yaPasoUnAnio) {
        await otorgarSiNoExiste(`${u.uid}_${SKILL_UN_ANIO}`, u.uid, SKILL_UN_ANIO);
      }
    }

    // Centenaria/o: 100 asistencias históricas.
    for (const u of usuarios) {
      const asistencias = await contarAsistenciasTotales(u.uid);
      if (asistencias >= MIN_CLASES_CENTENARIA) {
        await otorgarSiNoExiste(`${u.uid}_${SKILL_CENTENARIA}`, u.uid, SKILL_CENTENARIA);
      }
    }

    // Mes Perfecto: solo se evalúa el día 1, sobre el mes recién cerrado.
    if (hoy.getDate() === 1) {
      const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      const inicioMesAnterior = new Date(finMesAnterior.getFullYear(), finMesAnterior.getMonth(), 1);
      const desdeISO = toISODate(inicioMesAnterior);
      const hastaISO = toISODate(finMesAnterior);
      const periodo = desdeISO.slice(0, 7); // "YYYY-MM"

      for (const u of usuarios) {
        if (await fueMesPerfecto(u.uid, desdeISO, hastaISO)) {
          await otorgarSiNoExiste(`${u.uid}_${SKILL_MES_PERFECTO}_${periodo}`, u.uid, SKILL_MES_PERFECTO);
        }
      }
    }
  }
);
