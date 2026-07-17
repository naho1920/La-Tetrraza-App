"use client";

import { Award, CalendarDays, User, UtensilsCrossed, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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

// TASK-082: reducir de 3 a 2 pasos — el paso 2 anterior ("Formulario de
// nutrición: muy pronto podrás…") era una promesa incumplida que contradecía
// el primer paso. Ahora: paso 1 = perfil físico, paso 2 = tour de la app.
export default function OnboardingPage() {
  const { userDoc, refreshUserDoc } = useAuth();
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [terminando, setTerminando] = useState(false);
  const weightFormRef = useRef<HTMLFormElement>(null);
  const profileFormRef = useRef<HTMLFormElement>(null);

  if (!userDoc) return <PageSkeleton />;

  function handleGuardarPerfil() {
    weightFormRef.current?.requestSubmit();
    profileFormRef.current?.requestSubmit();
  }

  async function handleSalir() {
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
        {[1, 2].map((n) => (
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
            <WeightLogForm ref={weightFormRef} uid={userDoc.uid} ultimoPeso={null} hideSubmitButton />
            <ProfileForm
              ref={profileFormRef}
              userDoc={userDoc}
              onSaved={() => setPaso(2)}
              hideSubmitButton
            />
          </CardContent>
        </Card>
      )}

      {paso === 2 && (
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
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        {paso > 1 ? (
          <Button
            variant="outline"
            disabled={terminando}
            onClick={() => setPaso(1)}
          >
            Atrás
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {paso < 2 && (
            <Button variant="ghost" disabled={terminando} onClick={handleSalir}>
              Cancelar
            </Button>
          )}
          {paso === 1 && (
            <Button className="h-11 text-base" onClick={handleGuardarPerfil}>
              Guardar
            </Button>
          )}
          {paso === 2 && (
            <Button className="h-11 text-base" disabled={terminando} onClick={handleSalir}>
              {terminando ? "Un momento…" : "Empezar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
