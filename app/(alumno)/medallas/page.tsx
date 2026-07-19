"use client";

import { Medal, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MedalBadge } from "@/components/ui/medal-badge";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { textoHito } from "@/features/medallas/bw";
import { CATALOGO_MEDALLAS, PILARES } from "@/features/medallas/catalogo";
import { listAchievementsForUser, listSkills } from "@/features/medallas/api";
import { PillarSection, type MedalSeleccionada } from "@/features/medallas/pillar-section";
import type { Achievement, Skill } from "@/features/medallas/types";
import { getLatestWeightLog } from "@/features/perfil/api";
import { cn } from "@/lib/utils";

const CATALOGO_LOCAL: Skill[] = CATALOGO_MEDALLAS.map((seed) => ({
  ...seed,
  id: `local-${seed.pilar}-${seed.arte}`,
  activa: true,
}));

type Tab = "catalogo" | "logros";

function nivelLabel(nivel: string): string {
  if (nivel === "oro") return "🥇 Oro";
  if (nivel === "plata") return "🥈 Plata";
  if (nivel === "base") return "Base";
  return "🥉 Bronce";
}

function nivelColor(nivel: string): string {
  if (nivel === "oro") return "text-yellow-500";
  if (nivel === "plata") return "text-slate-400";
  return "text-amber-600";
}

export default function MedallasPage() {
  const { userDoc } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pesoKg, setPesoKg] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<MedalSeleccionada | null>(null);
  const [tab, setTab] = useState<Tab>("catalogo");

  useEffect(() => {
    if (!userDoc) return;
    let ignore = false;

    Promise.all([listSkills(), listAchievementsForUser(userDoc.uid)]).then(
      ([skillsData, achievementsData]) => {
        if (ignore) return;
        setSkills(skillsData);
        setAchievements(achievementsData);
      }
    );
    getLatestWeightLog(userDoc.uid).then((log) => {
      if (!ignore) setPesoKg(log?.pesoKg ?? null);
    });

    return () => {
      ignore = true;
    };
  }, [userDoc]);

  const skillsMostradas = skills.length > 0 ? skills : CATALOGO_LOCAL;

  const { total, logradas } = useMemo(() => {
    const totalNiveles = skillsMostradas.reduce((acc, s) => acc + s.nivelesDisponibles.length, 0);
    const conseguidas = skillsMostradas.reduce(
      (acc, s) =>
        acc +
        s.nivelesDisponibles.filter((nivel) =>
          achievements.some((a) => a.skillId === s.id && a.nivel === nivel && a.estado === "validado")
        ).length,
      0
    );
    return { total: totalNiveles, logradas: conseguidas };
  }, [skillsMostradas, achievements]);

  const misLogros = useMemo(
    () =>
      achievements
        .filter((a) => a.estado === "validado")
        .map((a) => ({
          ...a,
          skill: skillsMostradas.find((s) => s.id === a.skillId),
        }))
        .filter((a) => a.skill)
        .sort((a, b) => (b.fechaLogro ?? "").localeCompare(a.fechaLogro ?? "")),
    [achievements, skillsMostradas]
  );

  if (!userDoc) return <PageSkeleton />;

  const progreso = total === 0 ? 0 : logradas / total;
  const colorSeleccion = seleccion
    ? PILARES.find((p) => p.pilar === seleccion.skill.pilar)?.color ?? "var(--color-primary)"
    : "var(--color-primary)";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
      <h1 className="font-heading text-xl font-semibold">Medallas</h1>

      {/* Stats banner */}
      <section className="flex flex-col gap-4 rounded-3xl bg-card-dark p-5 text-card-dark-foreground">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/25">
            <Medal className="size-6 text-primary-light" />
          </span>
          <div className="flex flex-1 flex-col">
            <p className="font-heading text-3xl font-semibold leading-tight">
              {logradas}
              <span className="text-base font-medium text-card-dark-foreground/50"> / {total}</span>
            </p>
            <p className="text-xs text-card-dark-foreground/60">
              medallas de tu colección — cada una viene con su pin físico 📍
            </p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary-light transition-all"
            style={{ width: `${Math.max(2, progreso * 100)}%` }}
          />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        <button
          onClick={() => setTab("catalogo")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            tab === "catalogo"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Catálogo
        </button>
        <button
          onClick={() => setTab("logros")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            tab === "logros"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Mis logros ({logradas})
        </button>
      </div>

      {/* Tab: catálogo */}
      {tab === "catalogo" && (
        <>
          {PILARES.map(({ pilar, label, color }) => (
            <PillarSection
              key={pilar}
              pilar={pilar}
              label={label}
              color={color}
              skills={skillsMostradas}
              achievements={achievements}
              pesoKg={pesoKg}
              onSelect={setSeleccion}
            />
          ))}
        </>
      )}

      {/* Tab: mis logros */}
      {tab === "logros" && (
        <section className="flex flex-col gap-2">
          {misLogros.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Trophy className="size-7 text-muted-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">
                Aún no tienes medallas ganadas. ¡Sigue entrenando!
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y rounded-xl border">
              {misLogros.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <MedalBadge
                    pilar={a.skill!.pilar}
                    arte={a.skill!.arte}
                    nivel={a.nivel}
                    colorPilar={
                      PILARES.find((p) => p.pilar === a.skill!.pilar)?.color ?? "var(--color-primary)"
                    }
                    bloqueada={false}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{a.skill!.nombreMedalla}</p>
                    <p className={cn("text-xs font-medium", nivelColor(a.nivel))}>
                      {nivelLabel(a.nivel)}
                    </p>
                  </div>
                  {a.fechaLogro && (
                    <p className="shrink-0 text-xs text-muted-foreground">{a.fechaLogro}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Detail dialog */}
      {seleccion && (
        <Dialog open onOpenChange={(open) => !open && setSeleccion(null)}>
          <DialogContent>
            <DialogHeader>
              <MedalBadge
                pilar={seleccion.skill.pilar}
                arte={seleccion.skill.arte}
                nivel={seleccion.nivel}
                colorPilar={colorSeleccion}
                bloqueada={seleccion.achievement?.estado !== "validado"}
                size="lg"
              />
              <DialogTitle>
                {seleccion.nivel === "base"
                  ? seleccion.skill.nombreMedalla
                  : `${seleccion.skill.nombreMedalla} — ${seleccion.nivel}`}
              </DialogTitle>
              <DialogDescription>{seleccion.skill.habilidad}</DialogDescription>
            </DialogHeader>
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm">
              {textoHito(seleccion.skill.hitos[seleccion.nivel], seleccion.skill.relativoABW, pesoKg)}
            </p>
            {!seleccion.achievement && (
              <p className="text-sm text-muted-foreground">
                Aún está bloqueada. Cuando lo consigas, tu coach lo validará 💪
              </p>
            )}
            {(seleccion.achievement?.pesoLevantadoKg != null || seleccion.achievement?.tiempoLogrado) && (
              <p className="text-sm text-muted-foreground">
                Registraste:{" "}
                {seleccion.achievement.pesoLevantadoKg != null &&
                  `${seleccion.achievement.pesoLevantadoKg} kg`}
                {seleccion.achievement.tiempoLogrado && ` ${seleccion.achievement.tiempoLogrado}`}
              </p>
            )}
            {seleccion.achievement?.estado === "pendiente" && (
              <p className="text-sm text-warning">Tu coach todavía está validando este logro.</p>
            )}
            {seleccion.achievement?.estado === "validado" && (
              <p className="text-sm text-success">¡Medalla conseguida! 🎉</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
