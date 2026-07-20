import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { excedeLimite, RESPUESTA_LIMITE } from "@/lib/rate-limit";

const MENSAJES: Record<string, string> = {
  NOT_FOUND: "Este link no existe. Pídele uno nuevo a tu coach.",
  INACTIVE: "Este link fue desactivado por tu coach.",
  EXPIRED: "Este link ya venció. Pídele uno nuevo a tu coach.",
  EXHAUSTED: "Este link ya alcanzó su límite de usos.",
  DISABLED: "Tu acceso fue deshabilitado por tu coach. Contáctala directamente.",
  NO_EMAIL: "Tu cuenta de Google no tiene un correo asociado.",
};

/**
 * Canjea un link de invitación: si es válido, aprueba el correo del usuario
 * ya autenticado con Google. Corre con Firebase Admin SDK (ignora las
 * Security Rules) porque quien llama todavía NO está aprobado — es la única
 * vía por la que alguien sin aprobar puede terminar escribiendo en
 * `approvedEmails`, así que toda la validación vive aquí, server-side.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  if (excedeLimite(`redimir-invite:${decoded.uid}`, 10)) {
    return NextResponse.json(RESPUESTA_LIMITE, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const inviteToken = body?.token;
  if (typeof inviteToken !== "string" || inviteToken.length < 10) {
    return NextResponse.json({ error: "Link inválido." }, { status: 400 });
  }

  const email = (decoded.email ?? "").toLowerCase();
  if (!email) return NextResponse.json({ error: MENSAJES.NO_EMAIL }, { status: 400 });

  const inviteRef = adminDb.collection("inviteLinks").doc(inviteToken);
  const approvedRef = adminDb.collection("approvedEmails").doc(email);

  try {
    await adminDb.runTransaction(async (tx) => {
      const [inviteSnap, approvedSnap] = await Promise.all([tx.get(inviteRef), tx.get(approvedRef)]);

      if (!inviteSnap.exists) throw new Error("NOT_FOUND");
      const invite = inviteSnap.data()!;

      if (invite.activo === false) throw new Error("INACTIVE");

      const expiraAt = invite.expiraAt as Timestamp | undefined;
      if (expiraAt && expiraAt.toMillis() < Date.now()) throw new Error("EXPIRED");

      const usosActuales = invite.usosActuales ?? 0;
      const usosMaximos = invite.usosMaximos ?? 0;

      // Si ya estaba aprobado, no gastamos un uso (reintento inofensivo).
      const yaAprobado = approvedSnap.exists && approvedSnap.data()?.activo !== false;

      // Si la coach lo deshabilitó explícitamente, un link de invitación no
      // puede reactivarlo — evita que alguien use un link filtrado para
      // saltarse un bloqueo intencional.
      if (approvedSnap.exists && approvedSnap.data()?.activo === false) {
        throw new Error("DISABLED");
      }

      if (!yaAprobado && usosActuales >= usosMaximos) throw new Error("EXHAUSTED");

      tx.set(
        approvedRef,
        { agregadoAt: FieldValue.serverTimestamp(), activo: true, viaInvite: inviteToken },
        { merge: true }
      );

      if (!yaAprobado) {
        tx.update(inviteRef, {
          usosActuales: usosActuales + 1,
          usadoPor: FieldValue.arrayUnion(email),
        });
      }
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    return NextResponse.json(
      { error: MENSAJES[code] ?? "No se pudo procesar la invitación. Inténtalo de nuevo." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
