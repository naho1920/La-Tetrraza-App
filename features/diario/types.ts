export type UnidadMetric = "kg" | "tiempo" | "reps";
export type NivelDiario = "bronce" | "plata" | "oro";

export interface TrackingMetric {
  id: string;
  nombre: string;
  unidad: UnidadMetric;
  direccion: "mayor_es_mejor" | "menor_es_mejor";
  umbrales: {
    bronce: number;
    plata: number;
    oro: number;
  };
  activa: boolean;
  publicadaHoy: boolean;
  orden: number;
  creadoAt: { toDate: () => Date } | null;
  creadoPor: string;
}

export interface ActivityLog {
  id: string;
  uid: string;
  metricId: string;
  valor: number;
  valorDisplay: string;
  nota?: string;
  fecha: string; // "YYYY-MM-DD"
  creadoAt: { toDate: () => Date } | null;
}

export interface DiarioAchievement {
  id: string; // `{uid}_{metricId}_{nivel}`
  uid: string;
  metricId: string;
  metricNombre: string;
  nivel: NivelDiario;
  valor: number;
  valorDisplay: string;
  fecha: string;
  creadoAt: { toDate: () => Date } | null;
}
