"use client";

import { Ban, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  type ApprovedEmail,
  addApprovedEmail,
  aprobarSolicitud,
  desactivarAcceso,
  eliminarAlumno,
  listActivatedUsers,
  listApprovedEmails,
  listSolicitudesPendientes,
  reactivarAcceso,
  rechazarSolicitud,
} from "@/features/admin/api";
import { useAuth } from "@/features/auth/AuthProvider";
import type { AccessRequest } from "@/features/auth/approval";
import type { UserDoc } from "@/features/auth/types";
import { InviteManager } from "@/features/invitaciones/invite-manager";

export default function NuevoAlumnoPage() {
  const { userDoc } = useAuth();
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
  const [procesandoEmail, setProcesandoEmail] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<ApprovedEmail | null>(null);

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
      toast(`${solicitud.nombre} ahora tiene acceso.`);
      await Promise.all([loadSolicitudes(), loadData()]);
    } catch {
      toast("No se pudo aprobar la solicitud. Inténtalo de nuevo.", "error");
    } finally {
      setProcesandoUid(null);
    }
  }

  async function handleRechazar(uid: string) {
    setProcesandoUid(uid);
    try {
      await rechazarSolicitud(uid);
      toast("Solicitud rechazada.");
      await loadSolicitudes();
    } catch {
      toast("No se pudo rechazar la solicitud. Inténtalo de nuevo.", "error");
    } finally {
      setProcesandoUid(null);
    }
  }

  async function handleToggleActivo(item: ApprovedEmail) {
    const deshabilitado = item.activo === false;
    const activated = usersByEmail.get(item.email);
    setProcesandoEmail(item.email);
    try {
      if (deshabilitado) {
        await reactivarAcceso(item.email, activated?.uid);
        toast(`${item.email} puede volver a entrar.`);
      } else {
        await desactivarAcceso(item.email, activated?.uid);
        toast(`${item.email} fue deshabilitado.`);
      }
      await loadData();
    } catch {
      toast("No se pudo actualizar el acceso. Inténtalo de nuevo.", "error");
    } finally {
      setProcesandoEmail(null);
    }
  }

  async function handleEliminar(item: ApprovedEmail) {
    const activated = usersByEmail.get(item.email);
    try {
      await eliminarAlumno(item.email, activated?.uid);
      toast(`${item.email} fue eliminado de la lista.`);
      setEliminando(null);
      await loadData();
    } catch {
      toast("No se pudo eliminar al alumno. Inténtalo de nuevo.", "error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await addApprovedEmail(email);
      toast(`Acceso concedido a ${email}.`);
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
      <header className="flex items-center gap-3 py-2">
        <h1 className="font-heading text-xl font-semibold">Alumnos</h1>
      </header>

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
              {filtrados.map((item) => {
                const approvedEmail = item.email;
                const activated = usersByEmail.get(approvedEmail);
                const deshabilitado = item.activo === false;
                const estadoLabel = deshabilitado ? "Deshabilitado" : activated ? "Activo" : "Pendiente";
                const estadoClase = deshabilitado
                  ? "bg-muted text-muted-foreground"
                  : activated
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning";
                const nombreYEstado = (
                  <>
                    <span className="truncate text-sm">
                      {activated?.nombre ?? approvedEmail}
                      {activated && (
                        <span className="block text-xs text-muted-foreground">
                          {approvedEmail}
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${estadoClase}`}>
                      {estadoLabel}
                    </span>
                  </>
                );
                return (
                  <li key={approvedEmail} className="flex items-center gap-2 py-2.5">
                    {activated ? (
                      <Link
                        href={`/alumnos/${activated.uid}`}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 hover:text-primary"
                      >
                        {nombreYEstado}
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">{nombreYEstado}</div>
                    )}
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={deshabilitado ? "Habilitar acceso" : "Deshabilitar acceso"}
                        disabled={procesandoEmail === approvedEmail}
                        onClick={() => handleToggleActivo(item)}
                      >
                        {deshabilitado ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Eliminar alumno"
                        className="text-destructive"
                        onClick={() => setEliminando(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {userDoc && (
        <CollapsibleSection title="Invitar por link">
          <InviteManager adminUid={userDoc.uid} />
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Agregar alumno">
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
      </CollapsibleSection>

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

      {eliminando && (
        <ConfirmDialog
          title="¿Eliminar a este alumno?"
          description={
            <>
              Se eliminará <strong>{eliminando.email}</strong> de la lista de acceso y su perfil.
              Su historial de clases, medallas y nutrición no se borra. Podrá volver a pedir acceso
              más adelante.
            </>
          }
          confirmLabel="Sí, eliminar"
          onConfirm={() => handleEliminar(eliminando)}
          onCancel={() => setEliminando(null)}
        />
      )}
    </div>
  );
}
