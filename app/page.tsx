"use client";

import { ArrowUpRight, Award, CalendarDays, Scale, UtensilsCrossed, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminTabBar } from "@/components/ui/admin-tab-bar";
import { BentoGrid, BentoIcon, BentoStat, BentoTile } from "@/components/ui/bento";
import { PageSkeleton } from "@/components/ui/skeleton";
import { TabBar } from "@/components/ui/tab-bar";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOutUser } from "@/features/auth/client-actions";
import {
  getSkill,
  getUncelebratedValidated,
  listAchievementsForUser,
  marcarCelebrado,
} from "@/features/medallas/api";
import { AchievementCelebration } from "@/features/medallas/celebration";
import type { Achievement, Skill } from "@/features/medallas/types";
import { getMembershipForUser } from "@/features/membresias/api";
import { ESTADO_LABEL, calcularEstadoMembresia } from "@/features/membresias/estado";
import type { EstadoMembresia } from "@/features/membresias/types";
import { NotificationsBell } from "@/features/notificaciones/bell";
import { getLatestWeightLog } from "@/features/perfil/api";
import { getUpcomingBookingsForUser } from "@/features/reservas/api";
import { toISODate } from "@/features/reservas/date-utils";
import type { Booking, ClassSession } from "@/features/reservas/types";
import { AdminDashboard } from "@/features/estadisticas/dashboard";

export default function Home() {
  const router = useRouter();
  const { status, userDoc } = useAuth();
  const [proximas, setProximas] = useState<Array<{ booking: Booking; session: ClassSession }>>([]);
  const [celebracion, setCelebracion] = useState<{ achievement: Achievement; skill: Skill } | null>(null);
  const [ultimoPeso, setUltimoPeso] = useState<number | null>(null);
  const [medallas, setMedallas] = useState<number | null>(null);
  const [estadoMembresia, setEstadoMembresia] = useState<EstadoMembresia | null>(null);

  useEffect(() => {
    if (status !== "ready" || userDoc?.rol !== "alumno") return;
    getUpcomingBookingsForUser(userDoc.uid, toISODate(new Date())).then(setProximas);
    getLatestWeightLog(userDoc.uid).then((log) => setUltimoPeso(log?.pesoKg ?? null));
    listAchievementsForUser(userDoc.uid)
      .then((a) => setMedallas(a.filter((x) => x.estado === "validado").length))
      .catch(() => setMedallas(0));
    getMembershipForUser(userDoc.uid)
      .then((m) => setEstadoMembresia(m ? calcularEstadoMembresia(m.fechaFin) : null))
      .catch(() => setEstadoMembresia(null));
  }, [status, userDoc]);

  useEffect(() => {
    if (status !== "ready" || userDoc?.rol !== "alumno") return;
    getUncelebratedValidated(userDoc.uid).then(async (achievement) => {
      if (!achievement) return;
      const skill = await getSkill(achievement.skillId);
      if (skill) setCelebracion({ achievement, skill });
    });
  }, [status, userDoc]);

  async function handleCerrarCelebracion() {
    if (!celebracion) return;
    await marcarCelebrado(celebracion.achievement.id);
    setCelebracion(null);
  }

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
    if (status === "not-approved") router.replace("/sin-acceso");
    if (status === "ready" && userDoc?.rol === "alumno" && !userDoc.onboardingCompletado) {
      router.replace("/onboarding");
    }
  }, [status, userDoc, router]);

  if (
    status === "loading" ||
    status === "signed-out" ||
    status === "not-approved" ||
    (userDoc?.rol === "alumno" && !userDoc.onboardingCompletado)
  ) {
    return <PageSkeleton />;
  }

  if (userDoc?.rol === "admin") {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <AdminDashboard nombre={userDoc.nombre} foto={userDoc.foto} />
        </main>
        <AdminTabBar />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
        <header className="flex items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-3">
            <Image
              src="/icon-512.png"
              alt="La Terraza"
              width={44}
              height={44}
              className="rounded-full shadow-sm"
              priority
            />
            <div>
              <p className="text-xs text-muted-foreground">La Terraza</p>
              <h1 className="font-heading text-lg leading-tight font-semibold">
                Hola, {userDoc?.nombre.split(" ")[0]} 👋
              </h1>
            </div>
          </div>
          <NotificationsBell />
        </header>

        <BentoGrid>
          <BentoTile variant="dark" className="col-span-2 gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold">Tus próximas clases</h2>
              <BentoIcon icon={CalendarDays} variant="dark" />
            </div>
            {proximas.length === 0 ? (
              <p className="text-sm text-card-dark-foreground/60">
                Todavía no tienes clases reservadas.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-white/10">
                {proximas.map(({ booking, session }) => (
                  <li key={booking.id} className="flex items-center gap-2.5 py-2.5 text-sm">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary-light" />
                    <span>
                      {session.fecha} · {session.hora} — {session.nombre}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button
              render={<Link href="/horarios" />}
              className="bg-white text-neutral-900 hover:bg-white/90"
            >
              Ver calendario de clases
            </Button>
          </BentoTile>

          <BentoTile href="/perfil" className="aspect-square">
            <BentoIcon icon={Scale} />
            <BentoStat valor={ultimoPeso ? `${ultimoPeso} kg` : "—"} label="Peso actual" />
          </BentoTile>

          <BentoTile href="/medallas" className="aspect-square">
            <BentoIcon icon={Award} />
            <BentoStat valor={medallas ?? "…"} label="Medallas ganadas" />
          </BentoTile>

          <BentoTile href="/nutricion" variant="accent" className="aspect-square">
            <div className="flex items-start justify-between">
              <BentoIcon icon={UtensilsCrossed} variant="accent" />
              <ArrowUpRight className="size-4 opacity-70" />
            </div>
            <BentoStat variant="accent" valor="Nutrición" label="Tu plan alimenticio" />
          </BentoTile>

          <BentoTile href="/membresia" className="aspect-square">
            <BentoIcon icon={Wallet} />
            <BentoStat
              valor={estadoMembresia ? ESTADO_LABEL[estadoMembresia] : "—"}
              label="Membresía"
            />
          </BentoTile>
        </BentoGrid>

        <Button variant="ghost" onClick={() => signOutUser()}>
          Cerrar sesión
        </Button>
      </div>
      <TabBar />

      {celebracion && (
        <AchievementCelebration
          achievement={celebracion.achievement}
          skill={celebracion.skill}
          onClose={handleCerrarCelebracion}
        />
      )}
    </div>
  );
}
