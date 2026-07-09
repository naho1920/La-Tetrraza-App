"use client";

import { Check, Users } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { cancelarReserva, listBookingsForSession, reservarCupo, type BookingConAlumno } from "./api";
import { esClasePasada, puedeCancelar } from "./date-utils";
import type { ClassSession } from "./types";

function AvatarAlumno({ nombre, foto }: { nombre: string; foto: string | null }) {
  if (foto) {
    return (
      <Image
        src={foto}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary">
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Detalle de una clase: cupos, quiénes van y el botón de reservar/cancelar.
 * La misma vista sirve para el alumno; la admin tiene su propio diálogo con
 * el marcado de asistencia.
 */
export function ClassDetailDialog({
  session,
  reservada,
  onClose,
}: {
  session: ClassSession;
  reservada: boolean;
  onClose: () => void;
}) {
  const { userDoc } = useAuth();
  const [inscritos, setInscritos] = useState<BookingConAlumno[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarInscritos = useCallback(() => {
    listBookingsForSession(session.id).then(setInscritos).catch(() => setInscritos([]));
  }, [session.id]);

  useEffect(() => {
    cargarInscritos();
  }, [cargarInscritos]);

  if (!userDoc) return null;

  const cancelada = session.estado === "cancelada";
  const pasada = esClasePasada(session);
  const lleno = session.cuposOcupados >= session.capacidad;
  const cancelableAhora = puedeCancelar(session);
  const fechaLegible = new Date(`${session.fecha}T00:00:00`).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  async function handleAccion() {
    if (!userDoc) return;
    setError(null);
    setLoading(true);
    try {
      if (reservada) {
        await cancelarReserva(session.id, userDoc.uid);
      } else {
        await reservarCupo(session.id, userDoc.uid, {
          nombre: userDoc.nombre,
          foto: userDoc.foto,
        });
      }
      cargarInscritos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {session.hora} · {session.nombre}
          </DialogTitle>
          <DialogDescription className="capitalize">{fechaLegible}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-primary" />
            {session.cuposOcupados} de {session.capacidad} cupos
          </span>
          {cancelada ? (
            <Badge variant="destructive">Cancelada</Badge>
          ) : pasada ? (
            <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
              Vencida
            </Badge>
          ) : lleno ? (
            <Badge variant="warning">Llena</Badge>
          ) : (
            <Badge variant="success">Disponible</Badge>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {pasada ? "Asistencia" : "Van a esta clase"}
          </p>
          {inscritos === null ? (
            <p className="py-2 text-sm text-muted-foreground">Cargando…</p>
          ) : inscritos.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {pasada ? "Nadie se inscribió a esta clase." : "Nadie se ha inscrito todavía. ¡Sé la primera persona! 💪"}
            </p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {inscritos.map(({ booking, alumno }) => {
                const esUsuario = booking.uid === userDoc.uid;
                return (
                  <li
                    key={booking.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm",
                      esUsuario && "bg-primary-subtle"
                    )}
                  >
                    <AvatarAlumno nombre={alumno?.nombre ?? "Alumno"} foto={alumno?.foto ?? null} />
                    <span className="truncate">
                      {esUsuario ? "Tú" : alumno?.nombre ?? "Alumno del box"}
                    </span>
                    {pasada && (
                      <span
                        className={cn(
                          "ml-auto flex size-5 shrink-0 items-center justify-center rounded-full",
                          booking.asistio ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Check className="size-3" />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!pasada && error && <p className="text-sm text-destructive">{error}</p>}
        {!pasada && reservada && !cancelableAhora && !cancelada && (
          <p className="text-xs text-muted-foreground">
            Ya no puedes cancelar: falta menos del límite permitido para esta clase.
          </p>
        )}

        {!cancelada && !pasada && (
          <Button
            className="h-11 w-full text-base"
            variant={reservada ? "outline" : "default"}
            disabled={loading || (!reservada && lleno) || (reservada && !cancelableAhora)}
            onClick={handleAccion}
          >
            {loading
              ? "Un momento…"
              : reservada
                ? "Cancelar mi reserva"
                : lleno
                  ? "Sin cupos"
                  : "Reservar mi cupo"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
