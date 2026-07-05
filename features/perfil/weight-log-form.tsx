"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addWeightLog } from "./api";

export function WeightLogForm({
  uid,
  ultimoPeso,
}: {
  uid: string;
  ultimoPeso: number | null;
}) {
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
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
      <Button type="submit" disabled={saving || !peso}>
        Guardar
      </Button>
    </form>
  );
}
