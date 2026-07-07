"use client";

import { Medal, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MedalBadge } from "@/components/ui/medal-badge";
import { useAuth } from "@/features/auth/AuthProvider";
import { textoHito } from "@/features/medallas/bw";
import { CATALOGO_MEDALLAS, PILARES } from "@/features/medallas/catalogo";
import { listAchievementsForUser, listSkills } from "@/features/medallas/api";
import { ClaimAchievementDialog } from "@/features/medallas/claim";
import { PillarSection, type MedalSeleccionada } from "@/features/medallas/pillar-section";
import type { Achievement, Skill } from "@/features/medallas/types";
import { getLatestWeightLog } from "@/features/perfil/api";

/**
 * Si el catálogo aún no está cargado en Firestore, la vitrina muestra el
 * catálogo local como siluetas bloqueadas: el alumno siempre ve qué medallas
 * le esperan. (Registrar un logro sí requiere el catálogo real.)
 */
const CATALOGO_LOCAL: Skill[] = CATALOGO_MEDALLAS.map((seed) => ({
  ...seed,
  id: `local-${seed.pilar}-${seed.arte}`,
  activa: true,
}));

export default function MedallasPage() {
  const { userDoc } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pesoKg, setPesoKg] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<MedalSeleccionada | null>(null);
  const [mostrarClaim, setMostrarClaim] = useState(false);

  async function cargar() {
    if (!userDoc) return;
    const [skillsData, achievementsData] = await Promise.all([
      listSkills(),
      listAchievementsForUser(userDoc.uid),
    ]);
    setSkills(skillsData);
    setAchievements(achievementsData);
  }

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

  if (!userDoc) return null;

  const progreso = total === 0 ? 0 : logradas / total;
  const colorSeleccion = seleccion
    ? PILARES.find((p) => p.pilar === seleccion.skill.pilar)?.color ?? "#6934E1"
    : "#6934E1";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
      <h1 className="font-heading text-xl font-semibold">Medallas</h1>

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
        {skills.length > 0 && (
          <Button
            className="h-11 w-full bg-white text-base text-neutral-900 hover:bg-white/90"
            onClick={() => setMostrarClaim(true)}
          >
            <Plus className="size-4" data-icon="inline-start" />
            Registrar logro
          </Button>
        )}
      </section>

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
                Aún está bloqueada. Cuando lo consigas, regístralo y tu coach lo validará 💪
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

      {mostrarClaim && (
        <ClaimAchievementDialog
          uid={userDoc.uid}
          skills={skills}
          achievements={achievements}
          onClose={() => setMostrarClaim(false)}
          onClaimed={() => {
            setMostrarClaim(false);
            void cargar();
          }}
        />
      )}
    </div>
  );
}
