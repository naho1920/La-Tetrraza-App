import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
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
}

export async function updatePlan(id: string, data: Partial<Omit<MembershipPlan, "id">>) {
  await updateDoc(doc(db, "membershipPlans", id), data);
}

// ---------- Alumno ----------

export async function getMembershipForUser(uid: string): Promise<Membership | null> {
  const q = query(
    collection(db, "memberships"),
    where("uid", "==", uid),
    orderBy("fechaFin", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? ({ id: first.id, ...(first.data() as Omit<Membership, "id">) }) : null;
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

export async function listAllMembershipsWithAlumno(): Promise<MembershipConAlumno[]> {
  const [membershipsSnap, plans] = await Promise.all([
    getDocs(collection(db, "memberships")),
    listAllPlansAdmin(),
  ]);
  const memberships = membershipsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Membership, "id">),
  }));
  const plansById = Object.fromEntries(plans.map((p) => [p.id, p]));

  const alumnos = await Promise.all(
    memberships.map(async (m) => {
      const snap = await getDoc(doc(db, "users", m.uid));
      return snap.exists() ? (snap.data() as UserDoc) : null;
    })
  );

  return memberships.map((membership, i) => ({
    membership,
    alumno: alumnos[i] ? { uid: alumnos[i]!.uid, nombre: alumnos[i]!.nombre } : null,
    plan: plansById[membership.planId] ?? null,
  }));
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
}

export async function registerPayment(
  membershipId: string,
  uid: string,
  monto: number,
  fecha: string,
  metodo: string,
  notas: string
) {
  await addDoc(collection(db, "payments"), {
    membershipId,
    uid,
    monto,
    fecha,
    metodo,
    notas,
    registradoAt: serverTimestamp(),
  });
}
