"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConfirmDialogProps {
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/** Confirmación reutilizable para acciones irreversibles (cancelar, rechazar, eliminar). */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Sí, continuar",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-xs text-center">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-muted-foreground">{description}</div>
        <div className="flex flex-col gap-2">
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? "Un momento…" : confirmLabel}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
