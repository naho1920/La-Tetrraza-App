"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { signInWithGoogle, signOutUser } from "@/features/auth/client-actions";
import { authErrorMessage } from "@/features/auth/error-messages";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.58-5.18 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.3A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.3v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.6l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

export default function InvitarPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { status, user, refreshUserDoc } = useAuth();

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intentadoRef = useRef(false);

  useEffect(() => {
    if (status === "ready") router.replace("/");
  }, [status, router]);

  const redimir = useCallback(async () => {
    if (!user) return;
    setRedeeming(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/invitaciones/redimir", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token: params.token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo procesar la invitación.");
        return;
      }
      await refreshUserDoc();
      router.replace("/");
    } catch {
      setError("No se pudo procesar la invitación. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setRedeeming(false);
    }
  }, [user, params.token, refreshUserDoc, router]);

  useEffect(() => {
    if (status !== "not-approved" || !user || intentadoRef.current) return;
    intentadoRef.current = true;
    void redimir();
  }, [status, user, redimir]);

  async function handleGoogle() {
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoadingGoogle(false);
    }
  }

  const cargando = status === "loading" || status === "ready";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-primary-subtle px-6 py-16 dark:bg-background">
      <Image
        src="/icon-512.png"
        alt="La Terraza"
        width={72}
        height={72}
        className="rounded-2xl shadow-lg"
        priority
      />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Únete a La Terraza</CardTitle>
          <CardDescription>
            Tu coach te invitó. Inicia sesión con Google y quedas dentro al instante.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {cargando || redeeming ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                {redeeming ? "Activando tu acceso…" : "Un momento…"}
              </p>
            </div>
          ) : status === "signed-out" ? (
            <Button
              size="lg"
              variant="outline"
              className="h-11 gap-2 text-base"
              onClick={handleGoogle}
              disabled={loadingGoogle}
            >
              <GoogleIcon />
              {loadingGoogle ? "Conectando…" : "Continuar con Google"}
            </Button>
          ) : (
            error && (
              <div className="flex flex-col gap-2">
                <Button onClick={() => void redimir()}>Reintentar</Button>
                <Button variant="outline" onClick={() => router.push("/sin-acceso")}>
                  Pedir acceso a mi coach
                </Button>
                <Button variant="ghost" onClick={() => signOutUser()}>
                  Usar otra cuenta de Google
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
