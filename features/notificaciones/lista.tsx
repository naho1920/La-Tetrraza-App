"use client";

import {
  ArrowLeft,
  Award,
  BellOff,
  CalendarX,
  ChevronRight,
  MapPin,
  UserPlus,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/features/auth/AuthProvider";
import { getNotificaciones, type IconoNotificacion, type Notificacion } from "./api";

const ICONOS: Record<IconoNotificacion, { icon: LucideIcon; clase: string }> = {
  acceso: { icon: UserPlus, clase: "bg-primary-subtle text-primary" },
  medalla: { icon: Award, clase: "bg-accent-gold/15 text-accent-gold" },
  nutricion: { icon: UtensilsCrossed, clase: "bg-success/10 text-success" },
  pin: { icon: MapPin, clase: "bg-primary-subtle text-primary" },
  membresia: { icon: Wallet, clase: "bg-warning/15 text-warning" },
  clase: { icon: CalendarX, clase: "bg-destructive/10 text-destructive" },
};

function tiempoRelativo(fecha: Date | null): string | null {
  if (!fecha) return null;
  const dias = Math.floor((Date.now() - fecha.getTime()) / (24 * 60 * 60 * 1000));
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  return fecha.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
}

/** Bandeja de notificaciones; funciona para ambos roles según el userDoc. */
export function ListaNotificaciones() {
  const { userDoc } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Notificacion[] | null>(null);

  useEffect(() => {
    if (!userDoc) return;
    let ignore = false;
    getNotificaciones(userDoc)
      .then((data) => {
        if (!ignore) setItems(data);
      })
      .catch(() => {
        if (!ignore) setItems([]);
      });
    return () => {
      ignore = true;
    };
  }, [userDoc]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center gap-3 py-2">
        <button
          type="button"
          aria-label="Volver"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10 transition-colors active:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-heading text-xl font-semibold">Notificaciones</h1>
      </header>

      {items === null ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          message="Estás al día — no tienes notificaciones pendientes 🎉"
          className="rounded-3xl bg-card px-6 py-12 ring-1 ring-foreground/10"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => {
            const { icon: Icon, clase } = ICONOS[n.icono];
            const tiempo = tiempoRelativo(n.fecha);
            return (
              <Link
                key={n.id}
                href={n.href}
                className="flex items-center gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/60"
              >
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${clase}`}>
                  <Icon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{n.titulo}</span>
                    {tiempo && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">{tiempo}</span>
                    )}
                  </span>
                  {n.detalle && (
                    <span className="truncate text-xs text-muted-foreground">{n.detalle}</span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
