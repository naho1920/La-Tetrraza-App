export type ProgresoPercibido = "mejorando" | "igual" | "estancado";

export interface MonthlySurvey {
  /** Determinístico: `${uid}_${mes}` — un alumno no puede responder dos veces el mismo mes. */
  id: string;
  uid: string;
  /** Denormalizado desde el perfil: la lista de la coach no necesita leer users/ por cada respuesta. */
  alumnoNombre: string;
  /** "YYYY-MM" */
  mes: string;
  animo: number;
  progreso: ProgresoPercibido;
  molestias: string | null;
  loMejor: string | null;
  aMejorar: string | null;
  createdAt: { toDate: () => Date } | null;
}
