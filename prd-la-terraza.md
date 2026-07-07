# PRD — La Terraza · PWA para Box de CrossFit

**Versión:** 2.0 · Julio 2026
**Autora del producto:** Nahomi
**Estado:** Listo para desarrollo
**Cambios v2:** Backend migrado a Firebase (login con Google) · Sistema de logros rediseñado como "Medallas estilo Scout" en 3 pilares.

---

## 1. Resumen del producto

**La Terraza** es una Progressive Web App (PWA) para un box de CrossFit que conecta a la profesora (admin) con sus alumnos. Los alumnos reservan clases, reciben su plan alimenticio personalizado, mantienen su perfil físico actualizado y desbloquean **medallas estilo scout** por dominar habilidades de CrossFit (medalla digital + pin físico). La profesora administra horarios, valida asistencias, revisa formularios de nutrición, envía planes alimenticios, valida logros y ve estadísticas de sus alumnos.

**Momento mágico:** el instante en que un alumno registra que consiguió su primer muscle-up, la app lo celebra con una animación, le entrega la medalla **"Gravedad"** y le anuncia que recibirá su pin físico en el box.

**Plataforma:** PWA instalable (funciona en iPhone, Android y escritorio desde el navegador, sin pasar por App Store / Play Store).

**Escala inicial:** 1 admin + hasta 50 alumnos. Arquitectura preparada para crecer.

---

## 2. Objetivos

1. Digitalizar la reserva de clases y control de asistencia.
2. Centralizar el flujo de nutrición: formulario → revisión → entrega del plan.
3. Motivar a los alumnos con un sistema de medallas gamificado (medallas digitales + pins físicos coleccionables).
4. Darle a la profesora visibilidad total de sus alumnos en un solo lugar.
5. Sentar una base técnica sólida y económica que permita agregar funcionalidades sin reescribir nada.

### Fuera de alcance (v1)

- Procesamiento de pagos dentro de la app (solo se registran y recuerdan; el pago se hace en el box o por transferencia).
- Chat entre alumnos o mensajería en tiempo real.
- Generación automática de planes alimenticios con IA (el plan lo elabora y sube la profesora).
- App nativa en tiendas (la PWA cubre la necesidad).
- Múltiples boxes / multi-tenant (un solo box: La Terraza).

---

## 3. Usuarios y roles

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Alumno** | Miembro del box | Reservar clases, llenar formulario de nutrición, ver su plan alimenticio, editar su perfil, registrar logros, ver su vitrina de medallas, ver su membresía y fecha de pago |
| **Admin (profesora)** | Dueña/coach del box | Todo lo del alumno + gestionar horarios, ver reservas por clase, marcar asistencia, revisar formularios de nutrición, subir/enviar planes alimenticios, validar medallas, ver estadísticas, gestionar membresías y enviar recordatorios de pago |

El rol se guarda en la base de datos (campo `rol` en el documento del usuario, reforzado con **custom claims** de Firebase Auth) y **toda la interfaz cambia según el rol** después del login. La app protege los datos a nivel de servidor con **Firestore Security Rules**: un alumno jamás puede leer datos de otro alumno, aunque manipule la app en su navegador.

---

## 4. Stack tecnológico

> **Nota para ti, Nahomi:** esta sección explica *qué* usar y *por qué*, en lenguaje de diseñadora. Todas las opciones son las más documentadas del ecosistema — Claude Code las conoce a la perfección.

### 4.1 Resumen del stack

| Capa | Tecnología | Qué es en simple |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React + TypeScript** | El "esqueleto" de la app. React arma la interfaz con componentes reutilizables; Next.js organiza páginas y rendimiento. TypeScript avisa cuando un dato no es del tipo esperado. |
| Estilos | **Tailwind CSS** | Clases utilitarias directamente en el componente (`bg-primary rounded-xl p-4`). Como sabes CSS, lo leerás con naturalidad. |
| Componentes UI | **shadcn/ui** | Biblioteca de componentes (botones, formularios, modales, tablas, calendario, toasts) que se copian a tu proyecto y son 100 % personalizables. Se tematiza con **variables CSS** — cambias el lila en un solo archivo y toda la app se actualiza. |
| Iconos | **Lucide React** | Set de iconos consistente. |
| Backend | **Firebase** | La suite de Google, todo en un solo servicio: **Authentication** (login con cuenta de Google en un tap + email/contraseña), **Firestore** (base de datos), **Storage** (los PDFs de los planes alimenticios y videos de logros), **Cloud Functions** (lógica de servidor: recordatorios, generación de sesiones) y **FCM** (notificaciones push — punto fuerte enorme de Firebase para la Fase 6). |
| Hosting | **Vercel** | Donde vive la app Next.js. Conectas GitHub y cada cambio se publica solo. (Alternativa equivalente: Firebase App Hosting; elegimos Vercel por su integración perfecta con Next.js.) |
| Animaciones | **Framer Motion + canvas-confetti** | Para la celebración de medallas. |

### 4.2 Por qué Firebase

- **Login con Google en un tap:** para los alumnos es cero fricción — sin crear contraseñas ni recordar nada. Se mantiene email+contraseña como alternativa para quien no use Google.
- **FCM (Firebase Cloud Messaging):** el sistema de push notifications más maduro para PWAs; los recordatorios de clase y de pago de la Fase 6 salen casi "gratis" en esfuerzo.
- **Documentación gigante y SDK muy amigable con IA:** Claude Code tiene muchísimo entrenamiento con Firebase.
- **Consola visual:** Firestore se ve en la consola de Firebase como documentos navegables; puedes inspeccionar datos sin código.

**Dos cosas honestas a tener en cuenta:**
1. **Firestore es NoSQL** (documentos, no tablas relacionadas). Para las relaciones de esta app (reservas ↔ clases ↔ alumnos) funciona bien, pero exige modelar con cuidado y usar **transacciones** para los cupos (ya contemplado en §8). El modelo de datos de este PRD ya está pensado en "modo Firestore".
2. **Cloud Functions requiere el plan Blaze** (pago por uso, pide tarjeta), pero incluye una cuota gratuita enorme — con 50 alumnos el costo real será **$0/mes** o centavos. Auth, Firestore, Storage y FCM entran en la cuota gratuita de sobra.

### 4.3 Costo estimado

- Vercel Hobby: **$0**
- Firebase (Auth + Firestore + Storage + FCM, plan Blaze con cuota gratuita): **≈ $0/mes** a esta escala
- Dominio (ej. `laterraza.fit`): ~**$15–30/año** (único costo real)

---

## 5. Arquitectura

```
┌─────────────────────────────────────────────┐
│                 PWA (Next.js)               │
│  ┌──────────────┐      ┌─────────────────┐  │
│  │ Vista Alumno  │      │  Vista Admin    │  │
│  └──────┬───────┘      └────────┬────────┘  │
│         └──────────┬────────────┘           │
│              Design System                  │
│        (shadcn/ui + tokens lila)            │
│      Service Worker (offline, install,      │
│              push vía FCM)                  │
└───────────────────┬─────────────────────────┘
                    │ SDK de Firebase
┌───────────────────▼─────────────────────────┐
│                 FIREBASE                    │
│  Auth (Google Sign-In + email/contraseña,   │
│        custom claims para el rol admin)     │
│  Firestore + Security Rules                 │
│  Storage (planes PDF, videos de logros)     │
│  Cloud Functions (crons, recordatorios)     │
│  FCM (notificaciones push)                  │
└─────────────────────────────────────────────┘
```

### Principios de arquitectura (para que la app pueda crecer)

1. **Feature folders:** el código se organiza por funcionalidad (`features/reservas`, `features/nutricion`, `features/logros`...), no por tipo de archivo. Agregar una funcionalidad = agregar una carpeta.
2. **Componentes del design system separados de las features:** `components/ui/` nunca sabe nada del negocio; las features los componen.
3. **Toda la seguridad en el servidor (Security Rules + custom claims):** aunque alguien manipule la app en su navegador, Firestore rechaza lo que su rol no permite.
4. **Acceso a datos centralizado:** cada feature tiene su archivo `api.ts` con las lecturas/escrituras de Firestore; los componentes nunca llaman a Firebase directo. Si mañana cambia algo del backend, se toca un solo lugar.
5. **El catálogo de medallas vive en Firestore**, no en el código: la profesora agrega medallas nuevas sin re-publicar la app.

### Estructura de carpetas

```
la-terraza/
├── app/                    # Rutas (Next.js App Router)
│   ├── (auth)/login/
│   ├── (alumno)/           # horarios, nutricion, medallas, membresia, perfil
│   └── (admin)/            # dashboard, alumnos, clases, nutricion, medallas
├── components/ui/          # Design system (shadcn/ui)
├── features/               # Lógica por funcionalidad (cada una con su api.ts)
│   ├── reservas/  ├── nutricion/  ├── perfil/
│   ├── medallas/  ├── membresias/ └── estadisticas/
├── lib/firebase/           # Inicialización de Firebase (client + admin)
├── public/                 # manifest.json, iconos PWA, arte de medallas
└── functions/              # Cloud Functions (crons, push, recordatorios)
```

---

## 6. Design System — "Terraza UI"

### 6.1 Identidad

- **Nombre del box:** La Terraza
- **Color de marca:** Lila
- **Personalidad:** cercana, motivadora, enérgica pero cálida. Celebra el progreso. Habla de "tú".

### 6.2 Tokens de color (variables CSS sobre shadcn/ui)

| Token | Hex | Uso |
|---|---|---|
| `--primary` | `#6934E1` (morado de marca) | Detalles: iconos, links, estados activos, indicadores — **no botones** |
| `--primary-dark` | `#4E1FB5` | Hover, énfasis |
| `--primary-light` | `#A186EE` | Acentos sobre cards oscuras, badges |
| `--primary-subtle` | `#F1EBFD` | Fondos suaves, chips seleccionados |
| `--foreground` (botones) | `#17141F` (negro) | Botones principales (píldora negra, texto blanco) |
| `--card-dark` | `#17141F` | Cards "hero" oscuras (dashboard, generar clases, resumen de medallas) |
| `--accent-gold` | `#F59E0B` | Medallas de oro, celebraciones |
| `--success` | `#10B981` | Asistencia confirmada, medalla validada |
| `--warning` | `#F59E0B` | Membresía por vencer |
| `--destructive` | `#EF4444` | Cancelar reserva, membresía vencida |
| `--background` | `#FFFFFF` / `#0F0B1A` | Modo claro / modo oscuro (base violeta profundo) |
| `--foreground` | `#1E1B2E` | Texto principal |
| `--muted` | `#8E8AA0` | Texto secundario |

> Verificar contraste AA (4.5:1): para texto en lila usar 600+ (`#7C3AED`); reservar lila 400–500 para superficies y elementos grandes.

### 6.3 Tipografía

- **Display / títulos:** `Sora` o `Space Grotesk` (deportiva, moderna, Google Fonts)
- **Cuerpo:** `Inter`
- Escala: 12 / 14 / 16 / 18 / 24 / 32 / 40 px

### 6.4 Componentes base (shadcn/ui, tematizados)

Button · Card · Input, Select, Textarea, Checkbox, RadioGroup · Form (con validación) · Dialog/Modal · Sheet · Tabs · Badge · Avatar · Calendar · Table · Toast · Skeleton · Progress.

### 6.5 Componentes propios del producto

| Componente | Descripción |
|---|---|
| `ClassCard` | Tarjeta de clase: hora, cupos, coach, botón reservar/cancelar |
| `MedalBadge` | Medalla scout: variantes bronce/plata/oro para niveles + variante "insignia con nombre" + estado bloqueado (silueta gris) |
| `PillarSection` | Agrupador visual de medallas por pilar (Fuerza / Gimnasia / Resistencia / Constancia) con su icono y color de acento |
| `AchievementCelebration` | Modal de celebración: confetti, medalla animada, mensaje del pin físico |
| `MembershipStatusCard` | Estado de membresía con días restantes y alerta de pago |
| `StatCard` / `StudentRow` | Métricas y filas de alumno para el panel admin |
| `NutritionStatusStepper` | Pasos: Formulario enviado → En revisión → Plan enviado |

### 6.6 Navegación

- **Alumno (móvil primero):** tab bar inferior — Horarios · Nutrición · Medallas · Membresía · Perfil.
- **Admin:** tab bar inferior tipo app en todos los tamaños (Inicio · Clases · Alumnos · Nutrición · Medallas); Membresías y Estadísticas se acceden desde el dashboard. Contenido centrado a `max-w-lg`.

---

## 7. Especificación funcional

### 7.1 Autenticación y onboarding

- **Login con Google (un tap)** como método principal + **email/contraseña** como alternativa (Firebase Auth). Recuperación de contraseña por email.
- **Control de acceso al box:** cualquiera puede loguearse con Google, pero solo entra a la app quien esté en la **lista de alumnos aprobados**. Flujo: la profesora registra el email del alumno → cuando ese email inicia sesión, su cuenta se activa automáticamente. Un login no aprobado ve la pantalla "Pídele acceso a tu coach 💜".
- El rol admin se asigna con **custom claim** de Firebase (una sola vez, vía script o consola).
- Al primer login, el alumno pasa por un **onboarding de 3 pasos**: (1) completar perfil físico, (2) llenar formulario de nutrición (puede posponerse), (3) tour de la app.
- La sesión persiste.

**Criterios de aceptación**
- [ ] Nadie accede a rutas internas sin sesión + aprobación.
- [ ] Un alumno que abre una ruta de admin es redirigido a su home.
- [ ] El rol vive en custom claims / Firestore, nunca en algo editable por el cliente.

### 7.2 Horarios y reservas de clases

**Alumno**
- Ve el calendario semanal: día, hora, tipo de clase, coach, cupos disponibles (en tiempo real — Firestore actualiza los cupos en vivo sin recargar).
- Confirma asistencia con un tap; puede cancelar hasta 2 h antes (configurable).
- Ve sus próximas clases en su home.

**Admin**
- CRUD de horarios: plantillas semanales recurrentes + clases puntuales. Capacidad por clase (default 12).
- Lista de inscritos por clase y **marcado de asistencia** (asistió / faltó) con un tap.
- Cancelar una clase → notificación a los inscritos.

**Criterios de aceptación**
- [ ] Dos alumnos no pueden tomar el último cupo a la vez (transacción de Firestore que valida `cupos_ocupados < capacidad`).
- [ ] La asistencia marcada alimenta las estadísticas.

### 7.3 Nutrición

**Flujo:**

```
Alumno nuevo → llena Formulario de Nutrición → estado "En revisión"
→ Admin lo revisa en su panel → sube el plan (PDF) → estado "Plan enviado"
→ Alumno recibe notificación → ve/descarga su plan en la app
```

**Formulario de nutrición (alumno, una vez + actualizable).** Es el formulario real que usa la coach, organizado en la app como un **multipaso de 6 pasos** con barra de progreso y guardado de borrador (si el alumno lo deja a medias, retoma donde quedó). Los ejemplos de la coach se muestran como *placeholders* en cada campo.

*Paso 1 — Datos básicos* (se **pre-llenan automáticamente desde el perfil** para no pedir dos veces; el alumno solo confirma):
1. Nombre
2. Fecha de nacimiento (día, mes y año)
3. Altura en cm

*Paso 2 — Tu objetivo:*
4. Objetivo — selección: `Aumentar masa muscular` / `Bajar porcentaje de grasa` / `Ambos`
5. ¿Cuál es la parte de tu cuerpo que quieres mejorar y por qué? — texto libre

*Paso 3 — Tus hábitos de comida:*
6. ¿Cuántas veces al día puedes comer? — número/selector
7. ¿Cuántas comidas realizas fuera de casa? — número/selector
8. ¿Cuántos días a la semana puedes comer (siguiendo el plan)? — selector 1–7
9. ¿Cuánta agua tomas al día? — selector (vasos o litros)
10. ¿Cuál es tu bebida favorita o la que consumes con más frecuencia? — texto corto

*Paso 4 — Gustos y restricciones:*
11. ¿Cuáles son tus verduras/vegetales favoritos? — texto libre o chips
12. ¿Cuáles son tus golosinas favoritas? — texto libre · *placeholder: helados, chocolates, papas fritas, fritada…*
13. ¿Cuáles son los alimentos que **no consumes**? — texto libre (restricciones: alergias, religión, vegetariano…)
14. ¿Cuáles son los alimentos que **no te gustan**? — texto libre
15. ¿Cuáles son los alimentos que más consumes? — texto libre

*Paso 5 — Tus comidas típicas:*
16. ¿Cuál es tu desayuno más común? — texto libre · *placeholder: verde y huevos, pan con café, seco de pollo, avena y fruta*
17. ¿Cuál es tu almuerzo más común? — texto libre · *placeholder: sopa y arroz más tallarín y papas con ensalada, jugo de sobre*
18. ¿Cuál es tu merienda o cena más común? — texto libre

*Paso 6 — Hambre, antojos y adherencia:*
19. ¿En qué hora del día sientes más hambre (hambre real)? — selector de franja horaria
20. ¿A qué hora del día comes menos o no sientes hambre? — selector de franja horaria
21. ¿Cuáles son tus antojos más frecuentes y a qué hora te dan? — texto libre
22. ¿Qué es lo que más te cuesta seguir cuando empiezas un plan de alimentación? — texto libre · *placeholder: tomar agua, comer ensalada, siempre tengo hambre / no me siento lleno, dejar los dulces o las salchipapas, tomar el fin de semana, eventos familiares…*

> Las respuestas se guardan en `nutritionForms.respuestas{}` con claves estables (`objetivo`, `aguaDiaria`, `desayunoComun`…), de modo que la coach las ve ordenadas por sección en su panel junto al perfil físico del alumno, y agregar o quitar preguntas en el futuro no rompe los formularios antiguos.

**Admin:** bandeja (pendientes / revisados / plan enviado) · respuestas junto al perfil físico (peso, estatura, edad, lesiones) en una sola pantalla · sube el PDF (Firebase Storage, acceso restringido por Security Rules) con notas · puede subir versiones nuevas (historial).

**Alumno:** stepper de estado · visor de PDF en la app + descarga · puede re-enviar el formulario si sus objetivos cambian (versión nueva, no borra la anterior).

### 7.4 Perfil del alumno

Nombre completo, foto (o la de su cuenta Google), fecha de nacimiento (edad calculada), sexo, **estatura (cm)**, **peso (kg, con historial por fecha)**, **alergias**, **lesiones o condiciones médicas**, **meta principal** (bajar de peso / subir masa / mejorar resistencia / competir / salud general), teléfono, contacto de emergencia, fecha de inicio en el box.

- El peso se registra como historial → gráfico de evolución (visible para el alumno y la admin). El peso corporal actual además **calcula automáticamente los umbrales de las medallas de Fuerza** (1×, 1.5× BW).
- La admin puede ver y editar cualquier perfil; el alumno solo el suyo.

### 7.5 Medallas — Gamificación estilo Scout ⭐

El corazón motivacional de la app. Las medallas funcionan como las **insignias scout**: cada una tiene **nombre propio, arte único y un hito claro y verificable**. Se organizan en los **3 pilares del CrossFit** + 1 pilar transversal de constancia.

**Cómo funciona**
1. El alumno explora su **vitrina**: las medallas ganadas a color, las pendientes como siluetas grises — colección por completar ("12 / 40").
2. Cuando consigue un hito, lo registra (fecha + video opcional como evidencia).
3. La admin **valida** (lo vio en el box o revisa el video).
4. Al validarse: celebración con confetti 🎉, la medalla se ilumina en su vitrina, y mensaje: *"¡Ganaste la medalla [nombre]! Pasa por el box a recibir tu pin 📍"*.
5. La admin tiene un checklist de **pins físicos pendientes de entregar**.

**Estructura de una medalla en la base de datos:** `pilar` · `nombre de la medalla` · `habilidad/ejercicio` · `hito para ganarla` · `tipo` (niveles bronce/plata/oro **o** insignia única) · `arte`.

#### 🏋️ Pilar 1 — Fuerza (Weightlifting)

Medallas **por niveles** (bronce/plata/oro), calculadas contra el peso corporal (BW) del perfil:

| Habilidad | 🥉 Bronce | 🥈 Plata | 🥇 Oro |
|---|---|---|---|
| Peso Muerto (Deadlift) | 1× BW | 1.5× BW | 2× BW |
| Sentadilla Trasera (Back Squat) | 1× BW | 1.25× BW | 1.5× BW |
| Sentadilla Frontal (Front Squat) | 0.75× BW | 1× BW | 1.25× BW |
| Press Estricto | 0.35× BW | 0.5× BW | 0.75× BW |
| Clean (Cargada) | Técnica validada | 0.75× BW | 1× BW |
| Snatch (Arranque) | Técnica validada | 0.5× BW | 0.75× BW |
| Clean & Jerk | Técnica validada | 0.75× BW | 1× BW |

Insignias especiales de Fuerza (únicas, con nombre):

| Medalla | Hito |
|---|---|
| **"Club de las 300 lbs"** | Peso muerto o sentadilla ≥ 300 lbs (136 kg) |
| **"Overhead"** | Primera overhead squat con técnica validada |

#### 🤸 Pilar 2 — Gimnasia y Acrobacias

Insignias únicas con nombre (estilo scout puro):

| Medalla | Habilidad | Hito |
|---|---|---|
| **"Equilibrio"** | Parada de manos (handstand hold) | Sostener 30 segundos contra pared |
| **"Caminante"** | Handstand walk | Caminar 5 metros de manos |
| **"Primera Cima"** | Dominada (pull-up) | Primera dominada estricta |
| **"Vuelo"** | Kipping / butterfly pull-ups | 10 kipping seguidas (butterfly = versión oro) |
| **"Gravedad"** | Muscle-up | Tu primer muscle-up (barra); anillas = versión oro |
| **"Invertido"** | Handstand push-up | Primera HSPU (estricta = versión oro) |
| **"Escalador"** | Rope climb | Subida completa (sin piernas = versión oro) |
| **"Pistolero"** | Pistol squat | 1 por pierna |
| **"Núcleo"** | Toes-to-bar / L-sit | 5 toes-to-bar seguidas o L-sit 15 s |

#### 🫀 Pilar 3 — Resistencia (Cardio / Metcon)

| Medalla | Habilidad | Hito |
|---|---|---|
| **"Ninja"** | Dobles de cuerda (double unders) | 50 saltos dobles seguidos |
| **"Primer Doble"** | Double unders | Tu primer salto doble |
| **"Héroe"** | WOD "Murph" | Completarlo entero (con chaleco = versión oro) |
| **"Fran"** | WOD benchmark "Fran" | Completarlo (sub 8 min = versión oro) |
| **"Motor"** | Remo | 2 km completos (sub 8 min = versión oro) |
| **"RX"** | Cualquier WOD | Primer WOD completado con pesos y movimientos prescritos |

#### 💜 Pilar 4 — Constancia La Terraza (transversal)

| Medalla | Hito |
|---|---|
| **"Mes Perfecto"** | 100 % de asistencia en un mes (se otorga automáticamente con los datos de asistencia) |
| **"Centenaria/o"** | 100 clases asistidas (automática) |
| **"Un Año en La Terraza"** | Aniversario en el box (automática) |
| **"Fundador/a"** | Estar entre los primeros alumnos de la app |

> **Notas de diseño del sistema:**
> - Las medallas de los pilares 1–3 las registra el alumno y las **valida la admin**; las del pilar 4 se otorgan **automáticamente** (Cloud Function que revisa asistencias/fechas) — sorpresa garantizada.
> - Cada pilar tiene icono y acento propio en la UI (`PillarSection`), pero todas las medallas comparten el mismo "marco" scout para que la colección se sienta unificada — gran oportunidad de diseño para ti.
> - La estructura permite a la profesora crear medallas nuevas (nombre + pilar + hito) desde su panel, sin código. Los pins físicos pueden fabricarse por lotes siguiendo el mismo arte.

**Admin:** bandeja de validación (con video si lo subieron) · historial por alumno · checklist de pins pendientes · vista de "quién está cerca de qué medalla" (ej. alumnos con peso muerto en 1.4× BW, a punto de plata).

### 7.6 Membresías y recordatorio de pago (sin pagos en la app)

- La admin define los **planes del box** (ej.: 8 clases/mes, 12 clases/mes, ilimitado) con nombre, precio y duración — visibles para el alumno en la sección Membresía.
- La admin asigna el plan y registra manualmente cada pago (fecha, monto, método).
- El alumno ve: plan actual, fecha de vencimiento, historial de pagos y los demás planes disponibles.
- **Recordatorios automáticos** (Cloud Function diaria + FCM): push + banner 3 días antes del vencimiento y al vencer: *"Recuerda renovar tu membresía 💜"*.
- La admin ve membresías al día / por vencer / vencidas.

### 7.7 Panel de la profesora (Admin)

**Dashboard:** clases de hoy con inscritos y asistencia · alertas (formularios pendientes, medallas por validar, pins por entregar, membresías por vencer) · métricas del mes (asistencias, alumno más constante, medallas desbloqueadas, alumnos activos).

**Alumnos:** lista buscable → ficha completa (perfil, evolución de peso, % asistencia, historial de clases, estado de nutrición, vitrina de medallas, membresía).

**Estadísticas:** asistencia por horario (clases llenas/vacías), evolución de alumnos, medallas por mes.

### 7.8 Notificaciones — bandeja en la app (v2) y push (FCM, Fase 6)

**Bandeja en la app (implementada, sin FCM):** cada rol tiene su propia pantalla `/notificaciones` (alumno) y `/notificaciones-admin` (coach), con campanita y contador en el header. Se calculan al vuelo desde Firestore (sin colección propia de notificaciones) en `features/notificaciones/api.ts`:

| Evento | Para quién | Se ve como |
|---|---|---|
| Alguien sin acceso inicia sesión | Admin | "[nombre] quiere unirse a La Terraza" → lleva a Alumnos a darle acceso |
| Alumno registra un logro | Admin | "[nombre] registró un logro" → lleva a validar |
| Medalla validada, pin pendiente | Admin | "Entregar pin a [nombre]" |
| Formulario de nutrición nuevo/en revisión | Admin | "[nombre] espera su plan de nutrición" |
| Membresía por vencer o vencida | Admin | "La membresía de [nombre] está por vencer/venció" |
| Medalla validada o rechazada | Alumno | "¡Medalla [nombre] desbloqueada! 🎉" / "no fue validada" |
| Plan alimenticio enviado | Alumno | "¡Tu plan alimenticio está listo! 🥗" |
| Membresía por vencer o vencida | Alumno | "Tu membresía está por vencer / venció" |
| Clase reservada cancelada | Alumno | "La clase de las [hora] fue cancelada" |

**Push (FCM, Fase 6 — pendiente):** los mismos eventos, entregados como notificación del sistema aunque la app esté cerrada. Requiere permiso del navegador, `fcmTokens[]` en `users/{uid}` y Cloud Functions que disparen el envío; la bandeja en la app seguirá existiendo como historial.

### 7.9 Futuro (v2 — la arquitectura ya lo contempla)

- **WODs y PRs:** WOD del día publicado por la admin, registro de marcas personales (colección `personalRecords` ya prevista), leaderboard por WOD. Los PRs de fuerza podrán **desbloquear medallas automáticamente** (registras 1.5× BW en deadlift → plata instantánea).
- Lista de espera en clases llenas · reportes CSV · modo oscuro.

---

## 8. Modelo de datos (Firestore)

Colecciones de nivel superior (NoSQL — documentos con campos, no tablas):

```
users/{uid}
  rol: "alumno" | "admin" · aprobado: bool · nombre · foto · email
  fechaNac · sexo · estaturaCm · alergias[] · lesiones[] · meta
  telefono · contactoEmergencia · fechaIngreso · fcmTokens[]
  └─ weightLogs/{id}: pesoKg · fecha        (subcolección)

approvedEmails/{email}          ← lista de acceso que gestiona la admin
accessRequests/{uid}  email · nombre · foto · estado: pendiente|aprobada|rechazada
                      solicitadoAt — se crea sola cuando alguien sin acceso
                      inicia sesión; alimenta la bandeja de notificaciones
                      de la admin ("X quiere unirse")

classTemplates/{id}   diaSemana · hora · nombre · capacidad · activa
classSessions/{id}    fecha · hora · nombre · capacidad · cuposOcupados · estado
bookings/{id}         sessionId · uid · estado: reservado|cancelado
                      asistio: null|true|false
                      (id compuesto "sessionId_uid" → imposible duplicar reserva)

nutritionForms/{id}   uid · respuestas{} · version · estado:
                      pendiente|en_revision|plan_enviado · createdAt
nutritionPlans/{id}   formId · uid · archivoPath · notas · enviadoAt

skills/{id}           pilar: fuerza|gimnasia|resistencia|constancia
                      nombreMedalla · habilidad · tipo: niveles|insignia
                      hitos{bronce?, plata?, oro?} o hito único
                      relativoABW: bool · orden · activa · arte
achievements/{id}     uid · skillId · nivel? · fechaLogro · videoPath?
                      estado: pendiente|validado|rechazado
                      pinEntregado: bool · validadoPor · validadoAt

membershipPlans/{id}  nombre · precio · clasesIncluidas? · duracionDias · activo
memberships/{id}      uid · planId · fechaInicio · fechaFin
                      estado: activa|por_vencer|vencida
payments/{id}         membershipId · monto · fecha · metodo · notas

personalRecords/{id}  uid · movimiento · valor · unidad · fecha    (v2)
```

**Security Rules (resumen):**
- `users/{uid}` y subcolecciones: lee/escribe el dueño (`request.auth.uid == uid`); el admin (custom claim) lee/escribe todo. Campos `rol` y `aprobado` solo modificables por admin.
- `bookings`, `nutritionForms`, `achievements`: el alumno crea/lee solo documentos con su `uid`; admin todo.
- `skills`, `classTemplates`, `classSessions`, `membershipPlans`: lectura para autenticados aprobados; escritura solo admin.
- `nutritionPlans`, `memberships`, `payments`: lectura solo del dueño; escritura solo admin.
- Storage `nutrition-plans/{uid}/...` y `achievement-videos/{uid}/...`: lectura del dueño + admin; escritura según el flujo.

**Reglas de integridad clave:**
- **Reserva de cupo:** transacción que lee `cuposOcupados`, valida contra `capacidad` e incrementa — dos personas no pueden tomar el último cupo.
- **Medallas de Fuerza relativas a BW:** el hito se evalúa con el último `weightLog` del alumno.
- **Pilar Constancia:** Cloud Function programada (diaria) revisa asistencias/aniversarios y crea `achievements` automáticos.

---

## 9. Requisitos PWA

- `manifest.json`: nombre "La Terraza", `theme_color: #6934E1`, `background_color: #F4F4F6`, iconos 192/512 + maskable, `display: standalone`.
- **Service worker** (Serwist): cache del shell y assets; lectura offline de horarios reservados, perfil y vitrina de medallas (las acciones requieren conexión, con aviso claro). El mismo service worker recibe los push de FCM.
- Prompt de instalación amigable con instrucciones específicas para iOS (Safari → Compartir → Agregar a inicio).
- Lighthouse PWA ≥ 90; probado en iOS Safari, Android Chrome y escritorio.

## 10. Requisitos no funcionales

- **Móvil primero:** diseñar a 390 px y escalar.
- **Idioma:** español (textos centralizados).
- **Accesibilidad:** contraste AA, targets táctiles ≥ 44 px, labels en todos los inputs.
- **Rendimiento:** carga inicial < 3 s en 4G.
- **Privacidad:** datos de salud (lesiones, alergias, peso) visibles solo para el propio alumno y la admin. Nunca en rankings.

## 11. Métricas de éxito

- ≥ 80 % de los alumnos reservan por la app al mes 2.
- 100 % de los alumnos nuevos completan el formulario de nutrición en su primera semana.
- ≥ 1 medalla validada por alumno en los primeros 2 meses.
- La profesora deja de usar WhatsApp/Excel para reservas y planes.
