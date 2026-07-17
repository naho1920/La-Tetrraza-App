"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type PlataformaPWA = "android" | "ios" | null;

function detectarPlataforma(): PlataformaPWA {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent;
  // iOS: iPhone, iPad, iPod — Safari o WebKit
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // Android o escritorio donde corre beforeinstallprompt
  return "android";
}

function yaEstaInstalada(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

/**
 * TASK-071: prompt de instalación PWA.
 * - Android/Desktop: captura el evento `beforeinstallprompt` y muestra un
 *   botón "Instalar" que dispara el diálogo nativo del navegador.
 * - iOS (Safari): no hay `beforeinstallprompt`, así que muestra instrucciones
 *   manuales "Compartir → Añadir a inicio".
 * Se descarta al pulsar ✕ y no vuelve a aparecer en la sesión.
 */
export function InstallPrompt() {
  const [plataforma, setPlataforma] = useState<PlataformaPWA>(null);
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (yaEstaInstalada()) return;

    const p = detectarPlataforma();
    setPlataforma(p);

    if (p === "ios") {
      // En iOS no hay beforeinstallprompt; mostrar instrucciones manuales.
      const dismissido = sessionStorage.getItem("pwa-install-dismissed");
      if (!dismissido) setVisible(true);
      return;
    }

    // Android/Desktop: esperar el evento del navegador.
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => Promise<void> });
      const dismissido = sessionStorage.getItem("pwa-install-dismissed");
      if (!dismissido) setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  function descartar() {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
  }

  async function instalarAndroid() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-card p-4 shadow-xl ring-1 ring-border"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">Instalar La Terraza</p>
          {plataforma === "ios" ? (
            <p className="text-xs text-muted-foreground">
              Toca{" "}
              <span className="inline-flex items-center gap-0.5 font-medium">
                <Share className="inline size-3.5" /> Compartir
              </span>{" "}
              y luego <strong>«Añadir a la pantalla de inicio»</strong> para
              instalar la app sin App Store.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Instala la app para acceder sin internet y recibir notificaciones.
            </p>
          )}
        </div>
        <button
          onClick={descartar}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>

      {plataforma === "android" && deferredPrompt && (
        <Button size="sm" className="mt-3 w-full gap-2" onClick={instalarAndroid}>
          <Download className="size-4" />
          Instalar app
        </Button>
      )}
    </div>
  );
}
