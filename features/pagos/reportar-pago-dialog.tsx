"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { reportarPago } from "./api";

export function ReportarPagoDialog({ onReportado }: { onReportado: () => void }) {
  const [open, setOpen] = useState(false);
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function limpiar() {
    setNota("");
    setArchivo(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo && !nota.trim()) {
      setError("Agrega una nota o un comprobante.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await reportarPago(nota.trim(), archivo);
      limpiar();
      setOpen(false);
      onReportado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reportar el pago.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Button className="h-11 text-base" onClick={() => setOpen(true)}>
        Reportar mi pago
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nuevo) => {
          setOpen(nuevo);
          if (!nuevo) limpiar();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar mi pago</DialogTitle>
            <DialogDescription>
              Sube el comprobante del mes pagado, o cuéntanos si pagaste en efectivo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comprobante-archivo">Comprobante (opcional)</Label>
              <input
                id="comprobante-archivo"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comprobante-nota">Nota {archivo ? "(opcional)" : "(requerida)"}</Label>
              <textarea
                id="comprobante-nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Pago del mes de mayo / Ya pagué en efectivo"
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="h-11 text-base" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar reporte"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
