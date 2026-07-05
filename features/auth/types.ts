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
  alergias: string[];
  lesiones: string[];
  meta: Meta | null;
  telefono: string | null;
  contactoEmergencia: string | null;
  fechaIngreso: unknown;
  fcmTokens: string[];
  onboardingCompletado: boolean;
}
