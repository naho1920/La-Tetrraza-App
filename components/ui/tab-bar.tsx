"use client";

import { Award, CalendarDays, Home, User, UtensilsCrossed, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Prefijo de ruta para marcar el tab activo cuando difiere del href. */
  match?: string;
}

const TABS_ALUMNO: TabItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/horarios", label: "Horarios", icon: CalendarDays },
  { href: "/nutricion", label: "Nutrición", icon: UtensilsCrossed },
  { href: "/medallas", label: "Medallas", icon: Award },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function TabBar({ tabs = TABS_ALUMNO }: { tabs?: TabItem[] }) {
  const pathname = usePathname();

  // La bienvenida es una pantalla blanco/negro aislada del resto del diseño;
  // la barra de navegación morada no debe aparecer ahí.
  if (pathname.startsWith("/onboarding/bienvenida")) return null;

  return (
    <div className="pointer-events-none sticky bottom-0 z-10 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <nav className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 rounded-full bg-neutral-900/90 p-2 shadow-lg shadow-black/25 ring-1 ring-white/10 backdrop-blur dark:bg-card/90">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const base = match ?? href;
          const active =
            base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(`${base}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-white/55 hover:text-white/80"
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              <span className="max-w-full truncate px-1 text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
