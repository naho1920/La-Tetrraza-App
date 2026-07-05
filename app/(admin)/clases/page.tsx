"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type BookingConAlumno,
  cancelSession,
  createOneOffSession,
  createTemplate,
  generarSesionesDesdePlantillas,
  listBookingsForSession,
  listTemplates,
  marcarAsistencia,
  subscribeToWeekSessions,
  toggleTemplateActiva,
} from "@/features/reservas/api";
import { CAPACIDAD_DEFAULT, DIAS_SEMANA } from "@/features/reservas/constants";
import { addDays, toISODate } from "@/features/reservas/date-utils";
import type { ClassSession, ClassTemplate } from "@/features/reservas/types";

function TemplatesCard({ templates, onChanged }: { templates: ClassTemplate[]; onChanged: () => void }) {
  const [diaSemana, setDiaSemana] = useState("1");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState(String(CAPACIDAD_DEFAULT));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createTemplate({
        diaSemana: Number(diaSemana),
        hora,
        nombre,
        capacidad: Number(capacidad),
        activa: true,
      });
      setHora("");
      setNombre("");
      setCapacidad(String(CAPACIDAD_DEFAULT));
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plantillas semanales</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Día</Label>
            <Select value={diaSemana} onValueChange={(v) => setDiaSemana(v ?? "1")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAS_SEMANA.map((label, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hora-template">Hora</Label>
            <Input id="hora-template" type="time" required value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="nombre-template">Nombre de la clase</Label>
            <Input
              id="nombre-template"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="WOD, Halterofilia…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacidad-template">Capacidad</Label>
            <Input
              id="capacidad-template"
              type="number"
              min={1}
              required
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
            />
          </div>
          <Button type="submit" className="col-span-2 self-end" disabled={saving}>
            {saving ? "Agregando…" : "Agregar plantilla"}
          </Button>
        </form>

        <ul className="flex flex-col divide-y divide-border">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">
                {DIAS_SEMANA[t.diaSemana]} {t.hora} · {t.nombre} ({t.capacidad})
              </span>
              <Button
                size="sm"
                variant={t.activa ? "outline" : "secondary"}
                onClick={() => toggleTemplateActiva(t.id, !t.activa).then(onChanged)}
              >
                {t.activa ? "Desactivar" : "Activar"}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function OneOffSessionCard({ onCreated }: { onCreated: () => void }) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState(String(CAPACIDAD_DEFAULT));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createOneOffSession({ fecha, hora, nombre, capacidad: Number(capacidad) });
      setFecha("");
      setHora("");
      setNombre("");
      setCapacidad(String(CAPACIDAD_DEFAULT));
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agregar clase puntual</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fecha-sesion">Fecha</Label>
            <Input id="fecha-sesion" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hora-sesion">Hora</Label>
            <Input id="hora-sesion" type="time" required value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="nombre-sesion">Nombre de la clase</Label>
            <Input id="nombre-sesion" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
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
          <Button type="submit" className="col-span-2 self-end" disabled={saving}>
            {saving ? "Creando…" : "Crear clase"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function InscritosDialog({ session, onClose }: { session: ClassSession; onClose: () => void }) {
  const [inscritos, setInscritos] = useState<BookingConAlumno[] | null>(null);

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
      </DialogContent>
    </Dialog>
  );
}

export default function AdminClasesPage() {
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [seleccionada, setSeleccionada] = useState<ClassSession | null>(null);
  const [generando, setGenerando] = useState(false);
  const [mensajeGeneracion, setMensajeGeneracion] = useState<string | null>(null);

  function loadTemplates() {
    listTemplates().then(setTemplates);
  }

  async function handleGenerarSesiones() {
    setGenerando(true);
    setMensajeGeneracion(null);
    try {
      const creadas = await generarSesionesDesdePlantillas(7);
      setMensajeGeneracion(
        creadas === 0
          ? "No había sesiones nuevas por crear (ya estaban generadas)."
          : `Se crearon ${creadas} sesiones nuevas.`
      );
    } finally {
      setGenerando(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    const desde = toISODate(new Date());
    const hasta = toISODate(addDays(new Date(), 13));
    return subscribeToWeekSessions(desde, hasta, setSessions);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      <Card>
        <CardHeader>
          <CardTitle>Generar sesiones de la semana</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Crea las clases de los próximos 7 días a partir de tus plantillas activas. Puedes
            correrlo cuantas veces quieras: no duplica ni borra reservas ya hechas.
          </p>
          <Button disabled={generando} onClick={handleGenerarSesiones}>
            {generando ? "Generando…" : "Generar próximos 7 días"}
          </Button>
          {mensajeGeneracion && <p className="text-sm text-success">{mensajeGeneracion}</p>}
        </CardContent>
      </Card>

      <TemplatesCard templates={templates} onChanged={loadTemplates} />
      <OneOffSessionCard onCreated={() => {}} />

      <Card>
        <CardHeader>
          <CardTitle>Próximas clases</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay clases programadas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {sessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-3 py-2.5">
                  <button
                    className="flex-1 text-left text-sm"
                    onClick={() => setSeleccionada(session)}
                  >
                    {session.fecha} · {session.hora} — {session.nombre}
                    <Badge
                      className="ml-2"
                      variant={session.estado === "cancelada" ? "destructive" : "default"}
                    >
                      {session.estado === "cancelada"
                        ? "Cancelada"
                        : `${session.cuposOcupados}/${session.capacidad}`}
                    </Badge>
                  </button>
                  {session.estado === "programada" && (
                    <Button size="sm" variant="ghost" onClick={() => cancelSession(session.id)}>
                      Cancelar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {seleccionada && (
        <InscritosDialog session={seleccionada} onClose={() => setSeleccionada(null)} />
      )}
    </div>
  );
}
