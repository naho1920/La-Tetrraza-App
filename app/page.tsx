"use client";

import { CalendarDays } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/ui/admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabBar } from "@/components/ui/tab-bar";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOutUser } from "@/features/auth/client-actions";
import { getSkill, getUncelebratedValidated, marcarCelebrado } from "@/features/medallas/api";
import { AchievementCelebration } from "@/features/medallas/celebration";
import type { Achievement, Skill } from "@/features/medallas/types";
import { getUpcomingBookingsForUser } from "@/features/reservas/api";
import { toISODate } from "@/features/reservas/date-utils";
import type { Booking, ClassSession } from "@/features/reservas/types";
import { AdminDashboard } from "@/features/estadisticas/dashboard";

function FullscreenSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { status, user, userDoc } = useAuth();
  const [proximas, setProximas] = useState<Array<{ booking: Booking; session: ClassSession }>>([]);
  const [celebracion, setCelebracion] = useState<{ achievement: Achievement; skill: Skill } | null>(null);

  useEffect(() => {
    if (status !== "ready" || userDoc?.rol !== "alumno") return;
    getUpcomingBookingsForUser(userDoc.uid, toISODate(new Date())).then(setProximas);
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
    return <FullscreenSpinner />;
  }

  if (userDoc?.rol === "admin") {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <AdminNav />
        <AdminDashboard nombre={userDoc.nombre} />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-col items-center gap-4 bg-primary-subtle px-6 py-10 text-center dark:bg-background">
        <Image
          src="/icon-512.png"
          alt="La Terraza"
          width={64}
          height={64}
          className="rounded-2xl shadow-lg"
          priority
        />
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary-dark dark:text-primary-light">
          Hola, {userDoc?.nombre.split(" ")[0]} 👋
        </h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Tus próximas clases</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {proximas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no tienes clases reservadas.
              </p>
            ) : (
              proximas.map(({ booking, session }) => (
                <div key={booking.id} className="flex items-center gap-2 text-sm">
                  <CalendarDays className="size-4 shrink-0 text-primary" />
                  <span>
                    {session.fecha} · {session.hora} — {session.nombre}
                  </span>
                </div>
              ))
            )}
            <Button render={<Link href="/horarios" />} variant="outline" className="mt-2">
              Ver horarios
            </Button>
          </CardContent>
        </Card>

        <Button variant="ghost" onClick={() => signOutUser()}>
          Cerrar sesión ({user?.email})
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
