/**
 * Convierte el hito de un nivel de Fuerza a texto legible.
 * Si el hito es un multiplicador de BW (ej. "1.5") y hay peso registrado,
 * devuelve el kg concreto ("Plata: levanta 97.5 kg"); si es "tecnica" o no
 * hay peso registrado, devuelve el hito tal cual.
 */
export function textoHito(hito: string, relativoABW: boolean, pesoKg: number | null): string {
  if (!relativoABW) return hito;
  const multiplicador = Number(hito);
  if (Number.isNaN(multiplicador)) return "Técnica validada";
  if (!pesoKg) return `${multiplicador}× tu peso corporal`;
  const kg = Math.round(multiplicador * pesoKg * 10) / 10;
  return `Levanta ${kg} kg`;
}
