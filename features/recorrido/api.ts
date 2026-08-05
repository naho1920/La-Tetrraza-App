/**
 * Singleton de listeners para poder disparar el recorrido desde una página
 * cualquiera cuando el overlay está montado en el layout raíz (el botón "ver
 * de nuevo" vive en Perfil, el recorrido no).
 *
 * Mismo patrón que `components/ui/toast.tsx`: un Set a nivel de módulo, sin
 * contexto de React ni provider extra.
 */
type RecorridoListener = () => void;
const listeners = new Set<RecorridoListener>();

/** Vuelve a abrir el recorrido a pedido del alumno. */
export function iniciarRecorrido() {
  listeners.forEach((fn) => fn());
}

/** Suscribe al listener global; devuelve la función para desuscribirse. */
export function onIniciarRecorrido(fn: RecorridoListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
