"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList } from "lucide-react";
import {
  getAnimoPromedioPorMes,
  getResumenDelMes,
  listEncuestasDelMes,
  mesISO,
  type ResumenMesEncuestas,
} from "./api";
import { ANIMO_LABEL, PROGRESO_LABEL } from "./preguntas";
import type { MonthlySurvey } from "./types";

// Ya cargado en esta ruta por las gráficas de Métricas — sigue sin bloquear
// el render inicial (~255 KB de recharts).
const MiniLineChart = dynamic(() => import("@/app/(admin)/estadisticas/charts").then((m) => m.MiniLineChart), {
  ssr: false,
});

function ultimosMeses(cantidad: number): string[] {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    return mesISO(d);
  });
}

function mesLabel(mes: string): string {
  const label = new Date(`${mes}-01T00:00:00`).toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function tiempoRelativo(fecha: Date | null): string {
  if (!fecha) return "";
  const dias = Math.floor((Date.now() - fecha.getTime()) / (24 * 60 * 60 * 1000));
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  return fecha.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
}

function DetalleRespuestaDialog({ survey, onClose }: { survey: MonthlySurvey; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{survey.alumnoNombre}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge>{ANIMO_LABEL[survey.animo] ?? survey.animo}</Badge>
            <Badge variant="outline">{PROGRESO_LABEL[survey.progreso]}</Badge>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Molestias o dolor</p>
            <p>{survey.molestias || "No reportó ninguna"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Lo mejor del mes</p>
            <p>{survey.loMejor || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Qué mejoraría</p>
            <p>{survey.aMejorar || "—"}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResumenEncuestasCoach() {
  const [tendencia, setTendencia] = useState<{ mes: string; valor: number }[]>([]);
  const [mes, setMes] = useState(() => mesISO());
  const [resumen, setResumen] = useState<ResumenMesEncuestas | null>(null);
  const [respuestas, setRespuestas] = useState<MonthlySurvey[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<MonthlySurvey | null>(null);

  useEffect(() => {
    getAnimoPromedioPorMes(6).then(setTendencia);
  }, []);

  useEffect(() => {
    setCargando(true);
    Promise.all([getResumenDelMes(mes), listEncuestasDelMes(mes)])
      .then(([r, e]) => {
        setResumen(r);
        setRespuestas(e);
      })
      .finally(() => setCargando(false));
  }, [mes]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ánimo promedio por mes</CardTitle>
        </CardHeader>
        <CardContent>
          <MiniLineChart data={tendencia} />
        </CardContent>
      </Card>

      <Select value={mes} onValueChange={(v) => setMes(v ?? mesISO())}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ultimosMeses(6).map((m) => (
            <SelectItem key={m} value={m}>
              {mesLabel(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de {mesLabel(mes)}</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          ) : !resumen || resumen.respondieron === 0 ? (
            <p className="text-sm text-muted-foreground">Nadie respondió la encuesta este mes todavía.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Respondieron</p>
                <p className="font-semibold">
                  {resumen.respondieron} de {resumen.alumnosActivos}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ánimo promedio</p>
                <p className="font-semibold">{resumen.promedioAnimo?.toFixed(1) ?? "—"} / 5</p>
              </div>
              <div>
                <p className="text-muted-foreground">Con molestias/dolor</p>
                <p className="font-semibold">{resumen.conMolestias}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Progreso</p>
                <p className="font-semibold">
                  {resumen.progreso.mejorando} mejorando · {resumen.progreso.igual} igual ·{" "}
                  {resumen.progreso.estancado} estancado
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respuestas</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="flex flex-col gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : respuestas.length === 0 ? (
            <EmptyState icon={ClipboardList} message="Sin respuestas todavía." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {respuestas.map((r) => (
                <li key={r.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm"
                    onClick={() => setSeleccionada(r)}
                  >
                    <span>{r.alumnoNombre}</span>
                    <span className="flex items-center gap-2">
                      <Badge>{ANIMO_LABEL[r.animo] ?? r.animo}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {tiempoRelativo(r.createdAt?.toDate() ?? null)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {seleccionada && <DetalleRespuestaDialog survey={seleccionada} onClose={() => setSeleccionada(null)} />}
    </div>
  );
}
