import { describe, expect, it } from "vitest";

/**
 * Copia de la lógica de `fueMesPerfecto` de medallasConstancia.ts,
 * pero operando sobre datos en memoria (sin Firestore) para poder testearla
 * de forma unitaria. Si cambia la función, actualizar aquí también.
 */
const MIN_CLASES = 8;

function evaluarMesPerfecto(
  bookings: Array<{ sessionFecha: string; asistio: boolean | null }>,
  desdeISO: string,
  hastaISO: string,
): boolean {
  let asistencias = 0;
  let faltas = 0;

  for (const b of bookings) {
    if (b.asistio === null || b.asistio === undefined) continue;
    if (b.sessionFecha < desdeISO || b.sessionFecha > hastaISO) continue;
    if (b.asistio) asistencias += 1;
    else faltas += 1;
  }

  return asistencias >= MIN_CLASES && faltas === 0;
}

describe("evaluarMesPerfecto", () => {
  const DESDE = "2026-06-01";
  const HASTA = "2026-06-30";

  it("es verdadero con 8 asistencias y 0 faltas", () => {
    const bookings = Array.from({ length: 8 }, (_, i) => ({
      sessionFecha: `2026-06-${String(i + 1).padStart(2, "0")}`,
      asistio: true as const,
    }));
    expect(evaluarMesPerfecto(bookings, DESDE, HASTA)).toBe(true);
  });

  it("es falso con 7 asistencias (menos del mínimo)", () => {
    const bookings = Array.from({ length: 7 }, (_, i) => ({
      sessionFecha: `2026-06-${String(i + 1).padStart(2, "0")}`,
      asistio: true as const,
    }));
    expect(evaluarMesPerfecto(bookings, DESDE, HASTA)).toBe(false);
  });

  it("es falso si hay al menos una falta aunque haya 8+ asistencias", () => {
    const bookings = [
      ...Array.from({ length: 10 }, (_, i) => ({
        sessionFecha: `2026-06-${String(i + 1).padStart(2, "0")}`,
        asistio: true as const,
      })),
      { sessionFecha: "2026-06-11", asistio: false as const },
    ];
    expect(evaluarMesPerfecto(bookings, DESDE, HASTA)).toBe(false);
  });

  it("ignora bookings fuera del rango de fechas", () => {
    const bookings = [
      ...Array.from({ length: 8 }, (_, i) => ({
        sessionFecha: `2026-06-${String(i + 1).padStart(2, "0")}`,
        asistio: true as const,
      })),
      // Este booking está en mayo — no debe contar como falta
      { sessionFecha: "2026-05-15", asistio: false as const },
    ];
    expect(evaluarMesPerfecto(bookings, DESDE, HASTA)).toBe(true);
  });

  it("ignora bookings sin asistio marcada (null)", () => {
    const bookings = [
      ...Array.from({ length: 8 }, (_, i) => ({
        sessionFecha: `2026-06-${String(i + 1).padStart(2, "0")}`,
        asistio: true as const,
      })),
      { sessionFecha: "2026-06-20", asistio: null },
    ];
    expect(evaluarMesPerfecto(bookings, DESDE, HASTA)).toBe(true);
  });

  it("es verdadero con más de 8 asistencias y 0 faltas", () => {
    const bookings = Array.from({ length: 15 }, (_, i) => ({
      sessionFecha: `2026-06-${String(i + 1).padStart(2, "0")}`,
      asistio: true as const,
    }));
    expect(evaluarMesPerfecto(bookings, DESDE, HASTA)).toBe(true);
  });
});
