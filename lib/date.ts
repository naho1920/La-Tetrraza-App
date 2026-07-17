/**
 * TASK-089: utilidades de fecha compartidas entre el cliente (Next.js) y las
 * Cloud Functions. Antes definidas en 5+ sitios distintos con implementaciones
 * idénticas — centralizar aquí evita deriva y duplicación.
 */

/**
 * Devuelve la fecha en formato "YYYY-MM-DD" en hora local (no UTC).
 * Compatible con el formato que usa Firestore para `fecha` en classSessions
 * y `fechaLogro` en achievements.
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
