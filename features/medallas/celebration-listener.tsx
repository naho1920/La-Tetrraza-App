"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { getSkill, getUncelebratedValidated, marcarCelebrado } from "./api";
import type { Achievement, Skill } from "./types";

const AchievementCelebration = dynamic(
  () => import("./celebration").then((m) => m.AchievementCelebration),
  { ssr: false }
);

/**
 * TASK-067: Listener global de celebraciones. Se monta en el layout de alumno
 * para que cualquier medalla validada dispare el confetti sin importar desde
 * qué página navegue el usuario (antes solo se disparaba en el Home).
 */
export function CelebrationListener() {
  const { status, userDoc } = useAuth();
  const [celebracion, setCelebracion] = useState<{ achievement: Achievement; skill: Skill } | null>(null);

  useEffect(() => {
    if (status !== "ready" || userDoc?.rol !== "alumno") return;
    getUncelebratedValidated(userDoc.uid).then(async (achievement) => {
      if (!achievement) return;
      const skill = await getSkill(achievement.skillId);
      if (skill) setCelebracion({ achievement, skill });
    });
  }, [status, userDoc]);

  async function handleClose() {
    if (!celebracion) return;
    await marcarCelebrado(celebracion.achievement.id);
    setCelebracion(null);
  }

  if (!celebracion) return null;

  return (
    <AchievementCelebration
      achievement={celebracion.achievement}
      skill={celebracion.skill}
      onClose={handleClose}
    />
  );
}
