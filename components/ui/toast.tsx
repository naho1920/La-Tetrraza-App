"use client";

import { CheckCircle, Info, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  mensaje: string;
  variant: ToastVariant;
}

// Singleton sencillo para emitir toasts desde cualquier parte sin contexto.
type ToastListener = (item: ToastItem) => void;
const listeners = new Set<ToastListener>();

/**
 * TASK-081: muestra un toast que se auto-descarta después de 4 s.
 * Reemplaza los mensajes de éxito inline que se quedaban pegados en las
 * páginas de admin (horario-semanal, clases, medallas-admin).
 */
export function toast(mensaje: string, variant: ToastVariant = "success") {
  const item: ToastItem = { id: Math.random().toString(36).slice(2), mensaje, variant };
  listeners.forEach((fn) => fn(item));
}

const ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const CLASES: Record<ToastVariant, string> = {
  success: "bg-success/10 text-success-dark ring-success/30",
  error: "bg-destructive/10 text-destructive ring-destructive/30",
  info: "bg-primary/10 text-primary-dark dark:text-primary-light ring-primary/30",
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(onClose, 4000);
    return () => clearTimeout(timerRef.current);
  }, [onClose]);

  const Icon = ICONS[item.variant];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1",
        CLASES[item.variant],
      )}
    >
      <Icon className="size-4.5 shrink-0" />
      <span className="flex-1">{item.mensaje}</span>
      <button
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="ml-1 shrink-0 rounded-full p-0.5 opacity-60 hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Renderiza la pila de toasts activos. Colócalo en el layout raíz o en el
 * layout de la sección que necesite toasts.
 */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler: ToastListener = (item) =>
      setItems((prev) => [...prev.slice(-4), item]); // máximo 5 toasts
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  function remove(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  if (items.length === 0) return null;

  return (
    <div
      aria-label="Notificaciones"
      className="fixed bottom-24 left-4 right-4 z-50 mx-auto flex max-w-md flex-col gap-2"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onClose={() => remove(item.id)} />
      ))}
    </div>
  );
}
