"use client";

import { useEffect, useMemo, useState } from "react";

import { CalendarOff } from "lucide-react";

import { MonthCalendar, type DayMarker } from "@/components/ui/month-calendar";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { subscribeToUserBookings, subscribeToWeekSessions } from "@/features/reservas/api";
import { ClassCard } from "@/features/reservas/class-card";
import { ClassDetailDialog } from "@/features/reservas/class-detail-dialog";
import { toISODate } from "@/features/reservas/date-utils";
import type { Booking, ClassSession } from "@/features/reservas/types";

export default function HorariosPage() {
  const { userDoc } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toISODate(new Date()));
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const desde = toISODate(new Date(month.getFullYear(), month.getMonth(), 1));
  const hasta = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0));

  useEffect(() => {
    return subscribeToWeekSessions(desde, hasta, setSessions);
  }, [desde, hasta]);

  // Re-renderiza cada minuto para que una clase pase a "Vencida" en pantalla
  // sin que el alumno tenga que recargar la página.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userDoc) return;
    return subscribeToUserBookings(userDoc.uid, setBookings);
  }, [userDoc]);

  const reservedSessionIds = useMemo(
    () => new Set(bookings.map((b) => b.sessionId)),
    [bookings]
  );

  const markers = useMemo(() => {
    const result: Record<string, DayMarker> = {};
    for (const session of sessions) {
      if (session.estado !== "programada") continue;
      if (reservedSessionIds.has(session.id)) {
        result[session.fecha] = "own";
      } else if (result[session.fecha] !== "own") {
        result[session.fecha] = "has";
      }
    }
    return result;
  }, [sessions, reservedSessionIds]);

  if (!userDoc) return <PageSkeleton />;

  const sesionesDelDia = sessions
    .filter((s) => s.fecha === selected)
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const abierta = sessions.find((s) => s.id === abiertaId) ?? null;

  const tituloDia = new Date(`${selected}T00:00:00`).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <h1 className="font-heading text-xl font-semibold">Horarios</h1>

      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onSelect={setSelected}
        markers={markers}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold capitalize text-muted-foreground">{tituloDia}</p>

        {sesionesDelDia.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <CalendarOff className="size-5 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">No hay clases este día. Elige un día con punto morado 💜</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sesionesDelDia.map((session) => (
              <ClassCard
                key={session.id}
                session={session}
                reservada={reservedSessionIds.has(session.id)}
                onOpen={() => setAbiertaId(session.id)}
              />
            ))}
          </div>
        )}
      </div>

      {abierta && (
        <ClassDetailDialog
          session={abierta}
          reservada={reservedSessionIds.has(abierta.id)}
          onClose={() => setAbiertaId(null)}
        />
      )}
    </div>
  );
}
