"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { listReportsByEstado, marcarRevisado, obtenerUrlComprobante } from "./api";
import type { EstadoPago, PaymentReport } from "./types";

const FILTROS: { estado: EstadoPago; label: string }[] = [
  { estado: "pendiente", label: "Pendientes" },
  { estado: "revisado", label: "Revisados" },
];

export function ComprobantesCard({ onRevisado }: { onRevisado: (uid: string) => void }) {
  const { userDoc } = useAuth();
  const [filtro, setFiltro] = useState<EstadoPago>("pendiente");
  const [reportes, setReportes] = useState<PaymentReport[]>([]);
  const [abriendoId, setAbriendoId] = useState<string | null>(null);

  function cargar() {
    listReportsByEstado(filtro).then(setReportes);
  }

  useEffect(cargar, [filtro]);

  async function handleVer(reporte: PaymentReport) {
    if (!reporte.archivoPath) return;
    setAbriendoId(reporte.id);
    try {
      const url = await obtenerUrlComprobante(reporte.archivoPath);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setAbriendoId(null);
    }
  }

  async function handleMarcarRevisado(reporte: PaymentReport) {
    if (!userDoc) return;
    await marcarRevisado(reporte, userDoc.uid);
    onRevisado(reporte.uid);
    cargar();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comprobantes de pago</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(({ estado, label }) => (
            <Button
              key={estado}
              size="sm"
              variant={filtro === estado ? "default" : "outline"}
              onClick={() => setFiltro(estado)}
            >
              {label}
            </Button>
          ))}
        </div>

        {reportes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No hay reportes en esta categoría.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {reportes.map((reporte) => (
              <li key={reporte.id} className="flex flex-col gap-2 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{reporte.nombreAlumno}</p>
                  <Badge variant={reporte.estado === "revisado" ? "success" : "warning"}>
                    {reporte.estado === "revisado" ? "Revisado" : "Pendiente"}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{reporte.nota || "Sin nota"}</p>
                <div className="flex gap-2">
                  {reporte.archivoPath ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={abriendoId === reporte.id}
                      onClick={() => handleVer(reporte)}
                    >
                      {abriendoId === reporte.id ? "Abriendo…" : "Ver comprobante"}
                    </Button>
                  ) : (
                    <span className="flex items-center text-xs text-muted-foreground">
                      Pago en efectivo, sin comprobante
                    </span>
                  )}
                  {reporte.estado === "pendiente" && (
                    <Button size="sm" onClick={() => handleMarcarRevisado(reporte)}>
                      Marcar como revisado
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
