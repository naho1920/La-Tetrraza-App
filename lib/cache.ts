/**
 * Caché en memoria para lecturas de Firestore, con deduplicación de peticiones
 * concurrentes.
 *
 * Resuelve dos problemas medidos en la auditoría de rendimiento:
 *
 * 1. **Peticiones duplicadas simultáneas.** La campanita de notificaciones y el
 *    dashboard de la coach piden exactamente las mismas colecciones al mismo
 *    tiempo, sin compartir nada: el Home de la coach disparaba ~432 round trips
 *    para pintar 5 badges y 4 métricas. Se guarda la PROMESA (no solo el
 *    resultado), así dos llamadas concurrentes comparten una sola petición de
 *    red en vez de duplicarla.
 *
 * 2. **Re-consultar todo en cada navegación.** La app no tenía ninguna caché de
 *    datos, así que volver a una pantalla ya visitada la reconstruía desde cero
 *    contra el servidor. Firestore tiene caché local (IndexedDB) pero
 *    `getDocs`/`getDoc` siempre prefieren el servidor, así que esa caché solo
 *    servía estando sin conexión.
 *
 * Es deliberadamente mínimo: no hace falta traer una librería de data-fetching
 * para esto. La consistencia se mantiene invalidando explícitamente después de
 * cada escritura (ver `invalidarCache`), no con un TTL agresivo.
 */

interface Entrada {
  promesa: Promise<unknown>;
  expiraEn: number;
}

const entradas = new Map<string, Entrada>();

/** Ventana por defecto: corta, para que un dato desactualizado nunca dure mucho. */
const TTL_MS = 30_000;

/**
 * Devuelve el resultado de `fn` desde la caché si sigue fresco; si no, lo
 * ejecuta y lo guarda. Llamadas concurrentes con la misma clave comparten una
 * única ejecución.
 *
 * Si `fn` falla, la entrada se descarta para no dejar cacheado un error.
 */
export function conCache<T>(clave: string, fn: () => Promise<T>, ttlMs = TTL_MS): Promise<T> {
  const ahora = Date.now();
  const existente = entradas.get(clave);
  if (existente && existente.expiraEn > ahora) {
    return existente.promesa as Promise<T>;
  }

  const promesa = fn().catch((err) => {
    entradas.delete(clave);
    throw err;
  });
  entradas.set(clave, { promesa, expiraEn: ahora + ttlMs });
  return promesa;
}

/**
 * Borra entradas de la caché. Hay que llamarla después de cualquier escritura
 * que cambie datos ya cacheados, para que la UI refleje el cambio al instante
 * en vez de esperar a que expire el TTL.
 *
 * Sin `prefijo` limpia todo (útil al cerrar sesión).
 */
export function invalidarCache(prefijo?: string): void {
  if (!prefijo) {
    entradas.clear();
    return;
  }
  for (const clave of entradas.keys()) {
    if (clave.startsWith(prefijo)) entradas.delete(clave);
  }
}
