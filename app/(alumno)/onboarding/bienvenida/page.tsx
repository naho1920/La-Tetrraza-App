"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { markBienvenidaVista, markOnboardingCompleted } from "@/features/auth/approval";

const SLIDES = [
  {
    imagen: "/slide-1.webp",
    texto: "Reserva tus clases, sigue tu progreso y no te pierdas nada de tu box, todo desde una sola app.",
  },
  {
    imagen: "/slide-2.webp",
    texto: "Desbloquea medallas, registra tu peso y lleva el control de tu membresía sin complicarte.",
  },
];

/**
 * Excepción única al design system: fondo blanco y botones negros fijos,
 * sin depender de los tokens de tema (`--primary`, `--foreground`, etc.) ni
 * de dark mode — por eso usa clases con color literal en vez de los
 * componentes compartidos de `components/ui`. No debe reutilizarse fuera de
 * esta ruta.
 */
export default function BienvenidaPage() {
  const { userDoc, refreshUserDoc } = useAuth();
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [enviando, setEnviando] = useState(false);

  if (!userDoc) return null;

  async function handleSiEmpezar() {
    setEnviando(true);
    try {
      await markBienvenidaVista(userDoc!.uid);
      await refreshUserDoc();
      router.replace("/onboarding");
    } finally {
      setEnviando(false);
    }
  }

  async function handleAhoraNo() {
    setEnviando(true);
    try {
      await markBienvenidaVista(userDoc!.uid);
      await markOnboardingCompleted(userDoc!.uid);
      await refreshUserDoc();
      router.replace("/");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white text-black">
      <div className="flex items-center justify-center gap-1.5 pt-8">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 w-8 rounded-full transition-colors ${n <= paso ? "bg-black" : "bg-black/15"}`}
          />
        ))}
      </div>

      {paso < 3 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
          <div className="relative h-64 w-full max-w-xs">
            <Image
              src={SLIDES[paso - 1].imagen}
              alt=""
              fill
              className="object-contain"
              priority={paso === 1}
            />
          </div>
          <p className="max-w-sm text-base text-black/80">{SLIDES[paso - 1].texto}</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
          <h1 className="text-xl font-semibold">¿Quieres llenar ahora tu formulario de datos personales?</h1>
          <p className="max-w-sm text-sm text-black/60">
            Tu coach lo usa para armar tu plan a tu medida. Si prefieres, puedes hacerlo después.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 p-6 pb-10">
        {paso < 3 ? (
          <button
            type="button"
            onClick={() => setPaso((p) => (p === 1 ? 2 : 3) as 1 | 2 | 3)}
            className="h-12 w-full rounded-full bg-black text-base font-medium text-white transition-opacity hover:opacity-90"
          >
            Siguiente
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={enviando}
              onClick={handleSiEmpezar}
              className="h-12 w-full rounded-full bg-black text-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {enviando ? "Un momento…" : "Sí, empezar"}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={handleAhoraNo}
              className="h-12 w-full rounded-full border border-black/20 bg-white text-base font-medium text-black transition-colors hover:bg-black/5 disabled:opacity-50"
            >
              Ahora no
            </button>
          </>
        )}
      </div>
    </div>
  );
}
