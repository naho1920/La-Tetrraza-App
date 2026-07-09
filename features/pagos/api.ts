import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
import type { EstadoPago, PaymentReport } from "./types";

async function authHeader(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token ?? ""}` };
}

export async function reportarPago(nota: string, archivo: File | null) {
  const body = new FormData();
  body.set("nota", nota);
  if (archivo) body.set("archivo", archivo);

  const res = await fetch("/api/pagos/reportar", {
    method: "POST",
    headers: await authHeader(),
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo reportar el pago.");
  return data as { ok: true; reportId: string };
}

export async function obtenerUrlComprobante(archivoPath: string): Promise<string> {
  const res = await fetch(`/api/pagos/ver-comprobante?path=${encodeURIComponent(archivoPath)}`, {
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo abrir el comprobante.");
  return data.url as string;
}

export async function getReportsForUser(uid: string): Promise<PaymentReport[]> {
  const q = query(collection(db, "paymentReports"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentReport, "id">) }));
}

// ---------- Admin ----------

export async function listReportsByEstado(estado: EstadoPago): Promise<PaymentReport[]> {
  const q = query(
    collection(db, "paymentReports"),
    where("estado", "==", estado),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentReport, "id">) }));
}

export async function marcarRevisado(report: PaymentReport, adminUid: string) {
  await updateDoc(doc(db, "paymentReports", report.id), {
    estado: "revisado",
    revisadoPor: adminUid,
    revisadoAt: serverTimestamp(),
  });
}
