import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { listActivatedUsers } from "@/features/admin/api";
import { conCache, invalidarCache } from "@/lib/cache";
import { db } from "@/lib/firebase/client";
import { getCountFromServer, getDoc, getDocs } from "@/lib/firestore-safe";
import type { UserDoc } from "@/features/auth/types";
import type { Membership, MembershipPlan, Payment } from "./types";

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------- Planes ----------

export async function listActivePlans(): Promise<MembershipPlan[]> {
  const snap = await getDocs(query(collection(db, "membershipPlans"), where("activo", "==", true)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MembershipPlan, "id">) }));
}

export async function listAllPlansAdmin(): Promise<MembershipPlan[]> {
  const snap = await getDocs(collection(db, "membershipPlans"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MembershipPlan, "id">) }));
}

export async function getPlan(id: string): Promise<MembershipPlan | null> {
  const snap = await getDoc(doc(db, "membershipPlans", id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<MembershipPlan, "id">) }) : null;
}

export async function createPlan(plan: Omit<MembershipPlan, "id">) {
  await addDoc(collection(db, "membershipPlans"), plan);
  invalidarCache("membresias:");
}

export async function updatePlan(id: string, data: Partial<Omit<MembershipPlan, "id">>) {
  await updateDoc(doc(db, "membershipPlans", id), data);
  invalidarCache("membresias:");
}

/** Cuántas membresías (históricas o vigentes) usan este plan — para avisar antes de eliminarlo. */
export async function contarMembresiasConPlan(planId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, "memberships"), where("planId", "==", planId))
  );
  return snap.data().count;
}

/**
 * Elimina el plan del catálogo. Las membresías que ya lo usaron NO se tocan
 * (no se borra el historial de nadie) — solo dejan de poder mostrar el
 * nombre/precio del plan si alguien lo consulta después, por eso
 * `contarMembresiasConPlan` existe para avisar antes de esta acción.
 */
export async function deletePlan(id: string) {
  await deleteDoc(doc(db, "membershipPlans", id));
  invalidarCache("membresias:");
}

// ---------- Alumno ----------

// Cacheada porque el Home del alumno y la campanita de notificaciones la piden
// en paralelo al montarse juntas.
export async function getMembershipForUser(uid: string): Promise<Membership | null> {
  return conCache(`membresias:del-alumno-${uid}`, async () => {
    const q = query(
      collection(db, "memberships"),
      where("uid", "==", uid),
      orderBy("fechaFin", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);
    const first = snap.docs[0];
    return first ? ({ id: first.id, ...(first.data() as Omit<Membership, "id">) }) : null;
  });
}

export async function listPaymentsForUser(uid: string): Promise<Payment[]> {
  const q = query(collection(db, "payments"), where("uid", "==", uid), orderBy("fecha", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Payment, "id">) }));
}

// ---------- Admin ----------

export interface MembershipConAlumno {
  membership: Membership;
  alumno: Pick<UserDoc, "uid" | "nombre"> | null;
  plan: MembershipPlan | null;
}

/**
 * Antes esto hacía un `getDoc` a `users` por CADA membresía (N+1): con 200
 * membresías eran 202 peticiones, y como `assignMembership` crea un doc nuevo
 * en cada renovación sin cerrar el anterior, un alumno con 12 renovaciones se
 * leía 12 veces. Se ejecutaba tres veces por pantalla en el Home de la coach.
 *
 * Ahora reutiliza `listActivatedUsers()` — que ya está cacheada y compartida
 * con el resto de las pantallas admin — así que el N+1 desaparece por completo
 * en vez de solo reducirse.
 */
export async function listAllMembershipsWithAlumno(): Promise<MembershipConAlumno[]> {
  return conCache("membresias:todas-con-alumno", async () => {
    const [membershipsSnap, plans, alumnos] = await Promise.all([
      getDocs(collection(db, "memberships")),
      listAllPlansAdmin(),
      listActivatedUsers(),
    ]);
    const memberships = membershipsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Membership, "id">),
    }));
    const plansById = Object.fromEntries(plans.map((p) => [p.id, p]));
    const alumnosPorUid = new Map(alumnos.map((a) => [a.uid, a]));

    return memberships.map((membership) => {
      const alumno = alumnosPorUid.get(membership.uid);
      return {
        membership,
        alumno: alumno ? { uid: alumno.uid, nombre: alumno.nombre } : null,
        plan: plansById[membership.planId] ?? null,
      };
    });
  });
}

export async function assignMembership(uid: string, planId: string, fechaInicioISO: string, duracionDias: number) {
  const inicio = new Date(`${fechaInicioISO}T00:00:00`);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + duracionDias);

  await addDoc(collection(db, "memberships"), {
    uid,
    planId,
    fechaInicio: fechaInicioISO,
    fechaFin: toISODate(fin),
  });
  invalidarCache("membresias:");
}

/**
 * Registra el pago Y renueva la membresía por la duración del mismo plan que
 * ya tenía — antes solo quedaba el registro histórico del pago sin tocar la
 * membresía, así que un alumno que ya pagó seguía apareciendo como "por
 * vencer" o "vencida" hasta que alguien le asignara un plan nuevo a mano.
 *
 * Sigue el mismo patrón que ya usa `assignMembership` (una membresía nueva
 * por cada período, en vez de editar `fechaFin` en la existente — ver el
 * comentario en `listAllMembershipsWithAlumno`). Extiende desde el
 * vencimiento actual si todavía no venció, o desde hoy si ya venció, para
 * que la renovación nunca regale ni le quite días al alumno.
 */
export async function registerPayment(
  membershipId: string,
  uid: string,
  monto: number,
  fecha: string,
  metodo: string,
  notas: string
) {
  const membershipSnap = await getDoc(doc(db, "memberships", membershipId));
  const membership = membershipSnap.data() as Omit<Membership, "id"> | undefined;
  if (!membership) throw new Error("Esta membresía ya no existe.");

  const plan = await getPlan(membership.planId);
  if (!plan) throw new Error("El plan de esta membresía ya no existe.");

  const hoy = toISODate(new Date());
  const fechaInicioRenovacion = membership.fechaFin > hoy ? membership.fechaFin : hoy;

  await Promise.all([
    addDoc(collection(db, "payments"), {
      membershipId,
      uid,
      monto,
      fecha,
      metodo,
      notas,
      registradoAt: serverTimestamp(),
    }),
    assignMembership(uid, plan.id, fechaInicioRenovacion, plan.duracionDias),
  ]);
}
