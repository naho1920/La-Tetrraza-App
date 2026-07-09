"use client";

import dynamic from "next/dynamic";
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
