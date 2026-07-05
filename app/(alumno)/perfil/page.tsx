"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOutUser } from "@/features/auth/client-actions";
import { getLatestWeightLog } from "@/features/perfil/api";
import { ProfileForm } from "@/features/perfil/profile-form";
import { WeightLogForm } from "@/features/perfil/weight-log-form";

export default function PerfilPage() {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const [ultimoPeso, setUltimoPeso] = useState<number | null>(null);

  useEffect(() => {
    if (!userDoc) return;
    getLatestWeightLog(userDoc.uid).then((log) => setUltimoPeso(log?.pesoKg ?? null));
  }, [userDoc]);

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
        <CardContent>
          <WeightLogForm uid={userDoc.uid} ultimoPeso={ultimoPeso} />
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
