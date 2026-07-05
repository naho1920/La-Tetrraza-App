export type Pilar = "fuerza" | "gimnasia" | "resistencia" | "constancia";
export type TipoSkill = "niveles" | "insignia";
export type EstadoAchievement = "pendiente" | "validado" | "rechazado";

export interface Skill {
  id: string;
  pilar: Pilar;
  nombreMedalla: string;
  habilidad: string;
  tipo: TipoSkill;
  /** ["bronce","plata","oro"] para tipo "niveles"; ["base"] o ["base","oro"] para "insignia". */
  nivelesDisponibles: string[];
  /** nivel -> hito. Si `relativoABW`, el valor es un multiplicador ("1.5") o "tecnica". */
  hitos: Record<string, string>;
  relativoABW: boolean;
  orden: number;
  activa: boolean;
  /** Slug para el arte: /medals/{pilar}/{arte}-{nivel}.svg */
  arte: string;
}

export interface Achievement {
  id: string;
  uid: string;
  skillId: string;
  nivel: string;
  fechaLogro: string; // "YYYY-MM-DD"
  videoPath: string | null;
  estado: EstadoAchievement;
  pinEntregado: boolean;
  celebrado: boolean;
  validadoPor: string | null;
  validadoAt: { toDate: () => Date } | null;
}
