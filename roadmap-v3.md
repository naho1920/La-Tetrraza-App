# Roadmap v3 â€” La Terraza PWA Â· Mejoras post-auditorÃ­a

ContinuaciÃ³n del roadmap original (`roadmap-la-terraza.md`, que llega hasta TASK-048). Este documento recoge el plan de mejoras derivado de la auditorÃ­a de **arquitectura, medallas, seguridad y UX/UI** de julio 2026, con la app ya construida en las fases 0â€“5 y la Fase 6 casi sin empezar.

**FilosofÃ­a (igual que antes):**
1. Nunca dejar la app rota entre tareas.
2. Seguridad primero: cuando una tarea toca reglas de Firestore, se escriben y despliegan antes que la UI.
3. Un commit por tarea, con el ID (`TASK-049: acota cuposOcupados en las rules`).
4. Cada fase termina con una app funcionando y demostrable.

**NumeraciÃ³n:** las tareas siguen desde TASK-049 para no chocar con el roadmap original.

**Estado real de partida (verificado en cÃ³digo):**
- Fases 0â€“5: construidas y funcionando.
- Fase 6 (FCM push, install prompt, offline, estados vacÃ­os): sin empezar. Existe scaffolding muerto (`fcmTokens[]` que nunca se llena).
- Modo oscuro (listado como "v2 futura" en el original): **ya estÃ¡ hecho**.
- Storage: migrÃ³ de Firebase a Supabase (bucket `docslaterraza`); no existe `storage.rules`.
- Notas de rutas reales vs. el roadmap original: `medallas` â†’ `medallas-admin`, `[id]` â†’ `[uid]`, homes unificados en `app/page.tsx`.

---

## Fase 7 â€” Blindaje de seguridad (â‰ˆ 1 semana) ðŸ”´ antes del piloto

**Objetivo:** cerrar los huecos de integridad de datos que hoy dependen de la honestidad del cliente. Es lo mÃ¡s urgente porque cualquier alumno aprobado puede explotarlos con el SDK directo.

> **Prompt para Claude Code:** "Endurece las Security Rules de Firestore y las API routes segÃºn la auditorÃ­a de seguridad. Prioriza la integridad de reservas (cuposOcupados y bookings), los lÃ­mites de subida de video, la whitelist de campos en nutritionForms y achievements, y la protecciÃ³n server-side de las rutas admin. No cambies la UI salvo lo mÃ­nimo necesario."

- [ ] **TASK-049** â€” Reglas de `classSessions`: acotar `cuposOcupados` al rango `[0, capacidad]` y, si es posible, ligar el cambio del contador a la existencia del `booking` del propio uid
  Files: `firestore.rules`
  Notes: hoy (`firestore.rules:96-101`) cualquier alumno aprobado puede sumar/restar Â±1 sin lÃ­mite ni relaciÃ³n con una reserva suya â†’ puede "llenar" una clase sin reservar y bloquear a los demÃ¡s. Considerar mover el contador a una transacciÃ³n validada por Cloud Function/API route.
- [ ] **TASK-050** â€” Reglas de `bookings`: validar en el `create` contra el documento de la sesiÃ³n (existe, estado `programada`, no ha comenzado, hay cupo) con `get(...)`
  Files: `firestore.rules`
  Notes: hoy (`firestore.rules:112-115`) solo se valida formato de id, `uid` y `estado=='reservado'`. Toda la lÃ³gica de negocio vive solo en el cliente (`features/reservas/api.ts:168-176`). Alternativa mÃ¡s robusta: centralizar la reserva en una API route con Admin SDK y quitar la escritura directa desde cliente.
- [ ] **TASK-051** â€” LÃ­mites en subida de videos de logros: `fileSizeLimit` + `allowedMimeTypes` en el bucket de Supabase y validaciÃ³n de tamaÃ±o/tipo antes de emitir la signed upload URL
  Files: `app/api/medallas/solicitar-subida-video/route.ts`, policy del bucket `docslaterraza`
  Notes: hoy no hay ningÃºn lÃ­mite (contrasta con `subir-plan` 10 MB/PDF y `subir-avatar` 2 MB/imagen). Guardar el `content-type` real, no forzar siempre `.mp4` (`route.ts:32`).
- [ ] **TASK-052** â€” Whitelist de campos editables en `nutritionForms` (que el alumno NO pueda cambiar `estado`)
  Files: `firestore.rules`
  Notes: hoy (`firestore.rules:135-139`) sin `hasOnly([...])` el dueÃ±o puede mover su propio `estado` a `plan_enviado`/`revisado` mientras estÃ¡ `pendiente`, rompiendo la mÃ¡quina de estados de la coach.
- [ ] **TASK-053** â€” Whitelist de campos en el `create` de `achievements` + validar que `skillId` exista
  Files: `firestore.rules`
  Notes: el invariante crÃ­tico se mantiene (no puede auto-validarse), pero hoy puede sembrar `skillId` inexistente, `pesoLevantadoKg` inflado y campos que no le tocan (`firestore.rules:160-163`).
- [ ] **TASK-054** â€” ProtecciÃ³n server-side de las rutas `(admin)`: `middleware.ts` o Server Component que valide el ID token y el custom claim `admin`
  Files: `middleware.ts`, `app/(admin)/layout.tsx`
  Notes: hoy la protecciÃ³n es solo cliente (`features/auth/guards.tsx`, `useEffect`) y decide por `userDoc.rol` en vez de `token.admin`. Los datos ya estÃ¡n protegidos por rules; esto es defensa en profundidad.
- [ ] **TASK-055** â€” Cabeceras de seguridad globales: `Content-Security-Policy` de pÃ¡gina + `Strict-Transport-Security` (HSTS)
  Files: `next.config.ts`
  Notes: ya hay X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy; faltan CSP global y HSTS.
- [ ] **TASK-056** â€” Excluir documentos sensibles del runtime caching del service worker (`NetworkOnly` para `*.supabase.co/storage`)
  Files: `app/sw.ts`
  Notes: hoy los PDFs de nutriciÃ³n y comprobantes de pago pueden quedar en Cache Storage del navegador aunque expire la signed URL â€” riesgo en equipos compartidos.
- [ ] **TASK-057** â€” Rate limiting: migrar el limitador en memoria a un store compartido (Upstash Redis o Firestore), o al menos quitar el `clear()` global (evicciÃ³n LRU por clave)
  Files: `lib/rate-limit.ts`
  Notes: en serverless cada instancia tiene su propio `Map` â†’ el lÃ­mite efectivo se multiplica; el `clear()` al superar 5000 claves resetea todos los contadores (`lib/rate-limit.ts:14-38`).
- [ ] **TASK-058** â€” Normalizar emails a minÃºsculas en reglas y cliente (evitar desajuste de mayÃºsculas)
  Files: `firestore.rules`, `features/auth/approval.ts`
  Notes: las rules comparan `request.auth.token.email` contra ids de `approvedEmails` guardados en minÃºsculas; si el token trae mayÃºsculas, `get`/`exists` no casan (`firestore.rules:40,63-66`).
- [ ] **TASK-059** â€” Validar en `subir-plan` que `nutritionForms/{formId}.uid == uid` antes de asociar el plan
  Files: `app/api/nutricion/subir-plan/route.ts`
  Notes: ruta solo-admin, pero un error humano podrÃ­a asociar un plan al alumno equivocado.
- [ ] **TASK-060** â€” Operativo: sacar el proyecto de OneDrive (o excluir la carpeta de la sincronizaciÃ³n) para que `.env.local` no se sincronice a la nube de Microsoft
  Notes: `.env.local` no estÃ¡ en git âœ… pero contiene `FIREBASE_ADMIN_PRIVATE_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; la carpeta vive bajo `OneDrive\Escritorio`. Si el bucket de Firebase Storage estÃ¡ habilitado en consola, ponerle reglas `allow read, write: if false`.

**Demo:** intentas manipular `cuposOcupados` o crear un booking en una clase llena desde la consola del navegador â†’ las rules lo rechazan.

---

## Fase 8 â€” Medallas 2.0 (â‰ˆ 1â€“2 semanas) ðŸ¥‡ el corazÃ³n de la app

**Objetivo:** eliminar duplicados de raÃ­z, dar contexto real a la validaciÃ³n de la coach y resolver las dos contradicciones internas (cron vs. manual de Constancia, celebraciÃ³n atada al Home).

> **Prompt para Claude Code:** "Refuerza el sistema de medallas: id determinÃ­stico en los reclamos, validaciÃ³n del hito con el peso corporal real, progresiÃ³n de niveles, y decide un Ãºnico camino para las medallas de Constancia. AÃ±ade la vista admin 'quiÃ©n estÃ¡ cerca de quÃ© medalla'."

- [ ] **TASK-061** â€” Decidir un Ãºnico camino para el pilar Constancia (cron automÃ¡tico **o** otorgamiento manual) y eliminar el otro
  Files: `features/medallas/api.ts`, `functions/src/medallasConstancia.ts`, `firestore.rules`
  Notes: hoy conviven el cron desplegado y `otorgarMedallaManual` (comentario en `api.ts:159` dice que reemplaza al cron). Usan patrones de id distintos (`${uid}_${skill}` vs `${uid}_${skill}_${nivel}`) â†’ riesgo de **doble medalla**. RecomendaciÃ³n: mantener el cron (sorpresa automÃ¡tica, como pide el PRD Â§7.5) y unificar el formato de id.
- [ ] **TASK-062** â€” Id determinÃ­stico en `claimAchievement` (`${uid}_${skillId}_${nivel}`) con `setDoc` en vez de `addDoc`
  Files: `features/medallas/api.ts`
  Notes: hoy usa `addDoc` (id aleatorio) y el anti-duplicado vive solo en el cliente (`claim.tsx:43-48`) â†’ dos pestaÃ±as = dos pendientes del mismo logro. Unifica el patrÃ³n con `otorgarMedallaManual`.
- [ ] **TASK-063** â€” Guardar snapshot del peso corporal del momento en el `achievement` de Fuerza + mostrar el umbral calculado en la bandeja de validaciÃ³n de la admin
  Files: `features/medallas/claim.tsx`, `features/medallas/api.ts`, `app/(admin)/medallas-admin/page.tsx`, `features/medallas/types.ts`
  Notes: hoy `pesoLevantadoKg` nunca se compara contra `multiplicador Ã— peso corporal`; si el alumno cambia de peso no queda registro de contra quÃ© se validÃ³. La UI admin deberÃ­a mostrar "declara 120 kg Â· umbral plata 97.5 kg âœ…/âŒ".
- [ ] **TASK-064** â€” ProgresiÃ³n de niveles en cascada: al validar oro, autocompletar bronce y plata (o bloquear reclamo de nivel superior sin el anterior)
  Files: `features/medallas/api.ts`, `features/medallas/claim.tsx`
  Notes: hoy se puede reclamar oro sin bronce/plata (`claim.tsx:41-53`). RecomendaciÃ³n: cascada (quien levanta 2Ã— BW ya pasÃ³ por 1Ã— y 1.5Ã—) â€” mÃ¡s motivador que bloquear.
- [x] **TASK-065** â€” Vista admin "quiÃ©n estÃ¡ cerca de quÃ© medalla" (ej. alumnos con peso muerto en 1.4Ã— BW, a punto de plata)
  Files: `app/(admin)/medallas-admin/*`
  Notes: gap confirmado vs PRD Â§7.5 y TASK-032 original. Herramienta clave para que la coach motive.
- [x] **TASK-066** â€” "Mes Perfecto": backfill retroactivo (recuperar meses si el cron fallÃ³ el dÃ­a 1) y documentar el mÃ­nimo de asistencias
  Files: `functions/src/medallasConstancia.ts`
  Notes: hoy solo se evalÃºa el dÃ­a 1 sobre el mes anterior (`:139`) â†’ si el cron falla ese dÃ­a, el mes se pierde. La constante `MIN_CLASES_MES_PERFECTO=8` (`:15`) no estÃ¡ documentada en el PRD (Â§7.5 dice solo "100% asistencia").
- [x] **TASK-067** â€” Mover el disparo de la celebraciÃ³n a un listener global (o tambiÃ©n a la vitrina), no solo al Home
  Files: `features/medallas/celebration.tsx`, `app/(alumno)/layout.tsx`
  Notes: hoy el confetti solo se dispara si el alumno visita el Home (`app/page.tsx:64-77`) â†’ una medalla otorgada por la admin puede no celebrarse.
- [x] **TASK-068** â€” Completar el catÃ¡logo a ~35â€“40 medallas y verificar que los SVG existan en `public/medals/`
  Files: `features/medallas/catalogo.ts`, `functions/scripts/seed-skills.ts`, `public/medals/*`
  Notes: hoy hay 27 medallas; el PRD sugiere ~35â€“40 ("12/40" en Â§7.5). `MedalBadge` espera `/medals/{pilar}/{arte}-{nivel}.svg` con fallback a icono (`medal-badge.tsx:47`).

**Demo:** reclamas "Peso Muerto oro" con un peso que no llega al umbral â†’ la admin lo ve marcado âŒ en su bandeja; al validar oro real, bronce y plata se iluminan en cascada.

---

## Fase 9 â€” Completar la Fase 6 real (â‰ˆ 1â€“2 semanas) ðŸŸ£

**Objetivo:** terminar lo que quedÃ³ pendiente de la Fase 6, en orden de impacto real. Los estados de error van primero porque hoy un fallo de red se disfraza de "no tienes datos".

> **Prompt para Claude Code:** "Completa la Fase 6: primero manejo de errores real con reintento en todas las pÃ¡ginas, luego prompt de instalaciÃ³n PWA con instrucciones iOS, FCM push reusando la lÃ³gica de la bandeja de notificaciones, y lectura offline con persistentLocalCache de Firestore."

- [ ] **TASK-069** â€” Manejo de errores real + botÃ³n reintentar en todas las pÃ¡ginas (reemplazar los `.catch(() => setX([]))` silenciosos)
  Files: `app/page.tsx`, `app/(alumno)/perfil/page.tsx`, `features/estadisticas/dashboard.tsx`, y demÃ¡s fetch
  Notes: hoy muchos fetch tragan el error y muestran estado vacÃ­o engaÃ±oso ("no tienes clases" cuando fallÃ³ la carga). Es lo que mÃ¡s degrada la confianza.
- [ ] **TASK-070** â€” Estados vacÃ­os ilustrados en Horarios, MembresÃ­a, NutriciÃ³n y bandejas admin
  Files: rutas de alumno/admin con listas
  Notes: ya existe el patrÃ³n bueno en `ListaNotificaciones` (icono `BellOff` en cÃ­rculo, `features/notificaciones/lista.tsx:68-76`) â€” replicarlo. Hoy el resto son texto plano.
- [ ] **TASK-071** â€” Prompt de instalaciÃ³n PWA con instrucciones para iOS
  Files: `features/pwa/install-prompt.tsx`
  Notes: no existe `features/pwa/`. Listener `beforeinstallprompt` (Android) + detecciÃ³n de `display-mode: standalone` + instrucciones manuales iOS ("Compartir â†’ AÃ±adir a inicio"). Prerequisito del push en iOS.
- [ ] **TASK-072** â€” `safe-area-inset-top` en los headers de pÃ¡gina (hoy solo la tab bar aplica safe area inferior)
  Files: cabeceras de `app/page.tsx` y pÃ¡ginas de alumno/admin
  Notes: en iPhone con notch/Dynamic Island en modo standalone el header queda pegado al borde superior.
- [ ] **TASK-073** â€” FCM: poblar `fcmTokens[]`, integrar Firebase Cloud Messaging en el service worker de Serwist
  Files: `app/sw.ts`, `features/push/*`
  Notes: hoy `fcmTokens: []` se aprovisiona pero nunca se llena (`features/auth/approval.ts:42`) â€” scaffolding muerto. En iOS los push solo funcionan con la PWA instalada (iOS 16.4+).
- [ ] **TASK-074** â€” Cloud Functions de envÃ­o de push para los 8 eventos del PRD Â§7.8 (triggers de Firestore + crons)
  Files: `functions/src/push/*`
  Notes: reusar la lÃ³gica de eventos que ya deriva `features/notificaciones/api.ts`; la bandeja in-app queda como historial.
- [ ] **TASK-075** â€” Lectura offline: activar `persistentLocalCache` de Firestore + banner "sin conexiÃ³n" con `navigator.onLine`
  Files: `lib/firebase/client.ts`, layout de alumno
  Notes: hoy usa `getFirestore` normal sin persistencia (`lib/firebase/client.ts:19`); el SW cachea assets pero no datos. Alto impacto para un box con wifi irregular.
- [ ] **TASK-076** â€” AuditorÃ­a Lighthouse (PWA/Perf/A11y â‰¥ 90) en iOS y Android reales
  Notes: la auditorÃ­a de rendimiento previa no pudo correr Lighthouse por falta de credenciales reales (ver `docs/auditoria-rendimiento.md`).

**Demo:** instalas la app en un iPhone desde el prompt, pierdes conexiÃ³n y sigues viendo tus clases reservadas; al validarse una medalla te llega el push con la app cerrada.

---

## Fase 10 â€” Pulido UX/UI y accesibilidad (â‰ˆ 1 semana) ðŸŽ¨

**Objetivo:** cerrar los fallos de accesibilidad (algunos fallan WCAG AA hoy), unificar patrones duplicados en componentes del design system y quitar la fricciÃ³n del onboarding.

> **Prompt para Claude Code:** "Aplica el pulido UX/UI: arregla el contraste de los badges, asocia labels a sus controles, crea un sistema de toast, extrae los componentes duplicados (ToggleChip, FileInput, variante on-dark) y limpia el onboarding."

- [ ] **TASK-077** â€” Contraste de badges `success` y `warning` (hoy fallan WCAG AA)
  Files: `components/ui/badge.tsx`
  Notes: `warning` (`text-warning` Ã¡mbar sobre `bg-warning/15`) â‰ˆ 1.9:1 y `success` â‰ˆ 2.8:1. Afecta "Llena" (`class-card.tsx:55`) y estados de pago. Usar el tono oscuro del color para el texto, como ya hace `default` con `text-primary-dark`.
- [ ] **TASK-078** â€” Asociar `<Label>` a sus controles (`htmlFor`/`id`) + `aria-label` en las medallas de la vitrina
  Files: `claim.tsx:101`, `form-wizard.tsx:116`, `profile-form.tsx`, `horario-semanal.tsx`, `catalogo/page.tsx`, `pillar-section.tsx:81-84`
  Notes: hoy un lector de pantalla no anuncia la etiqueta al enfocar Selects/campos custom; las medallas son botones icon-only sin nombre accesible.
- [ ] **TASK-079** â€” Respetar `prefers-reduced-motion` en confetti y springs de la celebraciÃ³n
  Files: `features/medallas/celebration.tsx`
  Notes: hoy el confetti (`:28-30`) y los springs se disparan siempre.
- [ ] **TASK-080** â€” TamaÃ±os tÃ¡ctiles a 44px (botones icon y celdas de calendario estÃ¡n en 40px)
  Files: `components/ui/button.tsx:28`, `components/ui/month-calendar.tsx:113`
- [ ] **TASK-081** â€” Sistema de toast con auto-dismiss (reemplazar los mensajes de Ã©xito inline que se quedan pegados en admin)
  Files: `components/ui/toast.tsx` (nuevo), `horario-semanal.tsx`, `clases/page.tsx`, `medallas-admin/page.tsx`
  Notes: hoy los mensajes de Ã©xito son estado inline que nunca se auto-descarta (ej. `horario-semanal.tsx:445-447`). Unifica 4+ patrones.
- [ ] **TASK-082** â€” Onboarding: eliminar el paso 2 muerto (o cargar ahÃ­ el wizard real de nutriciÃ³n)
  Files: `app/(alumno)/onboarding/page.tsx`
  Notes: la bienvenida pregunta "Â¿quieres llenar tu formulario de nutriciÃ³n?" y el paso 2 responde "muy pronto podrÃ¡sâ€¦" (`onboarding/page.tsx:82-95`). ContradicciÃ³n evidente; reducir 3â†’2 pasos.
- [x] **TASK-083** â€” Extraer componentes reutilizables: `<ToggleChip>`, `<FileInput>` estilado y variante `Button variant="on-dark"`
  Files: `components/ui/toggle-chip.tsx`, `components/ui/file-input.tsx`, `components/ui/button.tsx`
  Notes: hoy los chips de hora/dÃ­a se repiten en `horario-semanal.tsx` y `clases/page.tsx`; hay 4 `<input type="file">` crudos sin estilar (`claim.tsx:159`, `reportar-pago-dialog.tsx:71`, `nutricion-admin/page.tsx:54`, avatar); el botÃ³n blanco sobre tile oscuro estÃ¡ literal en 4 sitios.
- [ ] **TASK-084** â€” Limpieza del design system: token muerto `--font-mono` y fallbacks `"#6934E1"` hardcodeados
  Files: `app/globals.css:11`, `features/medallas/celebration.tsx:32`, `app/(alumno)/medallas/page.tsx:93-94`
  Notes: `--font-mono` referencia `--font-geist-mono` que nunca se declara; los fallbacks literales del morado rompen en dark mode (donde primary es `#A186EE`). Unificar tambiÃ©n el tamaÃ±o del h1 de pÃ¡gina (Home usa `text-lg`, el resto `text-xl`).
- [ ] **TASK-085** â€” Alinear el color de marca entre Figma y cÃ³digo (`#6934E1` real vs `#8B5CF6` del PRD/roadmap)
  Files: spec de Figma, `prd-la-terraza.md`
  Notes: decidir cuÃ¡l es la fuente de verdad y sincronizar.
- [ ] **TASK-086** â€” UI optimista en reservar/cancelar clase (con rollback)
  Files: `features/reservas/class-detail-dialog.tsx`
  Notes: hoy espera al servidor y recarga la lista (`:80-99`); la asistencia admin ya es optimista y se siente instantÃ¡nea.

**Demo:** navegas toda la app con lector de pantalla y teclado sin puntos ciegos; los badges se leen con contraste correcto y los mensajes de Ã©xito se auto-descartan.

---

## Fase 11 â€” Deuda tÃ©cnica y arquitectura (â‰ˆ 3â€“4 dÃ­as)

**Objetivo:** limpiar duplicaciones, alinear dependencias y sincronizar la documentaciÃ³n con la realidad.

> **Prompt para Claude Code:** "Resuelve la deuda tÃ©cnica: unifica la generaciÃ³n de sesiones (cliente vs Cloud Function), alinea las versiones de firebase-admin, extrae utilidades de fecha duplicadas y aÃ±ade tests a las 3 zonas crÃ­ticas."

- [ ] **TASK-087** â€” Unificar la generaciÃ³n de sesiones: decidir fuente de verdad (Cloud Function `generarSesiones` vs cliente `generarSesionesParaFechas`) y borrar la otra
  Files: `functions/src/generarSesiones.ts`, `features/reservas/api.ts:82`
  Notes: la lÃ³gica estÃ¡ duplicada; el comentario del cliente dice que reemplaza a la CF (que requiere plan Blaze).
- [ ] **TASK-088** â€” Alinear versiones de `firebase-admin` (raÃ­z `^14` vs functions `^13`)
  Files: `package.json:21`, `functions/package.json:14`
- [ ] **TASK-089** â€” Extraer `toISODate`/`toISO` a un util comÃºn (hoy definida en 5+ sitios)
  Files: `lib/date.ts` (nuevo), `functions/src/generarSesiones.ts:18`, `functions/src/medallasConstancia.ts:24`, `features/reservas/date-utils.ts`, `claim.tsx:24`, `month-calendar.tsx:13`
- [x] **TASK-090** â€” Tests de las 3 zonas crÃ­ticas: transacciÃ³n de reserva, cÃ¡lculo de estado de membresÃ­a y lÃ³gica de Constancia
  Files: `features/reservas/*`, `features/membresias/estado.ts`, `functions/src/medallasConstancia.ts`, config de testing
  Notes: hoy no hay tests ni configuraciÃ³n de testing en el repo.
- [x] **TASK-091** â€” Cloud Function diaria de estados de membresÃ­a (`estadosMembresias.ts`, la del roadmap original TASK-036 que nunca se creÃ³)
  Files: `functions/src/estadosMembresias.ts`
  Notes: hoy el estado se calcula on-read en cliente (`features/membresias/estado.ts`) â†’ las notificaciones "por vencer" solo se generan cuando alguien abre la app. Con FCM (Fase 9) esta CF se vuelve necesaria.
- [ ] **TASK-092** â€” Limpieza de cÃ³digo muerto: exports sin uso, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` residual
  Files: `features/admin/api.ts:59,64`, `features/reservas/api.ts`, `features/reservas/date-utils.ts`, `lib/firebase/client.ts:9`, `.env.example:6`
  Notes: ~7 exports posiblemente muertos detectados en `docs/auditoria-rendimiento.md`.
- [ ] **TASK-093** â€” Sincronizar el roadmap original con la realidad (checkboxes, rutas reales, modo oscuro ya hecho)
  Files: `roadmap-la-terraza.md`
  Notes: todos los checkboxes siguen en `[ ]` con las fases 0â€“5 construidas; `medallas`â†’`medallas-admin`, `[id]`â†’`[uid]`, homes en `app/page.tsx`.

**Demo:** `npm run build` limpio, tests en verde para reservas/membresÃ­as/constancia, y el roadmap refleja lo que existe de verdad.

---

## Fase futura (v3) â€” Features de crecimiento

En orden de valor. La #1 tiene sinergia directa con las medallas.

- [ ] **WOD del dÃ­a + PRs + leaderboard** (PRD Â§7.9, colecciÃ³n `personalRecords` ya prevista) â€” registrar un PR de 1.5Ã— BW en deadlift **desbloquea la medalla de plata automÃ¡ticamente**, reusando la validaciÃ³n server-side de la Fase 8. Convierte el registro de marcas en el motor de la gamificaciÃ³n.
- [ ] **Rachas (streaks) de asistencia** â€” "8 semanas seguidas viniendo 3+ veces". Mecanismo de retenciÃ³n probado en fitness; los datos de `bookings.asistio` ya existen, solo falta la capa de cÃ¡lculo + una medalla nueva.
- [ ] **Lista de espera en clases llenas** â€” con push cuando se libera cupo (depende de la Fase 9).
- [ ] **Timeline "tu aÃ±o en La Terraza"** â€” medallas + PRs + asistencia en una vista compartible (Instagram-friendly, marketing gratis para el box).
- [ ] **Reportes CSV para la coach** (asistencia, membresÃ­as) â€” ya previsto en v2, barato de hacer.
- [ ] **Recordatorio inteligente de clase** â€” push 2h antes de tu clase reservada con opciÃ³n de cancelar desde la notificaciÃ³n (respeta la regla de las 2h).

---

## Orden de ejecuciÃ³n sugerido (sprints)

1. **Sprint 1 â€” Seguridad + medallas core:** Fase 7 completa + TASK-061, 062, 063, 064 de la Fase 8.
2. **Sprint 2 â€” Fase 6 real:** Fase 9 (errores â†’ install prompt â†’ FCM â†’ offline).
3. **Sprint 3 â€” Pulido UX/UI:** Fase 10 completa.
4. **Sprint 4 â€” Deuda + resto de medallas:** Fase 11 + TASK-065, 066, 067, 068.
5. **DespuÃ©s:** features v3, empezando por WOD + PRs con desbloqueo automÃ¡tico de medallas.
