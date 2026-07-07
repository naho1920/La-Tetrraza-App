"use client";

import { CheckCircle2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { ensureAccessRequest, type AccessRequest } from "@/features/auth/approval";
import { signOutUser } from "@/features/auth/client-actions";

export default function SinAccesoPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [solicitud, setSolicitud] = useState<AccessRequest | null>(null);

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
    if (status === "ready") router.replace("/");
  }, [status, router]);

  // Deja registrada la solicitud para que la coach la vea en su panel.
  useEffect(() => {
    if (status !== "not-approved" || !user) return;
    ensureAccessRequest(user).then(setSolicitud).catch(() => setSolicitud(null));
  }, [status, user]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <Image
        src="/icon-512.png"
        alt="La Terraza"
        width={72}
        height={72}
        className="rounded-3xl shadow-lg"
        priority
      />

      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-2xl font-semibold">¡Ya casi estás dentro! 💜</h1>
        <p className="max-w-xs text-base text-muted-foreground">
          Tu cuenta ({user?.email}) todavía no está habilitada en La Terraza.
        </p>
      </div>

      {solicitud ? (
        <div className="flex max-w-xs items-center gap-2.5 rounded-3xl bg-success/10 px-5 py-4 text-left text-sm text-success">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>
            Tu coach ya recibió tu solicitud de acceso. Cuando la apruebe, entra de nuevo y listo.
          </span>
        </div>
      ) : (
        <p className="max-w-xs text-sm text-muted-foreground">
          Estamos avisándole a tu coach que quieres unirte…
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="size-4" data-icon="inline-start" />
          Ya me dieron acceso
        </Button>
        <Button variant="ghost" onClick={() => signOutUser()}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
