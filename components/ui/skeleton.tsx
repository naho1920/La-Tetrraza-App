import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-2xl bg-muted", className)}
      {...props}
    />
  );
}

/**
 * Esqueleto genérico de página: se muestra mientras cargan los datos para
 * que la pantalla nunca quede en blanco (hero + tarjetas + lista).
 */
function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8" aria-busy="true" aria-label="Cargando…">
      <div className="flex items-center gap-3 py-2">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-24 w-full rounded-3xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

export { PageSkeleton, Skeleton };
