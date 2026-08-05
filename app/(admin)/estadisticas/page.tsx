"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
  getAsistenciaPorHorario,
  getEvolucionAlumnos,
  getMedallasPorMes,
  type AsistenciaPorHorario,
  type PuntoMensual,
} from "@/features/estadisticas/api";
import { ResumenEncuestasCoach } from "@/features/encuestas/resumen-coach";

// Recharts (~255 KB) no debe bloquear el render inicial de esta ruta.
const MiniBarChart = dynamic(() => import("./charts").then((m) => m.MiniBarChart), { ssr: false });
const MiniLineChart = dynamic(() => import("./charts").then((m) => m.MiniLineChart), { ssr: false });

type Tab = "metricas" | "encuestas";

const TABS_VALIDOS: Tab[] = ["metricas", "encuestas"];

function tabDesdeParam(valor: string | null): Tab {
  return TABS_VALIDOS.includes(valor as Tab) ? (valor as Tab) : "metricas";
}

export default function EstadisticasPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => tabDesdeParam(searchParams.get("tab")));
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

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "metricas", label: "Métricas" },
          { value: "encuestas", label: "Encuestas" },
        ]}
      />

      {tab === "metricas" ? (
        <>
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
        </>
      ) : (
        <ResumenEncuestasCoach />
      )}
    </div>
  );
}
