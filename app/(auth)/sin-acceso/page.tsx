"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOutUser } from "@/features/auth/client-actions";

export default function SinAccesoPage() {
  const router = useRouter();
  const { status, user } = useAuth();

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
    if (status === "ready") router.replace("/");
  }, [status, router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-primary-subtle px-6 py-16 text-center dark:bg-background">
      <Image
        src="/icon-512.png"
        alt="La Terraza"
        width={72}
        height={72}
        className="rounded-2xl shadow-lg"
        priority
      />

      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-2xl font-semibold text-primary-dark dark:text-primary-light">
          Pídele acceso a tu coach 💜
        </h1>
        <p className="max-w-xs text-base text-muted-foreground">
          Tu cuenta ({user?.email}) todavía no está habilitada. Avísale a tu
          profesora para que te agregue como alumna o alumno de La Terraza.
        </p>
      </div>

      <Button variant="outline" onClick={() => signOutUser()}>
        Cerrar sesión
      </Button>
    </div>
  );
}
