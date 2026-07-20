import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { AccessRequest } from "@/features/auth/approval";
import type { UserDoc } from "@/features/auth/types";

export interface ApprovedEmail {
  email: string;
  agregadoAt: { toDate: () => Date } | null;
  // Ausente o true = acceso activo. false = deshabilitado (no puede ingresar
  // pero conserva su lugar en la lista para poder reactivarlo).
  activo?: boolean;
}

/** Bloquea el acceso sin borrar el registro, para poder reactivarlo luego. */
export async function desactivarAcceso(email: string) {
  await updateDoc(doc(db, "approvedEmails", email), { activo: false });
}

export async function reactivarAcceso(email: string) {
  await updateDoc(doc(db, "approvedEmails", email), { activo: true });
}

/** Quita al alumno de la lista de acceso y borra su perfil (no su historial). */
export async function eliminarAlumno(email: string, uid?: string) {
  await deleteDoc(doc(db, "approvedEmails", email));
  if (uid) await deleteDoc(doc(db, "users", uid));
}

export async function addApprovedEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  await setDoc(doc(db, "approvedEmails", normalized), {
    agregadoAt: serverTimestamp(),
  });
}

export async function listApprovedEmails(): Promise<ApprovedEmail[]> {
  const snap = await getDocs(
    query(collection(db, "approvedEmails"), orderBy("agregadoAt", "desc"))
  );
  return snap.docs.map((d) => ({
    email: d.id,
    ...(d.data() as Omit<ApprovedEmail, "email">),
  }));
}

export async function listActivatedUsers(): Promise<UserDoc[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as UserDoc);
}

// ---------- Solicitudes de acceso ----------

export async function listSolicitudesPendientes(): Promise<AccessRequest[]> {
  const snap = await getDocs(
    query(collection(db, "accessRequests"), where("estado", "==", "pendiente"))
  );
  return snap.docs
    .map((d) => d.data() as AccessRequest)
    .sort(
      (a, b) =>
        (a.solicitadoAt?.toDate().getTime() ?? 0) - (b.solicitadoAt?.toDate().getTime() ?? 0)
    );
}

/** Aprueba la solicitud: agrega el email a la lista de acceso y la marca. */
export async function aprobarSolicitud(solicitud: AccessRequest) {
  await addApprovedEmail(solicitud.email);
  await updateDoc(doc(db, "accessRequests", solicitud.uid), { estado: "aprobada" });
}

export async function rechazarSolicitud(uid: string) {
  await updateDoc(doc(db, "accessRequests", uid), { estado: "rechazada" });
}
