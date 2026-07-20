"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { crearInviteLink, listInviteLinks, revocarInviteLink } from "./api";
import type { InviteLink } from "./types";

type Estado = "activo" | "vencido" | "agotado" | "revocado";

function estadoDe(link: InviteLink): Estado {
  if (!link.activo) return "revocado";
  const expirado = link.expiraAt ? link.expiraAt.toDate().getTime() < Date.now() : false;
  if (expirado) return "vencido";
  if (link.usosActuales >= link.usosMaximos) return "agotado";
  return "activo";
}

const ESTADO_LABEL: Record<Estado, string> = {
  activo: "Activo",
  vencido: "Vencido",
  agotado: "Agotado",
  revocado: "Revocado",
};

const ESTADO_VARIANT: Record<Estado, "success" | "warning" | "outline"> = {
  activo: "success",
  vencido: "warning",
  agotado: "warning",
  revocado: "outline",
};

function diasRestantes(link: InviteLink): number | null {
  if (!link.expiraAt) return null;
  const ms = link.expiraAt.toDate().getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function urlDelLink(token: string): string {
  return `${window.location.origin}/invitar/${token}`;
}

export function InviteManager({ adminUid }: { adminUid: string }) {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [cargando, setCargando] = useState(true);
  const [diasValidez, setDiasValidez] = useState("7");
  const [usosMaximos, setUsosMaximos] = useState("5");
  const [nota, setNota] = useState("");
  const [generando, setGenerando] = useState(false);
  const [ultimoToken, setUltimoToken] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [revocando, setRevocando] = useState<InviteLink | null>(null);

  function cargar() {
    setCargando(true);
    listInviteLinks()
      .then(setLinks)
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  async function handleGenerar(e: React.FormEvent) {
    e.preventDefault();
    const dias = Number(diasValidez);
    const usos = Number(usosMaximos);
    if (!Number.isInteger(dias) || dias < 1 || dias > 90) {
      toast("Los días de validez deben ser entre 1 y 90.", "error");
      return;
    }
    if (!Number.isInteger(usos) || usos < 1 || usos > 100) {
      toast("Los usos máximos deben ser entre 1 y 100.", "error");
      return;
    }
    setGenerando(true);
    try {
      const token = await crearInviteLink(adminUid, dias, usos, nota);
      setUltimoToken(token);
      setNota("");
      toast("Link de invitación creado.");
      cargar();
    } catch {
      toast("No se pudo crear el link. Inténtalo de nuevo.", "error");
    } finally {
      setGenerando(false);
    }
  }

  async function handleCopiar(token: string) {
    await navigator.clipboard.writeText(urlDelLink(token));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function handleWhatsApp(token: string) {
    const mensaje = `¡Hola! Te invito a unirte a La Terraza 💜 Entra con este link e inicia sesión con Google: ${urlDelLink(token)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  }

  async function handleRevocar(link: InviteLink) {
    try {
      await revocarInviteLink(link.id);
      toast("Link revocado.");
      setRevocando(null);
      cargar();
    } catch {
      toast("No se pudo revocar el link. Inténtalo de nuevo.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleGenerar} className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dias-validez">Días de validez</Label>
          <Input
            id="dias-validez"
            type="number"
            min={1}
            max={90}
            required
            value={diasValidez}
            onChange={(e) => setDiasValidez(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="usos-maximos">Usos máximos</Label>
          <Input
            id="usos-maximos"
            type="number"
            min={1}
            max={100}
            required
            value={usosMaximos}
            onChange={(e) => setUsosMaximos(e.target.value)}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="nota-invite">Nota (opcional, solo para ti)</Label>
          <Input
            id="nota-invite"
            placeholder="Ej. Grupo de julio"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </div>
        <Button type="submit" className="col-span-2" disabled={generando}>
          {generando ? "Generando…" : "Generar link de invitación"}
        </Button>
      </form>

      {ultimoToken && (
        <div className="flex flex-col gap-2 rounded-xl bg-primary/5 p-3">
          <p className="text-xs font-medium text-muted-foreground">Nuevo link listo para compartir:</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={urlDelLink(ultimoToken)} className="text-xs" />
            <Button size="icon" variant="outline" aria-label="Copiar link" onClick={() => handleCopiar(ultimoToken)}>
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <Button variant="outline" onClick={() => handleWhatsApp(ultimoToken)}>
            <MessageCircle className="size-4" data-icon="inline-start" />
            Enviar por WhatsApp
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Links creados
        </p>
        {cargando ? (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Todavía no has creado ningún link.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border">
            {links.map((link) => {
              const estado = estadoDe(link);
              const dias = diasRestantes(link);
              return (
                <li key={link.id} className="flex flex-col gap-1.5 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{link.nota || "Sin nota"}</span>
                    <Badge variant={ESTADO_VARIANT[estado]} className="shrink-0">
                      {ESTADO_LABEL[estado]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {link.usosActuales}/{link.usosMaximos} usados
                    {estado === "activo" && dias !== null && ` · vence en ${dias} ${dias === 1 ? "día" : "días"}`}
                  </p>
                  {estado === "activo" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => handleCopiar(link.id)}>
                        <Copy className="size-3.5" data-icon="inline-start" />
                        Copiar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleWhatsApp(link.id)}>
                        <MessageCircle className="size-3.5" data-icon="inline-start" />
                        WhatsApp
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRevocando(link)}>
                        Revocar
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {revocando && (
        <ConfirmDialog
          title="¿Revocar este link?"
          description={
            <>
              Nadie más podrá usarlo para entrar, aunque lo tenga guardado. Los usos ya consumidos
              ({revocando.usosActuales}/{revocando.usosMaximos}) no se recuperan.
            </>
          }
          confirmLabel="Sí, revocar"
          onConfirm={() => handleRevocar(revocando)}
          onCancel={() => setRevocando(null)}
        />
      )}
    </div>
  );
}
