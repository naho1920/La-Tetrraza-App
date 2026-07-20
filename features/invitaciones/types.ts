export interface InviteLink {
  id: string; // token, también el id del documento
  creadoPor: string;
  creadoAt: { toDate: () => Date } | null;
  expiraAt: { toDate: () => Date } | null;
  usosMaximos: number;
  usosActuales: number;
  activo: boolean;
  nota: string;
  usadoPor: string[];
}
