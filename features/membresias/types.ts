export type EstadoMembresia = "activa" | "por_vencer" | "vencida";

export interface MembershipPlan {
  id: string;
  nombre: string;
  precio: number;
  clasesIncluidas: number | null;
  duracionDias: number;
  activo: boolean;
}

export interface Membership {
  id: string;
  uid: string;
  planId: string;
  fechaInicio: string; // "YYYY-MM-DD"
  fechaFin: string; // "YYYY-MM-DD"
}

export interface Payment {
  id: string;
  membershipId: string;
  uid: string;
  monto: number;
  fecha: string; // "YYYY-MM-DD"
  metodo: string;
  notas: string;
  registradoAt: { toDate: () => Date } | null;
}
