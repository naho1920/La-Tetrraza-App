"use client";

import { CalendarPlus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthCalendar, type DayMarker } from "@/components/ui/month-calendar";
import { cn } from "@/lib/utils";
import {
  type BookingConAlumno,
  cancelSession,
  createOneOffSession,
  generarSesionesParaFechas,
  listBookingsForSession,
  listTemplates,
  marcarAsistencia,
  subscribeToWeekSessions,
} from "@/features/reservas/api";
import { ClassCard } from "@/features/reservas/class-card";
import { CAPACIDAD_DEFAULT, DIAS_SEMANA } from "@/features/reservas/constants";
import { addDays, toISODate } from "@/features/reservas/date-utils";
import { HorarioSemanal } from "@/features/reservas/horario-semanal";
import type { ClassSession, ClassTemplate } from "@/features/reservas/types";

/**
 * Diálogo "Generar clases": la coach marca los días de los próximos 14 y las
 * sesiones se crean a partir de sus plantillas activas para esos días.
 */
function GenerarClasesDialog({
  templates,
  fechasConClases,
  onClose,
}: {
  templates: ClassTemplate[];
  fechasConClases: Set<string>;
  onClose: () => void;
}) {
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const activas = templates.filter((t) => t.activa);
  const clasesPorDiaSemana = useMemo(() => {
    const counts = new Map<number, number>();
    for (const t of activas) counts.set(t.diaSemana, (counts.get(t.diaSemana) ?? 0) + 1);
    return counts;
  }, [activas]);

  const proximosDias = useMemo(() => {
    const hoy = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const fecha = addDays(hoy, i);
      return { fecha, iso: toISODate(fecha) };
    });
  }, []);

  const estimadas = useMemo(
    () =>
      [...seleccionadas].reduce(
        (acc, iso) =>
          acc + (clasesPorDiaSemana.get(new Date(`${iso}T00:00:00`).getDay()) ?? 0),
        0
      ),
    [seleccionadas, clasesPorDiaSemana]
  );

  function toggleDia(iso: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  async function handleGenerar() {
    setGenerando(true);
    setMensaje(null);
    try {
      const creadas = await generarSesionesParaFechas([...seleccionadas].sort());
      setMensaje(
        creadas === 0
          ? "No se creó ninguna clase nueva: esos días ya estaban generados o tus plantillas no tienen clases esos días."
          : `¡Listo! Se crearon ${creadas} clases. Ya se ven en el calendario 💜`
      );
      setSeleccionadas(new Set());
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar clases</DialogTitle>
          <DialogDescription>
            Elige los días y se crean las clases según tus plantillas semanales. Los días con
            punto ya tienen clases generadas.
          </DialogDescription>
        </DialogHeader>

        {activas.length === 0 ? (
          <p className="rounded-2xl bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            Todavía no tienes un horario semanal activo. Configúralo primero en la sección
            &ldquo;Horario semanal&rdquo; de esta pantalla.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5">
              {proximosDias.map(({ fecha, iso }) => {
                const activo = seleccionadas.has(iso);
                const tieneClases = fechasConClases.has(iso);
                const nClases = clasesPorDiaSemana.get(fecha.getDay()) ?? 0;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => toggleDia(iso)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-2xl py-2 text-sm transition-colors",
                      activo
                        ? "bg-foreground font-semibold text-background"
                        : nClases > 0
                          ? "bg-muted hover:bg-accent"
                          : "bg-muted/50 text-muted-foreground/50 hover:bg-muted"
                    )}
                  >
                    <span className="text-[10px] uppercase">
                      {DIAS_SEMANA[fecha.getDay()].slice(0, 3)}
                    </span>
                    <span className="leading-none">{fecha.getDate()}</span>
                    <span
                      className={cn(
                        "text-[9px] leading-tight",
                        activo
                          ? "text-background/70"
                          : tieneClases
                            ? "text-primary"
                            : "text-muted-foreground/60"
                      )}
                    >
                      {tieneClases ? "✓ listo" : nClases > 0 ? `${nClases} clases` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              &ldquo;✓ listo&rdquo; = ese día ya tiene clases publicadas; volver a generarlo no las
              duplica.
            </p>

            {mensaje && <p className="text-sm text-success">{mensaje}</p>}

            <Button
              className="h-11 w-full text-base"
              disabled={generando || seleccionadas.size === 0}
              onClick={handleGenerar}
            >
              {generando
                ? "Generando…"
                : seleccionadas.size === 0
                  ? "Elige al menos un día"
                  : `Publicar ${estimadas} ${estimadas === 1 ? "clase" : "clases"} en ${seleccionadas.size} ${seleccionadas.size === 1 ? "día" : "días"}`}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OneOffSessionCard() {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState(String(CAPACIDAD_DEFAULT));
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMensaje(null);
    try {
      await createOneOffSession({ fecha, hora, nombre, capacidad: Number(capacidad) });
      const legible = new Date(`${fecha}T00:00:00`).toLocaleDateString("es-EC", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      setMensaje(`Clase especial creada para el ${legible} a las ${hora} ✓ — ya está en el calendario.`);
      setFecha("");
      setHora("");
      setNombre("");
      setCapacidad(String(CAPACIDAD_DEFAULT));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Clase especial (una sola fecha)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Para algo fuera del horario fijo — por ejemplo, un sábado de entrenamiento especial.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          {/* Fecha ocupa toda la fila: los selectores nativos de fecha
              necesitan más ancho del que cabe compartiendo columna. */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="fecha-sesion">Fecha</Label>
            <Input id="fecha-sesion" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hora-sesion">Hora</Label>
            <Input id="hora-sesion" type="time" required value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacidad-sesion">Capacidad</Label>
            <Input
              id="capacidad-sesion"
              type="number"
              min={1}
              required
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="nombre-sesion">Nombre de la clase</Label>
            <Input id="nombre-sesion" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <Button type="submit" className="col-span-2 self-end" disabled={saving}>
            {saving ? "Creando…" : "Crear clase especial"}
          </Button>
        </form>
        {mensaje && (
          <p className="mt-3 rounded-2xl bg-success/10 px-4 py-2.5 text-sm text-success">{mensaje}</p>
        )}
      </CardContent>
    </Card>
  );
}

function InscritosDialog({ session, onClose }: { session: ClassSession; onClose: () => void }) {
  const [inscritos, setInscritos] = useState<BookingConAlumno[] | null>(null);
  const cancelada = session.estado === "cancelada";

  useEffect(() => {
    listBookingsForSession(session.id).then(setInscritos);
  }, [session.id]);

  async function handleAsistencia(bookingId: string, asistio: boolean) {
    await marcarAsistencia(bookingId, asistio);
    setInscritos((prev) =>
      prev?.map((item) =>
        item.booking.id === bookingId ? { ...item, booking: { ...item.booking, asistio } } : item
      ) ?? null
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {session.hora} · {session.nombre}
          </DialogTitle>
          <DialogDescription>
            {session.cuposOcupados}/{session.capacidad} cupos
            {cancelada && " · Cancelada"}
          </DialogDescription>
        </DialogHeader>
        {inscritos === null ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : inscritos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie se ha inscrito todavía.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {inscritos.map(({ booking, alumno }) => (
              <li key={booking.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-sm">{alumno?.nombre ?? booking.uid}</span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={booking.asistio === true ? "default" : "outline"}
                    onClick={() => handleAsistencia(booking.id, true)}
                  >
                    Asistió
                  </Button>
                  <Button
                    size="sm"
                    variant={booking.asistio === false ? "destructive" : "outline"}
                    onClick={() => handleAsistencia(booking.id, false)}
                  >
                    Faltó
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!cancelada && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => cancelSession(session.id).then(onClose)}
          >
            Cancelar esta clase
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminClasesPage() {
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toISODate(new Date()));
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [mostrarGenerar, setMostrarGenerar] = useState(false);

  const desde = toISODate(new Date(month.getFullYear(), month.getMonth(), 1));
  const hasta = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0));

  function loadTemplates() {
    listTemplates().then(setTemplates);
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    return subscribeToWeekSessions(desde, hasta, setSessions);
  }, [desde, hasta]);

  const markers = useMemo(() => {
    const result: Record<string, DayMarker> = {};
    for (const session of sessions) {
      if (session.estado === "programada") result[session.fecha] = "has";
    }
    return result;
  }, [sessions]);

  const fechasConClases = useMemo(
    () => new Set(sessions.filter((s) => s.estado === "programada").map((s) => s.fecha)),
    [sessions]
  );

  const sesionesDelDia = sessions
    .filter((s) => s.fecha === selected)
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const seleccionada = sessions.find((s) => s.id === seleccionadaId) ?? null;

  const tituloDia = new Date(`${selected}T00:00:00`).toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex w-full flex-1 flex-col gap-4 p-4 pb-8">
      <h1 className="font-heading text-xl font-semibold">Clases</h1>

      <section className="flex items-center gap-4 rounded-3xl bg-card-dark p-5 text-card-dark-foreground">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/25">
          <Sparkles className="size-5 text-primary-light" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="font-heading text-base font-semibold">Genera tus clases</h2>
          <p className="text-xs text-card-dark-foreground/60">
            Elige los días y se publican según tu horario semanal.
          </p>
        </div>
        <Button
          className="shrink-0 bg-white text-neutral-900 hover:bg-white/90"
          onClick={() => setMostrarGenerar(true)}
        >
          <CalendarPlus className="size-4" data-icon="inline-start" />
          Generar
        </Button>
      </section>

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
          <div className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
            No hay clases publicadas este día. Usa &ldquo;Generar&rdquo; para crearlas desde tu
            horario semanal.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sesionesDelDia.map((session) => (
              <ClassCard
                key={session.id}
                session={session}
                reservada={false}
                onOpen={() => setSeleccionadaId(session.id)}
              />
            ))}
          </div>
        )}
      </div>

      <HorarioSemanal templates={templates} onChanged={loadTemplates} />
      <OneOffSessionCard />

      {seleccionada && (
        <InscritosDialog session={seleccionada} onClose={() => setSeleccionadaId(null)} />
      )}

      {mostrarGenerar && (
        <GenerarClasesDialog
          templates={templates}
          fechasConClases={fechasConClases}
          onClose={() => setMostrarGenerar(false)}
        />
      )}
    </div>
  );
}
