"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ApprovedEmail,
  addApprovedEmail,
  listActivatedUsers,
  listApprovedEmails,
} from "@/features/admin/api";
import type { UserDoc } from "@/features/auth/types";

export default function NuevoAlumnoPage() {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState<ApprovedEmail[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [approvedList, userList] = await Promise.all([
        listApprovedEmails(),
        listActivatedUsers(),
      ]);
      setApproved(approvedList);
      setUsers(userList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      const [approvedList, userList] = await Promise.all([
        listApprovedEmails(),
        listActivatedUsers(),
      ]);
      if (ignore) return;
      setApproved(approvedList);
      setUsers(userList);
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await addApprovedEmail(email);
      setEmail("");
      await loadData();
    } catch {
      setError("No se pudo agregar el correo. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const usersByEmail = new Map(users.map((u) => [u.email, u]));
  const filtrados = approved.filter(({ email: approvedEmail }) => {
    if (!busqueda.trim()) return true;
    const activated = usersByEmail.get(approvedEmail);
    const texto = `${activated?.nombre ?? ""} ${approvedEmail}`.toLowerCase();
    return texto.includes(busqueda.trim().toLowerCase());
  });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      <Card>
        <CardHeader>
          <CardTitle>Agregar alumno</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo del alumno</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alumno@correo.com"
              />
            </div>
            <Button type="submit" disabled={saving || !email}>
              {saving ? "Agregando…" : "Dar acceso"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alumnos con acceso ({approved.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            placeholder="Buscar por nombre o correo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {approved.length === 0 ? "Todavía no agregas a ningún alumno." : "Sin resultados."}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {filtrados.map(({ email: approvedEmail }) => {
                const activated = usersByEmail.get(approvedEmail);
                const contenido = (
                  <>
                    <span className="truncate text-sm">
                      {activated?.nombre ?? approvedEmail}
                      {activated && (
                        <span className="block text-xs text-muted-foreground">
                          {approvedEmail}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        activated
                          ? "shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
                          : "shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning"
                      }
                    >
                      {activated ? "Activo" : "Pendiente"}
                    </span>
                  </>
                );
                return (
                  <li key={approvedEmail}>
                    {activated ? (
                      <Link
                        href={`/alumnos/${activated.uid}`}
                        className="flex items-center justify-between gap-3 py-2.5 hover:text-primary"
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-3 py-2.5">{contenido}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
