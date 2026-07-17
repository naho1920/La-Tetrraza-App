"use client";

import { Check, Clock3, Dumbbell, Flame, HeartPulse, PersonStanding, type LucideIcon } from "lucide-react";

import { MedalBadge } from "@/components/ui/medal-badge";
import { cn } from "@/lib/utils";
import { textoHito } from "./bw";
import type { Achievement, Pilar, Skill } from "./types";

export interface MedalSeleccionada {
  skill: Skill;
  nivel: string;
  achievement: Achievement | null;
}

const ICONO_PILAR: Record<Pilar, LucideIcon> = {
  fuerza: Dumbbell,
  gimnasia: PersonStanding,
  resistencia: HeartPulse,
  constancia: Flame,
};

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

  const Icono = ICONO_PILAR[pilar];

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Icono className="size-4.5" style={{ color }} />
        </span>
        <h2 className="flex-1 font-heading text-base font-semibold">{label}</h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
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
                const pendiente = achievement?.estado === "pendiente";
                return (
                  <button
                    key={nivel}
                    className="relative flex flex-col items-center gap-1"
                    onClick={() => onSelect({ skill, nivel, achievement })}
                    aria-label={`${skill.nombreMedalla} – ${nivel === "base" ? "Insignia" : nivel}${lograda ? " (lograda)" : pendiente ? " (pendiente)" : ""}`}
                  >
                    <MedalBadge
                      pilar={pilar}
                      arte={skill.arte}
                      nivel={nivel}
                      colorPilar={color}
                      bloqueada={!lograda}
                      size="sm"
                    />
                    {(lograda || pendiente) && (
                      <span
                        className={cn(
                          "absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full text-white ring-2 ring-card",
                          lograda ? "bg-success" : "bg-warning"
                        )}
                      >
                        {lograda ? <Check className="size-3" /> : <Clock3 className="size-3" />}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {nivel === "base" ? "Insignia" : nivel}
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
