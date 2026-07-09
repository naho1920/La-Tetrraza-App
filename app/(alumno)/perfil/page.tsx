"use client";

import { Award, CalendarCheck, ChevronRight, CreditCard, Scale, UserPen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BentoGrid, BentoIcon, BentoStat, BentoTile } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOutUser } from "@/features/auth/client-actions";
import { getSkill, listAchievementsForUser } from "@/features/medallas/api";
import { NotificationsBell } from "@/features/notificaciones/bell";
import { contarClasesAsistidas, getWeightLogs, type WeightLog } from "@/features/perfil/api";
import { AvatarUploader } from "@/features/perfil/avatar-uploader";
import { ThemeToggle } from "@/features/theme/theme";
import { WeightChart } from "@/features/perfil/weight-chart";
import { WeightLogForm } from "@/features/perfil/weight-log-form";

export default function PerfilPage() {
  const { userDoc, refreshUserDoc } = useAuth();
  const [pesoLogs, setPesoLogs] = useState<WeightLog[]>([]);
  const [clasesAsistidas, setClasesAsistidas] = useState<number | null>(null);
  const [ultimaMedalla, setUltimaMedalla] = useState<string | null>(null);

  useEffect(() => {
    if (!userDoc) return;
    getWeightLogs(userDoc.uid).then(setPesoLogs);
    contarClasesAsistidas(userDoc.uid).then(setClasesAsistidas).catch(() => setClasesAsistidas(0));

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
            className="bg-white text-neutral-900 hover:bg-white/90"
          >
            <UserPen className="size-4" data-icon="inline-start" />
            Editar perfil
          </Button>
        </BentoTile>

        <BentoTile>
          <BentoIcon icon={Scale} />
          <BentoStat valor={ultimoPeso ? `${ultimoPeso} kg` : "—"} label="Peso actual" />
        </BentoTile>

        <BentoTile variant="accent">
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

      <Button variant="destructive" onClick={() => signOutUser()}>
        Cerrar sesión
      </Button>
    </div>
  );
}
