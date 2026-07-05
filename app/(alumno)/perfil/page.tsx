"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOutUser } from "@/features/auth/client-actions";
import { getWeightLogs, type WeightLog } from "@/features/perfil/api";
import { ProfileForm } from "@/features/perfil/profile-form";
import { WeightChart } from "@/features/perfil/weight-chart";
import { WeightLogForm } from "@/features/perfil/weight-log-form";

export default function PerfilPage() {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const [pesoLogs, setPesoLogs] = useState<WeightLog[]>([]);

  useEffect(() => {
    if (!userDoc) return;
    getWeightLogs(userDoc.uid).then(setPesoLogs);
  }, [userDoc]);

  const ultimoPeso = pesoLogs.at(-1)?.pesoKg ?? null;

  function handlePesoGuardado(nuevoLog: WeightLog) {
    setPesoLogs((prev) => [...prev, nuevoLog]);
  }

  if (!userDoc) return null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <div className="flex items-center gap-3">
        {user?.photoURL && (
          <Image
            src={user.photoURL}
            alt={userDoc.nombre}
            width={56}
            height={56}
            className="rounded-full"
          />
        )}
        <div>
          <h1 className="font-heading text-xl font-semibold">{userDoc.nombre}</h1>
          <p className="text-sm text-muted-foreground">{userDoc.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tu peso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <WeightChart logs={pesoLogs} />
          <WeightLogForm uid={userDoc.uid} ultimoPeso={ultimoPeso} onSaved={handlePesoGuardado} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tu perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm userDoc={userDoc} onSaved={refreshUserDoc} />
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => signOutUser()}>
        Cerrar sesión
      </Button>
    </div>
  );
}
