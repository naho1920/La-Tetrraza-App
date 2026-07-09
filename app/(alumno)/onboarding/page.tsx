"use client";

import { Award, CalendarDays, User, UtensilsCrossed, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { markOnboardingCompleted } from "@/features/auth/approval";
import { ProfileForm } from "@/features/perfil/profile-form";
import { WeightLogForm } from "@/features/perfil/weight-log-form";

const TOUR = [
  { icon: CalendarDays, label: "Horarios", texto: "Reserva tus clases de la semana y cancela hasta 2 h antes." },
  { icon: UtensilsCrossed, label: "Nutrición", texto: "Llena tu formulario y recibe tu plan alimenticio personalizado." },
  { icon: Award, label: "Medallas", texto: "Desbloquea medallas por cada logro y colecciona tus pines." },
  { icon: Wallet, label: "Membresía", texto: "Consulta tu plan, vencimiento e historial de pagos." },
  { icon: User, label: "Perfil", texto: "Mantén tus datos y tu peso actualizados." },
];

export default function OnboardingPage() {
  const { userDoc, refreshUserDoc } = useAuth();
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [terminando, setTerminando] = useState(false);

  if (!userDoc) return <PageSkeleton />;

  async function handleTerminar() {
    setTerminando(true);
    try {
      await markOnboardingCompleted(userDoc!.uid);
      await refreshUserDoc();
      router.replace("/");
    } finally {
      setTerminando(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 max-w-16 rounded-full ${n <= paso ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {paso === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Completa tu perfil físico</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <WeightLogForm uid={userDoc.uid} ultimoPeso={null} />
            <ProfileForm userDoc={userDoc} onSaved={() => setPaso(2)} />
          </CardContent>
        </Card>
      )}

      {paso === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Formulario de nutrición</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Muy pronto vas a poder llenar aquí tu formulario de nutrición para que tu coach te
              prepare un plan alimenticio personalizado. Por ahora puedes continuar — te avisamos
              cuando esté listo.
            </p>
            <Button className="h-11 text-base" onClick={() => setPaso(3)}>
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      {paso === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Así funciona La Terraza 💜</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {TOUR.map(({ icon: Icon, label, texto }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-dark dark:bg-primary/20 dark:text-primary-light">
                  <Icon className="size-4.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{texto}</p>
                </div>
              </div>
            ))}
            <Button className="mt-2 h-11 text-base" disabled={terminando} onClick={handleTerminar}>
              {terminando ? "Un momento…" : "Empezar"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
