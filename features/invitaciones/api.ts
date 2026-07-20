import {
  Timestamp,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { InviteLink } from "./types";

/** Token de 192 bits (24 bytes) en base64url — imposible de adivinar por fuerza bruta. */
function generarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function crearInviteLink(
  adminUid: string,
  diasValidez: number,
  usosMaximos: number,
  nota: string
): Promise<string> {
  const token = generarToken();
  const expiraAt = Timestamp.fromDate(new Date(Date.now() + diasValidez * 24 * 60 * 60 * 1000));

  await setDoc(doc(db, "inviteLinks", token), {
    creadoPor: adminUid,
    creadoAt: serverTimestamp(),
    expiraAt,
    usosMaximos,
    usosActuales: 0,
    activo: true,
    nota: nota.trim(),
    usadoPor: [],
  });

  return token;
}

export async function listInviteLinks(): Promise<InviteLink[]> {
  const snap = await getDocs(query(collection(db, "inviteLinks"), orderBy("creadoAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InviteLink, "id">) }));
}

export async function revocarInviteLink(token: string) {
  await updateDoc(doc(db, "inviteLinks", token), { activo: false });
}
