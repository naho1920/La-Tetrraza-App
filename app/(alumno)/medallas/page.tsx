"use client";

import { useEffect, useState } from "react";

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
import { PILARES } from "@/features/medallas/catalogo";
import { listAchievementsForUser, listSkills } from "@/features/medallas/api";
import { ClaimAchievementDialog } from "@/features/medallas/claim";
import { PillarSection, type MedalSeleccionada } from "@/features/medallas/pillar-section";
import type { Achievement, Skill } from "@/features/medallas/types";
import { getLatestWeightLog } from "@/features/perfil/api";

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

  if (!userDoc) return null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pb-24">
      <Button className="h-11 self-start text-base" onClick={() => setMostrarClaim(true)}>
        Registrar logro
      </Button>

      {PILARES.map(({ pilar, label, color }) => (
        <PillarSection
          key={pilar}
          pilar={pilar}
          label={label}
          color={color}
          skills={skills}
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
                colorPilar={PILARES.find((p) => p.pilar === seleccion.skill.pilar)?.color ?? "#8B5CF6"}
                bloqueada={seleccion.achievement?.estado !== "validado"}
                size="lg"
              />
              <DialogTitle>
                {seleccion.nivel === "base" ? seleccion.skill.nombreMedalla : `${seleccion.skill.nombreMedalla} — ${seleccion.nivel}`}
              </DialogTitle>
              <DialogDescription>{seleccion.skill.habilidad}</DialogDescription>
            </DialogHeader>
            <p className="text-sm">
              {textoHito(seleccion.skill.hitos[seleccion.nivel], seleccion.skill.relativoABW, pesoKg)}
            </p>
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
