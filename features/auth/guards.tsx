"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "./AuthProvider";
import { necesitaBienvenida, necesitaOnboarding } from "./onboarding-status";

function FullscreenSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/**
 * Deja pasar solo a usuarios logueados y aprobados (cualquier rol), y a un
 * alumno solo si ya vio la bienvenida y terminó el onboarding — así el gate
 * aplica en cualquier ruta de `(alumno)`, no solo en Home. Las rutas del
 * propio onboarding se excluyen de su propio redirect para no hacer loop.
 */
export function RequireApproved({ children }: { children: React.ReactNode }) {
  const { status, userDoc } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const debeVerBienvenida = necesitaBienvenida(userDoc) && pathname !== "/onboarding/bienvenida";
  const debeVerOnboarding = necesitaOnboarding(userDoc) && pathname !== "/onboarding";

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
    if (status === "not-approved") router.replace("/sin-acceso");
    if (status === "ready" && debeVerBienvenida) router.replace("/onboarding/bienvenida");
    else if (status === "ready" && debeVerOnboarding) router.replace("/onboarding");
  }, [status, debeVerBienvenida, debeVerOnboarding, router]);

  if (status !== "ready" || debeVerBienvenida || debeVerOnboarding) return <FullscreenSpinner />;
  return <>{children}</>;
}

/** Deja pasar solo a la admin; un alumno es redirigido a su home. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { status, userDoc } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
    if (status === "not-approved") router.replace("/sin-acceso");
    if (status === "ready" && userDoc?.rol !== "admin") router.replace("/");
  }, [status, userDoc, router]);

  if (status !== "ready" || userDoc?.rol !== "admin") return <FullscreenSpinner />;
  return <>{children}</>;
}
