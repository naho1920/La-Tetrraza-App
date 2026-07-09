import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Bento grid: mosaico de 2 columnas con tiles de distintos tamaños.
 * Variantes: `default` (tarjeta clara), `dark` (tarjeta oscura protagonista),
 * `accent` (morado de marca, para un solo tile por pantalla como detalle).
 */

const VARIANTES = {
  default: "bg-card ring-1 ring-foreground/10",
  dark: "bg-card-dark text-card-dark-foreground",
  accent: "bg-primary text-primary-foreground",
} as const;

type BentoVariant = keyof typeof VARIANTES;

function BentoGrid({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid grid-cols-2 gap-3", className)} {...props} />;
}

function BentoTile({
  variant = "default",
  href,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: BentoVariant;
  href?: string;
}) {
  const clases = cn(
    "flex flex-col gap-2 rounded-3xl p-4 transition-transform",
    VARIANTES[variant],
    href && "active:scale-[0.98]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={clases}>
        {children}
      </Link>
    );
  }
  return (
    <div className={clases} {...props}>
      {children}
    </div>
  );
}

/** Chip de ícono redondo para la esquina de un tile. */
function BentoIcon({
  icon: Icon,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  variant?: BentoVariant;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        variant === "default" && "bg-primary/10 text-primary",
        variant === "dark" && "bg-white/10 text-primary-light",
        variant === "accent" && "bg-white/20 text-white"
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

/** Valor grande + etiqueta pequeña, el corazón de un tile de estadística. */
function BentoStat({
  valor,
  label,
  variant = "default",
}: {
  valor: React.ReactNode;
  label: string;
  variant?: BentoVariant;
}) {
  return (
    <div className="mt-auto flex flex-col gap-0.5">
      <p className="truncate font-heading text-2xl leading-tight font-semibold">{valor}</p>
      <p
        className={cn(
          "text-xs",
          variant === "default" ? "text-muted-foreground" : "opacity-60"
        )}
      >
        {label}
      </p>
    </div>
  );
}

export { BentoGrid, BentoIcon, BentoStat, BentoTile };
