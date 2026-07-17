"use client";

import { Check, Pause, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import {
  createTemplate,
  createTemplatesBulk,
  deleteTemplate,
  updateTemplate,
} from "./api";
import { CAPACIDAD_DEFAULT, DIAS_SEMANA } from "./constants";
import type { ClassTemplate } from "./types";

/** Lunes → Domingo, como un calendario. */
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

/** Horarios reales del box como punto de partida de la configuración rápida. */
const HORARIOS_SUGERIDOS = ["06:30", "17:00", "18:00", "19:00"];

// ---------- Diálogo crear / editar una clase del horario ----------

function TemplateDialog({
  template,
  diaInicial,
  onClose,
  onSaved,
}: {
  /** Si viene, es edición; si no, creación. */
  template: ClassTemplate | null;
  diaInicial: number;
  onClose: () => void;
  onSaved: (mensaje: string) => void;
}) {
  const [diaSemana, setDiaSemana] = useState(String(template?.diaSemana ?? diaInicial));
  const [hora, setHora] = useState(template?.hora ?? "");
  const [nombre, setNombre] = useState(template?.nombre ?? "WOD");
  const [capacidad, setCapacidad] = useState(String(template?.capacidad ?? CAPACIDAD_DEFAULT));
  const [saving, setSaving] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  const editando = template !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        diaSemana: Number(diaSemana),
        hora,
        nombre,
        capacidad: Number(capacidad),
      };
      if (editando) {
        await updateTemplate(template.id, data);
        onSaved(`Clase de ${DIAS_SEMANA[data.diaSemana]} ${hora} actualizada ✓`);
      } else {
        await createTemplate({ ...data, activa: true });
        onSaved(`Clase de ${DIAS_SEMANA[data.diaSemana]} ${hora} agregada al horario ✓`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePausar() {
    if (!template) return;
    await updateTemplate(template.id, { activa: !template.activa });
    onSaved(
      template.activa
        ? `Clase de ${DIAS_SEMANA[template.diaSemana]} ${template.hora} pausada — no se generará hasta que la reactives.`
        : `Clase de ${DIAS_SEMANA[template.diaSemana]} ${template.hora} reactivada ✓`
    );
  }

  async function handleEliminar() {
    if (!template) return;
    if (!confirmandoEliminar) {
      setConfirmandoEliminar(true);
      return;
    }
    await deleteTemplate(template.id);
    onSaved(`Clase de ${DIAS_SEMANA[template.diaSemana]} ${template.hora} eliminada del horario.`);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar clase" : "Nueva clase semanal"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "Los cambios aplican a las clases que generes desde ahora; las ya publicadas en el calendario no cambian."
              : "Se repite cada semana ese día y hora, cuando generes las clases."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          {/* Día ocupa toda la fila: los nombres largos ("Miércoles") necesitan
              más ancho del que cabe compartiendo columna con la hora. */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="dia-select">Día</Label>
            <Select value={diaSemana} onValueChange={(v) => setDiaSemana(v ?? "1")}>
              <SelectTrigger id="dia-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDEN_DIAS.map((i) => (
                  <SelectItem key={i} value={String(i)}>
                    {DIAS_SEMANA[i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hora-clase">Hora</Label>
            <Input
              id="hora-clase"
              type="time"
              required
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacidad-clase">Cupos</Label>
            <Input
              id="capacidad-clase"
              type="number"
              min={1}
              required
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="nombre-clase">Nombre</Label>
            <Input
              id="nombre-clase"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="WOD, Halterofilia…"
            />
          </div>

          <Button type="submit" className="col-span-2 h-11 text-base" disabled={saving}>
            {saving ? "Guardando…" : editando ? "Guardar cambios" : "Agregar al horario"}
          </Button>
        </form>

        {editando && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handlePausar}>
              {template.activa ? (
                <>
                  <Pause className="size-4" data-icon="inline-start" />
                  Pausar
                </>
              ) : (
                <>
                  <Check className="size-4" data-icon="inline-start" />
                  Reactivar
                </>
              )}
            </Button>
            <Button type="button" variant="destructive" className="flex-1" onClick={handleEliminar}>
              <Trash2 className="size-4" data-icon="inline-start" />
              {confirmandoEliminar ? "¿Segura? Sí, eliminar" : "Eliminar"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Configuración rápida (primera vez o para rehacer el horario) ----------

function QuickSetupDialog({
  templates,
  onClose,
  onSaved,
}: {
  templates: ClassTemplate[];
  onClose: () => void;
  onSaved: (mensaje: string) => void;
}) {
  const [dias, setDias] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [horas, setHoras] = useState<Set<string>>(new Set(HORARIOS_SUGERIDOS));
  const [horaNueva, setHoraNueva] = useState("");
  const [nombre, setNombre] = useState("WOD");
  const [capacidad, setCapacidad] = useState(String(CAPACIDAD_DEFAULT));
  const [saving, setSaving] = useState(false);

  const existentes = useMemo(
    () => new Set(templates.map((t) => `${t.diaSemana}_${t.hora}`)),
    [templates]
  );

  const horasOrdenadas = [...horas].sort();
  const manana = horasOrdenadas.filter((h) => h < "12:00");
  const tarde = horasOrdenadas.filter((h) => h >= "12:00");

  const nuevas = useMemo(() => {
    const result: { diaSemana: number; hora: string }[] = [];
    for (const dia of dias) {
      for (const hora of horas) {
        if (!existentes.has(`${dia}_${hora}`)) result.push({ diaSemana: dia, hora });
      }
    }
    return result;
  }, [dias, horas, existentes]);

  function toggleDia(dia: number) {
    setDias((prev) => {
      const next = new Set(prev);
      if (next.has(dia)) next.delete(dia);
      else next.add(dia);
      return next;
    });
  }

  function toggleHora(hora: string) {
    setHoras((prev) => {
      const next = new Set(prev);
      if (next.has(hora)) next.delete(hora);
      else next.add(hora);
      return next;
    });
  }

  function agregarHora() {
    if (!horaNueva) return;
    setHoras((prev) => new Set(prev).add(horaNueva));
    setHoraNueva("");
  }

  async function handleCrear() {
    setSaving(true);
    try {
      await createTemplatesBulk(
        nuevas.map((n) => ({
          ...n,
          nombre,
          capacidad: Number(capacidad),
          activa: true,
        }))
      );
      onSaved(`¡Horario listo! Se agregaron ${nuevas.length} clases semanales ✓`);
    } finally {
      setSaving(false);
    }
  }

  function ChipHora({ hora }: { hora: string }) {
    const activa = horas.has(hora);
    return (
      <button
        type="button"
        onClick={() => toggleHora(hora)}
        className={cn(
          "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          activa ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
        )}
      >
        {hora}
      </button>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configura tu horario semanal</DialogTitle>
          <DialogDescription>
            Marca los días y las horas de tus clases; se crea todo el horario de una vez. Después
            puedes ajustar cualquier día tocando su clase.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Días con clases</legend>
          <div className="flex gap-1.5">
            {ORDEN_DIAS.map((dia) => {
              const activo = dias.has(dia);
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleDia(dia)}
                  className={cn(
                    "flex-1 rounded-2xl py-2 text-sm font-medium transition-colors",
                    activo
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {DIAS_SEMANA[dia].slice(0, 2)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Horarios de la mañana</legend>
          <div className="flex flex-wrap gap-1.5">
            {manana.length === 0 && (
              <span className="py-1 text-sm text-muted-foreground">Sin clases de mañana</span>
            )}
            {manana.map((h) => (
              <ChipHora key={h} hora={h} />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Horarios de la tarde</legend>
          <div className="flex flex-wrap gap-1.5">
            {tarde.length === 0 && (
              <span className="py-1 text-sm text-muted-foreground">Sin clases de tarde</span>
            )}
            {tarde.map((h) => (
              <ChipHora key={h} hora={h} />
            ))}
          </div>
        </fieldset>

        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="hora-extra">Agregar otra hora</Label>
            <Input
              id="hora-extra"
              type="time"
              value={horaNueva}
              onChange={(e) => setHoraNueva(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={agregarHora} disabled={!horaNueva}>
            <Plus className="size-4" data-icon="inline-start" />
            Agregar
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre-setup">Nombre de la clase</Label>
            <Input id="nombre-setup" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacidad-setup">Cupos por clase</Label>
            <Input
              id="capacidad-setup"
              type="number"
              min={1}
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
            />
          </div>
        </div>

        <Button
          className="h-11 w-full text-base"
          disabled={saving || nuevas.length === 0}
          onClick={handleCrear}
        >
          {saving
            ? "Creando horario…"
            : nuevas.length === 0
              ? "Elige días y horas"
              : `Crear horario (${nuevas.length} clases semanales)`}
        </Button>
        {nuevas.length > 0 && dias.size > 0 && horas.size > 0 && nuevas.length < dias.size * horas.size && (
          <p className="text-xs text-muted-foreground">
            Las combinaciones que ya existen en tu horario no se duplican.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Vista principal: el horario semanal ----------

export function HorarioSemanal({
  templates,
  onChanged,
}: {
  templates: ClassTemplate[];
  onChanged: () => void;
}) {
  const [editando, setEditando] = useState<ClassTemplate | null>(null);
  const [creandoEnDia, setCreandoEnDia] = useState<number | null>(null);
  const [mostrarSetup, setMostrarSetup] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const sinHorario = templates.length === 0;

  function handleSaved(texto: string) {
    setEditando(null);
    setCreandoEnDia(null);
    setMostrarSetup(false);
    setMensaje(texto);
    onChanged();
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-semibold">Horario semanal</h2>
          <p className="text-xs text-muted-foreground">
            Tus clases fijas de cada semana. Toca una para editarla.
          </p>
        </div>
        {!sinHorario && (
          <Button variant="outline" size="sm" onClick={() => setMostrarSetup(true)}>
            <Sparkles className="size-3.5" data-icon="inline-start" />
            Config. rápida
          </Button>
        )}
      </div>

      {mensaje && (
        <p className="rounded-2xl bg-success/10 px-4 py-2.5 text-sm text-success">{mensaje}</p>
      )}

      {sinHorario ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted/60 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no tienes horario. Configúralo una sola vez — tus clases se repiten cada semana.
          </p>
          <Button className="h-11 text-base" onClick={() => setMostrarSetup(true)}>
            <Sparkles className="size-4" data-icon="inline-start" />
            Configurar mi horario
          </Button>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {ORDEN_DIAS.map((dia) => {
            const delDia = templates
              .filter((t) => t.diaSemana === dia)
              .sort((a, b) => a.hora.localeCompare(b.hora));
            return (
              <div key={dia} className="flex items-start gap-3 py-2.5">
                <span className="w-9 shrink-0 pt-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  {DIAS_SEMANA[dia].slice(0, 3)}
                </span>
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {delDia.length === 0 && (
                    <span className="py-1 text-xs text-muted-foreground/50">Sin clases</span>
                  )}
                  {delDia.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEditando(t)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        t.activa
                          ? "bg-primary-subtle text-primary-dark hover:bg-accent"
                          : "bg-muted text-muted-foreground/60 line-through hover:bg-accent"
                      )}
                    >
                      {t.hora}
                      <span className={cn(!t.activa && "no-underline")}>· {t.nombre}</span>
                      {!t.activa && <Pause className="size-3" />}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Agregar clase el ${DIAS_SEMANA[dia]}`}
                  onClick={() => setCreandoEnDia(dia)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {(editando || creandoEnDia !== null) && (
        <TemplateDialog
          template={editando}
          diaInicial={creandoEnDia ?? editando?.diaSemana ?? 1}
          onClose={() => {
            setEditando(null);
            setCreandoEnDia(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {mostrarSetup && (
        <QuickSetupDialog
          templates={templates}
          onClose={() => setMostrarSetup(false)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
