"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  createAccountWithEmailPassword,
  sendPasswordReset,
  signInWithEmailPassword,
  signInWithGoogle,
} from "@/features/auth/client-actions";
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

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (status === "ready") router.replace("/");
    if (status === "not-approved") router.replace("/sin-acceso");
  }, [status, router]);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailPassword(email, password);
      } else {
        await createAccountWithEmailPassword(email, password);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Escribe tu correo arriba y toca de nuevo en \"Olvidé mi contraseña\".");
      return;
    }
    setError(null);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

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
          <CardTitle className="text-2xl">Bienvenida a La Terraza</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Inicia sesión para reservar tus clases y ver tus medallas."
              : "Crea tu cuenta con correo y contraseña."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {resetSent && (
            <Alert>
              <AlertDescription>
                Te enviamos un correo para restablecer tu contraseña.
              </AlertDescription>
            </Alert>
          )}

          <Button
            size="lg"
            variant="outline"
            className="h-11 gap-2 text-base"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon />
            Continuar con Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            o con tu correo
            <div className="h-px flex-1 bg-border" />
          </div>

          <form className="flex flex-col gap-3" onSubmit={handleEmailSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "login" && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="self-end text-xs text-primary hover:underline"
              >
                Olvidé mi contraseña
              </button>
            )}

            <Button type="submit" className="h-11 text-base" disabled={loading}>
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === "login" ? "signup" : "login");
            }}
            className="text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login"
              ? "¿No tienes cuenta? Crear una"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
