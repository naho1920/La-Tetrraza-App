"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { getMiEncuestaDelMes } from "@/features/encuestas/api";
import { EncuestaDialog } from "@/features/encuestas/encuesta-dialog";

export default function EncuestaPage() {
  const { userDoc } = useAuth();
  const router = useRouter();
  const [yaRespondio, setYaRespondio] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userDoc) return;
    getMiEncuestaDelMes(userDoc.uid)
      .then((encuesta) => setYaRespondio(Boolean(encuesta)))
      .catch(() => setYaRespondio(false));
  }, [userDoc]);

  if (!userDoc || yaRespondio === null) return <PageSkeleton />;

  if (yaRespondio) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <div>
          <p className="font-heading text-lg font-semibold">Ya enviaste tu encuesta de este mes</p>
          <p className="text-sm text-muted-foreground">¡Gracias por contarnos cómo te fue! 💜</p>
        </div>
        <Button onClick={() => router.push("/")}>Volver a Inicio</Button>
      </div>
    );
  }

  return (
    <EncuestaDialog
      uid={userDoc.uid}
      alumnoNombre={userDoc.nombre}
      onClose={() => router.push("/")}
      onEnviada={() => {
        toast("¡Gracias por tu feedback! 💜");
        router.push("/");
      }}
    />
  );
}
