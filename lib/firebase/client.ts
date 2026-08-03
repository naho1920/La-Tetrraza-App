import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, getAuth } from "firebase/auth";
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

// TASK-075: activar persistencia local de Firestore para que los datos de
// clases, reservas y membresía sigan siendo legibles sin conexión. El cache
// se llena la primera vez con red y luego se sirve desde IndexedDB en offline.
// Si el módulo se recarga (HMR en dev) initializeFirestore lanza una
// excepción porque ya existe — en ese caso simplemente recuperamos la instancia.
function createFirestore(): Firestore {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache(),
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const db: Firestore = createFirestore();

export const googleProvider = new GoogleAuthProvider();
// Fuerza a Google a mostrar siempre el selector de cuentas. Sin esto, una PWA
// instalada en iOS ("Agregar a inicio") queda pegada a la primera cuenta con
// la que se inició sesión: ese modo standalone usa un almacenamiento aislado
// del Safari/Chrome normal, así que Google no ve ambigüedad de cuentas y
// omite el selector — cerrar sesión en la app nunca borra la sesión de Google
// en sí (ninguna app puede hacer eso), solo la de Firebase. Con este parámetro
// el selector aparece siempre, en cualquier plataforma.
googleProvider.setCustomParameters({ prompt: "select_account" });
