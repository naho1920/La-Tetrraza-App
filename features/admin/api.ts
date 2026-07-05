import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { UserDoc } from "@/features/auth/types";

export interface ApprovedEmail {
  email: string;
  agregadoAt: { toDate: () => Date } | null;
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
