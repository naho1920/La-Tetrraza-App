"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MedalBadge } from "@/components/ui/medal-badge";
import { PILARES } from "./catalogo";
import type { Achievement, Skill } from "./types";

export function AchievementCelebration({
  achievement,
  skill,
  onClose,
}: {
  achievement: Achievement;
  skill: Skill;
  onClose: () => void;
}) {
  useEffect(() => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  }, []);

  const color = PILARES.find((p) => p.pilar === skill.pilar)?.color ?? "#6934E1";
  const nombre =
    achievement.nivel === "base" ? skill.nombreMedalla : `${skill.nombreMedalla} — ${achievement.nivel}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="items-center justify-items-center text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
        >
          <MedalBadge
            pilar={skill.pilar}
            arte={skill.arte}
            nivel={achievement.nivel}
            colorPilar={color}
            size="lg"
          />
        </motion.div>
        <DialogHeader className="items-center pr-0">
          <DialogTitle>¡Ganaste la medalla {nombre}! 🎉</DialogTitle>
          <DialogDescription>Pasa por el box a recibir tu pin 📍</DialogDescription>
        </DialogHeader>
        <Button className="h-11 w-full text-base" onClick={onClose}>
          ¡Genial!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
