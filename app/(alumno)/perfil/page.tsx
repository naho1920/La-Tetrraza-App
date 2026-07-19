"use client";

import { Award, BookOpen, CalendarCheck, ChevronRight, CreditCard, LogOut, Scale, UserPen } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { BentoGrid, BentoIcon, BentoStat, BentoTile } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOutUser } from "@/features/auth/client-actions";
import { getSkill, listAchievementsForUser } from "@/features/medallas/api";
import { listDiarioAchievementsForUser } from "@/features/diario/api";
import { NotificationsBell } from "@/features/notificaciones/bell";
import { contarClasesAsistidas, getWeightLogs, type WeightLog } from "@/features/perfil/api";
import { AvatarUploader } from "@/features/perfil/avatar-uploader";
import { ThemeToggle } from "@/features/theme/theme";
import { WeightLogForm } from "@/features/perfil/weight-log-form";

// Recharts (~255 KB) no debe bloquear el render inicial de esta ruta.
const WeightChart = dynamic(
  () => import("@/features/perfil/weight-chart").then((m) => m.WeightChart),
  { ssr: false }
);

export default function PerfilPage() {
  const { userDoc, refreshUserDoc } = useAuth();
  const [pesoLogs, setPesoLogs] = useState<WeightLog[]>([]);
  const [clasesAsistidas, setClasesAsistidas] = useState<number | null>(null);
  const [ultimaMedalla, setUltimaMedalla] = useState<string | null>(null);
  const [logrosCount, setLogrosCount] = useState<number | null>(null);

  useEffect(() => {
    if (!userDoc) return;
    getWeightLogs(userDoc.uid).then(setPesoLogs);
    contarClasesAsistidas(userDoc.uid).then(setClasesAsistidas).catch(() => setClasesAsistidas(0));
    listDiarioAchievementsForUser(userDoc.uid)
      .then((a) => setLogrosCount(a.length))
      .catch(() => setLogrosCount(0));

    listAchievementsForUser(userDoc.uid)
      .then(async (achievements) => {
        const validadas = achievements
          .filter((a) => a.estado === "validado")
          .sort(
            (a, b) =>
              (b.validadoAt?.toDate().getTime() ?? 0) - (a.validadoAt?.toDate().getTime() ?? 0)
          );
        const ultima = validadas[0];
        if (!ultima) return setUltimaMedalla("—");
        const skill = await getSkill(ultima.skillId);
        setUltimaMedalla(skill?.nombreMedalla ?? "—");
      })
      .catch(() => setUltimaMedalla("—"));
  }, [userDoc]);

  const ultimoPeso = pesoLogs.at(-1)?.pesoKg ?? null;

  function handlePesoGuardado(nuevoLog: WeightLog) {
    setPesoLogs((prev) => [...prev, nuevoLog]);
  }

  if (!userDoc) return <PageSkeleton />;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center justify-between gap-3 py-2">
        <h1 className="font-heading text-xl font-semibold">Perfil</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationsBell />
          <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => signOutUser()}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <BentoGrid>
        <BentoTile variant="dark" className="col-span-2 gap-4 p-5">
          <div className="flex items-center gap-4">
            <AvatarUploader
              uid={userDoc.uid}
              nombre={userDoc.nombre}
              foto={userDoc.foto}
              onUploaded={refreshUserDoc}
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-heading text-lg font-semibold">{userDoc.nombre}</h2>
              <p className="truncate text-sm text-card-dark-foreground/60">{userDoc.email}</p>
            </div>
          </div>
          <Button
            render={<Link href="/perfil/editar" />}
            variant="on-dark"
          >
            <UserPen className="size-4" data-icon="inline-start" />
            Editar perfil
          </Button>
        </BentoTile>

        <BentoTile>
          <BentoIcon icon={Scale} />
          <BentoStat valor={ultimoPeso ? `${ultimoPeso} kg` : "—"} label="Peso actual" />
        </BentoTile>

        <BentoTile href="/medallas" variant="accent">
          <BentoIcon icon={Award} variant="accent" />
          <BentoStat
            variant="accent"
            valor={<span className="text-lg">{ultimaMedalla ?? "…"}</span>}
            label="Última medalla"
          />
        </BentoTile>

        <BentoTile>
          <BentoIcon icon={CalendarCheck} />
          <BentoStat
            valor={clasesAsistidas === null ? "…" : clasesAsistidas}
            label="Clases asistidas"
          />
        </BentoTile>

        <BentoTile href="/diario">
          <BentoIcon icon={BookOpen} />
          <BentoStat
            valor={logrosCount === null ? "…" : logrosCount}
            label="Logros diario"
          />
        </BentoTile>

        <BentoTile href="/membresia" className="justify-between">
          <div className="flex items-start justify-between">
            <BentoIcon icon={CreditCard} />
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
          <BentoStat valor={<span className="text-lg">Mi membresía</span>} label="Plan y pagos" />
        </BentoTile>

        <BentoTile className="col-span-2 gap-4 p-5">
          <h2 className="font-heading text-base font-semibold">Tu peso</h2>
          <WeightChart logs={pesoLogs} />
          <WeightLogForm uid={userDoc.uid} ultimoPeso={ultimoPeso} onSaved={handlePesoGuardado} />
        </BentoTile>
      </BentoGrid>

    </div>
  );
}
