"use client";

import { useEffect, useState } from "react";

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

export default function MembresiaPage() {
  const { userDoc } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [pagos, setPagos] = useState<Payment[]>([]);
  const [planesDisponibles, setPlanesDisponibles] = useState<MembershipPlan[]>([]);

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
            <p className="text-sm text-muted-foreground">
              Todavía no tienes una membresía asignada. Habla con tu coach.
            </p>
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
          <CardTitle>Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
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
