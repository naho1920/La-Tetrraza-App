"use client";

import { useEffect, useState } from "react";

import { ArrowLeft, ChevronDown, ChevronUp, CreditCard, Receipt } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getMembershipForUser,
  getPlan,
  listActivePlans,
  listPaymentsForUser,
} from "@/features/membresias/api";
import { ESTADO_BADGE_VARIANT, ESTADO_LABEL, calcularEstadoMembresia } from "@/features/membresias/estado";
import type { Membership, MembershipPlan, Payment } from "@/features/membresias/types";
import { getReportsForUser } from "@/features/pagos/api";
import { ReportarPagoDialog } from "@/features/pagos/reportar-pago-dialog";
import type { PaymentReport } from "@/features/pagos/types";

function Collapsible({
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
          {badge !== undefined && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
        <div className="border-t px-4 pb-4 pt-3">{children}</div>
      )}
    </div>
  );
}

export default function MembresiaPage() {
  const { userDoc } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [pagos, setPagos] = useState<Payment[]>([]);
  const [planesDisponibles, setPlanesDisponibles] = useState<MembershipPlan[]>([]);
  const [reportes, setReportes] = useState<PaymentReport[]>([]);
  const [loading, setLoading] = useState(true);

  function cargarReportes(uid: string) {
    getReportsForUser(uid).then(setReportes);
  }

  useEffect(() => {
    if (!userDoc) return;
    let ignore = false;

    Promise.all([
      getMembershipForUser(userDoc.uid).then(async (m) => {
        if (ignore) return;
        setMembership(m);
        if (m) {
          const p = await getPlan(m.planId);
          if (!ignore) setPlan(p);
        }
      }),
      listPaymentsForUser(userDoc.uid).then((p) => !ignore && setPagos(p)),
      listActivePlans().then((p) => !ignore && setPlanesDisponibles(p)),
      getReportsForUser(userDoc.uid).then((r) => !ignore && setReportes(r)),
    ]).finally(() => !ignore && setLoading(false));

    return () => { ignore = true; };
  }, [userDoc]);

  if (!userDoc || loading) return <PageSkeleton />;

  const estado = membership ? calcularEstadoMembresia(membership.fechaFin) : null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      {/* Header con back */}
      <header className="flex items-center gap-3 py-2">
        <Link
          href="/perfil"
          aria-label="Volver"
          className="flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10 transition-colors active:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-heading text-xl font-semibold">Mi membresía</h1>
      </header>

      {/* Estado actual */}
      {!membership ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center ring-1 ring-foreground/10">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <CreditCard className="size-6 text-muted-foreground" />
          </span>
          <div>
            <p className="font-semibold">Sin membresía activa</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Habla con tu coach para que te asigne un plan.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-3xl bg-card-dark p-5 text-card-dark-foreground">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-card-dark-foreground/60 mb-0.5">Plan actual</p>
              <p className="font-heading text-xl font-semibold">{plan?.nombre ?? "—"}</p>
            </div>
            {estado && (
              <Badge variant={ESTADO_BADGE_VARIANT[estado]} className="shrink-0">
                {ESTADO_LABEL[estado]}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-card-dark-foreground/70">
            <span>Vence el <strong className="text-card-dark-foreground">{membership.fechaFin}</strong></span>
            {plan?.precio != null && (
              <span>${plan.precio} / mes</span>
            )}
          </div>
          {(estado === "por_vencer" || estado === "vencida") && (
            <Alert variant={estado === "vencida" ? "destructive" : "default"} className="bg-transparent border-white/20 text-card-dark-foreground">
              <AlertDescription className="text-card-dark-foreground/80">
                {estado === "vencida"
                  ? "Tu membresía venció. Renuévala con tu coach para seguir reservando clases."
                  : "Tu membresía está por vencer. Renuévala pronto 💜"}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Reportar pago */}
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <p className="font-semibold text-sm">Reportar pago</p>
        <p className="text-xs text-muted-foreground">
          Sube tu comprobante o avísale a tu coach que ya pagaste.
        </p>
        <ReportarPagoDialog onReportado={() => cargarReportes(userDoc.uid)} />
      </div>

      {/* Comprobantes enviados */}
      {reportes.length > 0 && (
        <Collapsible title="Comprobantes enviados" badge={reportes.length}>
          <ul className="flex flex-col divide-y divide-border">
            {reportes.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <span className="text-muted-foreground truncate">{r.nota || "Sin nota"}</span>
                <Badge variant={r.estado === "revisado" ? "success" : "warning"} className="shrink-0">
                  {r.estado === "revisado" ? "Revisado ✓" : "En revisión"}
                </Badge>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {/* Historial de pagos */}
      <Collapsible title="Historial de pagos" badge={pagos.length > 0 ? pagos.length : undefined}>
        {pagos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Receipt className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {pagos.map((pago) => (
              <li key={pago.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-muted-foreground">{pago.fecha}</span>
                <span className="text-muted-foreground">{pago.metodo}</span>
                <span className="font-semibold">${pago.monto}</span>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      {/* Planes disponibles */}
      <Collapsible title="Planes del box" badge={planesDisponibles.length}>
        <ul className="flex flex-col divide-y divide-border">
          {planesDisponibles.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="font-medium">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">{p.duracionDias} días</p>
              </div>
              <span className="font-semibold">${p.precio}</span>
            </li>
          ))}
        </ul>
      </Collapsible>
    </div>
  );
}
