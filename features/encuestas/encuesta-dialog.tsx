"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { enviarEncuesta } from "./api";
import { OPCIONES_ANIMO, OPCIONES_PROGRESO } from "./preguntas";
import type { ProgresoPercibido } from "./types";

/**
 * Encuesta mensual: una sola pantalla, no un wizard de pasos — con 5
 * preguntas, obligar a pasar varias pantallas baja la tasa de respuesta sin
 * ganar nada. `DialogContent` ya scrollea solo (`max-h-[85vh]`).
 */
export function EncuestaDialog({
  uid,
  alumnoNombre,
  onClose,
  onEnviada,
}: {
  uid: string;
  alumnoNombre: string;
  onClose: () => void;
  onEnviada: () => void;
}) {
  const [animo, setAnimo] = useState<number | null>(null);
  const [progreso, setProgreso] = useState<ProgresoPercibido | null>(null);
  const [molestias, setMolestias] = useState("");
  const [loMejor, setLoMejor] = useState("");
  const [aMejorar, setAMejorar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!animo || !progreso) {
      setError("Contanos cómo te sentiste y cómo ves tu progreso para poder enviar.");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await enviarEncuesta({
        uid,
        alumnoNombre,
        animo,
        progreso,
        molestias: molestias.trim() || null,
        loMejor: loMejor.trim() || null,
        aMejorar: aMejorar.trim() || null,
      });
      onEnviada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la encuesta. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Cómo te fue este mes?</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">
          Tu coach va a ver tus respuestas con tu nombre, para poder ayudarte mejor.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>¿Cómo te sentiste entrenando este mes?</Label>
            <div className="flex flex-wrap gap-2">
              {OPCIONES_ANIMO.map((o) => (
                <ToggleChip key={o.value} label={o.label} active={animo === o.value} onClick={() => setAnimo(o.value)} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>¿Cómo sentís tu progreso?</Label>
            <div className="flex flex-wrap gap-2">
              {OPCIONES_PROGRESO.map((o) => (
                <ToggleChip
                  key={o.value}
                  label={o.label}
                  active={progreso === o.value}
                  onClick={() => setProgreso(o.value)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="molestias">¿Alguna molestia o dolor al entrenar? (opcional)</Label>
            <Textarea
              id="molestias"
              placeholder="Ej: dolor de hombro al hacer press"
              value={molestias}
              onChange={(e) => setMolestias(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lo-mejor">¿Qué fue lo mejor del mes? (opcional)</Label>
            <Textarea id="lo-mejor" value={loMejor} onChange={(e) => setLoMejor(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-mejorar">¿Qué mejorarías? (opcional)</Label>
            <Textarea id="a-mejorar" value={aMejorar} onChange={(e) => setAMejorar(e.target.value)} />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
