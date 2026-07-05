"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAlertas, getClasesDeHoy, getMetricasDelMes, type Alertas, type ClaseDeHoy, type MetricasMes } from "./api";

function AlertaRow({ href, label, count }: { href: string; label: string; count: number }) {
  if (count === 0) return null;
  return (
    <Link href={href} className="flex items-center justify-between gap-2 py-1.5 text-sm hover:text-primary">
      <span>{label}</span>
      <Badge variant="warning">{count}</Badge>
    </Link>
  );
}

export function AdminDashboard({ nombre }: { nombre: string }) {
  const [clasesHoy, setClasesHoy] = useState<ClaseDeHoy[]>([]);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [metricas, setMetricas] = useState<MetricasMes | null>(null);

  useEffect(() => {
    getClasesDeHoy().then(setClasesHoy);
    getAlertas().then(setAlertas);
    getMetricasDelMes().then(setMetricas);
  }, []);

  const sinAlertas =
    alertas &&
    alertas.nutricionPendientes === 0 &&
    alertas.medallasPorValidar === 0 &&
    alertas.pinesPendientes === 0 &&
    alertas.membresiasPorVencer === 0;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <h1 className="font-heading text-2xl font-semibold text-primary-dark dark:text-primary-light">
        Hola, {nombre.split(" ")[0]} 💜
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Clases de hoy</CardTitle>
        </CardHeader>
        <CardContent>
          {clasesHoy.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay clases programadas para hoy.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {clasesHoy.map(({ session }) => (
                <li key={session.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span>
                    {session.hora} · {session.nombre}
                  </span>
                  <span className="text-muted-foreground">
                    {session.cuposOcupados}/{session.capacidad}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          {sinAlertas ? (
            <p className="text-sm text-muted-foreground">Todo al día 🎉</p>
          ) : (
            alertas && (
              <div className="flex flex-col divide-y divide-border">
                <AlertaRow href="/nutricion-admin" label="Formularios de nutrición" count={alertas.nutricionPendientes} />
                <AlertaRow href="/medallas-admin" label="Medallas por validar" count={alertas.medallasPorValidar} />
                <AlertaRow href="/medallas-admin" label="Pines pendientes" count={alertas.pinesPendientes} />
                <AlertaRow href="/membresias" label="Membresías por vencer" count={alertas.membresiasPorVencer} />
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Este mes</CardTitle>
        </CardHeader>
        <CardContent>
          {metricas && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-2xl font-semibold">{metricas.asistenciasTotales}</p>
                <p className="text-muted-foreground">Asistencias</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{metricas.medallasDesbloqueadas}</p>
                <p className="text-muted-foreground">Medallas desbloqueadas</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{metricas.alumnosActivos}</p>
                <p className="text-muted-foreground">Alumnos activos</p>
              </div>
              <div>
                <p className="truncate text-2xl font-semibold">
                  {metricas.alumnoMasConstante?.nombre ?? "—"}
                </p>
                <p className="text-muted-foreground">
                  {metricas.alumnoMasConstante
                    ? `Más constante (${metricas.alumnoMasConstante.asistencias} clases)`
                    : "Alumno más constante"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
