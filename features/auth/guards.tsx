"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "./AuthProvider";

function FullscreenSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/** Deja pasar solo a usuarios logueados y aprobados (cualquier rol). */
export function RequireApproved({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
    if (status === "not-approved") router.replace("/sin-acceso");
  }, [status, router]);

  if (status !== "ready") return <FullscreenSpinner />;
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
