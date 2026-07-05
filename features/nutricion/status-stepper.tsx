import { cn } from "@/lib/utils";
import type { EstadoNutricion } from "./types";

const ETAPAS: { estado: EstadoNutricion; label: string }[] = [
  { estado: "pendiente", label: "Formulario enviado" },
  { estado: "en_revision", label: "En revisión" },
  { estado: "plan_enviado", label: "Plan enviado" },
];

export function NutritionStatusStepper({ estado }: { estado: EstadoNutricion }) {
  const activeIndex = ETAPAS.findIndex((e) => e.estado === estado);

  return (
    <div className="flex items-start gap-2">
      {ETAPAS.map((etapa, i) => (
        <div key={etapa.estado} className="flex flex-1 flex-col items-center gap-1.5">
          <div className={cn("h-1.5 w-full rounded-full", i <= activeIndex ? "bg-primary" : "bg-muted")} />
          <span
            className={cn(
              "text-center text-[11px] leading-tight",
              i <= activeIndex ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {etapa.label}
          </span>
        </div>
      ))}
    </div>
  );
}
