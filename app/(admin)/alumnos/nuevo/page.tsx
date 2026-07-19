"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ApprovedEmail,
  addApprovedEmail,
  aprobarSolicitud,
  listActivatedUsers,
  listApprovedEmails,
  listSolicitudesPendientes,
  rechazarSolicitud,
} from "@/features/admin/api";
import type { AccessRequest } from "@/features/auth/approval";
import type { UserDoc } from "@/features/auth/types";

export default function NuevoAlumnoPage() {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState<ApprovedEmail[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [solicitudes, setSolicitudes] = useState<AccessRequest[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
  const [procesandoUid, setProcesandoUid] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState<AccessRequest | null>(null);

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

  async function loadSolicitudes() {
    setLoadingSolicitudes(true);
    try {
      setSolicitudes(await listSolicitudesPendientes());
    } finally {
      setLoadingSolicitudes(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      const [approvedList, userList, solicitudesList] = await Promise.all([
        listApprovedEmails(),
        listActivatedUsers(),
        listSolicitudesPendientes(),
      ]);
      if (ignore) return;
      setApproved(approvedList);
      setUsers(userList);
      setSolicitudes(solicitudesList);
      setLoading(false);
      setLoadingSolicitudes(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleAprobar(solicitud: AccessRequest) {
    setProcesandoUid(solicitud.uid);
    try {
      await aprobarSolicitud(solicitud);
      await Promise.all([loadSolicitudes(), loadData()]);
    } finally {
      setProcesandoUid(null);
    }
  }

  async function handleRechazar(uid: string) {
    setProcesandoUid(uid);
    try {
      await rechazarSolicitud(uid);
      await loadSolicitudes();
    } finally {
      setProcesandoUid(null);
    }
  }

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
      {(loadingSolicitudes || solicitudes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes pendientes ({solicitudes.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loadingSolicitudes ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {solicitudes.map((solicitud) => (
                  <li
                    key={solicitud.uid}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm">
                      {solicitud.nombre}
                      <span className="block truncate text-xs text-muted-foreground">
                        {solicitud.email}
                      </span>
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={procesandoUid === solicitud.uid}
                        onClick={() => setRechazando(solicitud)}
                      >
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        disabled={procesandoUid === solicitud.uid}
                        onClick={() => handleAprobar(solicitud)}
                      >
                        Aprobar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

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

      {rechazando && (
        <ConfirmDialog
          title="¿Rechazar esta solicitud?"
          description={
            <>
              Se rechazará el acceso de <strong>{rechazando.nombre}</strong> ({rechazando.email}).
              Podrá volver a solicitarlo más adelante.
            </>
          }
          confirmLabel="Sí, rechazar"
          onConfirm={() => handleRechazar(rechazando.uid).then(() => setRechazando(null))}
          onCancel={() => setRechazando(null)}
        />
      )}
    </div>
  );
}
