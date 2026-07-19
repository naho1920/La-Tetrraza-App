"use client";

import { Check, Clock, Dumbbell, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  addActivityLog,
  checkAndGrantAchievements,
  deleteActivityLog,
  listActiveMetrics,
  listLogsForUser,
  secsToDisplay,
  updateActivityLog,
} from "@/features/diario/api";
import type {
  ActivityLog,
  AudienciaTag,
  DiarioAchievement,
  NivelDiario,
  TrackingMetric,
} from "@/features/diario/types";
import type { UserDoc } from "@/features/auth/types";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
  });
}

function metricVisiblePara(metric: TrackingMetric, user: UserDoc): boolean {
  const audiencia: AudienciaTag[] = metric.audiencia ?? ["todos"];
  if (audiencia.includes("todos")) return true;
  for (const tag of audiencia) {
    if (tag === "mujeres" && user.sexo !== null && user.sexo !== "femenino") return false;
    if (tag === "hombres" && user.sexo !== null && user.sexo !== "masculino") return false;
    if (tag === "principiantes" && user.nivel != null && user.nivel !== "principiante") return false;
    if (tag === "avanzados" && user.nivel != null && user.nivel !== "avanzado") return false;
  }
  return true;
}

function unidadLabel(unidad: TrackingMetric["unidad"]): string {
  if (unidad === "tiempo") return "mm:ss";
  if (unidad === "kg") return "kg";
  return "reps";
}

function nivelColor(nivel: string): string {
  if (nivel === "oro") return "text-yellow-500";
  if (nivel === "plata") return "text-slate-400";
  return "text-amber-600";
}

function nivelLabel(nivel: NivelDiario): string {
  if (nivel === "oro") return "🥇 Oro";
  if (nivel === "plata") return "🥈 Plata";
  return "🥉 Bronce";
}

function nextThresholdInfo(
  metric: TrackingMetric,
  best: number | undefined
): { nivel: NivelDiario; target: number; progress: number; allDone: boolean } | null {
  if (best === undefined) return null;
  const dir = metric.direccion;
  const niveles: NivelDiario[] = ["bronce", "plata", "oro"];
  for (const nivel of niveles) {
    const threshold = metric.umbrales[nivel];
    if (threshold === 0) continue;
    const achieved =
      dir === "mayor_es_mejor" ? best >= threshold : best <= threshold;
    if (!achieved) {
      const progress =
        dir === "mayor_es_mejor" ? best / threshold : threshold / best;
      return {
        nivel,
        target: threshold,
        progress: Math.min(0.99, Math.max(0.04, progress)),
        allDone: false,
      };
    }
  }
  return { nivel: "oro", target: metric.umbrales.oro, progress: 1, allDone: true };
}

// ── Metric catalog card ────────────────────────────────────────────────────────

function MetricCard({
  metric,
  best,
  doneToday,
  onRegister,
}: {
  metric: TrackingMetric;
  best: number | undefined;
  doneToday: boolean;
  onRegister: () => void;
}) {
  const info = nextThresholdInfo(metric, best);

  const bestDisplay =
    best !== undefined
      ? metric.unidad === "tiempo"
        ? secsToDisplay(best)
        : `${best} ${metric.unidad}`
      : null;

  const targetDisplay =
    info && !info.allDone
      ? metric.unidad === "tiempo"
        ? secsToDisplay(info.target)
        : `${info.target} ${metric.unidad}`
      : null;

  return (
    <Card className={metric.publicadaHoy ? "border-primary/40 bg-primary/[0.03]" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            {metric.unidad === "tiempo" ? (
              <Clock className="size-5 text-primary" />
            ) : (
              <Dumbbell className="size-5 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-medium leading-tight">{metric.nombre}</p>
              {metric.publicadaHoy && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  WOD hoy
                </span>
              )}
              {doneToday && (
                <span className="flex items-center gap-0.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
                  <Check className="size-3" />
                  listo
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">
              🥉{" "}
              {metric.unidad === "tiempo"
                ? secsToDisplay(metric.umbrales.bronce)
                : metric.umbrales.bronce}{" "}
              · 🥈{" "}
              {metric.unidad === "tiempo"
                ? secsToDisplay(metric.umbrales.plata)
                : metric.umbrales.plata}{" "}
              · 🥇{" "}
              {metric.unidad === "tiempo"
                ? secsToDisplay(metric.umbrales.oro)
                : metric.umbrales.oro}{" "}
              {unidadLabel(metric.unidad)}
            </p>

            {info && !info.allDone && bestDisplay && targetDisplay && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Tu mejor: <strong className="text-foreground">{bestDisplay}</strong></span>
                  <span>Meta {nivelLabel(info.nivel)}: <strong className="text-foreground">{targetDisplay}</strong></span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${info.progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {info?.allDone && (
              <p className="mt-1 text-[11px] text-yellow-500 font-medium">
                🥇 ¡Todos los niveles completados!
              </p>
            )}
          </div>

          <Button
            size="sm"
            variant={doneToday ? "outline" : "default"}
            className="shrink-0"
            onClick={onRegister}
          >
            {doneToday ? <Check className="size-4" /> : "Registrar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Celebration modal ──────────────────────────────────────────────────────────

function DiarioCelebration({
  achievements,
  onClose,
}: {
  achievements: DiarioAchievement[];
  onClose: () => void;
}) {
  const sorted = [...achievements].sort((a, b) => {
    const ord: Record<string, number> = { oro: 3, plata: 2, bronce: 1 };
    return ord[b.nivel] - ord[a.nivel];
  });
  const best = sorted[0];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl">¡Felicidades!</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          <Trophy className={`size-16 ${nivelColor(best.nivel)}`} />
          <p className="text-lg font-semibold capitalize">{best.nivel}</p>
          <p className="text-muted-foreground">
            {best.metricNombre} · {best.valorDisplay}
          </p>
          {achievements.length > 1 && (
            <p className="text-sm text-muted-foreground">
              +{achievements.length - 1} medalla
              {achievements.length > 2 ? "s" : ""} más
            </p>
          )}
        </div>
        <Button onClick={onClose} className="w-full">
          ¡Gracias!
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Log dialog ─────────────────────────────────────────────────────────────────

function LogDialog({
  metrics,
  preselected,
  uid,
  onClose,
  onLogged,
}: {
  metrics: TrackingMetric[];
  preselected?: TrackingMetric;
  uid: string;
  onClose: () => void;
  onLogged: (log: ActivityLog, newAchievements: DiarioAchievement[]) => void;
}) {
  const [metricId, setMetricId] = useState(preselected?.id ?? "");
  const [valorNum, setValorNum] = useState("");
  const [minutos, setMinutos] = useState("");
  const [segundos, setSegundos] = useState("");
  const [nota, setNota] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metric = metrics.find((m) => m.id === metricId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!metric) return;
    setError(null);
    setLoading(true);

    try {
      let valor: number;
      let valorDisplay: string;

      if (metric.unidad === "tiempo") {
        const m = parseInt(minutos || "0", 10);
        const s = parseInt(segundos || "0", 10);
        if (s >= 60) {
          setError("Los segundos deben ser entre 0 y 59.");
          return;
        }
        valor = m * 60 + s;
        if (valor === 0) {
          setError("Ingresa un tiempo válido.");
          return;
        }
        valorDisplay = `${m}:${String(s).padStart(2, "0")}`;
      } else {
        valor = parseFloat(valorNum);
        if (isNaN(valor) || valor <= 0) {
          setError("Ingresa un valor válido.");
          return;
        }
        valorDisplay = `${valor} ${metric.unidad}`;
      }

      const fecha = todayISO();
      await addActivityLog({
        uid,
        metricId: metric.id,
        valor,
        valorDisplay,
        nota: nota.trim() || undefined,
        fecha,
      });

      const nuevas = await checkAndGrantAchievements(
        uid,
        metric,
        valor,
        valorDisplay,
        fecha
      );

      const log: ActivityLog = {
        id: crypto.randomUUID(),
        uid,
        metricId: metric.id,
        valor,
        valorDisplay,
        nota: nota.trim() || undefined,
        fecha,
        creadoAt: null,
      };

      onLogged(log, nuevas);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar actividad</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Ejercicio</Label>
            <Select value={metricId} onValueChange={(v) => setMetricId(v ?? "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un ejercicio" />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombre} ({unidadLabel(m.unidad)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {metric?.unidad === "tiempo" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Tiempo</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="min"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  className="w-20 text-center"
                />
                <span className="text-muted-foreground font-medium">:</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="seg"
                  value={segundos}
                  onChange={(e) => setSegundos(e.target.value)}
                  className="w-20 text-center"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>
                {metric?.unidad === "kg" ? "Peso (kg)" : "Repeticiones"}
              </Label>
              <Input
                type="number"
                min="0"
                step={metric?.unidad === "kg" ? "0.5" : "1"}
                placeholder={metric?.unidad === "kg" ? "85" : "10"}
                value={valorNum}
                onChange={(e) => setValorNum(e.target.value)}
                disabled={!metric}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Nota (opcional)</Label>
            <textarea
              className="flex min-h-[64px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="¿Cómo te fue?"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" disabled={loading || !metricId}>
            {loading ? "Guardando…" : "Guardar registro"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit log dialog ────────────────────────────────────────────────────────────

function EditLogDialog({
  log,
  metric,
  onClose,
  onSaved,
}: {
  log: ActivityLog;
  metric: TrackingMetric;
  onClose: () => void;
  onSaved: (updated: ActivityLog) => void;
}) {
  const initMin = metric.unidad === "tiempo" ? String(Math.floor(log.valor / 60)) : "";
  const initSeg = metric.unidad === "tiempo" ? String(log.valor % 60) : "";
  const initNum = metric.unidad !== "tiempo" ? String(log.valor) : "";

  const [valorNum, setValorNum] = useState(initNum);
  const [minutos, setMinutos] = useState(initMin);
  const [segundos, setSegundos] = useState(initSeg);
  const [nota, setNota] = useState(log.nota ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let valor: number;
      let valorDisplay: string;

      if (metric.unidad === "tiempo") {
        const m = parseInt(minutos || "0", 10);
        const s = parseInt(segundos || "0", 10);
        if (s >= 60) { setError("Los segundos deben ser entre 0 y 59."); return; }
        valor = m * 60 + s;
        if (valor === 0) { setError("Ingresa un tiempo válido."); return; }
        valorDisplay = `${m}:${String(s).padStart(2, "0")}`;
      } else {
        valor = parseFloat(valorNum);
        if (isNaN(valor) || valor <= 0) { setError("Ingresa un valor válido."); return; }
        valorDisplay = `${valor} ${metric.unidad}`;
      }

      await updateActivityLog(log.id, { valor, valorDisplay, nota: nota.trim() || undefined });
      onSaved({ ...log, valor, valorDisplay, nota: nota.trim() || undefined });
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar registro</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">{metric.nombre}</div>

          {metric.unidad === "tiempo" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Tiempo</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" placeholder="min" value={minutos}
                  onChange={(e) => setMinutos(e.target.value)} className="w-20 text-center" />
                <span className="text-muted-foreground font-medium">:</span>
                <Input type="number" min="0" max="59" placeholder="seg" value={segundos}
                  onChange={(e) => setSegundos(e.target.value)} className="w-20 text-center" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>{metric.unidad === "kg" ? "Peso (kg)" : "Repeticiones"}</Label>
              <Input type="number" min="0" step={metric.unidad === "kg" ? "0.5" : "1"}
                value={valorNum} onChange={(e) => setValorNum(e.target.value)} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Nota (opcional)</Label>
            <textarea
              className="flex min-h-[64px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="¿Cómo te fue?"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar cambios"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete confirm dialog ──────────────────────────────────────────────────────

function DeleteConfirmDialog({
  log,
  metric,
  onConfirm,
  onCancel,
}: {
  log: ActivityLog;
  metric: TrackingMetric | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteActivityLog(log.id);
      onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-xs text-center">
        <DialogHeader>
          <DialogTitle>¿Eliminar registro?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Se eliminará el registro de <strong>{metric?.nombre ?? "este ejercicio"}</strong> con valor{" "}
          <strong>{log.valorDisplay}</strong>. Esta acción no se puede deshacer.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="destructive" disabled={loading} onClick={handleDelete}>
            {loading ? "Eliminando…" : "Sí, eliminar"}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DiarioPage() {
  const { userDoc, status } = useAuth();
  const [metrics, setMetrics] = useState<TrackingMetric[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [preselected, setPreselected] = useState<TrackingMetric | undefined>();
  const [newAchievements, setNewAchievements] = useState<DiarioAchievement[]>([]);
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    if (!userDoc) return;
    Promise.all([listActiveMetrics(), listLogsForUser(userDoc.uid)])
      .then(([m, l]) => {
        setMetrics(m);
        setLogs(l);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [userDoc]);

  const bestByMetric = useMemo(() => {
    const result: Record<string, number> = {};
    for (const log of logs) {
      const metric = metrics.find((m) => m.id === log.metricId);
      if (!metric) continue;
      const current = result[log.metricId];
      if (current === undefined) {
        result[log.metricId] = log.valor;
      } else if (metric.direccion === "mayor_es_mejor") {
        result[log.metricId] = Math.max(current, log.valor);
      } else {
        result[log.metricId] = Math.min(current, log.valor);
      }
    }
    return result;
  }, [logs, metrics]);

  function handleLogged(log: ActivityLog, nuevas: DiarioAchievement[]) {
    setLogs((prev) => [log, ...prev]);
    setShowLogDialog(false);
    setPreselected(undefined);
    if (nuevas.length > 0) setNewAchievements(nuevas);
  }

  function openLogFor(metric: TrackingMetric) {
    setPreselected(metric);
    setShowLogDialog(true);
  }

  function handleEdited(updated: ActivityLog) {
    setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setEditingLog(null);
  }

  function handleDeleted(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setDeletingLog(null);
  }

  if (status === "loading" || dataLoading) return <PageSkeleton />;
  if (!userDoc) return null;

  const visibleMetrics = metrics.filter((m) => metricVisiblePara(m, userDoc));
  const today = todayISO();
  const loggedToday = new Set(
    logs.filter((l) => l.fecha === today).map((l) => l.metricId)
  );

  // WODs first, then the rest
  const wods = visibleMetrics.filter((m) => m.publicadaHoy);
  const otros = visibleMetrics.filter((m) => !m.publicadaHoy);
  const ordenados = [...wods, ...otros];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center justify-between py-2">
        <h1 className="font-heading text-xl font-semibold">Diario</h1>
        <Button
          size="sm"
          onClick={() => {
            setPreselected(undefined);
            setShowLogDialog(true);
          }}
        >
          <Plus className="size-4" />
          Registrar
        </Button>
      </header>

      {/* Catálogo de ejercicios */}
      {visibleMetrics.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No hay ejercicios disponibles aún. Tu coach los publicará pronto.
        </div>
      ) : (
        <section className="flex flex-col gap-2">
          {wods.length > 0 && (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              WODs del día · Otros ejercicios
            </h2>
          )}
          {ordenados.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              best={bestByMetric[metric.id]}
              doneToday={loggedToday.has(metric.id)}
              onRegister={() => openLogFor(metric)}
            />
          ))}
        </section>
      )}

      {/* Historial reciente */}
      {logs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Registros recientes
          </h2>
          <div className="flex flex-col divide-y rounded-xl border">
            {logs.slice(0, 20).map((log) => {
              const metric = metrics.find((m) => m.id === log.metricId);
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {metric?.nombre ?? "—"}
                    </p>
                    {log.nota && (
                      <p className="truncate text-xs text-muted-foreground">
                        {log.nota}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-primary">
                      {log.valorDisplay}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFecha(log.fecha)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label="Editar registro"
                      onClick={() => setEditingLog(log)}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar registro"
                      onClick={() => setDeletingLog(log)}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showLogDialog && (
        <LogDialog
          metrics={visibleMetrics}
          preselected={preselected}
          uid={userDoc.uid}
          onClose={() => {
            setShowLogDialog(false);
            setPreselected(undefined);
          }}
          onLogged={handleLogged}
        />
      )}

      {newAchievements.length > 0 && (
        <DiarioCelebration
          achievements={newAchievements}
          onClose={() => setNewAchievements([])}
        />
      )}

      {editingLog && (() => {
        const metric = metrics.find((m) => m.id === editingLog.metricId);
        return metric ? (
          <EditLogDialog
            log={editingLog}
            metric={metric}
            onClose={() => setEditingLog(null)}
            onSaved={handleEdited}
          />
        ) : null;
      })()}

      {deletingLog && (
        <DeleteConfirmDialog
          log={deletingLog}
          metric={metrics.find((m) => m.id === deletingLog.metricId)}
          onConfirm={() => handleDeleted(deletingLog.id)}
          onCancel={() => setDeletingLog(null)}
        />
      )}
    </div>
  );
}
