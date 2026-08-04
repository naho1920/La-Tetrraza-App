/**
 * `getDocs`/`getDoc`/`getCountFromServer` de Firestore no tienen ningún límite
 * de tiempo propio: si la conexión se corta a mitad de la petición (el celular
 * pausa la app al cambiar de pestaña o bloquear la pantalla, muy común en
 * iOS), la promesa puede quedarse sin resolver NUNCA. Como el `loading` de
 * cada pantalla normalmente se apaga en un `.then()`/`finally` de esa misma
 * promesa, eso deja el esqueleto de carga girando para siempre — la única
 * salida era cerrar y reabrir la app.
 *
 * Estos wrappers tienen la misma firma que los originales (todo el código de
 * la app ya castea `d.data()` manualmente con `as`, así que no hace falta
 * preservar la genérica interna de Firestore — el tipo de retorno se infiere
 * solo) y se usan en `features/*\/api.ts` en vez de importar directo de
 * "firebase/firestore" para que TODA lectura de la app quede protegida por
 * el mismo límite, sin tocar la lógica de cada función. `onSnapshot` no se
 * envuelve: es un listener de larga duración, no una promesa que deba
 * resolver una vez.
 */
import {
  getCountFromServer as getCountFromServerFirestore,
  getDoc as getDocFirestore,
  getDocs as getDocsFirestore,
  type DocumentData,
  type DocumentReference,
  type Query,
} from "firebase/firestore";

const TIMEOUT_MS = 8_000;

function conLimite<T>(promesa: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const vencido = setTimeout(
      () => reject(new Error("Tiempo de espera agotado consultando Firestore.")),
      TIMEOUT_MS
    );
    promesa.then(
      (valor) => {
        clearTimeout(vencido);
        resolve(valor);
      },
      (err) => {
        clearTimeout(vencido);
        reject(err);
      }
    );
  });
}

export function getDocs(query: Query<DocumentData>) {
  return conLimite(getDocsFirestore(query));
}

export function getDoc(ref: DocumentReference<DocumentData>) {
  return conLimite(getDocFirestore(ref));
}

export function getCountFromServer(query: Query<DocumentData>) {
  return conLimite(getCountFromServerFirestore(query));
}
