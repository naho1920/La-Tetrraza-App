"use client";

import { useEffect, useState } from "react";

import { Users } from "lucide-react";

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
import { listActivatedUsers } from "@/features/admin/api";
import type { UserDoc } from "@/features/auth/types";
import {
  assignMembership,
  getMembershipForUser,
  listAllMembershipsWithAlumno,
  listAllPlansAdmin,
  registerPayment,
  updatePlan,
  createPlan,
  type MembershipConAlumno,
} from "@/features/membresias/api";
import {
  ESTADO_BADGE_VARIANT,
  ESTADO_LABEL,
  calcularEstadoMembresia,
} from "@/features/membresias/estado";
import type { EstadoMembresia, MembershipPlan } from "@/features/membresias/types";
import { ComprobantesCard } from "@/features/pagos/comprobantes-card";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function PlansCard({ plans, onChanged }: { plans: MembershipPlan[]; onChanged: () => void }) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [clasesIncluidas, setClasesIncluidas] = useState("");
  const [duracionDias, setDuracionDias] = useState("30");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createPlan({
        nombre,
        precio: Number(precio),
        clasesIncluidas: clasesIncluidas ? Number(clasesIncluidas) : null,
        duracionDias: Number(duracionDias),
        activo: true,
      });
      setNombre("");
      setPrecio("");
      setClasesIncluidas("");
      setDuracionDias("30");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planes del box</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="nombre-plan">Nombre</Label>
            <Input id="nombre-plan" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="precio-plan">Precio</Label>
            <Input
              id="precio-plan"
              type="number"
              min={0}
              required
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="duracion-plan">Duración (días)</Label>
            <Input
              id="duracion-plan"
              type="number"
              min={1}
              required
              value={duracionDias}
              onChange={(e) => setDuracionDias(e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="clases-plan">Clases incluidas (opcional, vacío = ilimitado)</Label>
            <Input
              id="clases-plan"
              type="number"
              min={0}
              value={clasesIncluidas}
              onChange={(e) => setClasesIncluidas(e.target.value)}
            />
          </div>
          <Button type="submit" className="col-span-2" disabled={saving}>
            {saving ? "Agregando…" : "Agregar plan"}
          </Button>
        </form>

        <ul className="flex flex-col divide-y divide-border">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">
                {p.nombre} · ${p.precio} · {p.duracionDias} días
              </span>
              <Button
                size="sm"
                variant={p.activo ? "outline" : "secondary"}
                onClick={() => updatePlan(p.id, { activo: !p.activo }).then(onChanged)}
              >
                {p.activo ? "Desactivar" : "Activar"}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AsignarCard({
  alumnos,
  plans,
  onAsignado,
}: {
  alumnos: UserDoc[];
  plans: MembershipPlan[];
  onAsignado: () => void;
}) {
  const [uid, setUid] = useState("");
  const [planId, setPlanId] = useState("");
  const [fechaInicio, setFechaInicio] = useState(toISODate(new Date()));
  const [saving, setSaving] = useState(false);

  async function handleAsignar() {
    const plan = plans.find((p) => p.id === planId);
    if (!uid || !plan) return;
    setSaving(true);
    try {
      await assignMembership(uid, plan.id, fechaInicio, plan.duracionDias);
      onAsignado();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asignar plan a un alumno</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Select value={uid} onValueChange={(v) => setUid(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Alumno" />
          </SelectTrigger>
          <SelectContent>
            {alumnos.map((a) => (
              <SelectItem key={a.uid} value={a.uid}>
                {a.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={planId} onValueChange={(v) => setPlanId(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            {plans
              .filter((p) => p.activo)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre} (${p.precio})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fecha-inicio">Fecha de inicio</Label>
          <Input
            id="fecha-inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <Button disabled={saving || !uid || !planId} onClick={handleAsignar}>
          {saving ? "Asignando…" : "Asignar plan"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RegistrarPagoCard({ alumnos, presetUid }: { alumnos: UserDoc[]; presetUid?: string }) {
  const [uid, setUid] = useState("");
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(toISODate(new Date()));
  const [metodo, setMetodo] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (presetUid) handleSelectUid(presetUid);
  }, [presetUid]);

  async function handleSelectUid(nuevoUid: string) {
    setUid(nuevoUid);
    setMembershipId(null);
    setMensaje(null);
    if (!nuevoUid) return;
    setBuscando(true);
    try {
      const membership = await getMembershipForUser(nuevoUid);
      setMembershipId(membership?.id ?? null);
      if (!membership) setMensaje("Este alumno no tiene una membresía asignada todavía.");
    } finally {
      setBuscando(false);
    }
  }

  async function handleRegistrar() {
    if (!membershipId) return;
    setSaving(true);
    try {
      await registerPayment(membershipId, uid, Number(monto), fecha, metodo, notas);
      setMensaje("Pago registrado.");
      setMonto("");
      setMetodo("");
      setNotas("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar pago</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Select value={uid} onValueChange={(v) => handleSelectUid(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Alumno" />
          </SelectTrigger>
          <SelectContent>
            {alumnos.map((a) => (
              <SelectItem key={a.uid} value={a.uid}>
                {a.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {membershipId && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="monto-pago">Monto</Label>
                <Input
                  id="monto-pago"
                  type="number"
                  min={0}
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fecha-pago">Fecha</Label>
                <Input id="fecha-pago" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="metodo-pago">Método</Label>
              <Input
                id="metodo-pago"
                placeholder="Efectivo, transferencia…"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
              />
            </div>
            <Button disabled={saving || !monto} onClick={handleRegistrar}>
              {saving ? "Guardando…" : "Registrar pago"}
            </Button>
          </>
        )}

        {buscando && <p className="text-sm text-muted-foreground">Buscando membresía…</p>}
        {mensaje && <p className="text-sm text-muted-foreground">{mensaje}</p>}
      </CardContent>
    </Card>
  );
}

const FILTROS: { estado: EstadoMembresia | "todas"; label: string }[] = [
  { estado: "todas", label: "Todas" },
  { estado: "activa", label: "Al día" },
  { estado: "por_vencer", label: "Por vencer" },
  { estado: "vencida", label: "Vencidas" },
];

export default function AdminMembresiasPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [alumnos, setAlumnos] = useState<UserDoc[]>([]);
  const [memberships, setMemberships] = useState<MembershipConAlumno[]>([]);
  const [filtro, setFiltro] = useState<EstadoMembresia | "todas">("todas");
  const [presetUid, setPresetUid] = useState<string | undefined>(undefined);

  function cargar() {
    listAllPlansAdmin().then(setPlans);
    listAllMembershipsWithAlumno().then(setMemberships);
  }

  useEffect(() => {
    listActivatedUsers().then((users) => setAlumnos(users.filter((u) => u.rol === "alumno")));
    cargar();
  }, []);

  const listaFiltrada = memberships.filter(
    (m) => filtro === "todas" || calcularEstadoMembresia(m.membership.fechaFin) === filtro
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      <AsignarCard alumnos={alumnos} plans={plans} onAsignado={cargar} />
      <ComprobantesCard onRevisado={setPresetUid} />
      <RegistrarPagoCard alumnos={alumnos} presetUid={presetUid} />
      <PlansCard plans={plans} onChanged={cargar} />

      <Card>
        <CardHeader>
          <CardTitle>Membresías</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTROS.map(({ estado, label }) => (
              <Button
                key={estado}
                size="sm"
                variant={filtro === estado ? "default" : "outline"}
                onClick={() => setFiltro(estado)}
              >
                {label}
              </Button>
            ))}
          </div>
          {listaFiltrada.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Users className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">No hay membresías en esta categoría.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {listaFiltrada.map(({ membership, alumno, plan }) => {
                const estado = calcularEstadoMembresia(membership.fechaFin);
                return (
                  <li key={membership.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{alumno?.nombre ?? membership.uid}</p>
                      <p className="text-muted-foreground">
                        {plan?.nombre ?? "Plan"} · vence {membership.fechaFin}
                      </p>
                    </div>
                    <Badge variant={ESTADO_BADGE_VARIANT[estado]}>{ESTADO_LABEL[estado]}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
