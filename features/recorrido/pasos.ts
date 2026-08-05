/**
 * Los pasos del recorrido guiado para el alumno nuevo, en orden.
 *
 * La navegación es monotónica (`/` → `/horarios` → `/diario` → `/nutricion` →
 * `/perfil`): nunca vuelve atrás, así el recorrido se siente como un paseo y
 * no como un rebote entre pantallas.
 *
 * Los anclajes son a propósito los elementos más estables de cada pantalla.
 * Quedaron afuera varios candidatos obvios pero frágiles: el botón "Reservar
 * mi cupo" (vive dentro de un Dialog y no existe si la clase está pasada o
 * cancelada), las tarjetas de métrica del Diario (se filtran por sexo y nivel,
 * dos alumnos ven tarjetas distintas) y todo lo que desaparece sin datos
 * (registros recientes, alertas) — que es justo el caso de un alumno nuevo.
 */
export interface PasoRecorrido {
  /** Ruta donde vive el elemento; el recorrido navega solo si hace falta. */
  ruta: string;
  /** Valor del atributo `data-tour` del elemento a resaltar. */
  ancla: string;
  titulo: string;
  detalle: string;
}

export const PASOS: PasoRecorrido[] = [
  {
    ruta: "/",
    ancla: "tabbar",
    titulo: "Tus 5 pestañas",
    detalle: "Todo se mueve desde acá: inicio, horarios, nutrición, diario y tu perfil.",
  },
  {
    ruta: "/",
    ancla: "ver-calendario",
    titulo: "Reservá tu primera clase",
    detalle: "Desde este botón entrás al calendario y elegís el horario que te quede mejor.",
  },
  {
    ruta: "/",
    ancla: "tile-medallas",
    titulo: "Tus medallas",
    detalle: "Cada logro te da una medalla, y cada medalla tiene su pin físico para retirar en el box.",
  },
  {
    ruta: "/horarios",
    ancla: "calendario",
    titulo: "El calendario de clases",
    detalle: "Los días con punto morado tienen clases. Tocá uno y elegí tu horario.",
  },
  {
    ruta: "/diario",
    ancla: "registrar",
    titulo: "Anotá lo que levantás",
    detalle: "Registrá tus pesos y tiempos acá para ir viendo tu progreso mes a mes.",
  },
  {
    ruta: "/nutricion",
    ancla: "nutricion",
    titulo: "Tu plan alimenticio",
    detalle: "Llená el formulario y tu coach te arma un plan hecho para vos.",
  },
  {
    ruta: "/perfil",
    ancla: "editar-perfil",
    titulo: "Mantené tus datos al día",
    detalle: "Tu coach usa tu peso, tus medidas y tus lesiones para armarte todo. Actualizalos acá.",
  },
];
