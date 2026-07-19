"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { getFormForUser, getOrCreateDraftForm, getPlanesForUser } from "@/features/nutricion/api";
import { NutritionFormWizard } from "@/features/nutricion/form-wizard";
import { PlanViewer } from "@/features/nutricion/plan-viewer";
import { NutritionStatusStepper } from "@/features/nutricion/status-stepper";
import type { NutritionForm, NutritionPlan } from "@/features/nutricion/types";

export default function NutricionPage() {
  const { userDoc } = useAuth();
  const [form, setForm] = useState<NutritionForm | null>(null);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [reenviando, setReenviando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);

  async function cargar() {
    if (!userDoc) return;
    setErrorCarga(false);
    try {
      const existente = await getFormForUser(userDoc.uid);
      if (existente) {
        setForm(existente);
        if (existente.estado === "plan_enviado") {
          const planes = await getPlanesForUser(userDoc.uid);
          setPlan(planes[0] ?? null);
        }
        return;
      }
      const nuevo = await getOrCreateDraftForm(userDoc.uid, {
        nombre: userDoc.nombre ?? "",
        fechaNac: userDoc.fechaNac ?? "",
        estaturaCm: userDoc.estaturaCm ? String(userDoc.estaturaCm) : "",
      });
      setForm(nuevo);
    } catch {
      setErrorCarga(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleActualizarFormulario() {
    if (!userDoc) return;
    setReenviando(true);
    try {
      const nuevo = await getOrCreateDraftForm(userDoc.uid, {
        nombre: userDoc.nombre ?? "",
        fechaNac: userDoc.fechaNac ?? "",
        estaturaCm: userDoc.estaturaCm ? String(userDoc.estaturaCm) : "",
      });
      setForm(nuevo);
      setPlan(null);
    } finally {
      setReenviando(false);
    }
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc]);

  if (!userDoc || loading) return <PageSkeleton />;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center gap-3 py-2">
        <h1 className="font-heading text-xl font-semibold">Nutrición</h1>
      </header>

      {errorCarga && (
        <ErrorState
          mensaje="No se pudo cargar tu información de nutrición."
          onReintentar={cargar}
        />
      )}

      {!errorCarga && form && (
        form.enviado ? (
          <Card>
            <CardHeader>
              <CardTitle>Tu plan alimenticio</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <NutritionStatusStepper estado={form.estado} />
              {form.estado === "en_revision" && (
                <p className="text-sm text-muted-foreground">
                  Tu coach está revisando tu formulario. Te avisamos apenas tengas tu plan listo.
                </p>
              )}
              {form.estado === "plan_enviado" && plan && <PlanViewer plan={plan} />}
              {form.estado === "plan_enviado" && (
                <Button variant="outline" disabled={reenviando} onClick={handleActualizarFormulario}>
                  {reenviando ? "Un momento…" : "Actualizar formulario (mis objetivos cambiaron)"}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Formulario de nutrición</CardTitle>
            </CardHeader>
            <CardContent>
              <NutritionFormWizard form={form} onEnviado={cargar} />
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
