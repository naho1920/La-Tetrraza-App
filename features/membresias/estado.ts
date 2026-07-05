import type { EstadoMembresia } from "./types";

const DIAS_ALERTA_VENCIMIENTO = 3;

export function calcularEstadoMembresia(fechaFin: string, hoy: Date = new Date()): EstadoMembresia {
  const fin = new Date(`${fechaFin}T23:59:59`);
  const diffDias = (fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDias < 0) return "vencida";
  if (diffDias <= DIAS_ALERTA_VENCIMIENTO) return "por_vencer";
  return "activa";
}

export const ESTADO_LABEL: Record<EstadoMembresia, string> = {
  activa: "Al día",
  por_vencer: "Por vencer",
  vencida: "Vencida",
};

export const ESTADO_BADGE_VARIANT: Record<EstadoMembresia, "success" | "warning" | "destructive"> = {
  activa: "success",
  por_vencer: "warning",
  vencida: "destructive",
};
