/**
 * Rate limiting en memoria para las API routes (ventana deslizante simple).
 *
 * Suficiente para este backend: las rutas ya exigen token de Firebase, así
 * que esto solo frena abuso/bucles de un usuario autenticado sin necesidad
 * de pagar Redis ni servicios externos. En serverless cada instancia tiene
 * su propio contador, lo cual sigue acotando el abuso por instancia.
 */

interface Ventana {
  timestamps: number[];
}

const ventanas = new Map<string, Ventana>();

const VENTANA_MS = 60_000;
const MAX_ENTRADAS = 5_000;

/**
 * Devuelve `true` si la clave (uid o IP) superó `max` peticiones por minuto.
 */
export function excedeLimite(clave: string, max: number): boolean {
  const ahora = Date.now();

  // TASK-057: evicción LRU en lugar de clear() global — borrar solo las
  // entradas más antiguas (20% del mapa) para que los contadores del resto
  // de usuarios no se reseteen junto con las claves que ya no importan.
  if (ventanas.size >= MAX_ENTRADAS) {
    const objetivo = Math.floor(MAX_ENTRADAS * 0.8);
    const iter = ventanas.keys();
    while (ventanas.size > objetivo) {
      const { value, done } = iter.next();
      if (done || value === undefined) break;
      ventanas.delete(value);
    }
  }

  const ventana = ventanas.get(clave) ?? { timestamps: [] };
  ventana.timestamps = ventana.timestamps.filter((t) => ahora - t < VENTANA_MS);

  if (ventana.timestamps.length >= max) {
    ventanas.set(clave, ventana);
    return true;
  }

  ventana.timestamps.push(ahora);
  ventanas.set(clave, ventana);
  return false;
}

export const RESPUESTA_LIMITE = {
  error: "Demasiadas peticiones. Espera un minuto e inténtalo de nuevo.",
} as const;
