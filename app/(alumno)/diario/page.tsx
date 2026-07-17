"use client";

import { Check, Clock, Dumbbell, Plus, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  addActivityLog,
  checkAndGrantAchievements,
  listActiveMetrics,
  listLogsForUser,
  secsToDisplay,
} from "@/features/diario/api";
import type { ActivityLog, AudienciaTag, DiarioAchievement, TrackingMetric } from "@/features/diario/types";
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

  // Cada tag debe cumplirse (AND). Si el campo del perfil es null, se ignora ese tag.
  for (const tag of audiencia) {
    if (tag === "mujeres" && user.sexo !== null && user.sexo !== "femenino") return false;
    if (tag === "hombres" && user.sexo !== null && user.sexo !== "masculino") return false;
    if (tag === "principiantes" && user.nivel != null && user.nivel !== "principiante") return false;
    if (tag === "avanzados" && user.nivel != null && user.nivel !== "avanzado") return false;
  }
  return true;
}

function audienciaLabel(audiencia: AudienciaTag[] | undefined): string | null {
  if (!audiencia || audiencia.includes("todos")) return null;
  const map: Record<AudienciaTag, string> = {
    todos: "Todos",
    mujeres: "Mujeres",
    hombres: "Hombres",
    principiantes: "Principiantes",
    avanzados: "Avanzados",
  };
  return audiencia.map((t) => map[t]).join(" · ");
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DiarioPage() {
  const { userDoc, status } = useAuth();
  const [metrics, setMetrics] = useState<TrackingMetric[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [preselected, setPreselected] = useState<TrackingMetric | undefined>();
  const [newAchievements, setNewAchievements] = useState<DiarioAchievement[]>([]);

  useEffect(() => {
    if (!userDoc) return;
    Promise.all([listActiveMetrics(), listLogsForUser(userDoc.uid)]).then(
      ([m, l]) => {
        setMetrics(m);
        setLogs(l);
        setDataLoading(false);
      }
    );
  }, [userDoc]);

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

  if (status === "loading" || dataLoading) return <PageSkeleton />;
  if (!userDoc) return null;

  const visibleMetrics = metrics.filter((m) => metricVisiblePara(m, userDoc));
  const wods = visibleMetrics.filter((m) => m.publicadaHoy);
  const today = todayISO();
  const loggedToday = new Set(
    logs.filter((l) => l.fecha === today).map((l) => l.metricId)
  );

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

      {/* WODs del día */}
      {wods.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            WODs del día
          </h2>
          <div className="flex flex-col gap-2">
            {wods.map((metric) => {
              const done = loggedToday.has(metric.id);
              return (
                <Card key={metric.id} className={done ? "opacity-60" : ""}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {metric.unidad === "tiempo" ? (
                        <Clock className="size-5 shrink-0 text-primary" />
                      ) : (
                        <Dumbbell className="size-5 shrink-0 text-primary" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{metric.nombre}</p>
                        <p className="text-xs text-muted-foreground">
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
                        {audienciaLabel(metric.audiencia) && (
                          <p className="text-xs text-primary/70">
                            👥 {audienciaLabel(metric.audiencia)}
                          </p>
                        )}
                      </div>
                    </div>
                    {done ? (
                      <Check className="size-5 shrink-0 text-green-500" />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openLogFor(metric)}
                      >
                        Anotar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Historial */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Registros recientes
        </h2>
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no tienes registros. ¡Empieza hoy!
          </p>
        ) : (
          <div className="flex flex-col divide-y rounded-xl border">
            {logs.slice(0, 30).map((log) => {
              const metric = metrics.find((m) => m.id === log.metricId);
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
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
                </div>
              );
            })}
          </div>
        )}
      </section>

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
    </div>
  );
}
