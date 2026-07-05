"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAsistenciaPorHorario,
  getEvolucionAlumnos,
  getMedallasPorMes,
  type AsistenciaPorHorario,
  type PuntoMensual,
} from "@/features/estadisticas/api";

function MiniBarChart({ data, dataKey, xKey }: { data: unknown[]; dataKey: string; xKey: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay datos suficientes.</p>;
  }
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--card-foreground)",
            }}
          />
          <Bar dataKey={dataKey} fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniLineChart({ data }: { data: PuntoMensual[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay datos suficientes.</p>;
  }
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--card-foreground)",
            }}
          />
          <Line type="monotone" dataKey="valor" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function EstadisticasPage() {
  const [porHorario, setPorHorario] = useState<AsistenciaPorHorario[]>([]);
  const [evolucionAlumnos, setEvolucionAlumnos] = useState<PuntoMensual[]>([]);
  const [medallasPorMes, setMedallasPorMes] = useState<PuntoMensual[]>([]);

  useEffect(() => {
    getAsistenciaPorHorario().then(setPorHorario);
    getEvolucionAlumnos().then(setEvolucionAlumnos);
    getMedallasPorMes().then(setMedallasPorMes);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      <Card>
        <CardHeader>
          <CardTitle>Asistencia por horario (este mes)</CardTitle>
        </CardHeader>
        <CardContent>
          <MiniBarChart data={porHorario} dataKey="asistencias" xKey="hora" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolución de alumnos</CardTitle>
        </CardHeader>
        <CardContent>
          <MiniLineChart data={evolucionAlumnos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medallas por mes</CardTitle>
        </CardHeader>
        <CardContent>
          <MiniBarChart data={medallasPorMes} dataKey="valor" xKey="mes" />
        </CardContent>
      </Card>
    </div>
  );
}
