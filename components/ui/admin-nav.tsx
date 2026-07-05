"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOutUser } from "@/features/auth/client-actions";

export function AdminNav() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <Link href="/" className="font-heading text-lg font-semibold text-primary-dark">
        La Terraza · Admin
      </Link>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button render={<Link href="/clases" />} variant="ghost" size="sm">
          Clases
        </Button>
        <Button render={<Link href="/nutricion-admin" />} variant="ghost" size="sm">
          Nutrición
        </Button>
        <Button render={<Link href="/medallas-admin" />} variant="ghost" size="sm">
          Medallas
        </Button>
        <Button render={<Link href="/membresias" />} variant="ghost" size="sm">
          Membresías
        </Button>
        <Button render={<Link href="/alumnos/nuevo" />} variant="ghost" size="sm">
          Alumnos
        </Button>
        <Button render={<Link href="/estadisticas" />} variant="ghost" size="sm">
          Estadísticas
        </Button>
        <Button variant="outline" size="sm" onClick={() => signOutUser()}>
          Salir
        </Button>
      </div>
    </header>
  );
}
