export type EstadoNutricion = "pendiente" | "en_revision" | "plan_enviado";

export interface NutritionForm {
  id: string;
  uid: string;
  respuestas: Record<string, string>;
  version: number;
  enviado: boolean;
  estado: EstadoNutricion;
  createdAt: { toDate: () => Date } | null;
}

export interface NutritionPlan {
  id: string;
  formId: string;
  uid: string;
  archivoPath: string;
  notas: string;
  enviadoAt: { toDate: () => Date } | null;
}
