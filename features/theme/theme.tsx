"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { THEME_STORAGE_KEY } from "./init-script";

/**
 * Modo claro/oscuro sin dependencias: la clase `dark` en <html> activa los
 * tokens de globals.css. La preferencia vive en localStorage y, si no hay
 * ninguna guardada, se sigue la del sistema.
 */

function aplicarTema(oscuro: boolean) {
  document.documentElement.classList.toggle("dark", oscuro);
  localStorage.setItem(THEME_STORAGE_KEY, oscuro ? "dark" : "light");
}

/** Botón redondo para el header: alterna entre modo claro y oscuro. */
export function ThemeToggle() {
  const [oscuro, setOscuro] = useState<boolean | null>(null);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function handleToggle() {
    const siguiente = !(oscuro ?? false);
    setOscuro(siguiente);
    aplicarTema(siguiente);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex size-10 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10 transition-colors hover:bg-muted"
    >
      {oscuro ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}
