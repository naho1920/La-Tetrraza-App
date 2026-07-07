"use client";

import { ChevronRight, Clock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClassSession } from "./types";

export function ClassCard({
  session,
  reservada,
  onOpen,
}: {
  session: ClassSession;
  reservada: boolean;
  onOpen: () => void;
}) {
  const cancelada = session.estado === "cancelada";
  const lleno = session.cuposOcupados >= session.capacidad;
  const ocupacion = Math.min(1, session.cuposOcupados / session.capacidad);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/60",
        cancelada && "opacity-60"
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl font-heading text-sm font-semibold",
          reservada ? "bg-primary text-primary-foreground" : "bg-primary-subtle text-primary"
        )}
      >
        <Clock className="mb-0.5 size-3.5" />
        {session.hora}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{session.nombre}</span>
          {cancelada ? (
            <Badge variant="destructive">Cancelada</Badge>
          ) : reservada ? (
            <Badge>Reservada</Badge>
          ) : lleno ? (
            <Badge variant="warning">Llena</Badge>
          ) : null}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <span
              className={cn("block h-full rounded-full", lleno ? "bg-warning" : "bg-primary")}
              style={{ width: `${ocupacion * 100}%` }}
            />
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {session.cuposOcupados}/{session.capacidad}
          </span>
        </span>
      </span>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
