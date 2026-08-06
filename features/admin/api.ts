import {
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { conCache, invalidarCache } from "@/lib/cache";
import { db } from "@/lib/firebase/client";
import { getDocs } from "@/lib/firestore-safe";
import type { AccessRequest } from "@/features/auth/approval";
import type { UserDoc } from "@/features/auth/types";

export interface ApprovedEmail {
  email: string;
  agregadoAt: { toDate: () => Date } | null;
  // Ausente o true = acceso activo. false = deshabilitado (no puede ingresar
  // pero conserva su lugar en la lista para poder reactivarlo).
  activo?: boolean;
  // Token del link de invitación con el que se auto-aprobó (ver
  // app/api/invitaciones/redimir/route.ts). Ausente = acceso agregado a mano
  // por la coach.
  viaInvite?: string;
}

/**
 * Bloquea el acceso sin borrar el registro, para poder reactivarlo luego.
 * También apaga `users/{uid}.aprobado` porque las Firestore Security Rules
 * usan ese campo (no `approvedEmails`) para autorizar todas las lecturas y
 * escrituras del resto de la app — sin esto, un alumno ya activado seguiría
 * pudiendo leer/escribir datos si su sesión ya estaba cargada en el navegador.
 */
export async function desactivarAcceso(email: string, uid?: string) {
  await updateDoc(doc(db, "approvedEmails", email), { activo: false });
  if (uid) await updateDoc(doc(db, "users", uid), { aprobado: false });
  invalidarCache("admin:");
}

export async function reactivarAcceso(email: string, uid?: string) {
  await updateDoc(doc(db, "approvedEmails", email), { activo: true });
  if (uid) await updateDoc(doc(db, "users", uid), { aprobado: true });
  invalidarCache("admin:");
}

/**
 * Quita al alumno de la lista de acceso y borra su perfil (no su historial).
 *
 * En un batch para que sea atómico: antes eran dos `deleteDoc` seguidos, así
 * que si el segundo fallaba el alumno quedaba sin acceso pero CON su perfil en
 * `users` — y ese perfil es justo lo que leen los selectores de "Asignar plan"
 * y "Registrar pago", donde seguía apareciendo como si nada.
 */
export async function eliminarAlumno(email: string, uid?: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "approvedEmails", email));
  if (uid) batch.delete(doc(db, "users", uid));
  await batch.commit();
  invalidarCache("admin:");
}

/**
 * Alumnos que hoy realmente pueden entrar: están en `users` y su correo sigue
 * habilitado en `approvedEmails`. Para los selectores donde elegir a alguien
 * sin acceso no tiene sentido (asignar plan, registrar pago).
 *
 * `listActivatedUsers` a propósito no filtra nada, y `users.aprobado` por sí
 * solo no alcanza: cruzar contra la lista de acceso es lo que de verdad
 * refleja quién puede usar la app hoy. Las dos consultas ya están cacheadas,
 * así que esto no agrega lecturas.
 */
export async function listAlumnosConAcceso(): Promise<UserDoc[]> {
  const [users, approved] = await Promise.all([listActivatedUsers(), listApprovedEmails()]);
  const habilitados = new Set(
    approved.filter((a) => a.activo !== false).map((a) => a.email.toLowerCase())
  );
  return users.filter(
    (u) => u.rol === "alumno" && u.aprobado && habilitados.has(u.email.toLowerCase())
  );
}

export async function addApprovedEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  await setDoc(doc(db, "approvedEmails", normalized), {
    agregadoAt: serverTimestamp(),
  });
  invalidarCache("admin:");
}

export async function listApprovedEmails(): Promise<ApprovedEmail[]> {
  return conCache("admin:approved-emails", async () => {
    const snap = await getDocs(
      query(collection(db, "approvedEmails"), orderBy("agregadoAt", "desc"))
    );
    return snap.docs.map((d) => ({
      email: d.id,
      ...(d.data() as Omit<ApprovedEmail, "email">),
    }));
  });
}

/**
 * Filtra por `rol` en el servidor: los tres consumidores solo usan alumnos y
 * antes descartaban a los admins en el cliente, después de haber pagado la
 * lectura de la colección `users` completa.
 *
 * No se filtra además por `aprobado` a propósito: varias pantallas necesitan el
 * nombre de alumnos deshabilitados para mostrarlo en listas e historiales.
 */
export async function listActivatedUsers(): Promise<UserDoc[]> {
  return conCache("admin:users-alumnos", async () => {
    const snap = await getDocs(query(collection(db, "users"), where("rol", "==", "alumno")));
    return snap.docs.map((d) => d.data() as UserDoc);
  });
}

/**
 * Cuántos alumnos con acceso activo hay. Deriva el conteo de
 * `listActivatedUsers()` (ya cacheada) en vez de pedir un `getCountFromServer`
 * aparte — antes el Home de la coach y el resumen de encuestas pedían este
 * mismo conteo cada uno por su cuenta, dos round trips completos para el
 * mismo número.
 */
export async function contarAlumnosActivos(): Promise<number> {
  const alumnos = await listActivatedUsers();
  return alumnos.filter((u) => u.aprobado).length;
}

// ---------- Solicitudes de acceso ----------

export async function listSolicitudesPendientes(): Promise<AccessRequest[]> {
  return conCache("admin:solicitudes-pendientes", async () => {
    const snap = await getDocs(
      query(collection(db, "accessRequests"), where("estado", "==", "pendiente"))
    );
    return snap.docs
      .map((d) => d.data() as AccessRequest)
      .sort(
        (a, b) =>
          (a.solicitadoAt?.toDate().getTime() ?? 0) - (b.solicitadoAt?.toDate().getTime() ?? 0)
      );
  });
}

/** Aprueba la solicitud: agrega el email a la lista de acceso y la marca. */
export async function aprobarSolicitud(solicitud: AccessRequest) {
  await addApprovedEmail(solicitud.email);
  await updateDoc(doc(db, "accessRequests", solicitud.uid), { estado: "aprobada" });
  invalidarCache("admin:");
}

export async function rechazarSolicitud(uid: string) {
  await updateDoc(doc(db, "accessRequests", uid), { estado: "rechazada" });
  invalidarCache("admin:");
}
