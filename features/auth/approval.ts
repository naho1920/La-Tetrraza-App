import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { UserDoc } from "./types";

/**
 * Verifica que el email del usuario esté en `approvedEmails`. Si lo está,
 * crea (o devuelve) su documento `users/{uid}`. Si no, devuelve null: el
 * alumno debe ver la pantalla "pide acceso a tu coach".
 */
export async function ensureUserDocument(user: User): Promise<UserDoc | null> {
  const email = (user.email ?? "").toLowerCase();
  if (!email) return null;

  const approvedSnap = await getDoc(doc(db, "approvedEmails", email));
  if (!approvedSnap.exists()) return null;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserDoc;
  }

  const newUserDoc = {
    uid: user.uid,
    email,
    nombre: user.displayName ?? email,
    foto: user.photoURL ?? null,
    rol: "alumno" as const,
    aprobado: true,
    fechaNac: null,
    sexo: null,
    estaturaCm: null,
    alergias: [],
    lesiones: [],
    meta: null,
    telefono: null,
    contactoEmergencia: null,
    fechaIngreso: serverTimestamp(),
    fcmTokens: [],
  };

  await setDoc(userRef, newUserDoc);
  return newUserDoc as UserDoc;
}
