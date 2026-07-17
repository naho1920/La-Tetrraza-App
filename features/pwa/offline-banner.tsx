"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * TASK-075: banner que aparece cuando la app detecta pérdida de conexión.
 * Se oculta automáticamente al recuperar la red.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const markOffline = () => setOffline(true);
    const markOnline = () => setOffline(false);

    // Leer el estado inicial (puede que el componente monte ya sin red).
    setOffline(!navigator.onLine);

    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markOnline);
    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-sm font-medium text-warning"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>Sin conexión — mostrando datos guardados</span>
    </div>
  );
}
