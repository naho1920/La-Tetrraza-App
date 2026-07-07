"use client";

import { Award, CalendarDays, LayoutDashboard, Users, UtensilsCrossed } from "lucide-react";

import { TabBar, type TabItem } from "@/components/ui/tab-bar";

const TABS_ADMIN: TabItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/clases", label: "Clases", icon: CalendarDays },
  { href: "/alumnos/nuevo", label: "Alumnos", icon: Users, match: "/alumnos" },
  { href: "/nutricion-admin", label: "Nutrición", icon: UtensilsCrossed },
  { href: "/medallas-admin", label: "Medallas", icon: Award },
];

export function AdminTabBar() {
  return <TabBar tabs={TABS_ADMIN} />;
}
