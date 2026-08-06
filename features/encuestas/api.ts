import { collection, doc, query, serverTimestamp, setDoc, where } from "firebase/firestore";

import { conCache, invalidarCache } from "@/lib/cache";
import { db } from "@/lib/firebase/client";
import { getCountFromServer, getDoc, getDocs } from "@/lib/firestore-safe";
import { contarAlumnosActivos } from "@/features/admin/api";
import type { PuntoMensual } from "@/features/estadisticas/api";
import type { MonthlySurvey, ProgresoPercibido } from "./types";

export function mesISO(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function ultimosMeses(cantidad: number): string[] {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (cantidad - 1 - i), 1);
    return mesISO(d);
  });
}

function idDe(uid: string, mes: string): string {
  return `${uid}_${mes}`;
}

/**
 * La encuesta del alumno para un mes puntual (por defecto, el actual). Una
 * sola lectura por ID determinístico — así "¿ya respondió este mes?" es
 * barato tanto para la notificación del alumno como para la propia pantalla
 * del formulario (evita reenviar).
 */
export async function getMiEncuestaDelMes(
  uid: string,
  mes: string = mesISO()
): Promise<MonthlySurvey | null> {
  const snap = await getDoc(doc(db, "monthlySurveys", idDe(uid, mes)));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<MonthlySurvey, "id">) }) : null;
}

export async function enviarEncuesta(data: {
  uid: string;
  alumnoNombre: string;
  animo: number;
  progreso: ProgresoPercibido;
  molestias: string | null;
  loMejor: string | null;
  aMejorar: string | null;
}): Promise<void> {
  const mes = mesISO();
  await setDoc(doc(db, "monthlySurveys", idDe(data.uid, mes)), {
    ...data,
    mes,
    createdAt: serverTimestamp(),
  });
  invalidarCache("encuestas:");
}

// ---------- Coach ----------

/**
 * Cacheada porque el Home de la coach la pide para el aviso de "Pendientes"
 * en cada carga — mismo patrón que el resto de contadores de Alertas.
 */
export async function contarEncuestasDelMes(mes: string = mesISO()): Promise<number> {
  return conCache(`encuestas:count-${mes}`, async () => {
    const snap = await getCountFromServer(query(collection(db, "monthlySurveys"), where("mes", "==", mes)));
    return snap.data().count;
  });
}

export async function listEncuestasDelMes(mes: string): Promise<MonthlySurvey[]> {
  const snap = await getDocs(query(collection(db, "monthlySurveys"), where("mes", "==", mes)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<MonthlySurvey, "id">) }))
    .sort((a, b) => (b.createdAt?.toDate().getTime() ?? 0) - (a.createdAt?.toDate().getTime() ?? 0));
}

export interface ResumenMesEncuestas {
  respondieron: number;
  alumnosActivos: number;
  promedioAnimo: number | null;
  conMolestias: number;
  progreso: Record<ProgresoPercibido, number>;
}

export async function getResumenDelMes(mes: string): Promise<ResumenMesEncuestas> {
  // `contarAlumnosActivos` reusa la lista de alumnos que ya pide el Home de
  // la coach — antes esta pantalla pedía el mismo conteo por su cuenta con un
  // `getCountFromServer` aparte.
  const [encuestas, alumnosActivos] = await Promise.all([
    listEncuestasDelMes(mes),
    contarAlumnosActivos(),
  ]);

  const progreso: Record<ProgresoPercibido, number> = { mejorando: 0, igual: 0, estancado: 0 };
  let sumaAnimo = 0;
  let conMolestias = 0;
  for (const e of encuestas) {
    sumaAnimo += e.animo;
    progreso[e.progreso]++;
    if (e.molestias) conMolestias++;
  }

  return {
    respondieron: encuestas.length,
    alumnosActivos,
    promedioAnimo: encuestas.length ? sumaAnimo / encuestas.length : null,
    conMolestias,
    progreso,
  };
}

/**
 * Ánimo promedio por mes, para la tendencia — misma forma `{mes, valor}` que
 * `getEvolucionAlumnos`/`getMedallasPorMes` en `features/estadisticas/api.ts`
 * para poder reusar el mismo `MiniLineChart` sin cambios.
 *
 * Igual que esas dos funciones, lee la colección completa y agrupa en el
 * cliente en vez de una consulta por mes — evita un índice compuesto para
 * una colección que crece a lo sumo unas pocas decenas de docs por mes.
 */
export async function getAnimoPromedioPorMes(meses = 6): Promise<PuntoMensual[]> {
  const snap = await getDocs(collection(db, "monthlySurveys"));
  const porMes = new Map<string, number[]>();
  for (const d of snap.docs) {
    const data = d.data() as MonthlySurvey;
    const lista = porMes.get(data.mes) ?? [];
    lista.push(data.animo);
    porMes.set(data.mes, lista);
  }

  return ultimosMeses(meses).map((mes) => {
    const valores = porMes.get(mes) ?? [];
    const promedio = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
    return { mes, valor: Math.round(promedio * 10) / 10 };
  });
}
