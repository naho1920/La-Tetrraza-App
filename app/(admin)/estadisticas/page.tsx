"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAsistenciaPorHorario,
  getEvolucionAlumnos,
  getMedallasPorMes,
  type AsistenciaPorHorario,
  type PuntoMensual,
} from "@/features/estadisticas/api";

// Recharts (~255 KB) no debe bloquear el render inicial de esta ruta.
const MiniBarChart = dynamic(() => import("./charts").then((m) => m.MiniBarChart), { ssr: false });
const MiniLineChart = dynamic(() => import("./charts").then((m) => m.MiniLineChart), { ssr: false });

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
      <header className="flex items-center gap-3 py-2">
        <Link
          href="/"
          aria-label="Volver"
          className="flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10 transition-colors active:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-heading text-xl font-semibold">Estadísticas</h1>
      </header>

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
