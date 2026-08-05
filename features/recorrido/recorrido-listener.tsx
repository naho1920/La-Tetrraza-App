"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { markRecorridoVisto } from "@/features/auth/approval";
import { necesitaRecorrido } from "@/features/auth/onboarding-status";
import { onIniciarRecorrido } from "./api";

// Se descarga solo cuando el recorrido realmente va a correr: quien ya lo vio
// o lo rechazó no paga ni un KB extra.
const RecorridoOverlay = dynamic(
  () => import("./recorrido-overlay").then((m) => m.RecorridoOverlay),
  { ssr: false }
);

/**
 * Decide si el recorrido guiado corre. Va montado en el layout raíz porque
 * `app/page.tsx` (el Home) vive fuera del grupo `(alumno)`: montarlo en el
 * layout de alumno dejaría el Home afuera y desmontaría el recorrido al
 * navegar de `/` a `/horarios`.
 *
 * Mismo patrón que `features/medallas/celebration-listener.tsx`.
 */
export function RecorridoListener() {
  const { status, userDoc, refreshUserDoc } = useAuth();
  // "oferta" = primera vez, se pregunta antes. "directo" = lo pidió desde Perfil.
  const [modo, setModo] = useState<"oferta" | "directo" | null>(null);
  // Evita que se reabra si `userDoc` cambia de identidad antes de que la
  // escritura de `recorridoVisto` haya llegado.
  const yaOfrecido = useRef(false);

  useEffect(() => {
    if (status !== "ready" || yaOfrecido.current) return;
    if (!necesitaRecorrido(userDoc)) return;
    yaOfrecido.current = true;
    setModo("oferta");
  }, [status, userDoc]);

  useEffect(() => onIniciarRecorrido(() => setModo("directo")), []);

  async function handleCerrar() {
    setModo(null);
    // Se marca visto tanto al terminarlo como al saltarlo o rechazarlo.
    if (userDoc && userDoc.recorridoVisto !== true) {
      await markRecorridoVisto(userDoc.uid);
      await refreshUserDoc();
    }
  }

  if (!modo) return null;

  return <RecorridoOverlay conOferta={modo === "oferta"} onCerrar={handleCerrar} />;
}
