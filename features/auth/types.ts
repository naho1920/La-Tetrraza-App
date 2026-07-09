export type Rol = "alumno" | "admin";

export type Meta =
  | "bajar_peso"
  | "subir_masa"
  | "mejorar_resistencia"
  | "competir"
  | "salud_general";

export type Sexo = "femenino" | "masculino" | "otro";

export interface UserDoc {
  uid: string;
  email: string;
  nombre: string;
  foto: string | null;
  rol: Rol;
  aprobado: boolean;
  fechaNac: string | null;
  sexo: Sexo | null;
  estaturaCm: number | null;
  // Medidas corporales en cm (opcionales; los docs antiguos no las tienen).
  cuelloCm?: number | null;
  cinturaCm?: number | null;
  piernaCm?: number | null;
  brazoCm?: number | null;
  alergias: string[];
  lesiones: string[];
  meta: Meta | null;
  telefono: string | null;
  contactoEmergencia: string | null;
  fechaIngreso: unknown;
  fcmTokens: string[];
  onboardingCompletado: boolean;
  // Pantallas de bienvenida (3 slides); los docs creados antes de esta
  // feature no tienen el campo — se tratan como ya vistas si además
  // `onboardingCompletado` ya era true (ver onboarding-status.ts).
  bienvenidaVista?: boolean;
}
