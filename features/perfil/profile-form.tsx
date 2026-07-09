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
import type { Meta, Sexo, UserDoc } from "@/features/auth/types";
import { updateProfile } from "./api";

const META_LABELS: Record<Meta, string> = {
  bajar_peso: "Bajar de peso",
  subir_masa: "Subir masa muscular",
  mejorar_resistencia: "Mejorar resistencia",
  competir: "Competir",
  salud_general: "Salud general",
};

const SEXO_LABELS: Record<Sexo, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  otro: "Otro",
};

function calcularEdad(fechaNac: string | null): number | null {
  if (!fechaNac) return null;
  const nacimiento = new Date(fechaNac);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const cumpleEsteAno =
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate());
  if (!cumpleEsteAno) edad -= 1;
  return edad;
}

function toList(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function ProfileForm({ userDoc, onSaved }: { userDoc: UserDoc; onSaved?: () => void }) {
  const [nombre, setNombre] = useState(userDoc.nombre ?? "");
  const [fechaNac, setFechaNac] = useState(userDoc.fechaNac ?? "");
  const [sexo, setSexo] = useState<Sexo | "">(userDoc.sexo ?? "");
  const [estaturaCm, setEstaturaCm] = useState(userDoc.estaturaCm?.toString() ?? "");
  const [cuelloCm, setCuelloCm] = useState(userDoc.cuelloCm?.toString() ?? "");
  const [cinturaCm, setCinturaCm] = useState(userDoc.cinturaCm?.toString() ?? "");
  const [piernaCm, setPiernaCm] = useState(userDoc.piernaCm?.toString() ?? "");
  const [brazoCm, setBrazoCm] = useState(userDoc.brazoCm?.toString() ?? "");
  const [alergias, setAlergias] = useState(userDoc.alergias?.join(", ") ?? "");
  const [lesiones, setLesiones] = useState(userDoc.lesiones?.join(", ") ?? "");
  const [meta, setMeta] = useState<Meta | "">(userDoc.meta ?? "");
  const [telefono, setTelefono] = useState(userDoc.telefono ?? "");
  const [contactoEmergencia, setContactoEmergencia] = useState(
    userDoc.contactoEmergencia ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const edad = calcularEdad(fechaNac || null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(userDoc.uid, {
        nombre,
        fechaNac: fechaNac || null,
        sexo: sexo || null,
        estaturaCm: estaturaCm ? Number(estaturaCm) : null,
        cuelloCm: cuelloCm ? Number(cuelloCm) : null,
        cinturaCm: cinturaCm ? Number(cinturaCm) : null,
        piernaCm: piernaCm ? Number(piernaCm) : null,
        brazoCm: brazoCm ? Number(brazoCm) : null,
        alergias: toList(alergias),
        lesiones: toList(lesiones),
        meta: meta || null,
        telefono: telefono || null,
        contactoEmergencia: contactoEmergencia || null,
      });
      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fechaNac">Fecha de nacimiento</Label>
          <Input
            id="fechaNac"
            type="date"
            value={fechaNac ?? ""}
            onChange={(e) => setFechaNac(e.target.value)}
          />
          {edad !== null && (
            <span className="text-xs text-muted-foreground">{edad} años</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sexo</Label>
          <Select value={sexo} onValueChange={(v) => setSexo(v as Sexo)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SEXO_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="estatura">Estatura (cm)</Label>
        <Input
          id="estatura"
          type="number"
          min={100}
          max={250}
          value={estaturaCm}
          onChange={(e) => setEstaturaCm(e.target.value)}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Medidas corporales (cm)</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cuello">Cuello</Label>
            <Input
              id="cuello"
              type="number"
              step="0.5"
              min={20}
              max={80}
              placeholder="Ej. 36"
              value={cuelloCm}
              onChange={(e) => setCuelloCm(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cintura">Cintura</Label>
            <Input
              id="cintura"
              type="number"
              step="0.5"
              min={40}
              max={200}
              placeholder="Ej. 72"
              value={cinturaCm}
              onChange={(e) => setCinturaCm(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pierna">Pierna</Label>
            <Input
              id="pierna"
              type="number"
              step="0.5"
              min={30}
              max={120}
              placeholder="Ej. 55"
              value={piernaCm}
              onChange={(e) => setPiernaCm(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brazo">Brazo</Label>
            <Input
              id="brazo"
              type="number"
              step="0.5"
              min={15}
              max={70}
              placeholder="Ej. 32"
              value={brazoCm}
              onChange={(e) => setBrazoCm(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label>Meta principal</Label>
        <Select value={meta} onValueChange={(v) => setMeta(v as Meta)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona tu meta" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(META_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alergias">Alergias</Label>
        <Textarea
          id="alergias"
          placeholder="Separadas por coma: maní, mariscos…"
          value={alergias}
          onChange={(e) => setAlergias(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lesiones">Lesiones o condiciones médicas</Label>
        <Textarea
          id="lesiones"
          placeholder="Separadas por coma: hombro derecho, rodilla…"
          value={lesiones}
          onChange={(e) => setLesiones(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input
          id="telefono"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contacto">Contacto de emergencia</Label>
        <Input
          id="contacto"
          placeholder="Nombre y teléfono"
          value={contactoEmergencia}
          onChange={(e) => setContactoEmergencia(e.target.value)}
        />
      </div>

      <Button type="submit" className="h-11 text-base" disabled={saving}>
        {saving ? "Guardando…" : saved ? "¡Guardado!" : "Guardar cambios"}
      </Button>
    </form>
  );
}
