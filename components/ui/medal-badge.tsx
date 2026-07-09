"use client";

import { Dumbbell, Flame, HeartPulse, Lock, PersonStanding, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { Pilar } from "@/features/medallas/types";

const ICONO_PILAR: Record<Pilar, LucideIcon> = {
  fuerza: Dumbbell,
  gimnasia: PersonStanding,
  resistencia: HeartPulse,
  constancia: Flame,
};

const COLOR_NIVEL: Record<string, string> = {
  bronce: "#CD7F32",
  plata: "#B0B7C0",
  oro: "#F59E0B",
};

const SIZES = {
  sm: "size-12",
  md: "size-16",
  lg: "size-24",
};

export function MedalBadge({
  pilar,
  arte,
  nivel,
  colorPilar,
  bloqueada = false,
  size = "md",
}: {
  pilar: Pilar;
  arte: string;
  nivel: string;
  colorPilar: string;
  bloqueada?: boolean;
  size?: keyof typeof SIZES;
}) {
  const [imgFalla, setImgFalla] = useState(false);
  const Icono = bloqueada ? Lock : ICONO_PILAR[pilar];
  const color = COLOR_NIVEL[nivel] ?? colorPilar;
  const src = `/medals/${pilar}/${arte}-${nivel}.svg`;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full ring-2",
        SIZES[size],
        bloqueada && "opacity-40 grayscale"
      )}
      style={{ backgroundColor: `${color}22`, ["--tw-ring-color" as string]: color }}
    >
      {!imgFalla ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="96px"
          className="rounded-full object-contain p-1"
          onError={() => setImgFalla(true)}
        />
      ) : (
        <Icono className="size-1/2" style={{ color }} strokeWidth={1.75} />
      )}
    </div>
  );
}
