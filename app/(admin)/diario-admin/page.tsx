"use client";

import { ChevronLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  createMetric,
  deleteMetric,
  listAllMetricsAdmin,
  secsToDisplay,
  updateMetric,
} from "@/features/diario/api";
import type { AudienciaTag, TrackingMetric, UnidadMetric } from "@/features/diario/types";

// ── Form helpers ───────────────────────────────────────────────────────────────

const AUDIENCIA_OPTIONS: { value: AudienciaTag; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "mujeres", label: "Mujeres" },
  { value: "hombres", label: "Hombres" },
  { value: "principiantes", label: "Principiantes" },
  { value: "avanzados", label: "Avanzados" },
];

interface MetricFormData {
  nombre: string;
  unidad: UnidadMetric;
  umbrales: { bronce: string; plata: string; oro: string };
  orden: string;
  activa: boolean;
  publicadaHoy: boolean;
  audiencia: AudienciaTag[];
}

const EMPTY_FORM: MetricFormData = {
  nombre: "",
  unidad: "kg",
  umbrales: { bronce: "", plata: "", oro: "" },
  orden: "0",
  activa: true,
  publicadaHoy: false,
  audiencia: ["todos"],
};

function parseUmbral(val: string, unidad: UnidadMetric): number {
  if (unidad === "tiempo") {
    const [m, s] = val.split(":").map((v) => parseInt(v || "0", 10));
    return (m || 0) * 60 + (s || 0);
  }
  return parseFloat(val) || 0;
}

function displayUmbral(val: number, unidad: UnidadMetric): string {
  if (unidad === "tiempo") return secsToDisplay(val);
  return String(val);
}

function unidadLabel(unidad: UnidadMetric): string {
  if (unidad === "tiempo") return "mm:ss";
  if (unidad === "kg") return "kg";
  return "reps";
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DiarioAdminPage() {
  const { userDoc } = useAuth();
  const [metrics, setMetrics] = useState<TrackingMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MetricFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await listAllMetricsAdmin();
    setMetrics(data);
    setLoading(false);
  }

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEdit(metric: TrackingMetric) {
    setEditId(metric.id);
    setForm({
      nombre: metric.nombre,
      unidad: metric.unidad,
      umbrales: {
        bronce: displayUmbral(metric.umbrales.bronce, metric.unidad),
        plata: displayUmbral(metric.umbrales.plata, metric.unidad),
        oro: displayUmbral(metric.umbrales.oro, metric.unidad),
      },
      orden: String(metric.orden),
      activa: metric.activa,
      publicadaHoy: metric.publicadaHoy,
      audiencia: metric.audiencia ?? ["todos"],
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userDoc) return;
    setError(null);
    setSaving(true);
    try {
      const data = {
        nombre: form.nombre.trim(),
        unidad: form.unidad,
        direccion:
          form.unidad === "tiempo" ? "menor_es_mejor" : "mayor_es_mejor",
        umbrales: {
          bronce: parseUmbral(form.umbrales.bronce, form.unidad),
          plata: parseUmbral(form.umbrales.plata, form.unidad),
          oro: parseUmbral(form.umbrales.oro, form.unidad),
        },
        activa: form.activa,
        publicadaHoy: form.publicadaHoy,
        audiencia: form.audiencia.length === 0 ? ["todos"] : form.audiencia,
        orden: parseInt(form.orden, 10) || 0,
        creadoPor: userDoc.uid,
      } as Omit<TrackingMetric, "id" | "creadoAt">;

      if (editId) {
        await updateMetric(editId, data);
      } else {
        await createMetric(data);
      }
      setShowForm(false);
      await load();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(
    metric: TrackingMetric,
    field: "activa" | "publicadaHoy"
  ) {
    const updated = { [field]: !metric[field] };
    await updateMetric(metric.id, updated);
    setMetrics((prev) =>
      prev.map((m) => (m.id === metric.id ? { ...m, ...updated } : m))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta métrica?")) return;
    await deleteMetric(id);
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Link
            href="/medallas-admin"
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="font-heading text-xl font-semibold">
            Diario — Métricas
          </h1>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          Nueva
        </Button>
      </header>

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  {editId ? "Editar métrica" : "Nueva métrica"}
                </h2>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-1.5">
                <Label>Nombre del ejercicio</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  placeholder="Ej. Overhead Press"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Unidad</Label>
                <Select
                  value={form.unidad}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      unidad: v as UnidadMetric,
                      umbrales: { bronce: "", plata: "", oro: "" },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                    <SelectItem value="tiempo">Tiempo (mm:ss)</SelectItem>
                    <SelectItem value="reps">Repeticiones</SelectItem>
                  </SelectContent>
                </Select>
                {form.unidad === "tiempo" && (
                  <p className="text-xs text-muted-foreground">
                    Para tiempo: menor = mejor. Bronce es el umbral más fácil.
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">
                  Umbrales ({unidadLabel(form.unidad)})
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["bronce", "plata", "oro"] as const).map((nivel) => (
                    <div key={nivel} className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {nivel}
                      </span>
                      <Input
                        value={form.umbrales[nivel]}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            umbrales: {
                              ...f.umbrales,
                              [nivel]: e.target.value,
                            },
                          }))
                        }
                        placeholder={
                          form.unidad === "tiempo" ? "mm:ss" : "0"
                        }
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={form.orden}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, orden: e.target.value }))
                  }
                  className="w-24"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Audiencia</Label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCIA_OPTIONS.map(({ value, label }) => {
                    const selected = form.audiencia.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          if (value === "todos") {
                            setForm((f) => ({ ...f, audiencia: ["todos"] }));
                          } else {
                            setForm((f) => {
                              const without = f.audiencia.filter(
                                (t) => t !== "todos" && t !== value
                              );
                              const next = selected
                                ? without
                                : [...without, value as AudienciaTag];
                              return {
                                ...f,
                                audiencia: next.length === 0 ? ["todos"] : next,
                              };
                            });
                          }
                        }}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="form-activa">Activa</Label>
                  <Switch
                    id="form-activa"
                    checked={form.activa}
                    onCheckedChange={(v: boolean) => setForm((f) => ({ ...f, activa: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="form-wod">Publicada hoy (WOD)</Label>
                  <Switch
                    id="form-wod"
                    checked={form.publicadaHoy}
                    onCheckedChange={(v: boolean) =>
                      setForm((f) => ({ ...f, publicadaHoy: v }))
                    }
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                <Save className="size-4" />
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Cargando…</p>
      ) : metrics.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay métricas. Crea la primera con el botón de arriba.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {metrics.map((metric) => (
            <Card key={metric.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{metric.nombre}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {metric.unidad}
                      </span>
                      {!metric.activa && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          inactiva
                        </span>
                      )}
                      {metric.publicadaHoy && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          WOD hoy
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      🥉 {displayUmbral(metric.umbrales.bronce, metric.unidad)}{" "}
                      · 🥈 {displayUmbral(metric.umbrales.plata, metric.unidad)}{" "}
                      · 🥇 {displayUmbral(metric.umbrales.oro, metric.unidad)}
                    </p>
                    {metric.audiencia && !metric.audiencia.includes("todos") && (
                      <p className="mt-0.5 text-xs text-primary/70">
                        👥 {metric.audiencia.join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(metric)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(metric.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-6 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`activa-${metric.id}`}
                      checked={metric.activa}
                      onCheckedChange={() => handleToggle(metric, "activa")}
                    />
                    <Label
                      htmlFor={`activa-${metric.id}`}
                      className="cursor-pointer text-sm"
                    >
                      Activa
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`wod-${metric.id}`}
                      checked={metric.publicadaHoy}
                      onCheckedChange={() =>
                        handleToggle(metric, "publicadaHoy")
                      }
                    />
                    <Label
                      htmlFor={`wod-${metric.id}`}
                      className="cursor-pointer text-sm"
                    >
                      WOD hoy
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
