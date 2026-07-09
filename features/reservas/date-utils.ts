import { CANCELACION_HORAS_LIMITE } from "./constants";
import type { ClassSession } from "./types";

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function sessionDateTime(session: Pick<ClassSession, "fecha" | "hora">): Date {
  const [horas, minutos] = session.hora.split(":").map(Number);
  const fecha = new Date(`${session.fecha}T00:00:00`);
  fecha.setHours(horas, minutos, 0, 0);
  return fecha;
}

export function puedeCancelar(session: Pick<ClassSession, "fecha" | "hora" | "estado">): boolean {
  if (session.estado !== "programada") return false;
  const limite = sessionDateTime(session).getTime() - CANCELACION_HORAS_LIMITE * 60 * 60 * 1000;
  return Date.now() < limite;
}

/** La clase ya inició (hora de inicio en el pasado) — no depende del estado. */
export function esClasePasada(session: Pick<ClassSession, "fecha" | "hora">): boolean {
  return sessionDateTime(session).getTime() < Date.now();
}
