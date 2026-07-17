import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (!getApps().length) initializeApp();
const db = getFirestore();

const DIAS_ALERTA_VENCIMIENTO = 3;

type EstadoMembresia = "activa" | "por_vencer" | "vencida";

function calcularEstado(fechaFin: string, hoy: Date): EstadoMembresia {
  const fin = new Date(`${fechaFin}T23:59:59`);
  const diffDias = (fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDias < 0) return "vencida";
  if (diffDias <= DIAS_ALERTA_VENCIMIENTO) return "por_vencer";
  return "activa";
}

/**
 * Corre cada día a las 05:00 (América/Guayaquil) y actualiza el campo
 * `estado` de todas las membresías según su `fechaFin`. Esto permite que
 * las notificaciones push de "por vencer" (Fase 9, FCM) se disparen
 * aunque ningún alumno haya abierto la app ese día.
 */
export const estadosMembresias = onSchedule(
  { schedule: "0 5 * * *", timeZone: "America/Guayaquil" },
  async () => {
    const snap = await db.collection("membresias").get();
    const hoy = new Date();
    let actualizadas = 0;

    const BATCH_SIZE = 400;
    let batch = db.batch();
    let ops = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as { fechaFin?: string; estado?: EstadoMembresia };
      if (!data.fechaFin) continue;
      const nuevoEstado = calcularEstado(data.fechaFin, hoy);
      if (data.estado === nuevoEstado) continue;

      batch.update(docSnap.ref, { estado: nuevoEstado });
      actualizadas += 1;
      ops += 1;

      if (ops >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) await batch.commit();
    console.log(`estadosMembresias: ${actualizadas} membresías actualizadas.`);
  }
);
