"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cancelarReserva, reservarCupo } from "./api";
import { puedeCancelar } from "./date-utils";
import type { ClassSession } from "./types";

export function ClassCard({
  session,
  uid,
  reservada,
}: {
  session: ClassSession;
  uid: string;
  reservada: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelada = session.estado === "cancelada";
  const lleno = session.cuposOcupados >= session.capacidad;
  const cancelableAhora = puedeCancelar(session);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      if (reservada) {
        await cancelarReserva(session.id, uid);
      } else {
        await reservarCupo(session.id, uid);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={cancelada ? "opacity-60" : undefined}>
      <CardContent className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {session.hora} · {session.nombre}
          </p>
          {cancelada ? (
            <Badge variant="destructive">Clase cancelada</Badge>
          ) : (
            <Badge variant={lleno ? "warning" : "default"}>
              {session.cuposOcupados}/{session.capacidad} cupos
            </Badge>
          )}
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>

        {!cancelada && (
          <Button
            size="sm"
            variant={reservada ? "outline" : "default"}
            disabled={loading || (!reservada && lleno) || (reservada && !cancelableAhora)}
            onClick={handleClick}
          >
            {loading ? "…" : reservada ? "Cancelar" : lleno ? "Sin cupo" : "Reservar"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
