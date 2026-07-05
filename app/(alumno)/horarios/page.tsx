"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { subscribeToUserBookings, subscribeToWeekSessions } from "@/features/reservas/api";
import { ClassCard } from "@/features/reservas/class-card";
import { DIAS_SEMANA } from "@/features/reservas/constants";
import { addDays, getWeekDates, startOfWeek, toISODate } from "@/features/reservas/date-utils";
import type { Booking, ClassSession } from "@/features/reservas/types";

export default function HorariosPage() {
  const { userDoc } = useAuth();
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const weekDates = useMemo(() => getWeekDates(monday), [monday]);
  const desde = toISODate(weekDates[0]);
  const hasta = toISODate(weekDates[6]);

  useEffect(() => {
    return subscribeToWeekSessions(desde, hasta, setSessions);
  }, [desde, hasta]);

  useEffect(() => {
    if (!userDoc) return;
    return subscribeToUserBookings(userDoc.uid, setBookings);
  }, [userDoc]);

  if (!userDoc) return null;

  const reservedSessionIds = new Set(bookings.map((b) => b.sessionId));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setMonday((m) => addDays(m, -7))}>
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-heading text-sm font-medium">
          {weekDates[0].toLocaleDateString("es-EC", { day: "2-digit", month: "short" })} –{" "}
          {weekDates[6].toLocaleDateString("es-EC", { day: "2-digit", month: "short" })}
        </p>
        <Button variant="ghost" size="icon" onClick={() => setMonday((m) => addDays(m, 7))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {weekDates.map((date) => {
        const fechaISO = toISODate(date);
        const sesionesDelDia = sessions.filter((s) => s.fecha === fechaISO);
        if (sesionesDelDia.length === 0) return null;

        return (
          <div key={fechaISO} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-muted-foreground">
              {DIAS_SEMANA[date.getDay()]} {date.getDate()}
            </p>
            <div className="flex flex-col gap-2">
              {sesionesDelDia.map((session) => (
                <ClassCard
                  key={session.id}
                  session={session}
                  uid={userDoc.uid}
                  reservada={reservedSessionIds.has(session.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {sessions.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No hay clases programadas esta semana.
        </p>
      )}
    </div>
  );
}
