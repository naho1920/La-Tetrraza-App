"use client";

import { forwardRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addWeightLog, type WeightLog } from "./api";

interface WeightLogFormProps {
  uid: string;
  ultimoPeso: number | null;
  onSaved?: (log: WeightLog) => void;
  /** El onboarding dispara el envío desde un botón compartido con otro formulario. */
  hideSubmitButton?: boolean;
}

export const WeightLogForm = forwardRef<HTMLFormElement, WeightLogFormProps>(function WeightLogForm(
  { uid, ultimoPeso, onSaved, hideSubmitButton },
  ref
) {
  const [peso, setPeso] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedPeso, setSavedPeso] = useState<number | null>(ultimoPeso);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(peso);
    if (!valor) return;
    setSaving(true);
    try {
      await addWeightLog(uid, valor);
      setSavedPeso(valor);
      setPeso("");
      onSaved?.({ id: crypto.randomUUID(), pesoKg: valor, fecha: { toDate: () => new Date() } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="peso">Registrar peso (kg)</Label>
        <Input
          id="peso"
          type="number"
          step="0.1"
          min={20}
          max={300}
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          placeholder={savedPeso ? `Último: ${savedPeso} kg` : "Ej. 68.5"}
        />
      </div>
      {!hideSubmitButton && (
        <Button type="submit" className="h-11" disabled={saving || !peso}>
          Guardar
        </Button>
      )}
    </form>
  );
});
