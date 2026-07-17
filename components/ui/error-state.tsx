import { RotateCcw, Wifi } from "lucide-react";

import { Button } from "./button";

interface ErrorStateProps {
  mensaje?: string;
  onReintentar?: () => void;
}

/**
 * TASK-069: estado de error reutilizable con botón de reintento.
 * Reemplaza los `.catch(() => setX([]))` silenciosos que muestran "no tienes
 * datos" cuando en realidad falló la carga.
 */
export function ErrorState({
  mensaje = "No se pudieron cargar los datos.",
  onReintentar,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <Wifi className="size-6 text-destructive" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{mensaje}</p>
        <p className="text-xs text-muted-foreground">
          Revisa tu conexión e inténtalo de nuevo.
        </p>
      </div>
      {onReintentar && (
        <Button variant="outline" size="sm" onClick={onReintentar} className="gap-2">
          <RotateCcw className="size-4" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
