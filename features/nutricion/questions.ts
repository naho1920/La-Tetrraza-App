export type PreguntaTipo = "texto" | "textarea" | "select" | "numero" | "fecha";

export interface Pregunta {
  key: string;
  label: string;
  tipo: PreguntaTipo;
  placeholder?: string;
  opciones?: { value: string; label: string }[];
  prellenable?: boolean; // se sugiere desde el perfil del alumno
}

export interface PasoFormulario {
  paso: number;
  titulo: string;
  preguntas: Pregunta[];
}

const FRANJAS_HORARIAS = [
  { value: "madrugada", label: "Madrugada (00:00–06:00)" },
  { value: "manana", label: "Mañana (06:00–12:00)" },
  { value: "tarde", label: "Tarde (12:00–18:00)" },
  { value: "noche", label: "Noche (18:00–24:00)" },
];

export const PASOS_NUTRICION: PasoFormulario[] = [
  {
    paso: 1,
    titulo: "Datos básicos",
    preguntas: [
      { key: "nombre", label: "Nombre", tipo: "texto", prellenable: true },
      { key: "fechaNac", label: "Fecha de nacimiento", tipo: "fecha", prellenable: true },
      { key: "estaturaCm", label: "Altura (cm)", tipo: "numero", prellenable: true },
    ],
  },
  {
    paso: 2,
    titulo: "Tu objetivo",
    preguntas: [
      {
        key: "objetivo",
        label: "¿Cuál es tu objetivo?",
        tipo: "select",
        opciones: [
          { value: "aumentar_masa", label: "Aumentar masa muscular" },
          { value: "bajar_grasa", label: "Bajar porcentaje de grasa" },
          { value: "ambos", label: "Ambos" },
        ],
      },
      {
        key: "parteMejorar",
        label: "¿Cuál es la parte de tu cuerpo que quieres mejorar y por qué?",
        tipo: "textarea",
      },
    ],
  },
  {
    paso: 3,
    titulo: "Tus hábitos de comida",
    preguntas: [
      { key: "comidasPorDia", label: "¿Cuántas veces al día puedes comer?", tipo: "numero" },
      { key: "comidasFueraCasa", label: "¿Cuántas comidas realizas fuera de casa?", tipo: "numero" },
      {
        key: "diasSiguiendoPlan",
        label: "¿Cuántos días a la semana puedes comer siguiendo el plan?",
        tipo: "select",
        opciones: Array.from({ length: 7 }, (_, i) => ({
          value: String(i + 1),
          label: `${i + 1} día${i === 0 ? "" : "s"}`,
        })),
      },
      { key: "aguaDiaria", label: "¿Cuánta agua tomas al día?", tipo: "texto", placeholder: "Ej. 2 litros" },
      { key: "bebidaFavorita", label: "¿Cuál es tu bebida favorita o la que más consumes?", tipo: "texto" },
    ],
  },
  {
    paso: 4,
    titulo: "Gustos y restricciones",
    preguntas: [
      { key: "vegetalesFavoritos", label: "¿Cuáles son tus verduras/vegetales favoritos?", tipo: "textarea" },
      {
        key: "golosinasFavoritas",
        label: "¿Cuáles son tus golosinas favoritas?",
        tipo: "textarea",
        placeholder: "Ej. helados, chocolates, papas fritas, fritada…",
      },
      {
        key: "alimentosNoConsume",
        label: "¿Cuáles son los alimentos que no consumes?",
        tipo: "textarea",
        placeholder: "Alergias, religión, vegetariano…",
      },
      { key: "alimentosNoGustan", label: "¿Cuáles son los alimentos que no te gustan?", tipo: "textarea" },
      { key: "alimentosMasConsume", label: "¿Cuáles son los alimentos que más consumes?", tipo: "textarea" },
    ],
  },
  {
    paso: 5,
    titulo: "Tus comidas típicas",
    preguntas: [
      {
        key: "desayunoComun",
        label: "¿Cuál es tu desayuno más común?",
        tipo: "textarea",
        placeholder: "Ej. verde y huevos, pan con café, seco de pollo, avena y fruta",
      },
      {
        key: "almuerzoComun",
        label: "¿Cuál es tu almuerzo más común?",
        tipo: "textarea",
        placeholder: "Ej. sopa y arroz más tallarín y papas con ensalada, jugo de sobre",
      },
      { key: "meriendaCenaComun", label: "¿Cuál es tu merienda o cena más común?", tipo: "textarea" },
    ],
  },
  {
    paso: 6,
    titulo: "Hambre, antojos y adherencia",
    preguntas: [
      {
        key: "horaMasHambre",
        label: "¿En qué hora del día sientes más hambre (hambre real)?",
        tipo: "select",
        opciones: FRANJAS_HORARIAS,
      },
      {
        key: "horaMenosHambre",
        label: "¿A qué hora del día comes menos o no sientes hambre?",
        tipo: "select",
        opciones: FRANJAS_HORARIAS,
      },
      {
        key: "antojosFrecuentes",
        label: "¿Cuáles son tus antojos más frecuentes y a qué hora te dan?",
        tipo: "textarea",
      },
      {
        key: "dificultadSeguirPlan",
        label: "¿Qué es lo que más te cuesta seguir cuando empiezas un plan de alimentación?",
        tipo: "textarea",
        placeholder: "Ej. tomar agua, comer ensalada, siempre tengo hambre, dejar los dulces, tomar el fin de semana…",
      },
    ],
  },
];
