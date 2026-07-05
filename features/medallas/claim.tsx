"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { claimAchievement, subirVideo } from "./api";
import type { Achievement, Skill } from "./types";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ClaimAchievementDialog({
  uid,
  skills,
  achievements,
  onClose,
  onClaimed,
}: {
  uid: string;
  skills: Skill[];
  achievements: Achievement[];
  onClose: () => void;
  onClaimed: () => void;
}) {
  const opciones = skills.flatMap((skill) =>
    skill.nivelesDisponibles
      .filter(
        (nivel) =>
          !achievements.some(
            (a) => a.skillId === skill.id && a.nivel === nivel && a.estado !== "rechazado"
          )
      )
      .map((nivel) => ({
        key: `${skill.id}:${nivel}`,
        label: nivel === "base" ? skill.nombreMedalla : `${skill.nombreMedalla} — ${nivel}`,
      }))
  );

  const [seleccion, setSeleccion] = useState("");
  const [fecha, setFecha] = useState(toISODate(new Date()));
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seleccion) return;
    const [skillId, nivel] = seleccion.split(":");
    setError(null);
    setEnviando(true);
    try {
      const videoPath = archivo ? await subirVideo(uid, archivo) : null;
      await claimAchievement(uid, skillId, nivel, fecha, videoPath);
      onClaimed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el logro.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar un logro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Medalla</Label>
            <Select value={seleccion} onValueChange={(v) => setSeleccion(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona qué conseguiste" />
              </SelectTrigger>
              <SelectContent>
                {opciones.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fecha-logro">Fecha</Label>
            <Input
              id="fecha-logro"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="video-logro">Video (opcional)</Label>
            <input
              id="video-logro"
              type="file"
              accept="video/*"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="h-11 text-base" disabled={enviando || !seleccion}>
            {enviando ? "Enviando…" : "Registrar logro"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
