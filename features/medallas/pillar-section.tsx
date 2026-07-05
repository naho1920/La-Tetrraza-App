"use client";

import { MedalBadge } from "@/components/ui/medal-badge";
import { textoHito } from "./bw";
import type { Achievement, Pilar, Skill } from "./types";

export interface MedalSeleccionada {
  skill: Skill;
  nivel: string;
  achievement: Achievement | null;
}

export function PillarSection({
  pilar,
  label,
  color,
  skills,
  achievements,
  pesoKg,
  onSelect,
}: {
  pilar: Pilar;
  label: string;
  color: string;
  skills: Skill[];
  achievements: Achievement[];
  pesoKg: number | null;
  onSelect: (medalla: MedalSeleccionada) => void;
}) {
  const deEstePilar = skills.filter((s) => s.pilar === pilar);
  const total = deEstePilar.reduce((acc, s) => acc + s.nivelesDisponibles.length, 0);
  const logrados = deEstePilar.reduce(
    (acc, s) =>
      acc +
      s.nivelesDisponibles.filter((nivel) =>
        achievements.some((a) => a.skillId === s.id && a.nivel === nivel && a.estado === "validado")
      ).length,
    0
  );

  if (deEstePilar.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold" style={{ color }}>
          {label}
        </h2>
        <span className="text-sm text-muted-foreground">
          {logrados}/{total}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {deEstePilar.map((skill) => (
          <div key={skill.id} className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{skill.nombreMedalla}</p>
            <div className="flex gap-3">
              {skill.nivelesDisponibles.map((nivel) => {
                const achievement =
                  achievements.find((a) => a.skillId === skill.id && a.nivel === nivel) ?? null;
                const lograda = achievement?.estado === "validado";
                return (
                  <button
                    key={nivel}
                    className="flex flex-col items-center gap-1"
                    onClick={() => onSelect({ skill, nivel, achievement })}
                  >
                    <MedalBadge
                      pilar={pilar}
                      arte={skill.arte}
                      nivel={nivel}
                      colorPilar={color}
                      bloqueada={!lograda}
                      size="sm"
                    />
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {nivel === "base" ? skill.nombreMedalla : nivel}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {textoHito(skill.hitos[skill.nivelesDisponibles[0]], skill.relativoABW, pesoKg)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
