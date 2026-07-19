"use client";

import { useEffect, useState } from "react";

import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLatestWeightLog, getUserDoc, type WeightLog } from "@/features/perfil/api";
import { listFormsByEstado, marcarEnRevision, subirPlan } from "@/features/nutricion/api";
import { PASOS_NUTRICION } from "@/features/nutricion/questions";
import type { EstadoNutricion, NutritionForm } from "@/features/nutricion/types";
import type { UserDoc } from "@/features/auth/types";

function SubirPlanForm({ form, onSubido }: { form: NutritionForm; onSubido: () => void }) {
  const [notas, setNotas] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    try {
      await subirPlan(form.uid, form.id, notas, archivo);
      onSubido();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el plan.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold">
        {form.estado === "plan_enviado" ? "Subir una nueva versión del plan" : "Subir plan alimenticio"}
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notas-plan">Notas para el alumno (opcional)</Label>
        <Textarea id="notas-plan" value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="archivo-plan">PDF del plan</Label>
        <input
          id="archivo-plan"
          type="file"
          accept="application/pdf"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={subiendo || !archivo}>
        {subiendo ? "Subiendo…" : "Enviar plan"}
      </Button>
    </form>
  );
}

const FILTROS: { estado: EstadoNutricion; label: string }[] = [
  { estado: "pendiente", label: "Pendientes" },
  { estado: "en_revision", label: "En revisión" },
  { estado: "plan_enviado", label: "Enviados" },
];

function FormularioDialog({ form, onClose }: { form: NutritionForm; onClose: () => void }) {
  const [alumno, setAlumno] = useState<UserDoc | null>(null);
  const [peso, setPeso] = useState<WeightLog | null>(null);

  useEffect(() => {
    getUserDoc(form.uid).then(setAlumno);
    getLatestWeightLog(form.uid).then(setPeso);
    marcarEnRevision(form);
  }, [form]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{alumno?.nombre ?? "Alumno"}</DialogTitle>
        </DialogHeader>

        {alumno && (
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Estatura</span>
            <span>{alumno.estaturaCm ? `${alumno.estaturaCm} cm` : "—"}</span>
            <span className="text-muted-foreground">Peso actual</span>
            <span>{peso ? `${peso.pesoKg} kg` : "—"}</span>
            <span className="text-muted-foreground">Lesiones</span>
            <span>{alumno.lesiones?.join(", ") || "—"}</span>
            <span className="text-muted-foreground">Alergias</span>
            <span>{alumno.alergias?.join(", ") || "—"}</span>
          </div>
        )}

        <SubirPlanForm form={form} onSubido={onClose} />

        <div className="flex flex-col gap-4">
          {PASOS_NUTRICION.map((paso) => (
            <div key={paso.paso} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-primary-dark dark:text-primary-light">
                {paso.titulo}
              </p>
              {paso.preguntas.map((pregunta) => (
                <div key={pregunta.key} className="text-sm">
                  <p className="text-muted-foreground">{pregunta.label}</p>
                  <p>{form.respuestas[pregunta.key] || "—"}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminNutricionPage() {
  const [filtro, setFiltro] = useState<EstadoNutricion>("pendiente");
  const [forms, setForms] = useState<NutritionForm[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState<NutritionForm | null>(null);

  function cargar() {
    setCargando(true);
    listFormsByEstado(filtro)
      .then(setForms)
      .finally(() => setCargando(false));
  }

  useEffect(cargar, [filtro]);

  function handleCloseDialog() {
    setSeleccionado(null);
    cargar();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center gap-3 py-2">
        <h1 className="font-heading text-xl font-semibold">Nutrición</h1>
      </header>

      <SegmentedTabs
        value={filtro}
        onChange={setFiltro}
        options={FILTROS.map(({ estado, label }) => ({ value: estado, label }))}
      />

      <Card>
        <CardContent>
          {cargando ? (
            <div className="flex flex-col gap-2 py-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : forms.length === 0 ? (
            <EmptyState icon={ClipboardList} message="No hay formularios en esta categoría." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {forms.map((form) => (
                <li key={form.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm"
                    onClick={() => setSeleccionado(form)}
                  >
                    <span>{form.respuestas.nombre || form.uid}</span>
                    <Badge>v{form.version}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {seleccionado && <FormularioDialog form={seleccionado} onClose={handleCloseDialog} />}
    </div>
  );
}
