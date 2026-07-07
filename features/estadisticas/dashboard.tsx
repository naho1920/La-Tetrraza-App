"use client";

import { BarChart3, ChevronRight, LogOut, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutUser } from "@/features/auth/client-actions";
import { NotificationsBell } from "@/features/notificaciones/bell";
import { getAlertas, getClasesDeHoy, getMetricasDelMes, type Alertas, type ClaseDeHoy, type MetricasMes } from "./api";

function AlertaRow({ href, label, count }: { href: string; label: string; count: number }) {
  if (count === 0) return null;
  return (
    <Link href={href} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-primary">
      <span>{label}</span>
      <Badge variant="warning">{count}</Badge>
    </Link>
  );
}

function StatCard({ valor, label }: { valor: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="truncate font-heading text-3xl font-semibold">{valor}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function AdminDashboard({ nombre, foto }: { nombre: string; foto?: string | null }) {
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
      <header className="flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-3">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="" className="size-11 rounded-full object-cover ring-2 ring-primary/30" />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-full bg-primary-subtle font-heading font-semibold text-primary">
              {nombre.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Coach</p>
            <h1 className="font-heading text-lg leading-tight font-semibold">
              Hola, {nombre.split(" ")[0]} 💜
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => signOutUser()}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-3xl bg-card-dark p-5 text-card-dark-foreground">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Clases de hoy</h2>
          <Link href="/clases" className="flex items-center gap-0.5 text-xs text-primary-light">
            Ver calendario <ChevronRight className="size-3.5" />
          </Link>
        </div>
        {clasesHoy.length === 0 ? (
          <p className="text-sm text-card-dark-foreground/60">No hay clases programadas para hoy.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10">
            {clasesHoy.map(({ session }) => (
              <li key={session.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">
                  {session.hora} · {session.nombre}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
                  {session.cuposOcupados}/{session.capacidad}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {metricas && (
        <section className="grid grid-cols-2 gap-3">
          <StatCard valor={metricas.asistenciasTotales} label="Asistencias este mes" />
          <StatCard valor={metricas.medallasDesbloqueadas} label="Medallas desbloqueadas" />
          <StatCard valor={metricas.alumnosActivos} label="Alumnos activos" />
          <StatCard
            valor={metricas.alumnoMasConstante?.nombre.split(" ")[0] ?? "—"}
            label={
              metricas.alumnoMasConstante
                ? `Más constante (${metricas.alumnoMasConstante.asistencias} clases)`
                : "Alumno más constante"
            }
          />
        </section>
      )}

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Pendientes</CardTitle>
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

      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/membresias"
          className="flex items-center gap-2.5 rounded-3xl bg-card p-4 text-sm font-medium ring-1 ring-foreground/10 transition-colors hover:bg-muted"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary-subtle">
            <Wallet className="size-4 text-primary" />
          </span>
          Membresías
        </Link>
        <Link
          href="/estadisticas"
          className="flex items-center gap-2.5 rounded-3xl bg-card p-4 text-sm font-medium ring-1 ring-foreground/10 transition-colors hover:bg-muted"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary-subtle">
            <BarChart3 className="size-4 text-primary" />
          </span>
          Estadísticas
        </Link>
      </section>
    </div>
  );
}
