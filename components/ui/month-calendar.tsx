"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type DayMarker = "has" | "own";

const DIAS_CORTOS = ["L", "M", "X", "J", "V", "S", "D"];

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Lunes de la semana que contiene `date`. */
function mondayOf(date: Date): Date {
  const result = new Date(date);
  const dia = result.getDay();
  result.setDate(result.getDate() + (dia === 0 ? -6 : 1 - dia));
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Calendario mensual (semana inicia lunes). Los días con actividad se marcan
 * con un punto: "has" (hay clases) u "own" (el usuario tiene reserva ese día).
 */
export function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  markers = {},
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  selected: string | null;
  onSelect: (iso: string) => void;
  markers?: Record<string, DayMarker>;
}) {
  const hoyISO = toISO(new Date());
  const primerDia = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);

  const semanas = useMemo(() => {
    const inicio = mondayOf(primerDia);
    const result: Date[][] = [];
    let cursor = inicio;
    do {
      result.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
      cursor = addDays(cursor, 7);
    } while (cursor.getMonth() === primerDia.getMonth());
    return result;
  }, [primerDia]);

  const titulo = primerDia.toLocaleDateString("es-EC", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mes anterior"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-heading text-sm font-semibold capitalize">{titulo}</p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mes siguiente"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
        {DIAS_CORTOS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {semanas.flat().map((date) => {
          const iso = toISO(date);
          const delMes = date.getMonth() === month.getMonth();
          const activo = selected === iso;
          const esHoy = iso === hoyISO;
          const marker = markers[iso];

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                "mx-auto flex size-11 flex-col items-center justify-center rounded-full text-sm transition-colors",
                activo
                  ? "bg-foreground font-semibold text-background"
                  : cn(
                      "hover:bg-muted",
                      delMes ? "text-foreground" : "text-muted-foreground/40",
                      esHoy && "font-semibold text-primary"
                    )
              )}
            >
              <span className="leading-none">{date.getDate()}</span>
              <span
                className={cn(
                  "mt-1 size-1.5 rounded-full",
                  !marker && "bg-transparent",
                  marker === "has" && (activo ? "bg-background/50" : "bg-primary/35"),
                  marker === "own" && (activo ? "bg-background" : "bg-primary")
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
