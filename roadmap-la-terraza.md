# Roadmap de implementaciÃ³n â€” La Terraza PWA (v2 Â· Firebase)

Plan de construcciÃ³n por fases. Cada fase termina con una app **funcionando y demostrable**. Las tareas estÃ¡n ordenadas: dÃ¡selas a Claude Code en secuencia y marca `- [x]` al completarlas. Al inicio de cada fase tienes un **prompt sugerido**.

**FilosofÃ­a de build:**
1. Nunca dejar la app rota entre fases.
2. El momento mÃ¡gico (celebraciÃ³n de medalla) llega en la Fase 4 â€” no al final.
3. Commit + deploy en Vercel al final de cada fase (verÃ¡s la app real en tu celular desde la semana 1).
4. TÃº diseÃ±as en Figma un paso adelante de la fase en construcciÃ³n (prioridad: el arte de las medallas por pilar).

---

## Fase 0 â€” FundaciÃ³n y design system (â‰ˆ 1 semana)

**Objetivo:** proyecto creado, tema lila aplicado, Firebase conectado, PWA instalable publicada en Vercel.

> **Prompt para Claude Code:** "Crea un proyecto Next.js 15 con App Router, TypeScript y Tailwind. Instala shadcn/ui y configura el tema con los tokens lila del PRD Â§6.2. Configura la PWA con Serwist: manifest 'La Terraza', theme color #8B5CF6, iconos placeholder. Inicializa Firebase (Auth, Firestore, Storage) en lib/firebase con variables de entorno, crea la estructura de carpetas por features del PRD Â§5 y una pantalla de bienvenida. ConÃ©ctalo a un repo de GitHub."

- [x] **TASK-001** â€” Crear proyecto Next.js 15 + TypeScript + Tailwind y repo en GitHub
  Notes: `npx create-next-app@latest la-terraza --typescript --tailwind --app`
- [x] **TASK-002** â€” shadcn/ui con los tokens lila del PRD Â§6.2 (variables CSS)
  Files: `app/globals.css`, `tailwind.config.ts`, `components.json`
- [x] **TASK-003** â€” TipografÃ­as Sora (display) e Inter (cuerpo) con `next/font`
  Files: `app/layout.tsx`
- [x] **TASK-004** â€” PWA: manifest.json, iconos 192/512 maskable, service worker con Serwist
  Files: `public/manifest.json`, `app/sw.ts`, `next.config.mjs`
- [x] **TASK-005** â€” Crear proyecto en la consola de Firebase (Auth con Google + email habilitados, Firestore, Storage) e inicializar SDK cliente + Admin SDK
  Files: `lib/firebase/client.ts`, `lib/firebase/admin.ts`, `.env.local`
  Notes: guardar las claves del proyecto en `.env.local`; nunca subirlas a GitHub
- [x] **TASK-006** â€” Estructura de carpetas por features (PRD Â§5) + pantalla de bienvenida con logo
  Files: `features/*`, `app/page.tsx`
- [x] **TASK-007** â€” Conectar repo a Vercel (con las variables de entorno) y verificar deploy + instalaciÃ³n PWA en un celular real

**Demo:** abres `laterraza.vercel.app` en tu celular, la instalas y ves la bienvenida en lila.

---

## Fase 1 â€” AutenticaciÃ³n con Google, roles y perfil (â‰ˆ 1â€“2 semanas)

**Objetivo:** login con Google en un tap, acceso solo para alumnos aprobados, perfil completo.

> **Prompt para Claude Code:** "Implementa Firebase Auth segÃºn PRD Â§7.1: botÃ³n 'Continuar con Google' + email/contraseÃ±a como alternativa. ColecciÃ³n approvedEmails gestionada por la admin: al iniciar sesiÃ³n, si el email estÃ¡ aprobado se crea/activa su documento en users; si no, pantalla de 'pide acceso a tu coach'. Rol admin vÃ­a custom claim (script en functions/scripts). Security Rules del PRD Â§8 para users. Layouts (alumno) con tab bar y (admin), y la pÃ¡gina de perfil con todos los campos del PRD Â§7.4 incluyendo subcolecciÃ³n weightLogs con grÃ¡fico."

- [x] **TASK-008** â€” Login: "Continuar con Google" (popup/redirect) + email/contraseÃ±a + recuperaciÃ³n
  Files: `app/(auth)/login/page.tsx`, `features/auth/*`
- [x] **TASK-009** â€” Flujo de aprobaciÃ³n: colecciÃ³n `approvedEmails`, creaciÃ³n automÃ¡tica del doc `users/{uid}` al primer login aprobado, pantalla "pide acceso"
  Files: `features/auth/approval.ts`, `app/(auth)/sin-acceso/page.tsx`
- [x] **TASK-010** â€” Script Ãºnico para asignar el custom claim `admin` a la profesora + guard de rutas por rol y estado de aprobaciÃ³n
  Files: `functions/scripts/set-admin.ts`, `middleware.ts` / guard en layouts
- [x] **TASK-011** â€” Security Rules iniciales: `users`, `approvedEmails` (PRD Â§8) + deploy de rules
  Files: `firestore.rules`, `storage.rules`
- [x] **TASK-012** â€” Layout alumno con tab bar (Horarios Â· NutriciÃ³n Â· Medallas Â· MembresÃ­a Â· Perfil) y layout admin
  Files: `app/(alumno)/layout.tsx`, `app/(admin)/layout.tsx`, `components/ui/tab-bar.tsx`
- [x] **TASK-013** â€” PÃ¡gina de perfil: formulario completo (PRD Â§7.4), foto (Google o subida), validaciones
  Files: `features/perfil/*`, `app/(alumno)/perfil/page.tsx`
- [x] **TASK-014** â€” Historial de peso: subcolecciÃ³n `weightLogs` + grÃ¡fico de evoluciÃ³n (Recharts)
  Files: `features/perfil/weight-chart.tsx`
- [x] **TASK-015** â€” Admin: pantalla para agregar alumnos a `approvedEmails` y ver quiÃ©nes ya activaron su cuenta
  Files: `app/(admin)/alumnos/nuevo/page.tsx`
- [x] **TASK-016** â€” Onboarding de primer login (3 pasos, PRD Â§7.1)
  Files: `app/(alumno)/onboarding/page.tsx`

**Demo:** la profesora agrega tu email, entras con tu cuenta de Google en un tap, completas tu perfil y registras tu peso.

---

## Fase 2 â€” Horarios y reservas (â‰ˆ 1â€“2 semanas)

> **Prompt para Claude Code:** "Implementa el mÃ³dulo de clases del PRD Â§7.2 con Firestore: colecciones classTemplates, classSessions (con cuposOcupados) y bookings con id compuesto sessionId_uid. La reserva usa una transacciÃ³n de Firestore que valida cuposOcupados < capacidad. Vista semanal del alumno con ClassCard y cupos en tiempo real (onSnapshot), CRUD de horarios para la admin, lista de inscritos y marcado de asistencia. Cloud Function programada que genera las sesiones de la semana desde las plantillas. Actualiza las Security Rules."

- [x] **TASK-017** â€” Colecciones `classTemplates`, `classSessions`, `bookings` + Security Rules + funciÃ³n `reservarCupo()` con transacciÃ³n
  Files: `features/reservas/api.ts`, `firestore.rules`
  Notes: id de booking = `${sessionId}_${uid}` â†’ imposible reservar dos veces
- [x] **TASK-018** â€” Cloud Function programada (cron semanal) que genera las sesiones desde plantillas
  Files: `functions/src/generarSesiones.ts`
  Notes: requiere activar plan Blaze (cuota gratuita cubre todo a esta escala)
- [x] **TASK-019** â€” Vista alumno: calendario semanal, `ClassCard` con cupos en tiempo real (`onSnapshot`), reservar/cancelar (lÃ­mite 2 h)
  Files: `features/reservas/*`, `app/(alumno)/horarios/page.tsx`
- [x] **TASK-020** â€” Home del alumno: prÃ³ximas clases reservadas
  Files: `app/(alumno)/page.tsx`
- [x] **TASK-021** â€” Admin: CRUD de plantillas y clases puntuales, cancelar clase
  Files: `app/(admin)/clases/*`
- [x] **TASK-022** â€” Admin: lista de inscritos por clase + marcar asistencia (asistiÃ³ / faltÃ³)
  Files: `features/reservas/attendance.tsx`

**Demo:** reservas la clase de 19:00; en el telÃ©fono de la profesora el cupo baja en vivo y ella marca tu asistencia.

---

## Fase 3 â€” NutriciÃ³n (â‰ˆ 1 semana)

> **Prompt para Claude Code:** "Implementa nutriciÃ³n segÃºn PRD Â§7.3: colecciones nutritionForms y nutritionPlans, Storage en nutrition-plans/{uid}/ con rules de acceso dueÃ±o+admin. Formulario multipaso con guardado de borrador, NutritionStatusStepper, bandeja admin con vista formulario + perfil fÃ­sico lado a lado, subida de PDF con notas y versiones, y visor de PDF para el alumno."

- [x] **TASK-023** â€” Colecciones `nutritionForms`, `nutritionPlans` + Storage rules (`nutrition-plans/{uid}/`)
  Files: `features/nutricion/api.ts`, `firestore.rules`, `storage.rules`
- [x] **TASK-024** â€” Formulario multipaso del alumno: 6 pasos con las 22 preguntas reales de la coach (PRD Â§7.3), paso 1 pre-llenado desde el perfil, barra de progreso, placeholders con los ejemplos y guardado de borrador
  Files: `features/nutricion/form/*`, `app/(alumno)/nutricion/page.tsx`
- [x] **TASK-025** â€” `NutritionStatusStepper` + visor/descarga del PDF
  Files: `features/nutricion/plan-viewer.tsx`
- [x] **TASK-026** â€” Admin: bandeja (pendientes/revisados/enviados), formulario + perfil fÃ­sico lado a lado, subir PDF, historial de versiones
  Files: `app/(admin)/nutricion/*`

**Demo:** llenas el formulario, la profesora sube tu plan en PDF y lo abres desde la app.

---

## Fase 4 â€” Medallas estilo Scout â­ momento mÃ¡gico (â‰ˆ 1â€“2 semanas)

> **Prompt para Claude Code:** "Implementa el sistema de medallas del PRD Â§7.5: colecciones skills y achievements segÃºn el modelo del Â§8. Seed con el catÃ¡logo completo de los 4 pilares (Fuerza con niveles bronce/plata/oro relativos al peso corporal, Gimnasia y Resistencia como insignias con nombre, Constancia automÃ¡tica). Vitrina agrupada por PillarSection con siluetas bloqueadas y contador, registro de logro con video opcional a Storage, bandeja de validaciÃ³n admin con checklist de pins, modal AchievementCelebration con canvas-confetti y Framer Motion, y CRUD de medallas para la admin. Los hitos relativos a BW se calculan con el Ãºltimo weightLog."

- [x] **TASK-027** â€” Colecciones `skills`, `achievements` + Security Rules + Storage `achievement-videos/{uid}/`
  Files: `features/medallas/api.ts`, `firestore.rules`, `storage.rules`
- [x] **TASK-028** â€” Seed del catÃ¡logo completo (PRD Â§7.5): 4 pilares, ~35 medallas con nombre, tipo, hitos y flag `relativoABW`
  Files: `functions/scripts/seed-skills.ts`
- [x] **TASK-029** â€” Arte de medallas: `MedalBadge` (niveles bronce/plata/oro + insignia con nombre + bloqueada) â€” tÃº aportas los SVG por pilar
  Files: `components/ui/medal-badge.tsx`, `public/medals/*`
- [x] **TASK-030** â€” Vitrina del alumno: `PillarSection` por pilar, contador "X/35", detalle con hito; los umbrales de Fuerza se muestran ya calculados con su peso ("Plata: levanta 97.5 kg")
  Files: `features/medallas/*`, `app/(alumno)/medallas/page.tsx`
- [x] **TASK-031** â€” Registrar logro: nivel (si aplica) + fecha + video opcional â†’ estado pendiente
  Files: `features/medallas/claim.tsx`
- [x] **TASK-032** â€” Admin: bandeja de validaciÃ³n (aprobar/rechazar, ver video), checklist de pins pendientes, vista "cerca de la siguiente medalla"
  Files: `app/(admin)/medallas/*`
- [x] **TASK-033** â€” `AchievementCelebration`: confetti + medalla animada + mensaje del pin fÃ­sico al validarse
  Files: `features/medallas/celebration.tsx`
  Notes: canvas-confetti + Framer Motion; se muestra la prÃ³xima vez que el alumno abre la app
- [x] **TASK-034** â€” Admin CRUD de medallas (crear/editar/desactivar sin cÃ³digo)
  Files: `app/(admin)/medallas/catalogo/page.tsx`
- [x] **TASK-035** â€” Cloud Function diaria del pilar Constancia: otorga "Mes Perfecto", "Centenaria/o" y aniversarios automÃ¡ticamente
  Files: `functions/src/medallasConstancia.ts`

**Demo:** registras tu primera dominada estricta, la profesora la valida y explota el confetti con la medalla "Primera Cima". ðŸŽ‰

---

## Fase 5 â€” MembresÃ­as, dashboard admin y estadÃ­sticas (â‰ˆ 1 semana)

> **Prompt para Claude Code:** "Implementa membresÃ­as sin pagos in-app segÃºn PRD Â§7.6 (membershipPlans, memberships, payments) con Cloud Function diaria que actualiza estados. MembershipStatusCard del alumno con los planes del box, CRUD admin de planes y pagos, dashboard admin del PRD Â§7.7 con alertas y mÃ©tricas, ficha completa de alumno y estadÃ­sticas de asistencia por horario."

- [x] **TASK-036** â€” Colecciones `membershipPlans`, `memberships`, `payments` + rules + Cloud Function diaria de estados (activa/por_vencer/vencida)
  Files: `features/membresias/api.ts`, `functions/src/estadosMembresias.ts`
- [x] **TASK-037** â€” Alumno: secciÃ³n MembresÃ­a (plan actual, vencimiento, historial de pagos, planes del box, banner de renovaciÃ³n)
  Files: `app/(alumno)/membresia/page.tsx`
- [x] **TASK-038** â€” Admin: CRUD de planes, asignar plan, registrar pagos, lista al dÃ­a/por vencer/vencidas
  Files: `app/(admin)/membresias/*`
- [x] **TASK-039** â€” Dashboard admin: clases de hoy, alertas (nutriciÃ³n, medallas, pins, membresÃ­as), mÃ©tricas del mes
  Files: `app/(admin)/page.tsx`, `features/estadisticas/*`
- [x] **TASK-040** â€” Ficha de alumno: perfil + grÃ¡fico de peso + % asistencia + vitrina + membresÃ­a
  Files: `app/(admin)/alumnos/[id]/page.tsx`
- [x] **TASK-041** â€” EstadÃ­sticas: asistencia por horario y evoluciÃ³n mensual
  Files: `app/(admin)/estadisticas/page.tsx`

---

## Fase 6 â€” Notificaciones push (FCM) y pulido de lanzamiento (â‰ˆ 1 semana)

> **Prompt para Claude Code:** "Implementa push con Firebase Cloud Messaging segÃºn PRD Â§7.8: permiso de notificaciones en la PWA, guardado de fcmTokens en users, integraciÃ³n de FCM en el service worker de Serwist, y Cloud Functions/triggers para los 8 eventos de la tabla del PRD. Luego pulido: estados vacÃ­os, skeletons, prompt de instalaciÃ³n con instrucciones iOS, lectura offline de horarios/perfil/vitrina y auditorÃ­a Lighthouse â‰¥ 90."

- [ ] **TASK-042** â€” FCM: permiso, tokens en `users/{uid}.fcmTokens[]`, recepciÃ³n en el service worker
  Files: `app/sw.ts`, `features/push/*`
  Notes: en iOS los push solo funcionan con la PWA instalada (iOS 16.4+) â€” documentarlo en el prompt de instalaciÃ³n
- [ ] **TASK-043** â€” Cloud Functions de envÃ­o para los 8 eventos del PRD Â§7.8 (triggers de Firestore + crons)
  Files: `functions/src/push/*`
- [ ] **TASK-044** â€” Estados vacÃ­os ilustrados, skeletons y manejo de errores en toda la app
- [ ] **TASK-045** â€” Prompt de instalaciÃ³n PWA con instrucciones para iOS
  Files: `features/pwa/install-prompt.tsx`
- [ ] **TASK-046** â€” Cache offline de lectura (horarios reservados, perfil, vitrina) + aviso sin conexiÃ³n
  Notes: Firestore trae persistencia offline incorporada (`persistentLocalCache`) â€” aprovecharla
- [ ] **TASK-047** â€” AuditorÃ­a Lighthouse (PWA/Perf/A11y â‰¥ 90), prueba en iOS + Android reales, dominio propio
- [ ] **TASK-048** â€” Onboarding con la profesora: cargar horarios reales, planes del box, aprobar los primeros 5 alumnos piloto y entregar los primeros pins "Fundador/a"

**Lanzamiento:** semana piloto con 5 alumnos â†’ ajustes â†’ invitar a todo el box. ðŸš€

---

## Fase futura (v2) â€” ya soportada por la arquitectura

- WOD del dÃ­a + registro de PRs (`personalRecords`) + leaderboard; los PRs de fuerza desbloquean medallas automÃ¡ticamente
- Lista de espera en clases llenas
- Exportar reportes CSV
- Modo oscuro

---

## GuÃ­a de sesiones con Claude Code

1. **Una tarea (o grupo pequeÃ±o) por sesiÃ³n.** Pega el prompt de la fase y pide las tareas en orden.
2. **Pide siempre que corra la app** (`npm run dev`) y revisa el resultado en el navegador/celular antes de marcar la tarea.
3. **Commits pequeÃ±os:** un commit por tarea, con el ID (`TASK-019: vista semanal de clases`).
4. **Security Rules primero:** cuando una fase toque datos nuevos, pide que las rules se escriban y desplieguen antes que la UI.
5. Si algo se rompe: *"revisa el error, explÃ­camelo en simple y arrÃ©glalo"* â€” no acumules errores.
6. Tu superpoder como diseÃ±adora: feedback visual concreto ("el card necesita mÃ¡s aire, padding 20 px, y el lila del badge debe ser el 300").
