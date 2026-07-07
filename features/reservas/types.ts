export type SessionEstado = "programada" | "cancelada";
export type BookingEstado = "reservado" | "cancelado";

export interface ClassTemplate {
  id: string;
  diaSemana: number; // 0 = domingo … 6 = sábado
  hora: string; // "HH:MM"
  nombre: string;
  capacidad: number;
  activa: boolean;
}

export interface ClassSession {
  id: string;
  fecha: string; // "YYYY-MM-DD"
  hora: string; // "HH:MM"
  nombre: string;
  capacidad: number;
  cuposOcupados: number;
  estado: SessionEstado;
  templateId: string | null;
}

export interface Booking {
  id: string; // `${sessionId}_${uid}`
  sessionId: string;
  uid: string;
  estado: BookingEstado;
  asistio: boolean | null;
  creadoAt: { toDate: () => Date } | null;
  // Denormalizados desde la sesión al reservar; las reservas creadas antes
  // de Fase 5 no los tienen.
  fecha?: string;
  hora?: string;
  // Denormalizados desde el perfil al reservar, para que cualquier alumno
  // pueda ver quiénes van a una clase sin leer users/ (que las rules
  // restringen al dueño y la admin). Las reservas antiguas no los tienen.
  alumnoNombre?: string | null;
  alumnoFoto?: string | null;
}
