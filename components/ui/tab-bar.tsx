"use client";

import { Award, CalendarDays, User, UtensilsCrossed, Wallet, type LucideIcon } from "lucide-react";
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
  { href: "/horarios", label: "Horarios", icon: CalendarDays },
  { href: "/nutricion", label: "Nutrición", icon: UtensilsCrossed },
  { href: "/medallas", label: "Medallas", icon: Award },
  { href: "/membresia", label: "Membresía", icon: Wallet },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function TabBar({ tabs = TABS_ALUMNO }: { tabs?: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {tabs.map(({ href, label, icon: Icon, match }) => {
        const base = match ?? href;
        const active =
          base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(`${base}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
