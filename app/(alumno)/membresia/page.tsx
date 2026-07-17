"use client";

import { useEffect, useState } from "react";

import { CreditCard, Receipt } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function MembresiaPage() {
  const { userDoc } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [pagos, setPagos] = useState<Payment[]>([]);
  const [planesDisponibles, setPlanesDisponibles] = useState<MembershipPlan[]>([]);
  const [reportes, setReportes] = useState<PaymentReport[]>([]);

  function cargarReportes(uid: string) {
    getReportsForUser(uid).then(setReportes);
  }

  useEffect(() => {
    if (!userDoc) return;
    let ignore = false;

    getMembershipForUser(userDoc.uid).then(async (m) => {
      if (ignore) return;
      setMembership(m);
      if (m) {
        const p = await getPlan(m.planId);
        if (!ignore) setPlan(p);
      }
    });
    listPaymentsForUser(userDoc.uid).then((p) => !ignore && setPagos(p));
    listActivePlans().then((p) => !ignore && setPlanesDisponibles(p));
    getReportsForUser(userDoc.uid).then((r) => !ignore && setReportes(r));

    return () => {
      ignore = true;
    };
  }, [userDoc]);

  if (!userDoc) return <PageSkeleton />;

  const estado = membership ? calcularEstadoMembresia(membership.fechaFin) : null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <Card>
        <CardHeader>
          <CardTitle>Tu membresía</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!membership ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <CreditCard className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">Todavía no tienes una membresía asignada. Habla con tu coach.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="font-medium">{plan?.nombre ?? "Plan"}</p>
                {estado && <Badge variant={ESTADO_BADGE_VARIANT[estado]}>{ESTADO_LABEL[estado]}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">Vence el {membership.fechaFin}</p>
              {(estado === "por_vencer" || estado === "vencida") && (
                <Alert variant={estado === "vencida" ? "destructive" : "default"}>
                  <AlertDescription>
                    {estado === "vencida"
                      ? "Tu membresía venció. Renuévala con tu coach para seguir reservando clases."
                      : "Tu membresía está por vencer. Renuévala pronto con tu coach 💜"}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reportar pago</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Sube tu comprobante o avísale a tu coach que ya pagaste este mes.
          </p>
          {userDoc && (
            <ReportarPagoDialog onReportado={() => cargarReportes(userDoc.uid)} />
          )}
        </CardContent>
      </Card>

      {reportes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tus comprobantes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {reportes.map((reporte) => (
                <li key={reporte.id} className="flex flex-col gap-1 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{reporte.nota || "Sin nota"}</span>
                    <Badge variant={reporte.estado === "revisado" ? "success" : "warning"}>
                      {reporte.estado === "revisado" ? "Revisado ✓" : "Enviado — en revisión"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Receipt className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {pagos.map((pago) => (
                <li key={pago.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>{pago.fecha}</span>
                  <span className="text-muted-foreground">{pago.metodo}</span>
                  <span className="font-medium">${pago.monto}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planes del box</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {planesDisponibles.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{p.nombre}</span>
                <span className="text-muted-foreground">${p.precio}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
