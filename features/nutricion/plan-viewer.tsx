"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { obtenerUrlPlan } from "./api";
import type { NutritionPlan } from "./types";

export function PlanViewer({ plan }: { plan: NutritionPlan }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    setError(null);
    obtenerUrlPlan(plan.archivoPath)
      .then(setUrl)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el plan."));
  }, [plan.archivoPath]);

  return (
    <div className="flex flex-col gap-2">
      {plan.notas && <p className="text-sm text-muted-foreground">{plan.notas}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {url && (
        <>
          <iframe src={url} title="Plan alimenticio" className="h-96 w-full rounded-lg border border-border" />
          <Button render={<a href={url} download />} variant="outline">
            Descargar PDF
          </Button>
        </>
      )}
    </div>
  );
}
