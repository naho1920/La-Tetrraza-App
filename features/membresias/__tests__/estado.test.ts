import { describe, expect, it } from "vitest";
import { calcularEstadoMembresia } from "../estado";

describe("calcularEstadoMembresia", () => {
  it("devuelve 'activa' cuando falta más de 3 días", () => {
    const hoy = new Date("2026-07-17T12:00:00");
    expect(calcularEstadoMembresia("2026-07-25", hoy)).toBe("activa");
  });

  it("devuelve 'por_vencer' cuando faltan menos de 3 días", () => {
    // fin = 2026-07-19T23:59:59, hoy = 2026-07-17T00:00:00 → ~2.999 días ≤ 3
    const hoy = new Date("2026-07-17T00:00:00");
    expect(calcularEstadoMembresia("2026-07-19", hoy)).toBe("por_vencer");
  });

  it("devuelve 'por_vencer' cuando faltan 1 día", () => {
    const hoy = new Date("2026-07-17T00:00:00");
    expect(calcularEstadoMembresia("2026-07-18", hoy)).toBe("por_vencer");
  });

  it("devuelve 'por_vencer' el mismo día de vencimiento", () => {
    const hoy = new Date("2026-07-17T00:00:00");
    expect(calcularEstadoMembresia("2026-07-17", hoy)).toBe("por_vencer");
  });

  it("devuelve 'vencida' cuando la fecha ya pasó", () => {
    const hoy = new Date("2026-07-17T00:00:00");
    expect(calcularEstadoMembresia("2026-07-10", hoy)).toBe("vencida");
  });

  it("devuelve 'vencida' cuando vence en el pasado reciente", () => {
    const hoy = new Date("2026-07-17T00:00:00");
    expect(calcularEstadoMembresia("2026-07-16", hoy)).toBe("vencida");
  });
});
