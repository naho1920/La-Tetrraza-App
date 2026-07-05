"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/ui/admin-nav";
import { TabBar } from "@/components/ui/tab-bar";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOutUser } from "@/features/auth/client-actions";

function FullscreenSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { status, user, userDoc } = useAuth();

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
    if (status === "not-approved") router.replace("/sin-acceso");
  }, [status, router]);

  if (status === "loading" || status === "signed-out" || status === "not-approved") {
    return <FullscreenSpinner />;
  }

  if (userDoc?.rol === "admin") {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <AdminNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="font-heading text-2xl font-semibold text-primary-dark dark:text-primary-light">
            Hola, {userDoc.nombre.split(" ")[0]} 💜
          </h1>
          <p className="max-w-xs text-muted-foreground">
            El dashboard con métricas llega en la Fase 5. Por ahora puedes
            agregar alumnos con acceso a la app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-primary-subtle px-6 py-16 text-center dark:bg-background">
        <Image
          src="/icon-512.png"
          alt="La Terraza"
          width={80}
          height={80}
          className="rounded-2xl shadow-lg"
          priority
        />
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-primary-dark dark:text-primary-light">
            Hola, {userDoc?.nombre.split(" ")[0]} 👋
          </h1>
          <p className="max-w-xs text-base text-muted-foreground">
            Tus horarios, tu nutrición y tus medallas llegan en las próximas
            fases. Mientras tanto, completa tu perfil y registra tu peso.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="lg" className="h-11 px-6 text-base" onClick={() => router.push("/perfil")}>
            Ir a mi perfil
          </Button>
          <Button variant="ghost" onClick={() => signOutUser()}>
            Cerrar sesión ({user?.email})
          </Button>
        </div>
      </div>
      <TabBar />
    </div>
  );
}
