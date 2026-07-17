import { describe, expect, it } from "vitest";
import { addDays, esClasePasada, puedeCancelar, toISODate } from "../date-utils";

describe("toISODate", () => {
  it("formatea la fecha correctamente sin depender de la zona horaria del sistema", () => {
    const d = new Date(2026, 6, 17); // julio 17 en hora local
    expect(toISODate(d)).toBe("2026-07-17");
  });

  it("hace padding de mes y día con ceros", () => {
    const d = new Date(2026, 0, 5); // enero 5
    expect(toISODate(d)).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("suma días correctamente", () => {
    const d = new Date(2026, 6, 17);
    expect(toISODate(addDays(d, 3))).toBe("2026-07-20");
  });

  it("cruza el límite de mes", () => {
    const d = new Date(2026, 6, 30); // julio 30
    expect(toISODate(addDays(d, 5))).toBe("2026-08-04");
  });
});

describe("puedeCancelar", () => {
  it("permite cancelar cuando faltan más de 2 horas", () => {
    const futuro = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const session = {
      fecha: toISODate(futuro),
      hora: `${String(futuro.getHours()).padStart(2, "0")}:${String(futuro.getMinutes()).padStart(2, "0")}`,
      estado: "programada" as const,
    };
    expect(puedeCancelar(session)).toBe(true);
  });

  it("bloquea la cancelación cuando quedan menos de 2 horas", () => {
    const cerca = new Date(Date.now() + 60 * 60 * 1000); // 1h
    const session = {
      fecha: toISODate(cerca),
      hora: `${String(cerca.getHours()).padStart(2, "0")}:${String(cerca.getMinutes()).padStart(2, "0")}`,
      estado: "programada" as const,
    };
    expect(puedeCancelar(session)).toBe(false);
  });

  it("bloquea si la sesión está cancelada aunque falte tiempo", () => {
    const futuro = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const session = {
      fecha: toISODate(futuro),
      hora: `${String(futuro.getHours()).padStart(2, "0")}:${String(futuro.getMinutes()).padStart(2, "0")}`,
      estado: "cancelada" as const,
    };
    expect(puedeCancelar(session)).toBe(false);
  });
});

describe("esClasePasada", () => {
  it("devuelve true cuando la clase ya inició", () => {
    const pasado = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const session = {
      fecha: toISODate(pasado),
      hora: `${String(pasado.getHours()).padStart(2, "0")}:${String(pasado.getMinutes()).padStart(2, "0")}`,
    };
    expect(esClasePasada(session)).toBe(true);
  });

  it("devuelve false para clases futuras", () => {
    const futuro = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const session = {
      fecha: toISODate(futuro),
      hora: `${String(futuro.getHours()).padStart(2, "0")}:${String(futuro.getMinutes()).padStart(2, "0")}`,
    };
    expect(esClasePasada(session)).toBe(false);
  });
});
