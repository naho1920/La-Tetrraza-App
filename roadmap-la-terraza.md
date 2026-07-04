# Roadmap de implementación — La Terraza PWA (v2 · Firebase)

Plan de construcción por fases. Cada fase termina con una app **funcionando y demostrable**. Las tareas están ordenadas: dáselas a Claude Code en secuencia y marca `- [x]` al completarlas. Al inicio de cada fase tienes un **prompt sugerido**.

**Filosofía de build:**
1. Nunca dejar la app rota entre fases.
2. El momento mágico (celebración de medalla) llega en la Fase 4 — no al final.
3. Commit + deploy en Vercel al final de cada fase (verás la app real en tu celular desde la semana 1).
4. Tú diseñas en Figma un paso adelante de la fase en construcción (prioridad: el arte de las medallas por pilar).

---

## Fase 0 — Fundación y design system (≈ 1 semana)

**Objetivo:** proyecto creado, tema lila aplicado, Firebase conectado, PWA instalable publicada en Vercel.

> **Prompt para Claude Code:** "Crea un proyecto Next.js 15 con App Router, TypeScript y Tailwind. Instala shadcn/ui y configura el tema con los tokens lila del PRD §6.2. Configura la PWA con Serwist: manifest 'La Terraza', theme color #8B5CF6, iconos placeholder. Inicializa Firebase (Auth, Firestore, Storage) en lib/firebase con variables de entorno, crea la estructura de carpetas por features del PRD §5 y una pantalla de bienvenida. Conéctalo a un repo de GitHub."

- [ ] **TASK-001** — Crear proyecto Next.js 15 + TypeScript + Tailwind y repo en GitHub
  Notes: `npx create-next-app@latest la-terraza --typescript --tailwind --app`
- [ ] **TASK-002** — shadcn/ui con los tokens lila del PRD §6.2 (variables CSS)
  Files: `app/globals.css`, `tailwind.config.ts`, `components.json`
- [ ] **TASK-003** — Tipografías Sora (display) e Inter (cuerpo) con `next/font`
  Files: `app/layout.tsx`
- [ ] **TASK-004** — PWA: manifest.json, iconos 192/512 maskable, service worker con Serwist
  Files: `public/manifest.json`, `app/sw.ts`, `next.config.mjs`
- [ ] **TASK-005** — Crear proyecto en la consola de Firebase (Auth con Google + email habilitados, Firestore, Storage) e inicializar SDK cliente + Admin SDK
  Files: `lib/firebase/client.ts`, `lib/firebase/admin.ts`, `.env.local`
  Notes: guardar las claves del proyecto en `.env.local`; nunca subirlas a GitHub
- [ ] **TASK-006** — Estructura de carpetas por features (PRD §5) + pantalla de bienvenida con logo
  Files: `features/*`, `app/page.tsx`
- [ ] **TASK-007** — Conectar repo a Vercel (con las variables de entorno) y verificar deploy + instalación PWA en un celular real

**Demo:** abres `laterraza.vercel.app` en tu celular, la instalas y ves la bienvenida en lila.

---

## Fase 1 — Autenticación con Google, roles y perfil (≈ 1–2 semanas)

**Objetivo:** login con Google en un tap, acceso solo para alumnos aprobados, perfil completo.

> **Prompt para Claude Code:** "Implementa Firebase Auth según PRD §7.1: botón 'Continuar con Google' + email/contraseña como alternativa. Colección approvedEmails gestionada por la admin: al iniciar sesión, si el email está aprobado se crea/activa su documento en users; si no, pantalla de 'pide acceso a tu coach'. Rol admin vía custom claim (script en functions/scripts). Security Rules del PRD §8 para users. Layouts (alumno) con tab bar y (admin), y la página de perfil con todos los campos del PRD §7.4 incluyendo subcolección weightLogs con gráfico."

- [ ] **TASK-008** — Login: "Continuar con Google" (popup/redirect) + email/contraseña + recuperación
  Files: `app/(auth)/login/page.tsx`, `features/auth/*`
- [ ] **TASK-009** — Flujo de aprobación: colección `approvedEmails`, creación automática del doc `users/{uid}` al primer login aprobado, pantalla "pide acceso"
  Files: `features/auth/approval.ts`, `app/(auth)/sin-acceso/page.tsx`
- [ ] **TASK-010** — Script único para asignar el custom claim `admin` a la profesora + guard de rutas por rol y estado de aprobación
  Files: `functions/scripts/set-admin.ts`, `middleware.ts` / guard en layouts
- [ ] **TASK-011** — Security Rules iniciales: `users`, `approvedEmails` (PRD §8) + deploy de rules
  Files: `firestore.rules`, `storage.rules`
- [ ] **TASK-012** — Layout alumno con tab bar (Horarios · Nutrición · Medallas · Membresía · Perfil) y layout admin
  Files: `app/(alumno)/layout.tsx`, `app/(admin)/layout.tsx`, `components/ui/tab-bar.tsx`
- [ ] **TASK-013** — Página de perfil: formulario completo (PRD §7.4), foto (Google o subida), validaciones
  Files: `features/perfil/*`, `app/(alumno)/perfil/page.tsx`
- [ ] **TASK-014** — Historial de peso: subcolección `weightLogs` + gráfico de evolución (Recharts)
  Files: `features/perfil/weight-chart.tsx`
- [ ] **TASK-015** — Admin: pantalla para agregar alumnos a `approvedEmails` y ver quiénes ya activaron su cuenta
  Files: `app/(admin)/alumnos/nuevo/page.tsx`
- [ ] **TASK-016** — Onboarding de primer login (3 pasos, PRD §7.1)
  Files: `app/(alumno)/onboarding/page.tsx`

**Demo:** la profesora agrega tu email, entras con tu cuenta de Google en un tap, completas tu perfil y registras tu peso.

---

## Fase 2 — Horarios y reservas (≈ 1–2 semanas)

> **Prompt para Claude Code:** "Implementa el módulo de clases del PRD §7.2 con Firestore: colecciones classTemplates, classSessions (con cuposOcupados) y bookings con id compuesto sessionId_uid. La reserva usa una transacción de Firestore que valida cuposOcupados < capacidad. Vista semanal del alumno con ClassCard y cupos en tiempo real (onSnapshot), CRUD de horarios para la admin, lista de inscritos y marcado de asistencia. Cloud Function programada que genera las sesiones de la semana desde las plantillas. Actualiza las Security Rules."

- [ ] **TASK-017** — Colecciones `classTemplates`, `classSessions`, `bookings` + Security Rules + función `reservarCupo()` con transacción
  Files: `features/reservas/api.ts`, `firestore.rules`
  Notes: id de booking = `${sessionId}_${uid}` → imposible reservar dos veces
- [ ] **TASK-018** — Cloud Function programada (cron semanal) que genera las sesiones desde plantillas
  Files: `functions/src/generarSesiones.ts`
  Notes: requiere activar plan Blaze (cuota gratuita cubre todo a esta escala)
- [ ] **TASK-019** — Vista alumno: calendario semanal, `ClassCard` con cupos en tiempo real (`onSnapshot`), reservar/cancelar (límite 2 h)
  Files: `features/reservas/*`, `app/(alumno)/horarios/page.tsx`
- [ ] **TASK-020** — Home del alumno: próximas clases reservadas
  Files: `app/(alumno)/page.tsx`
- [ ] **TASK-021** — Admin: CRUD de plantillas y clases puntuales, cancelar clase
  Files: `app/(admin)/clases/*`
- [ ] **TASK-022** — Admin: lista de inscritos por clase + marcar asistencia (asistió / faltó)
  Files: `features/reservas/attendance.tsx`

**Demo:** reservas la clase de 19:00; en el teléfono de la profesora el cupo baja en vivo y ella marca tu asistencia.

---

## Fase 3 — Nutrición (≈ 1 semana)

> **Prompt para Claude Code:** "Implementa nutrición según PRD §7.3: colecciones nutritionForms y nutritionPlans, Storage en nutrition-plans/{uid}/ con rules de acceso dueño+admin. Formulario multipaso con guardado de borrador, NutritionStatusStepper, bandeja admin con vista formulario + perfil físico lado a lado, subida de PDF con notas y versiones, y visor de PDF para el alumno."

- [ ] **TASK-023** — Colecciones `nutritionForms`, `nutritionPlans` + Storage rules (`nutrition-plans/{uid}/`)
  Files: `features/nutricion/api.ts`, `firestore.rules`, `storage.rules`
- [ ] **TASK-024** — Formulario multipaso del alumno: 6 pasos con las 22 preguntas reales de la coach (PRD §7.3), paso 1 pre-llenado desde el perfil, barra de progreso, placeholders con los ejemplos y guardado de borrador
  Files: `features/nutricion/form/*`, `app/(alumno)/nutricion/page.tsx`
- [ ] **TASK-025** — `NutritionStatusStepper` + visor/descarga del PDF
  Files: `features/nutricion/plan-viewer.tsx`
- [ ] **TASK-026** — Admin: bandeja (pendientes/revisados/enviados), formulario + perfil físico lado a lado, subir PDF, historial de versiones
  Files: `app/(admin)/nutricion/*`

**Demo:** llenas el formulario, la profesora sube tu plan en PDF y lo abres desde la app.

---

## Fase 4 — Medallas estilo Scout ⭐ momento mágico (≈ 1–2 semanas)

> **Prompt para Claude Code:** "Implementa el sistema de medallas del PRD §7.5: colecciones skills y achievements según el modelo del §8. Seed con el catálogo completo de los 4 pilares (Fuerza con niveles bronce/plata/oro relativos al peso corporal, Gimnasia y Resistencia como insignias con nombre, Constancia automática). Vitrina agrupada por PillarSection con siluetas bloqueadas y contador, registro de logro con video opcional a Storage, bandeja de validación admin con checklist de pins, modal AchievementCelebration con canvas-confetti y Framer Motion, y CRUD de medallas para la admin. Los hitos relativos a BW se calculan con el último weightLog."

- [ ] **TASK-027** — Colecciones `skills`, `achievements` + Security Rules + Storage `achievement-videos/{uid}/`
  Files: `features/medallas/api.ts`, `firestore.rules`, `storage.rules`
- [ ] **TASK-028** — Seed del catálogo completo (PRD §7.5): 4 pilares, ~35 medallas con nombre, tipo, hitos y flag `relativoABW`
  Files: `functions/scripts/seed-skills.ts`
- [ ] **TASK-029** — Arte de medallas: `MedalBadge` (niveles bronce/plata/oro + insignia con nombre + bloqueada) — tú aportas los SVG por pilar
  Files: `components/ui/medal-badge.tsx`, `public/medals/*`
- [ ] **TASK-030** — Vitrina del alumno: `PillarSection` por pilar, contador "X/35", detalle con hito; los umbrales de Fuerza se muestran ya calculados con su peso ("Plata: levanta 97.5 kg")
  Files: `features/medallas/*`, `app/(alumno)/medallas/page.tsx`
- [ ] **TASK-031** — Registrar logro: nivel (si aplica) + fecha + video opcional → estado pendiente
  Files: `features/medallas/claim.tsx`
- [ ] **TASK-032** — Admin: bandeja de validación (aprobar/rechazar, ver video), checklist de pins pendientes, vista "cerca de la siguiente medalla"
  Files: `app/(admin)/medallas/*`
- [ ] **TASK-033** — `AchievementCelebration`: confetti + medalla animada + mensaje del pin físico al validarse
  Files: `features/medallas/celebration.tsx`
  Notes: canvas-confetti + Framer Motion; se muestra la próxima vez que el alumno abre la app
- [ ] **TASK-034** — Admin CRUD de medallas (crear/editar/desactivar sin código)
  Files: `app/(admin)/medallas/catalogo/page.tsx`
- [ ] **TASK-035** — Cloud Function diaria del pilar Constancia: otorga "Mes Perfecto", "Centenaria/o" y aniversarios automáticamente
  Files: `functions/src/medallasConstancia.ts`

**Demo:** registras tu primera dominada estricta, la profesora la valida y explota el confetti con la medalla "Primera Cima". 🎉

---

## Fase 5 — Membresías, dashboard admin y estadísticas (≈ 1 semana)

> **Prompt para Claude Code:** "Implementa membresías sin pagos in-app según PRD §7.6 (membershipPlans, memberships, payments) con Cloud Function diaria que actualiza estados. MembershipStatusCard del alumno con los planes del box, CRUD admin de planes y pagos, dashboard admin del PRD §7.7 con alertas y métricas, ficha completa de alumno y estadísticas de asistencia por horario."

- [ ] **TASK-036** — Colecciones `membershipPlans`, `memberships`, `payments` + rules + Cloud Function diaria de estados (activa/por_vencer/vencida)
  Files: `features/membresias/api.ts`, `functions/src/estadosMembresias.ts`
- [ ] **TASK-037** — Alumno: sección Membresía (plan actual, vencimiento, historial de pagos, planes del box, banner de renovación)
  Files: `app/(alumno)/membresia/page.tsx`
- [ ] **TASK-038** — Admin: CRUD de planes, asignar plan, registrar pagos, lista al día/por vencer/vencidas
  Files: `app/(admin)/membresias/*`
- [ ] **TASK-039** — Dashboard admin: clases de hoy, alertas (nutrición, medallas, pins, membresías), métricas del mes
  Files: `app/(admin)/page.tsx`, `features/estadisticas/*`
- [ ] **TASK-040** — Ficha de alumno: perfil + gráfico de peso + % asistencia + vitrina + membresía
  Files: `app/(admin)/alumnos/[id]/page.tsx`
- [ ] **TASK-041** — Estadísticas: asistencia por horario y evolución mensual
  Files: `app/(admin)/estadisticas/page.tsx`

---

## Fase 6 — Notificaciones push (FCM) y pulido de lanzamiento (≈ 1 semana)

> **Prompt para Claude Code:** "Implementa push con Firebase Cloud Messaging según PRD §7.8: permiso de notificaciones en la PWA, guardado de fcmTokens en users, integración de FCM en el service worker de Serwist, y Cloud Functions/triggers para los 8 eventos de la tabla del PRD. Luego pulido: estados vacíos, skeletons, prompt de instalación con instrucciones iOS, lectura offline de horarios/perfil/vitrina y auditoría Lighthouse ≥ 90."

- [ ] **TASK-042** — FCM: permiso, tokens en `users/{uid}.fcmTokens[]`, recepción en el service worker
  Files: `app/sw.ts`, `features/push/*`
  Notes: en iOS los push solo funcionan con la PWA instalada (iOS 16.4+) — documentarlo en el prompt de instalación
- [ ] **TASK-043** — Cloud Functions de envío para los 8 eventos del PRD §7.8 (triggers de Firestore + crons)
  Files: `functions/src/push/*`
- [ ] **TASK-044** — Estados vacíos ilustrados, skeletons y manejo de errores en toda la app
- [ ] **TASK-045** — Prompt de instalación PWA con instrucciones para iOS
  Files: `features/pwa/install-prompt.tsx`
- [ ] **TASK-046** — Cache offline de lectura (horarios reservados, perfil, vitrina) + aviso sin conexión
  Notes: Firestore trae persistencia offline incorporada (`persistentLocalCache`) — aprovecharla
- [ ] **TASK-047** — Auditoría Lighthouse (PWA/Perf/A11y ≥ 90), prueba en iOS + Android reales, dominio propio
- [ ] **TASK-048** — Onboarding con la profesora: cargar horarios reales, planes del box, aprobar los primeros 5 alumnos piloto y entregar los primeros pins "Fundador/a"

**Lanzamiento:** semana piloto con 5 alumnos → ajustes → invitar a todo el box. 🚀

---

## Fase futura (v2) — ya soportada por la arquitectura

- WOD del día + registro de PRs (`personalRecords`) + leaderboard; los PRs de fuerza desbloquean medallas automáticamente
- Lista de espera en clases llenas
- Exportar reportes CSV
- Modo oscuro

---

## Guía de sesiones con Claude Code

1. **Una tarea (o grupo pequeño) por sesión.** Pega el prompt de la fase y pide las tareas en orden.
2. **Pide siempre que corra la app** (`npm run dev`) y revisa el resultado en el navegador/celular antes de marcar la tarea.
3. **Commits pequeños:** un commit por tarea, con el ID (`TASK-019: vista semanal de clases`).
4. **Security Rules primero:** cuando una fase toque datos nuevos, pide que las rules se escriban y desplieguen antes que la UI.
5. Si algo se rompe: *"revisa el error, explícamelo en simple y arréglalo"* — no acumules errores.
6. Tu superpoder como diseñadora: feedback visual concreto ("el card necesita más aire, padding 20 px, y el lila del badge debe ser el 300").
