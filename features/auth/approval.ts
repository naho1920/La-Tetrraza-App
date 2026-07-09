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
    onboardingCompletado: false,
    bienvenidaVista: false,
  };

  await setDoc(userRef, newUserDoc);
  return newUserDoc as UserDoc;
}

export async function markOnboardingCompleted(uid: string) {
  await setDoc(doc(db, "users", uid), { onboardingCompletado: true }, { merge: true });
}

export async function markBienvenidaVista(uid: string) {
  await setDoc(doc(db, "users", uid), { bienvenidaVista: true }, { merge: true });
}

export interface AccessRequest {
  uid: string;
  email: string;
  nombre: string;
  foto: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  solicitadoAt: { toDate: () => Date } | null;
}

/**
 * Deja registrada la solicitud de acceso de un usuario no aprobado, para que
 * la coach la vea en su panel y le dé acceso con un tap. Si ya existe una
 * solicitud, no la pisa (conserva su estado y fecha).
 */
export async function ensureAccessRequest(user: User): Promise<AccessRequest | null> {
  const email = (user.email ?? "").toLowerCase();
  if (!email) return null;

  const ref = doc(db, "accessRequests", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as AccessRequest;

  const request: Omit<AccessRequest, "solicitadoAt"> = {
    uid: user.uid,
    email,
    nombre: user.displayName ?? email,
    foto: user.photoURL ?? null,
    estado: "pendiente",
  };
  await setDoc(ref, { ...request, solicitadoAt: serverTimestamp() });
  return { ...request, solicitadoAt: null };
}
