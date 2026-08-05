import type { ProgresoPercibido } from "./types";

/** Escala de ánimo del mes: 1 (mal) a 5 (excelente), con etiqueta corta para el chip. */
export const OPCIONES_ANIMO: { value: number; label: string }[] = [
  { value: 1, label: "😞 Mal" },
  { value: 2, label: "😕 Regular" },
  { value: 3, label: "🙂 Bien" },
  { value: 4, label: "😄 Muy bien" },
  { value: 5, label: "🤩 Excelente" },
];

export const OPCIONES_PROGRESO: { value: ProgresoPercibido; label: string }[] = [
  { value: "mejorando", label: "Mejorando" },
  { value: "igual", label: "Igual" },
  { value: "estancado", label: "Estancado" },
];

export const ANIMO_LABEL: Record<number, string> = Object.fromEntries(
  OPCIONES_ANIMO.map((o) => [o.value, o.label])
);

export const PROGRESO_LABEL: Record<ProgresoPercibido, string> = Object.fromEntries(
  OPCIONES_PROGRESO.map((o) => [o.value, o.label])
) as Record<ProgresoPercibido, string>;
