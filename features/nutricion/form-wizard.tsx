"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveFormDraft, submitForm } from "./api";
import { PASOS_NUTRICION, type Pregunta } from "./questions";
import type { NutritionForm } from "./types";

function CampoPregunta({
  pregunta,
  value,
  onChange,
}: {
  pregunta: Pregunta;
  value: string;
  onChange: (value: string) => void;
}) {
  if (pregunta.tipo === "select") {
    return (
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona" />
        </SelectTrigger>
        <SelectContent>
          {pregunta.opciones?.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (pregunta.tipo === "textarea") {
    return (
      <Textarea
        value={value}
        placeholder={pregunta.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <Input
      type={pregunta.tipo === "numero" ? "number" : pregunta.tipo === "fecha" ? "date" : "text"}
      value={value}
      placeholder={pregunta.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function NutritionFormWizard({
  form,
  onEnviado,
}: {
  form: NutritionForm;
  onEnviado: () => void;
}) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(form.respuestas ?? {});
  const [pasoActual, setPasoActual] = useState(1);
  const [saving, setSaving] = useState(false);

  const paso = PASOS_NUTRICION[pasoActual - 1];
  const esUltimoPaso = pasoActual === PASOS_NUTRICION.length;

  function setValor(key: string, value: string) {
    setRespuestas((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSiguiente() {
    setSaving(true);
    try {
      await saveFormDraft(form.id, respuestas);
      if (esUltimoPaso) {
        await submitForm(form.id);
        onEnviado();
      } else {
        setPasoActual((p) => p + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(pasoActual / PASOS_NUTRICION.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Paso {pasoActual} de {PASOS_NUTRICION.length} · {paso.titulo}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {paso.preguntas.map((pregunta) => (
          <div key={pregunta.key} className="flex flex-col gap-1.5">
            <Label>{pregunta.label}</Label>
            <CampoPregunta
              pregunta={pregunta}
              value={respuestas[pregunta.key] ?? ""}
              onChange={(v) => setValor(pregunta.key, v)}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {pasoActual > 1 && (
          <Button variant="outline" className="flex-1" onClick={() => setPasoActual((p) => p - 1)}>
            Atrás
          </Button>
        )}
        <Button className="flex-1 h-11 text-base" disabled={saving} onClick={handleSiguiente}>
          {saving ? "Guardando…" : esUltimoPaso ? "Enviar formulario" : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}
