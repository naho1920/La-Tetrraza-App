"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { ProfileForm } from "@/features/perfil/profile-form";

export default function EditarPerfilPage() {
  const router = useRouter();
  const { userDoc, refreshUserDoc } = useAuth();

  if (!userDoc) return <PageSkeleton />;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Volver"
          className="flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10 transition-colors active:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-heading text-xl font-semibold">Editar perfil</h1>
      </header>

      <ProfileForm userDoc={userDoc} onSaved={refreshUserDoc} />
    </div>
  );
}
