"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSkill, listAllSkillsAdmin, updateSkill } from "@/features/medallas/api";
import { PILARES } from "@/features/medallas/catalogo";
import type { Pilar, Skill, TipoSkill } from "@/features/medallas/types";

const VACIO = {
  pilar: "fuerza" as Pilar,
  nombreMedalla: "",
  habilidad: "",
  tipo: "insignia" as TipoSkill,
  tieneOro: false,
  relativoABW: false,
  orden: "1",
  arte: "",
  hitoBronce: "",
  hitoPlata: "",
  hitoOro: "",
  hitoBase: "",
};

function SkillForm({
  editando,
  onGuardado,
  onCancelar,
}: {
  editando: Skill | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState(() =>
    editando
      ? {
          pilar: editando.pilar,
          nombreMedalla: editando.nombreMedalla,
          habilidad: editando.habilidad,
          tipo: editando.tipo,
          tieneOro: editando.nivelesDisponibles.includes("oro") && editando.tipo === "insignia",
          relativoABW: editando.relativoABW,
          orden: String(editando.orden),
          arte: editando.arte,
          hitoBronce: editando.hitos.bronce ?? "",
          hitoPlata: editando.hitos.plata ?? "",
          hitoOro: editando.hitos.oro ?? "",
          hitoBase: editando.hitos.base ?? "",
        }
      : VACIO
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const nivelesDisponibles =
        form.tipo === "niveles" ? ["bronce", "plata", "oro"] : form.tieneOro ? ["base", "oro"] : ["base"];
      const hitos: Record<string, string> =
        form.tipo === "niveles"
          ? { bronce: form.hitoBronce, plata: form.hitoPlata, oro: form.hitoOro }
          : form.tieneOro
            ? { base: form.hitoBase, oro: form.hitoOro }
            : { base: form.hitoBase };

      const data = {
        pilar: form.pilar,
        nombreMedalla: form.nombreMedalla,
        habilidad: form.habilidad,
        tipo: form.tipo,
        nivelesDisponibles,
        hitos,
        relativoABW: form.relativoABW,
        orden: Number(form.orden) || 0,
        arte: form.arte,
      };

      if (editando) {
        await updateSkill(editando.id, data);
      } else {
        await createSkill({ ...data, activa: true });
      }
      onGuardado();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pilar-select">Pilar</Label>
          <Select value={form.pilar} onValueChange={(v) => set("pilar", (v ?? "fuerza") as Pilar)}>
            <SelectTrigger id="pilar-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PILARES.map(({ pilar, label }) => (
                <SelectItem key={pilar} value={pilar}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tipo-select">Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => set("tipo", (v ?? "insignia") as TipoSkill)}>
            <SelectTrigger id="tipo-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="niveles">Niveles (bronce/plata/oro)</SelectItem>
              <SelectItem value="insignia">Insignia única</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre-medalla">Nombre de la medalla</Label>
        <Input
          id="nombre-medalla"
          required
          value={form.nombreMedalla}
          onChange={(e) => set("nombreMedalla", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="habilidad">Habilidad / ejercicio</Label>
        <Input id="habilidad" required value={form.habilidad} onChange={(e) => set("habilidad", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="arte">Slug de arte (público/medals/{"{pilar}"}/slug-nivel.svg)</Label>
        <Input id="arte" required value={form.arte} onChange={(e) => set("arte", e.target.value)} />
      </div>

      {form.tipo === "niveles" ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hito-bronce">Hito bronce</Label>
            <Input id="hito-bronce" value={form.hitoBronce} onChange={(e) => set("hitoBronce", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hito-plata">Hito plata</Label>
            <Input id="hito-plata" value={form.hitoPlata} onChange={(e) => set("hitoPlata", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hito-oro">Hito oro</Label>
            <Input id="hito-oro" value={form.hitoOro} onChange={(e) => set("hitoOro", e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hito-base">Hito</Label>
            <Input id="hito-base" required value={form.hitoBase} onChange={(e) => set("hitoBase", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.tieneOro}
              onChange={(e) => set("tieneOro", e.target.checked)}
            />
            Tiene una variante oro
          </label>
          {form.tieneOro && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hito-oro-insignia">Hito oro</Label>
              <Input
                id="hito-oro-insignia"
                value={form.hitoOro}
                onChange={(e) => set("hitoOro", e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.relativoABW}
            onChange={(e) => set("relativoABW", e.target.checked)}
          />
          Relativo al peso corporal
        </label>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="orden">Orden</Label>
          <Input id="orden" type="number" value={form.orden} onChange={(e) => set("orden", e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        {editando && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear medalla"}
        </Button>
      </div>
    </form>
  );
}

export default function CatalogoMedallasPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editando, setEditando] = useState<Skill | null>(null);

  function cargar() {
    listAllSkillsAdmin().then(setSkills);
  }

  useEffect(cargar, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      <Card>
        <CardHeader>
          <CardTitle>{editando ? "Editar medalla" : "Nueva medalla"}</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillForm
            key={editando?.id ?? "new"}
            editando={editando}
            onGuardado={() => {
              setEditando(null);
              cargar();
            }}
            onCancelar={() => setEditando(null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo ({skills.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {skills.map((skill) => (
              <li key={skill.id} className="flex items-center justify-between gap-3 py-2.5">
                <button className="flex-1 text-left text-sm" onClick={() => setEditando(skill)}>
                  {skill.nombreMedalla}
                  {!skill.activa && <Badge variant="outline" className="ml-2">inactiva</Badge>}
                </button>
                <Button
                  size="sm"
                  variant={skill.activa ? "outline" : "secondary"}
                  onClick={() => updateSkill(skill.id, { activa: !skill.activa }).then(cargar)}
                >
                  {skill.activa ? "Desactivar" : "Activar"}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
