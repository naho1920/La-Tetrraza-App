export type EstadoPago = "pendiente" | "revisado";

export interface PaymentReport {
  id: string;
  uid: string;
  nombreAlumno: string;
  nota: string;
  archivoPath: string | null;
  estado: EstadoPago;
  createdAt: { toDate: () => Date } | null;
  revisadoPor: string | null;
  revisadoAt: { toDate: () => Date } | null;
}
