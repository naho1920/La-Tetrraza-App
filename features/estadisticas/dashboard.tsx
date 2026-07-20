"use client";

import {
  Award,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  Flame,
  LogOut,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { BentoGrid, BentoIcon, BentoStat, BentoTile } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { signOutUser } from "@/features/auth/client-actions";
import { NotificationsBell } from "@/features/notificaciones/bell";
import { ThemeToggle } from "@/features/theme/theme";
import { getAlertas, getClasesDeHoy, getMetricasDelMes, type Alertas, type ClaseDeHoy, type MetricasMes } from "./api";

function AlertaRow({ href, label, count }: { href: string; label: string; count: number }) {
  if (count === 0) return null;
  return (
    <Link href={href} className="flex min-h-11 items-center justify-between gap-2 py-2 text-sm hover:text-primary">
      <span>{label}</span>
      <Badge variant="warning">{count}</Badge>
    </Link>
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
    alertas.membresiasPorVencer === 0 &&
    alertas.comprobantesPendientes === 0;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-3">
          {foto ? (
            <Image
              src={foto}
              alt=""
              width={44}
              height={44}
              className="size-11 rounded-full object-cover ring-2 ring-primary/30"
            />
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
          <ThemeToggle />
          <NotificationsBell />
          <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => signOutUser()}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <BentoGrid>
        <BentoTile variant="dark" className="col-span-2 gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">Clases de hoy</h2>
            <Link href="/clases" className="flex min-h-11 items-center gap-0.5 text-xs text-primary-light">
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
        </BentoTile>

        {metricas && (
          <>
            <BentoTile variant="accent">
              <BentoIcon icon={CalendarCheck} variant="accent" />
              <BentoStat
                variant="accent"
                valor={metricas.asistenciasTotales}
                label="Asistencias este mes"
              />
            </BentoTile>
            <BentoTile>
              <BentoIcon icon={Award} />
              <BentoStat valor={metricas.medallasDesbloqueadas} label="Medallas desbloqueadas" />
            </BentoTile>
            <BentoTile>
              <BentoIcon icon={Users} />
              <BentoStat valor={metricas.alumnosActivos} label="Alumnos activos" />
            </BentoTile>
            <BentoTile>
              <BentoIcon icon={Flame} />
              <BentoStat
                valor={
                  <span className="text-lg">
                    {metricas.alumnoMasConstante?.nombre.split(" ")[0] ?? "—"}
                  </span>
                }
                label={
                  metricas.alumnoMasConstante
                    ? `Más constante (${metricas.alumnoMasConstante.asistencias} clases)`
                    : "Alumno más constante"
                }
              />
            </BentoTile>
          </>
        )}

        <BentoTile className="col-span-2 gap-2 p-5">
          <h2 className="font-heading text-base font-semibold">Pendientes</h2>
          {sinAlertas ? (
            <p className="text-sm text-muted-foreground">Todo al día 🎉</p>
          ) : (
            alertas && (
              <div className="flex flex-col divide-y divide-border">
                <AlertaRow href="/nutricion-admin?estado=pendiente" label="Formularios de nutrición" count={alertas.nutricionPendientes} />
                <AlertaRow href="/medallas-admin?vista=pendientes" label="Medallas por validar" count={alertas.medallasPorValidar} />
                <AlertaRow href="/medallas-admin?vista=pines" label="Pines pendientes" count={alertas.pinesPendientes} />
                <AlertaRow href="/membresias?tab=estado&filtro=por_vencer" label="Membresías por vencer" count={alertas.membresiasPorVencer} />
                <AlertaRow href="/membresias?tab=acciones&open=comprobantes" label="Comprobantes por revisar" count={alertas.comprobantesPendientes} />
              </div>
            )
          )}
        </BentoTile>

        <BentoTile href="/membresias" className="flex-row items-center gap-2.5">
          <BentoIcon icon={Wallet} />
          <span className="text-sm font-medium">Membresías</span>
        </BentoTile>
        <BentoTile href="/estadisticas" className="flex-row items-center gap-2.5">
          <BentoIcon icon={BarChart3} />
          <span className="text-sm font-medium">Estadísticas</span>
        </BentoTile>
      </BentoGrid>
    </div>
  );
}
