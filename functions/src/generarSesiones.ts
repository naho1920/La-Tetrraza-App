import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (!getApps().length) initializeApp();
const db = getFirestore();

const DIAS_A_GENERAR = 7;

interface ClassTemplateData {
  diaSemana: number;
  hora: string;
  nombre: string;
  capacidad: number;
  activa: boolean;
}

// Duplicado local necesario: functions/ es un workspace separado y no puede
// resolver rutas @/ ni imports fuera de su árbol de compilación.
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Corre cada domingo de madrugada: genera las `classSessions` de los
 * próximos 7 días a partir de las `classTemplates` activas. El id de cada
 * sesión es determinístico (`${templateId}_${fecha}`) y solo se crea si no
 * existe todavía, para poder reintentar sin duplicar ni resetear cupos ya
 * reservados.
 */
export const generarSesiones = onSchedule(
  { schedule: "0 3 * * 0", timeZone: "America/Guayaquil" },
  async () => {
    const templatesSnap = await db
      .collection("classTemplates")
      .where("activa", "==", true)
      .get();

    const hoy = new Date();
    const fechas = Array.from({ length: DIAS_A_GENERAR }, (_, i) => {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      return fecha;
    });

    let creadas = 0;

    for (const templateDoc of templatesSnap.docs) {
      const template = templateDoc.data() as ClassTemplateData;

      for (const fecha of fechas) {
        if (fecha.getDay() !== template.diaSemana) continue;

        const fechaISO = toISODate(fecha);
        const sessionRef = db.collection("classSessions").doc(`${templateDoc.id}_${fechaISO}`);
        const existing = await sessionRef.get();
        if (existing.exists) continue;

        await sessionRef.set({
          fecha: fechaISO,
          hora: template.hora,
          nombre: template.nombre,
          capacidad: template.capacidad,
          cuposOcupados: 0,
          estado: "programada",
          templateId: templateDoc.id,
        });
        creadas += 1;
      }
    }

    console.log(`generarSesiones: ${creadas} sesiones nuevas creadas.`);
  }
);
