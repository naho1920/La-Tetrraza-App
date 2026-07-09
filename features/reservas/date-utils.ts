import { CANCELACION_HORAS_LIMITE } from "./constants";
import type { ClassSession } from "./types";

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Lunes de la semana que contiene `date`. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const dia = result.getDay(); // 0 domingo … 6 sábado
  const offset = dia === 0 ? -6 : 1 - dia;
  result.setDate(result.getDate() + offset);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
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
