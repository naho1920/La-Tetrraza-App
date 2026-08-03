import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { invalidarCache } from "@/lib/cache";
import { auth, googleProvider } from "@/lib/firebase/client";

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signInWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function createAccountWithEmailPassword(
  email: string,
  password: string
) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Limpia la caché en memoria además de cerrar la sesión: en un equipo
 * compartido (o al cambiar de cuenta) el siguiente usuario no debe poder ver
 * datos cacheados del anterior.
 */
export function signOutUser() {
  invalidarCache();
  return signOut(auth);
}
