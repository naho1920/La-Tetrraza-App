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
      <div className="flex items-center gap-2">
        <Button render={<Link href="/alumnos/nuevo" />} variant="ghost" size="sm">
          Alumnos
        </Button>
        <Button variant="outline" size="sm" onClick={() => signOutUser()}>
          Salir
        </Button>
      </div>
    </header>
  );
}
