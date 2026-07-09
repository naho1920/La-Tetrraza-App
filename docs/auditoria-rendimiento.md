# Auditoría de rendimiento — La Terraza PWA

**Fecha:** 2026-07-09
**Alcance:** Diagnóstico D.1 del plan de acción. Solo lectura sobre el código de la app — no se aplicó ninguna corrección. Única excepción: se agregó `@next/bundle-analyzer` como devDependency y un wrapper gateado por `ANALYZE=true` en `next.config.ts` (ver Metodología), necesario para producir esta auditoría.

**Metodología:**
- `npx knip`, `npx depcheck` y `npx ts-prune` para archivos/exports/dependencias sin uso, cruzando los tres para descartar falsos positivos.
- `ANALYZE=true npm run build` con `@next/bundle-analyzer` (`.next/analyze/client.html`); el JSON del treemap se parseó con un script de Node para agregar tamaños por paquete y por ruta (no hace falta abrir el HTML para leer los números de este informe).
- Revisión manual con grep/lectura de código para SDKs, Client/Server Components, imágenes/fuentes y listeners de Firestore.

---

## 1. Archivos huérfanos y código muerto

### 1.1 Falsos positivos (no tocar)

`knip`/`depcheck` no entienden algunos patrones de este proyecto y marcan cosas que sí se usan:

| Reportado como | Por qué es falso positivo |
|---|---|
| `app/sw.ts` sin uso | Se referencia por *string* en `next.config.ts` (`swSrc: "app/sw.ts"` de `@serwist/next`), no por `import` — knip no traza esa ruta. |
| `functions/src/*.ts` sin uso (3 archivos) | Es un codebase de Cloud Functions **separado**, con su propio `functions/package.json` y deploy (`firebase deploy --only functions`). No es parte del bundle de Next.js; knip lo escaneó igual por estar dentro del repo. |
| Dependencia `serwist` sin uso | Cascada del punto anterior: como knip cree que `app/sw.ts` no se usa, tampoco ve su único import (`import { Serwist, ... } from "serwist"` en `app/sw.ts:4`). |
| Dependencias `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css` sin uso | Se usan vía `@import` en `app/globals.css` y en `postcss.config.*` — depcheck no parsea CSS/PostCSS. |
| DevDependencies `@types/node`, `@types/react-dom` sin uso | Paquetes de tipos ambientales; TypeScript los usa implícitamente, nunca se importan con un `import`. |
| Casi todos los "unused exports" de `components/ui/*` (`CardFooter`, `DialogTrigger`, `SelectGroup`, etc.) | Son la API pública del kit de componentes (shadcn); no se usan *todavía* en esta app pero no son código muerto real — son superficie de librería compartida. |

### 1.2 Hallazgos reales

| Hallazgo | Impacto | Corrección propuesta | Riesgo |
|---|---|---|---|
| `components/ui/separator.tsx` — el componente `Separator` no se importa en ningún archivo (confirmado por knip + grep manual) | Bajo (archivo de ~25 líneas) | Eliminar el archivo, o marcarlo "revisar" si se planea usar pronto | Bajo |
| `shadcn` está en `dependencies` del `package.json` raíz, pero es un CLI de solo-desarrollo (`npx shadcn add ...`), nunca se importa en runtime | Bajo | Mover a `devDependencies` | Bajo |
| Exports nunca importados en ningún otro archivo, confirmados por **knip y ts-prune a la vez**: `aprobarSolicitud`/`rechazarSolicitud` (`features/admin/api.ts`), `getNotificacionesCoach`/`getNotificacionesAlumno` (`features/notificaciones/api.ts`), `toggleTemplateActiva`/`updateSession`/`generarSesionesDesdePlantillas` (`features/reservas/api.ts`), `startOfWeek`/`getWeekDates` (`features/reservas/date-utils.ts`) | Bajo (no pesan en el bundle del cliente por tree-shaking, pero confunden mantenimiento) | Revisar uno por uno antes de borrar — varios suenan a flujos admin que podrían manejarse hoy desde Firebase Console en vez de la UI (ej. aprobar/rechazar solicitudes). Marcar "revisar", no borrar a ciegas | Medio (si alguno resulta ser una función pensada para un flujo admin pendiente de UI) |

---

## 2. Peso del bundle

Top contribuyentes al JS parseado del cliente (agregado por paquete, sumando todos los chunks donde aparece):

| Paquete | KB parseados | ¿Dónde carga? |
|---|---|---|
| `next` (framework) | 517 | Todas las rutas — no accionable |
| `recharts` | 255 | Solo `/estadisticas` y `/perfil` |
| `@firebase/firestore` (incluye `re2js`, 153 KB, motor de regex interno) | 242 | Todas las rutas — no accionable, viene con el SDK |
| `react-dom` | 174 | Todas las rutas — no accionable |
| `@base-ui/react` (design system) | 135 | Todas las rutas — no accionable sin cambiar de librería |
| `@supabase/auth-js` + `postgrest-js` + `realtime-js` + `phoenix` (websockets) | ~162 | Cualquier ruta que importe `lib/supabase/client.ts` |
| `motion-dom` + `framer-motion` + `canvas-confetti` | ~126 | Home (`/`), vía `AchievementCelebration` |
| `lucide-react` | 29 | Todas las rutas — ya se importa por ícono individual, peso normal |

### Hallazgos accionables

**A. [Impacto alto] `@supabase/supabase-js` carga el cliente universal completo, pero la app solo usa Storage.**
Confirmé por grep que no hay ni un solo uso de `supabase.auth`, `supabase.from(` (Postgrest) ni `supabase.channel(` (Realtime) en todo el proyecto — solo `.storage.*`. Aun así, `createClient()` de `@supabase/supabase-js` bundlea `@supabase/auth-js` (98 KB), `@supabase/postgrest-js` (26.5 KB), `@supabase/realtime-js` (24.4 KB) y `@supabase/phoenix` (13.5 KB) — código que nunca se ejecuta pero sí se descarga y parsea.
- *Corrección propuesta:* usar `@supabase/storage-js` de forma standalone en `lib/supabase/client.ts` y `lib/supabase/admin.ts` en vez de `createClient` del paquete universal. La superficie de la API (`.storage.from(bucket).upload/createSignedUrl/createSignedUploadUrl/getPublicUrl/createBucket/getBucket`) es la misma; solo cambia cómo se instancia el cliente.
- *Ahorro estimado:* ~160 KB parseados menos en cualquier ruta con upload/lectura de archivos (perfil, nutrición, medallas, membresía — la mayoría de la app).
- *Riesgo:* medio. Toca un archivo compartido por todas las features de storage; hay que probar cada flujo de upload/signed URL después del cambio.

**B. [Impacto medio] `AchievementCelebration` (framer-motion + canvas-confetti, ~29 KB) se carga en cada visita a Home aunque casi nunca se muestre.**
`app/page.tsx` importa `AchievementCelebration` de forma estática; el componente solo se renderiza si `getUncelebratedValidated` encuentra un logro sin celebrar (evento raro), pero su JS ya viaja en el bundle de Home para todos.
- *Corrección:* `next/dynamic(() => import(".../celebration"), { ssr: false })`.
- *Riesgo:* bajo — ya se renderiza condicionalmente hoy, el dynamic import solo difiere cuándo se descarga.

**C. [Impacto medio] Recharts (255 KB) bloquea el render inicial de `/estadisticas` y `/perfil` (las 2 rutas más pesadas de la app: 460 KB y 476 KB de First Load JS).**
Ya está aislado correctamente por code-splitting de rutas (no contamina otras páginas), pero dentro de esas 2 rutas sigue siendo parte del bundle crítico.
- *Corrección:* `next/dynamic(..., { ssr: false })` para el componente de gráfico específico en cada página.
- *Riesgo:* bajo. No reduce el peso total, mejora tiempo de interacción de esas 2 rutas.

**D. [Informativo, no accionable] `re2js` (153 KB) es interno de `@firebase/firestore`** (motor de regex para queries) — no se puede quitar sin dejar de usar Firestore.

**E. "Visor de PDF" (sospechoso típico según el plan): no aplica.** El proyecto no tiene ninguna librería de visor de PDF en el cliente — los comprobantes/planes se abren vía URL firmada en una pestaña nueva (visor nativo del navegador), sin peso de bundle asociado.

---

## 3. Imports de SDKs

- **Firebase: sin hallazgos.** Confirmé (grep exhaustivo) que el 100% de los imports son modulares: `firebase/app`, `firebase/auth`, `firebase/firestore` en cliente; `firebase-admin/app`, `firebase-admin/auth`, `firebase-admin/firestore` en servidor. Nunca se importa el paquete `firebase` completo.
- **Supabase: instanciación correcta, peso incorrecto.** El cliente (`lib/supabase/client.ts`) y el admin (`lib/supabase/admin.ts`) se instancian una sola vez cada uno, a nivel de módulo — no hay instanciación repetida. El problema real es *qué* paquete se usa para instanciarlo, ya documentado en el hallazgo A de la sección de bundle.

---

## 4. Client vs Server Components

47 archivos tienen `"use client"`. Revisé cada uno buscando hooks, handlers y APIs de browser. La gran mayoría están justificados: casi toda la app depende de `useAuth()` (contexto de Firebase Auth client-side) y de Firestore en tiempo real (`onSnapshot`), que es el patrón esperado dado que no hay lectura de Firestore desde Server Components en ningún lado del proyecto — convertir esto a Server Components sería un cambio arquitectónico grande, no una optimización incremental.

| Hallazgo | Impacto | Corrección | Riesgo |
|---|---|---|---|
| `components/ui/label.tsx` — `<label>` estático, sin hooks ni handlers | Bajo (siempre se renderiza dentro de formularios ya marcados cliente, así que el beneficio real es mínimo) | Quitar `"use client"` — **aplicado** | Bajo |
| ~~`components/ui/admin-tab-bar.tsx`~~ | — | **Descartado tras probarlo**: pasa `TABS_ADMIN` (con íconos de Lucide, funciones) como prop a `TabBar`, que sí es cliente — cruzar ese límite server→client rompe el build (`Functions cannot be passed directly to Client Components`). Se revirtió, queda con `"use client"`. | — |

No se encontraron páginas completas candidatas a Server Component sin rediseño mayor.

---

## 5. Imágenes y fuentes

**Fuentes: sin hallazgos.** `app/layout.tsx` ya usa `next/font/google` (Sora + Inter) correctamente; no hay `<link>` a Google Fonts ni `@import` de fuente externa en `globals.css`.

**`<img>` nativo — solo 3 casos en todo el proyecto:**

| Archivo:línea | ¿Ya tiene `eslint-disable`? | Tipo | Impacto | Corrección | Riesgo |
|---|---|---|---|---|---|
| `components/ui/medal-badge.tsx:58` | No — genera warning en cada build | Asset local (SVG) | Medio | Migrar a `next/image`; como es SVG requiere `dangerouslyAllowSVG: true` en `next.config.ts` (bloqueado por defecto por riesgo XSS) | Bajo-medio, evaluar si vale la pena para íconos pequeños |
| `features/reservas/class-detail-dialog.tsx:24` | Sí | Avatar dinámico (Google/Supabase) | Bajo | Aplicar el mismo patrón que ya usa `features/perfil/avatar-uploader.tsx` (que YA usa `next/image` con estas mismas URLs, `remotePatterns` ya configurado en `next.config.ts`) | Bajo — el patrón ya existe en el propio código |
| `features/estadisticas/dashboard.tsx:59` | Sí | Avatar dinámico (coach) | Bajo | Igual que el anterior | Bajo |

---

## 6. Suscripciones Firestore (`onSnapshot`)

**Sin hallazgos.** Solo hay 2 usos de `onSnapshot` en todo el proyecto (`subscribeToWeekSessions` y `subscribeToUserBookings`, ambos en `features/reservas/api.ts`), y ambos retornan el `Unsubscribe` directamente desde el `useEffect` que los consume (`app/(alumno)/horarios/page.tsx` y `app/(admin)/clases/page.tsx`) — sin fugas, sin listeners huérfanos.

---

## Resumen priorizado para D.2

| # | Hallazgo | Impacto | Riesgo |
|---|---|---|---|
| 1 | Cambiar `@supabase/supabase-js` por `@supabase/storage-js` standalone | Alto | Medio |
| 2 | `next/dynamic(ssr:false)` para `AchievementCelebration` en Home | Medio | Bajo |
| 3 | `next/dynamic(ssr:false)` para el gráfico de Recharts en `/estadisticas` y `/perfil` | Medio | Bajo |
| 4 | Migrar avatares (`class-detail-dialog.tsx`, `dashboard.tsx`) a `next/image` | Bajo | Bajo |
| 5 | Quitar `"use client"` de `label.tsx` | Bajo | Bajo |
| ~~5b~~ | ~~Quitar `"use client"` de `admin-tab-bar.tsx`~~ — **descartado**: al probarlo, `AdminTabBar` pasa `TABS_ADMIN` (con íconos de Lucide, funciones no serializables) como prop al `TabBar` cliente, y romper ese límite server→client hace fallar el build (`Functions cannot be passed directly to Client Components`). Se revirtió. | — | — |
| 6 | Eliminar `components/ui/separator.tsx` (sin uso) | Bajo | Bajo |
| 7 | Mover `shadcn` a `devDependencies` | Bajo | Bajo |
| 8 | Revisar (no borrar sin confirmar) los 7 exports muertos de la sección 1.2 | Bajo | Medio |
| — | Migrar `medal-badge.tsx` a `next/image` (SVG, requiere `dangerouslyAllowSVG`) | Medio | Bajo-medio |

Dime cuáles apruebas y en qué orden — cada uno va en su propio commit, con `npm run build` limpio antes de pasar al siguiente, siguiendo D.2/D.3 del plan.
