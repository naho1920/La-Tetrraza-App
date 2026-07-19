"use client";

import { useEffect, useState } from "react";

import { ChevronDown, ChevronUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { listActivatedUsers } from "@/features/admin/api";
import type { UserDoc } from "@/features/auth/types";
import { useAuth } from "@/features/auth/AuthProvider";
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
import { listReportsByEstado, marcarRevisado, obtenerUrlComprobante } from "@/features/pagos/api";
import type { EstadoPago, PaymentReport } from "@/features/pagos/types";

type Tab = "estado" | "acciones";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ── Collapsible section ────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string | number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{title}</span>
          {badge !== undefined && badge !== "" && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3 flex flex-col gap-3">{children}</div>
      )}
    </div>
  );
}

// ── Asignar plan ───────────────────────────────────────────────────────────────

function AsignarPlan({
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
  const [ok, setOk] = useState(false);

  async function handleAsignar() {
    const plan = plans.find((p) => p.id === planId);
    if (!uid || !plan) return;
    setSaving(true);
    setOk(false);
    try {
      await assignMembership(uid, plan.id, fechaInicio, plan.duracionDias);
      setOk(true);
      setUid("");
      setPlanId("");
      setFechaInicio(toISODate(new Date()));
      onAsignado();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Select value={uid} onValueChange={(v) => { setUid(v ?? ""); setOk(false); }}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Alumno" />
        </SelectTrigger>
        <SelectContent>
          {alumnos.map((a) => (
            <SelectItem key={a.uid} value={a.uid}>{a.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={planId} onValueChange={(v) => { setPlanId(v ?? ""); setOk(false); }}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Plan" />
        </SelectTrigger>
        <SelectContent>
          {plans.filter((p) => p.activo).map((p) => (
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
      {ok && <p className="text-sm text-success">Plan asignado correctamente ✓</p>}
    </>
  );
}

// ── Comprobantes ───────────────────────────────────────────────────────────────

function Comprobantes({ onRevisado }: { onRevisado: (uid: string) => void }) {
  const { userDoc } = useAuth();
  const [filtro, setFiltro] = useState<EstadoPago>("pendiente");
  const [reportes, setReportes] = useState<PaymentReport[]>([]);
  const [abriendoId, setAbriendoId] = useState<string | null>(null);

  function cargar() {
    listReportsByEstado(filtro).then(setReportes);
  }

  useEffect(cargar, [filtro]);

  async function handleVer(reporte: PaymentReport) {
    if (!reporte.archivoPath) return;
    setAbriendoId(reporte.id);
    try {
      const url = await obtenerUrlComprobante(reporte.archivoPath);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setAbriendoId(null);
    }
  }

  async function handleMarcarRevisado(reporte: PaymentReport) {
    if (!userDoc) return;
    await marcarRevisado(reporte, userDoc.uid);
    onRevisado(reporte.uid);
    cargar();
  }

  return (
    <>
      <div className="flex gap-2">
        {(["pendiente", "revisado"] as EstadoPago[]).map((e) => (
          <Button
            key={e}
            size="sm"
            variant={filtro === e ? "default" : "outline"}
            onClick={() => setFiltro(e)}
          >
            {e === "pendiente" ? "Pendientes" : "Revisados"}
          </Button>
        ))}
      </div>
      {reportes.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          No hay comprobantes en esta categoría.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border">
          {reportes.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{r.nombreAlumno}</p>
                <Badge variant={r.estado === "revisado" ? "success" : "warning"}>
                  {r.estado === "revisado" ? "Revisado" : "Pendiente"}
                </Badge>
              </div>
              {r.nota && <p className="text-muted-foreground text-xs">{r.nota}</p>}
              <div className="flex gap-2">
                {r.archivoPath ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={abriendoId === r.id}
                    onClick={() => handleVer(r)}
                  >
                    {abriendoId === r.id ? "Abriendo…" : "Ver comprobante"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin comprobante (efectivo)</span>
                )}
                {r.estado === "pendiente" && (
                  <Button size="sm" onClick={() => handleMarcarRevisado(r)}>
                    Marcar revisado
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ── Registrar pago ─────────────────────────────────────────────────────────────

function RegistrarPago({
  alumnos,
  presetUid,
}: {
  alumnos: UserDoc[];
  presetUid?: string;
}) {
  const [uid, setUid] = useState("");
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(toISODate(new Date()));
  const [metodo, setMetodo] = useState("");
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
      if (!membership) setMensaje("Este alumno no tiene membresía asignada.");
    } finally {
      setBuscando(false);
    }
  }

  async function handleRegistrar() {
    if (!membershipId) return;
    setSaving(true);
    try {
      await registerPayment(membershipId, uid, Number(monto), fecha, metodo, "");
      setMensaje("Pago registrado ✓");
      setMonto("");
      setMetodo("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Select value={uid} onValueChange={(v) => handleSelectUid(v ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Alumno" />
        </SelectTrigger>
        <SelectContent>
          {alumnos.map((a) => (
            <SelectItem key={a.uid} value={a.uid}>{a.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {buscando && <p className="text-sm text-muted-foreground">Buscando membresía…</p>}

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
              <Input
                id="fecha-pago"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
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
      {mensaje && <p className="text-sm text-success">{mensaje}</p>}
    </>
  );
}

// ── Planes ─────────────────────────────────────────────────────────────────────

function Planes({ plans, onChanged }: { plans: MembershipPlan[]; onChanged: () => void }) {
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
    <>
      <ul className="flex flex-col divide-y divide-border rounded-xl border">
        {plans.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <div>
              <p className="font-medium">{p.nombre}</p>
              <p className="text-xs text-muted-foreground">
                ${p.precio} · {p.duracionDias} días
                {p.clasesIncluidas != null ? ` · ${p.clasesIncluidas} clases` : " · Ilimitado"}
              </p>
            </div>
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

      <div className="pt-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nuevo plan
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="nombre-plan">Nombre</Label>
            <Input
              id="nombre-plan"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
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
            <Label htmlFor="clases-plan">Clases incluidas (vacío = ilimitado)</Label>
            <Input
              id="clases-plan"
              type="number"
              min={0}
              value={clasesIncluidas}
              onChange={(e) => setClasesIncluidas(e.target.value)}
            />
          </div>
          <Button type="submit" className="col-span-2" disabled={saving}>
            {saving ? "Creando…" : "Crear plan"}
          </Button>
        </form>
      </div>
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const FILTROS_ESTADO: { estado: EstadoMembresia | "todas"; label: string }[] = [
  { estado: "todas", label: "Todas" },
  { estado: "activa", label: "Al día" },
  { estado: "por_vencer", label: "Por vencer" },
  { estado: "vencida", label: "Vencidas" },
];

export default function AdminMembresiasPage() {
  const [tab, setTab] = useState<Tab>("estado");
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

  const cuentas = {
    activa: memberships.filter((m) => calcularEstadoMembresia(m.membership.fechaFin) === "activa").length,
    por_vencer: memberships.filter((m) => calcularEstadoMembresia(m.membership.fechaFin) === "por_vencer").length,
    vencida: memberships.filter((m) => calcularEstadoMembresia(m.membership.fechaFin) === "vencida").length,
  };

  function handleRevisado(uid: string) {
    setPresetUid(uid);
    setTab("acciones");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      <h1 className="font-heading text-xl font-semibold">Membresías</h1>

      {/* Tab bar */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        <button
          onClick={() => setTab("estado")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            tab === "estado"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Estado
        </button>
        <button
          onClick={() => setTab("acciones")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            tab === "acciones"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Acciones
        </button>
      </div>

      {/* Tab: Estado */}
      {tab === "estado" && (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center rounded-xl border bg-card py-3">
              <p className="text-xl font-bold text-success">{cuentas.activa}</p>
              <p className="text-[11px] text-muted-foreground">Al día</p>
            </div>
            <div className="flex flex-col items-center rounded-xl border bg-card py-3">
              <p className="text-xl font-bold text-warning">{cuentas.por_vencer}</p>
              <p className="text-[11px] text-muted-foreground">Por vencer</p>
            </div>
            <div className="flex flex-col items-center rounded-xl border bg-card py-3">
              <p className="text-xl font-bold text-destructive">{cuentas.vencida}</p>
              <p className="text-[11px] text-muted-foreground">Vencidas</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {FILTROS_ESTADO.map(({ estado, label }) => (
              <Button
                key={estado}
                size="sm"
                variant={filtro === estado ? "default" : "outline"}
                onClick={() => setFiltro(estado)}
              >
                {label}
                {estado !== "todas" && (
                  <span className="ml-1 opacity-60">
                    {estado === "activa" ? cuentas.activa : estado === "por_vencer" ? cuentas.por_vencer : cuentas.vencida}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* List */}
          {listaFiltrada.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Users className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">No hay membresías en esta categoría.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y rounded-xl border">
              {listaFiltrada.map(({ membership, alumno, plan }) => {
                const estado = calcularEstadoMembresia(membership.fechaFin);
                return (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{alumno?.nombre ?? membership.uid}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan?.nombre ?? "Plan"} · vence {membership.fechaFin}
                      </p>
                    </div>
                    <Badge variant={ESTADO_BADGE_VARIANT[estado]} className="shrink-0">
                      {ESTADO_LABEL[estado]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Acciones */}
      {tab === "acciones" && (
        <div className="flex flex-col gap-2">
          <Section title="Asignar plan">
            <AsignarPlan alumnos={alumnos} plans={plans} onAsignado={cargar} />
          </Section>

          <Section title="Comprobantes de pago">
            <Comprobantes onRevisado={handleRevisado} />
          </Section>

          <Section title="Registrar pago">
            <RegistrarPago alumnos={alumnos} presetUid={presetUid} />
          </Section>

          <Section title="Planes del box" badge={plans.filter(p => p.activo).length}>
            <Planes plans={plans} onChanged={cargar} />
          </Section>
        </div>
      )}
    </div>
  );
}
