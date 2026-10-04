# ATHELETE v2 · Migration Progress

Rama: `feature-migration` · Fuente única: `migration-source/ATHELETE Alive Minimalism/` (handoff v2, índice visual, `*.dc.html`, `Athelete App.dc.html`, `support.js`, `images/`, `icons/`, `references/`). El resto de `migration-source/` se ignora. Si el código contradice el handoff, manda el handoff; los valores exactos salen de los HTML.

> Este documento se versiona en `docs/migration/`. La carpeta del handoff (`migration-source/ATHELETE Alive Minimalism/`) sigue en `.gitignore`.
> Recreado el 2026-09-30 tras reemplazar la carpeta del handoff (la versión anterior se perdió).

---

> **Fase 2 (2026-09-30)**: resumen en 2 minutos, decisiones asumidas, problemas y commits propuestos en **§11**.
>
> **Pendientes del backend**: [`docs/backend/BACKEND_TODO.md`](../backend/BACKEND_TODO.md). Todo lo que la app necesite del backend y no exista se anota allí (no se improvisa en la app).
>
> **Backend (2026-10-01)**: la fuente de verdad del backend es [`docs/backend/BACKEND_SUMMARY.md`](../backend/BACKEND_SUMMARY.md) (aplicado por Lovable en Supabase). Estado, cambios de la app y pendientes con responsable en **§14**.

## 0. Estado por fase

| Fase | Estado | Cierre |
|---|---|---|
| 0 · Auditoría | ✅ Cerrada | 2026-09-30 |
| 0.5 · Prerrequisitos y bugs | ✅ Cerrada (bugs B1/B2 pendientes de backend, §8.2; dependencias movidas a la fase 2) | 2026-09-30 |
| 1 · Tokens | ✅ Cerrada (iOS; Android pendiente, §8.1) | 2026-09-30 |
| 2 · Primitivas (incluye instalar las 4 dependencias) | 🟡 Hecha en iOS, pendiente de revisión y commits (ver §11) | — |
| 3 · Recorrido del usuario: Auth y Onboarding (§12), Inicio y Notificaciones (§15) | 🟡 Implementado sin validación visual (sin Xcode); Ajustes, Detalle de rutina y Progreso después | — |
| 4 · Navegación final (ver §13) | 🟡 Implementada sin validación visual (sin Xcode); `tsc` + lint + jest en verde | — |
| 5 · Restyling por módulo | ⏳ | — |
| 6 · Estados del sistema | ⏳ | — |
| 7 · Funcionalidad nueva (Pausa/Descanso → Core 33 → MoveKit → Comunidad → Scan → Apple Health → Wear) | ⏳ | — |
| 8 · QA visual final | ⏳ | — |

---

## 1. Decisiones

### 1.1 Decisiones generales (2026-09-29)

1. Fuente de valores exactos: los `*.dc.html`. Carpeta del handoff en `.gitignore`.
2. Plataformas: iOS y Android. Diseño solo iPhone; Android se adapta (safe areas, back nativo, sombras/elevation). Build verificado en ambas en cada fase. Android se valida en otra máquina o CI (aquí no hay SDK).
3. Tipografía: fuente del sistema (SF Pro en iOS, Roboto en Android) con cifras tabulares. Inter se elimina cuando nada la use.
4. Dependencias aprobadas: Reanimated, bottom sheet, haptics y blur, una por commit con build iOS + Android entre cada una. Video, cámara y HealthKit entran en su bloque de la fase 7. HealthKit solo iOS.
5. Funciones sin lugar en v2 se mantienen con estilo v2; no se elimina nada (lista en §9).
6. Core 33: los retos activos siguen con su modelo actual hasta completarse; el catálogo aplica a retos nuevos.
7. Social: antes de cualquier UI, documento de esquema de tablas y RLS para aprobación.
8. Puntos: se mantienen los existentes (Quiz +10). No hay puntos por social. No se replica el +60 por entreno del prototipo.
9. Assets: `images/` e `icons/` del paquete. Fotos = PLACEHOLDER; iconos finales.
10. Bugs: fase 0.5. Reproducir y confirmar primero; corregir solo los confirmados.

### 1.2 Decisiones sobre el prototipo (2026-09-30)

- Errores del prototipo: se aplican los valores coherentes y se registran como desviaciones (§6).
- Celebración y reto completado: `#161616` en ambos modos. Se descarta el degradado Ember de Dark.
- Pastilla "Pregúntale algo a ELLIE" en Dark: vidrio `rgba(28,27,25,.82)`, placeholder `#77746F`.
- Iconos: `lucide-react-native` con `strokeWidth={2}`. `droplet-blue`, `bed-blue`, `heart-ember`, `heart-fill` se resuelven con props de color o fill.
- Imágenes estáticas del paquete: tratamiento de color horneado en los archivos. Imágenes remotas: capa oscura para el brillo; la desaturación en iOS queda pendiente.
- `mask-image`: se sustituye por degradados superpuestos. Sin dependencias nuevas aparte de las 4 aprobadas.

### 1.3 Restricciones vigentes

- Sin push hasta que el usuario lo pida.
- Credenciales de la cuenta de prueba: solo en tiempo de ejecución; nunca en archivos versionados.
- Verificación en iOS en este Mac; Android pendiente por paso (§8.1) hasta tener entorno Android.

---

## 2. Verificación del paquete

| Elemento | Estado |
|---|---|
| 30 prototipos v2 (15 módulos × Light/Dark) | ✅ Completos |
| `Athelete App.dc.html` (shell) | ✅ |
| `support.js` | ✅ Runtime del prototipo; sin valores de diseño |
| `Quiz.dc.html` | ✅ |
| `images/` | ✅ 22 archivos; 22 referenciados; ninguno faltante ni sobrante |
| `icons/` | ✅ 101 SVG; todas las rutas resuelven |
| `references/` | ✅ 226 PNG |
| Estructura plana | ✅ Todas las rutas `images/`, `icons/`, `./support.js` resuelven |
| v1, QuizV2, Fundamentos, copias | ✅ No queda ninguno |

Observaciones:
- `uploads/` (material ajeno al handoff) fue eliminada por el usuario el 2026-09-30.
- Iconos: 96 de 101 son Lucide 1.8 por nombre. Diferencias: `circle-help` → `circle-question-mark`; variantes de color `bed-blue` y `droplet-blue` (`#6E8FB3`), `heart-ember` (`#FF5B1F`), `heart-fill` (`#121212`).

---

## 3. Auditoría de la app (resumen de la fase 0)

### 3.1 Pantallas del diseño → repo

Clave: **R** = se reestiliza · **P** = existe parcialmente · **N** = no existe.

| Módulo | Repo hoy | Clase | Notas |
|---|---|---|---|
| Auth (Login, Registro, Recuperar, Restablecer, error) | `screens/auth/*` | R | Foto + hoja; sacudida de error; requisitos de contraseña en vivo. |
| Intro deslizable | `VisualOnboardingScreen` | R | |
| Onboarding 8 pasos | 9 pantallas en `screens/onboarding/` | P | Estructura Tú / Tu objetivo / Tu semana; controles visuales nuevos. |
| Bienvenida ELLIE | `ProfileSetupCompleteScreen` | P | |
| Inicio | `HomeScreen` + `features/home` | P | 6 modos v2 (§4.4). `homePriority.ts` tiene `nutrition`, que no existe en v2, y le faltan `nuevo`, `todo`, `hecho`, `retomar`. |
| Notificaciones | `NotificationsScreen` | P | Nudges derivados; actividad social nueva. |
| Rutinas | `WorkoutsScreen` | R | Sin toggle Biblioteca/ELLIE/Mis rutinas; solo "Tuya". |
| Ejercicios · Por zona / Equipamiento | `ExerciseDiscoveryHub` | P | Faltan 7 assets anatómicos. |
| Lista filtrada + hoja Filtros | `ExerciseFiltersModal` | R | |
| Detalle de rutina | `WorkoutDetailScreen` | R | Sin pestañas Resumen/Ejercicios/Reviews; recorrido con nodos. |
| Nueva rutina 3 pasos | `CreateRoutineScreen` | R | |
| Exercise Detail MoveKit | `ExerciseDetailScreen` | P | Sin librería de video; faltan MP4 y posters. |
| Sesión activa | `WorkoutSessionScreen` | R | |
| Pausa, Descanso, Fin de descanso | — | N | Requiere series por ejercicio. |
| Diálogo salir, Resumen, Error al guardar | `Alert.alert` | P | |
| ELLIE portada y chat | `EllieScreen` + `useEllieChat` | R | Estados offline y de activación nuevos. |
| Nutrición | `NutritionPlanScreen` + `NutritionLogModal` | P | Bug B1 por confirmar. |
| Progreso | `ProgressScreen` | R | 7/30 días → Semana/Mes. |
| Récord personal + hoja | `PersonalRecordsScreen`, `RegisterPrScreen` | R | |
| Logros + hoja | `AchievementsScreen` | R | 12 badges; el diseño agrupa en 4 categorías. |
| Core 33: Intro, Explorar, Detalle, Listo | — | N | |
| Core 33 activo / completado | `ChallengeScreen` + `Core33TrackerView` | P | Falta la salida "Explorar otro Core 33". |
| Quiz | `QuizLanding`, `QuizQuestion`, `QuizResult` | P | Rachas ×2/×3, récord por categoría, resultado escalonado. |
| Perfil, Editar | `ProfileScreen`, `EditProfileScreen` | R | Perfil pasa de tab a stack. |
| Ajustes | Secciones dentro de `ProfileScreen` | N | |
| Apple Health | — | N | Solo iOS. |
| Scan | — | N | |
| Comunidad (14 pantallas) | — | N | |
| Wear | `WearBanner` + `WearPreviewModal` | P | Faltan colección y producto. |
| Estados del sistema | `Loader`, `EmptyState` | P | Sin skeletons con forma real. |
| Celebración y toast | — | N | |

### 3.2 Estilos y tema actuales

- Tema centralizado (`theme/tokens.ts`, `theme/theme.ts`, `ThemeProvider` light/dark/system persistido, `useAppTheme`), usado en 162 archivos.
- `ThemeColors` tiene 10 claves; faltan casi todos los tokens v2 (§7).
- Desalineados: fondo `#FCFCFB` vs `#F7F6F3`; acento negro; `success` verde y `danger` (30 usos) sin equivalente v2 (`danger` → `ember.deep`).
- 239 colores hardcodeados en 64 archivos.
- Inter embebida (iOS y Android), 574 usos de `fontFamily`, sin cifras tabulares.
- Componentes duplicados: 3 botones y 4 segmented controls.
- Dark hoy invierte Light; v2 exige una capa de "escena".

### 3.3 Navegación actual vs final

| Hoy | Final |
|---|---|
| Tabs Home, Workouts, Ellie, Progress, **Profile** | Inicio, Entrenos, ELLIE, Progreso, **Comunidad** |
| Perfil es tab | Perfil apilado desde el avatar (Inicio, Comunidad, Feed) |
| Rutas duplicadas en varios stacks | Stack raíz compartido para detalles e inmersivas |
| Tab bar 58 pt, radio 25, solo icono | Ver §4.1 |
| Sin rutas modales | Modales/inmersivas y hojas |
| Core 33 en 4 stacks | Entrada inteligente única (§4.3) |
| `PlaceholderScreen` sin registrar | Se borra en 0.5 |

### 3.4 Funcionalidad nueva

Social (esquema a aprobar), Scan (cámara + IA, UI con mock primero), Apple Health (solo iOS), Core 33 nuevo (catálogo, estados, Intro vista), Pausa y Descanso (series por ejercicio), MoveKit (video), Wear, Quiz v3, Reto de la semana (depende de social), Récord condicional.

### 3.5 Riesgos existentes

- Bugs de `docs/ui-audit` pendientes de reproducir (§8).
- `types/supabase.ts` desactualizado: faltan `personal_records`, `chat_messages`, `quiz_*`, `user_badges`.
- 11 tests, ninguno de UI.
- Favoritos solo en AsyncStorage.

---

## 4. Shell y navegación (de `Athelete App.dc.html`)

### 4.1 Tab bar

| Propiedad | Valor |
|---|---|
| Contenedor | alto 68, `left/right` 16, `bottom` 24, radio 34, padding `0 6`, `space-between`, z-index sobre contenido |
| Vidrio | `blur(24px) saturate(180%)`; Light `rgba(247,246,243,.74)`, Dark `rgba(30,29,27,.72)` |
| Sombra Light | `0 0 0 .5px rgba(0,0,0,.07), 0 12px 32px rgba(0,0,0,.10)` |
| Sombra Dark | `0 0 0 .5px rgba(255,255,255,.1), 0 16px 40px rgba(0,0,0,.55)` |
| Ítem | 62×56, radio 28, columna, gap 3; icono 22; label 10/600, tracking .01em |
| Activo | Light: fondo `#121212`, icono y label `#FFFFFF`. Dark: fondo `#F2F0EC`, contenido `#121212`. Transición de fondo .25 s |
| Inactivo | opacidad .72; contenido `#121212` (Light) / `#F2F0EC` (Dark) |
| Iconos | `house`, `dumbbell`, `sparkles`, `trending-up`, `users` |
| Raíces | Inicio → `home` · Entrenos → `rutinas` · ELLIE → `ellie` · Progreso → `progreso` · Comunidad → `feed` |
| Visible en | `home`, `rutinas`, `ejercicios`, `ellie`, `progreso`, `feed`, `amigos`, `retos` y sus estados de carga/vacío/error |
| Cambio de tab | reinicia la pila de la tab; fundido .36 s `cubic-bezier(.2,.8,.2,1)` |

Adaptación a Android:
- `bottom = max(24, insets.bottom − 10)` (en iPhone se superpone 10 pt a la safe area de 34, igual que el prototipo; en Android con 3 botones queda por encima).
- Blur costoso en Android: fondo sólido `rgba(247,246,243,.96)` / `rgba(30,29,27,.96)` (D-28).
- Sombra con `boxShadow` (nueva arquitectura activa: `newArchEnabled=true`).
- Back nativo: desde una raíz distinta de Inicio → Inicio; desde Inicio → salir.
- Se oculta con el teclado abierto.

### 4.2 Status bar

Cada pantalla declara un estilo:
- `light`: contenido blanco sobre escena o foto.
- `clear`: contenido oscuro, fondo transparente.
- `glass`: vidrio `rgba(247,246,243,.8)` / `rgba(18,17,16,.8)` con `blur(20px) saturate(180%)`, 54 pt.

En Dark el contenido siempre es blanco. En RN: `StatusBar` por pantalla; Android translúcida.

### 4.3 Navegación, estado global y Core 33

Acciones del shell:
- `go(id)`: push. Si `id === 'core33'`, se resuelve con la entrada inteligente.
- `back()`: pop; sin historial, va a la pantalla padre declarada.
- `tab(id)`: cambio de raíz con pila vacía.
- `jump(id)`: entra reconstruyendo la cadena de padres.
- `replace(id)`: sustituye la pantalla actual.
- `inCom(id)`: entra en Comunidad con Retos como base (Reto de la semana → al volver, Comunidad · Retos).
- `open/close`: hojas y diálogos (`health`, `nutriLog`, `prSheet`, `exit`, `filtros`).
- `celebrate(kind)`: celebración a pantalla completa.
- Transiciones: push translateX 28 → 0; back −24 → 0; ambas .36 s `cubic-bezier(.2,.8,.2,1)`; tab fundido .36 s.

Entrada inteligente de Core 33 (shell, línea 244):

```
c33Status === 'active' → core33   (activo; completado si coreDone)
!c33Seen               → c33Intro
c33Status === 'ready'  → c33Listo
otro                   → c33Explorar
```

- "Completado" no es un estado propio: es `active` + `coreDone`.
- La Intro marca `c33Seen` al saltarla o terminarla.
- Elegir reto: `c33Pick`, `c33Status: 'ready'`, `c33Seen: true`, pila reiniciada a Inicio → Listo.
- Explorar otro Core 33 desde el completado va a Explorar sin Intro.

Lógica a replicar:
- Hábitos: el día N se cierra con los 3 hábitos. En el día 33 se marca `coreDone` y la celebración aparece a los 900 ms.
- Sesión: descanso tras cada ejercicio de `[45, 60, 45, 60, 45, 60]` s, sin descanso tras el último. Pausa: `sessPausedAt`; al continuar se desplazan `sessStart` y `sessRest.start` para que la pausa no cuente. "+30 s" suma 30 000 ms; "Saltar" recorta `dur`. Últimos 3 s en Ember.
- `startSession` retoma con el tiempo acumulado; `finishSession` → Resumen con pila reiniciada; `saveForLater` → tab Inicio.
- Récord: si supera la marca, celebración a los 250 ms con la diferencia.
- Agua: `addVaso` hasta 14.
- Inicio: `mode = isNew ? nuevo : sessFinished && coreDone ? todo : sessFinished ? hecho : sessSaved ? retomar : homePriority (core | entreno)`.
- Quiz: la racha se reinicia al fallar; ≥3 aciertos → ×2 (brillo .22), ≥5 → ×3 (.34). Resultado: 10 perfecto, ≥6 medio, <6 bajo.
- Social: botón de amistad `agregar` / `solicitado` / `amigos`.
- Wear: `canBuy = !soon && size`.

No se replica: +60 puntos por entreno (decisión 8), el fallo forzado del primer intento de activar plan, las respuestas simuladas de ELLIE.

### 4.4 Toast

- Pill 44 pt, radio 22, padding `0 18 0 8`, gap 10, texto 14/600.
- Light: fondo `#121212`, texto `#FFFFFF`. Dark: fondo `#F2F0EC`, texto `#121212`.
- Círculo Ember de 28 con check de 15.
- Sombra `0 12px 32px rgba(0,0,0,.2)`.
- Entra con athUp .3 s; se retira a los 2,2 s.
- Posición corregida en D-27.

---

## 5. Animaciones y tipografía

### 5.1 Animaciones

29 `@keyframes` en el shell. Pulsación global: escala .97.

| Animación | Efecto | Duración / curva |
|---|---|---|
| athUp | translateY 10 → 0 + fundido | .25–.6 s ease; retrasos escalonados .1–.8 s |
| athPop / athPopB | escala .6 → 1.12 → 1 | .4–.6 s |
| athFadeA/B | opacidad | .25–.8 s |
| athPushA/B | translateX 28 → 0 + fundido | .36 s `cubic-bezier(.2,.8,.2,1)` |
| athBackA/B | translateX −24 → 0 + fundido | .36 s |
| athSheet | translateY 100 % → 0 | .32–.38 s `cubic-bezier(.2,.9,.25,1)` |
| athDim | opacidad del backdrop | .2–.4 s |
| athShake | ±6 / ±4 px | .4 s |
| athSkel | opacidad 1 → .45 → 1 | 1,4 s infinito |
| athOrb | escala 1 → 1.045 | 3,2 / 3,6 s reposo; 2,4 y 1,2 s pensando |
| athHalo | opacidad .5 → .9, escala 1.12 | 2,4 / 3,2 / 3,6 s |
| athBreath | escala .82, opacidad .45 | 2,4 s (1,4 s variante rápida) |
| athPulse | escala 1.6, opacidad .35 | 2,4 s |
| athBurst | escala .3 → 2.4 + fade | 1,2–1,5 s; retrasos .15 / .45 s |
| athRise ("+10") | sube 70 pt con pop 1.1 | 1,1 s `cubic-bezier(.2,.8,.2,1)` |
| athIn | escala .4 → 1 + fade | .4–.45 s `cubic-bezier(.3,1.3,.5,1)`; cascada 70 ms |
| athGrow | scaleY 0 → 1 | .6 s `cubic-bezier(.3,1.2,.5,1)` |
| athGrowX / athGrowX2 | scaleX 0 → 1 | 2,8 s lineal |
| athScanY | barrido −120 → 440 pt | 1,7 s `cubic-bezier(.5,0,.5,1)` infinito |
| athKen | escala 1.08 → 1 | 5–9 s ease-out |
| athShutter | opacidad .9 → 0 | .35 s |
| athRep | loop del video (9 pt, escala 1.012) | según velocidad |
| athFloat | translateY −6 | definido, sin uso |

Implementación: Reanimated.

### 5.2 Tipografía

- Stack del prototipo: `-apple-system, "SF Pro Text", Inter` con `font-variant-numeric: tabular-nums` global (incluye botones e inputs).
- RN: fuente del sistema (SF Pro / Roboto) y un `Text` propio con `fontVariant: ['tabular-nums']`, porque RN no tiene estilo global.
- Tracking en `em` → puntos (`em × fontSize`; .08em a 11 pt = 0,88).
- JetBrains Mono solo en el panel del prototipo.
- `text-wrap: balance/pretty` (39 usos): ver D-31.

---

## 6. Desviaciones consolidadas

Criterio: los valores exactos salen de los HTML; cada fila es una desviación documentada respecto al prototipo.

| ID | Archivo:línea | Valor en prototipo | Valor aplicado | Decisión |
|---|---|---|---|---|
| D-01 | HomeDark:74 | pista de anillos `#EAE8E3` | `#262422` | Valor coherente |
| D-02 | NutritionDark:20 | pista del indicador `#EAE8E3` | `#262422` | Valor coherente |
| D-03 | HomeDark:300 | hito fresh `tc #1C1B19` sobre `#141312` | `#FFFFFF` | Valor coherente (= Light) |
| D-04 | QuizDark:272 | fallo: `tc #1C1B19`; botón `#1C1B19` / `#F2F0EC` | `#FFFFFF`; botón `#FFFFFF` / `#121212` | Escena = Light |
| D-05 | QuizDark:236, 271 | texto `#F2F0EC` sobre Ember; `dot #F2F0EC` con check blanco; botón `#F2F0EC` / `#1C1B19` | `#121212`; `dot #121212`; botón `#121212` / `#FFFFFF` | Escena = Light |
| D-06 | QuizDark:121 | "+pts" `#F2F0EC` sobre Ember; pill ×mult `#F2F0EC` con Ember | `#121212`; pill `#121212` | Escena = Light |
| D-07 | ProgressDark:272 | anillo de cápsula futura `#E4E2DD` | `#3A3835` | Valor coherente |
| D-08 | ProgressDark:283, 352 | `#D9D6CF` | `#3A3835` | Valor coherente |
| D-09 | QuizDark:260 | puntos semanales `#D9D6CF` (portada, no escena) | `#3A3835` | Valor coherente |
| D-10 | SocialDark:769 | anillo de botón de amistad `#D9D6CF` | `#3A3835` | Valor coherente |
| D-11 | SocialDark:235 | iniciales `#55524E` sobre `#2E2C29` (1,79:1) | `#A3A09A` | Valor coherente |
| D-12 | HomeDark:115 | mini curva `#4A4845` (1,9:1) | `#55524E` | Valor coherente |
| D-13 | EllieDark:57 | pastilla `rgba(255,255,255,.82)`, texto `#6B6964` | `rgba(28,27,25,.82)`, placeholder `#77746F` | Decisión del usuario |
| D-14 | Ellie:107, EllieDark:107 | error en rojo `#D6333A` / `#FF6B6B` | `#C23D0B` / `#FF8A5C` | Valor coherente (no hay rojo) |
| D-15 | HomeDark:217, ScanDark:172 | sombra blanca `rgba(255,255,255,.07)` | borde interior `rgba(255,255,255,.06)` | Valor coherente |
| D-16 | HomeDark:140 | banner Quiz `#1C1B19` sin borde | borde interior `rgba(255,255,255,.06)` | Valor coherente |
| D-17 | Ellie:20, 28, 40, 53, 70, 140; Home:101, 210; Scan:197 | `#8A7B6C` (3,3:1) | `#72655A` (4,6:1) | Valor coherente (AA) |
| D-18 | QuizDark:234 | letra de opción `lc #1C1B19` | `#FFFFFF` | Escena = Light |
| D-19 | QuizDark:160, 254, 255 | "Otra ronda" `#1C1B19` / `#F2F0EC` sobre escena | `#FFFFFF` / `#121212` | Primaria sobre escena = blanca |
| D-20 | QuizDark:268 | chip de racha `#F2F0EC` sobre Ember | `#121212` | Escena = Light |
| D-21 | SocialDark:573, OverlaysDark:107 | degradado `#3B1C0E → #1B120C → #0A0908` | `#161616` | Decisión del usuario |
| D-22 | Social:573 (Light) | reto completado `#141312` | `#161616` | Unifica celebraciones |
| D-23 | Social:130, Workouts:315 | `#C2410C` | `#C23D0B` | Unificar tokens casi idénticos |
| D-24 | Handoff §3.1 | "`#E9E7E2` no es UI" | token `surface.skeleton` y `surface.wearPlate` | Manda el HTML |
| D-25 | Handoff §5 / §14 | skeleton 1,6–2 s | 1,4 s | Manda el HTML |
| D-26 | Handoff §3.8 | sombra de portada 14–16 % | `0 18px 40px rgba(20,19,18,.22)` | Manda el HTML |
| D-27 | Social:871 | toast a 40 pt en hubs (bajo la tab bar) y 120 sin ella | con tab bar 104 pt (92 + 12); sin ella `insets.bottom + 16` | Handoff: "sobre la tab bar" |
| D-28 | Plataforma | `backdrop-filter` en Android | fondo sólido al .96 | Adaptación Android |
| D-29 | Plataforma | filtros sobre imágenes remotas | capa oscura; desaturación en iOS pendiente | Decisión del usuario |
| D-30 | Plataforma | `mask-image` (22 usos) | degradados superpuestos | Decisión del usuario |
| D-31 | Plataforma | `text-wrap: balance/pretty` | Android `textBreakStrategy="balanced"`; iOS sin equivalente | Adaptación |
| D-32 | Plataforma | iconos SVG | `lucide-react-native`, trazo 2 | Decisión del usuario |
| D-33 | Profile:switch (y cualquier escena) | Interruptor encendido con pomo blanco siempre (en Dark: blanco sobre marfil; en escena: blanco sobre blanco) | Pomo con el color de contenido invertido al encenderse: blanco sobre negro (Light), `#121212` sobre marfil (Dark) y sobre blanco (escena). Apagado: pomo blanco | Decisión del usuario (contraste); criterio "Selected: relleno con contenido invertido" (handoff §13) |
| D-34 | Progress (Semana/Mes) | Segmented compacto: indicador blanco con sombra sobre pista muted | Mismo criterio que el Segmented grande en todos los modos: indicador `cta.primary` con texto `cta.primaryText`; `compact` solo cambia tamaño (30 pt) y tipo | Decisión del usuario (contraste en Dark/escena) |
| D-35 | Auth (campos) | Handoff §4: inputs blancos con borde; error `#C23D0B` en ambos modos | HTML: relleno `#EFEEEA` / `#262422` sin borde (token `surface.field`); error `#C23D0B` en Light y `#FF8A5C` en Dark | Manda el HTML (decisión 1) |
| D-36 | Auth (CTA inactiva) | Crear cuenta / Restablecer: CTA negra al 22 % (`rgba(18,18,18,.22)`) | Estado `disabled` de `Button` v2 (relleno `surface.muted` + texto `text.disabled`), igual que el resto de la app (handoff §3.3 `color.disabled`) | Coherencia del sistema |
| D-37 | Auth:SLIDES[0] (Intro) | "Rutinas claras, técnica en 3D…" | "Rutinas claras, técnica en video…" — el modelo 3D está descartado (handoff §1 y §9, MoveKit) | Coherencia de producto |
| D-38 | Auth:reset (requisitos) | Restablecer pide 8+, número y que coincidan (sin mayúscula) | Misma política que Crear cuenta (8+, número, mayúscula) + "Coinciden" (4 requisitos) | Decisión del usuario: una sola política de contraseña |

Nota: en QuizDark, la ronda y el resultado son escenas oscuras en ambos modos; esas líneas deben ser idénticas a `Quiz.dc.html`.

---

## 7. Tokens para la fase 1

**Implementado en la fase 1** (`src/theme/v2/`, expuesto como `theme.v2` vía `useAppTheme()`; las claves antiguas `theme.colors/spacing/radii/typography/elevations` no cambian):

| Sección | Código | Acceso |
|---|---|---|
| 7.1 Color | `palette.ts` (valores crudos con D-xx), `colors.ts` | `theme.v2.colors` (light/dark) |
| Escenas (handoff §4) | `scene.ts`; `SceneScope` en `providers/ThemeProvider.tsx` | `theme.v2.scene`; dentro de `<SceneScope>` → `theme.v2.mode === 'scene'` y `theme.v2.colors = sceneColorsV2` |
| 7.2 Tipografía | `typography.ts` (sin `fontFamily` → SF Pro / Roboto; `fontVariant: ['tabular-nums']`) | `theme.v2.type.*` |
| 7.3 Espaciado | `spacing.ts` | `theme.v2.space.s2…s36`, `theme.v2.layout.*` |
| 7.4 Radios | `radii.ts` | `theme.v2.radius.*` |
| 7.5 Sombras | `shadows.ts` (strings `boxShadow`) | `theme.v2.shadow.*`, `ringV2()` |
| 7.6 Blur | `blur.ts` | `theme.v2.blur.*` |
| 7.7 / §5.1 Movimiento | `motion.ts` | `theme.v2.motion.*`, `theme.v2.easing.*` |

Tests: `__tests__/themeV2.test.tsx` (paridad light/dark, tema antiguo congelado, contrastes WCAG, escenas, tipografía tabular sin `fontFamily`, sombras válidas).


### 7.1 Color (Light / Dark)

**Fondos y superficies**

| Token | Light | Dark |
|---|---|---|
| `bg.base` | `#F7F6F3` | `#121110` |
| `surface.raised` | `#FFFFFF` | `#1C1B19` |
| `surface.raised2` | `#FFFFFF` | `#1F1E1C` |
| `surface.muted` | `#EFEEEA` | `#2A2826` |
| `surface.track` | `#EAE8E3` | `#262422` |
| `surface.skeleton` | `#E9E7E2` | `#1F1E1C` |
| `surface.wearPlate` | `#E9E7E2` | `#1C1B19` |

**Divisores y contornos**

| Token | Light | Dark |
|---|---|---|
| `divider` | `#E4E2DD` | `#2C2A27` |
| `border.card` | `#ECEAE5` | `#262422` |
| `border.onDark` | — | `rgba(255,255,255,.06–.10)` |
| `outline.strong` | `#D9D6CF` | `#3A3835` |
| `outline.control` | `#C9C6C0` | `#55524E` |

**Texto**

| Token | Light | Dark |
|---|---|---|
| `text.primary` | `#121212` | `#F2F0EC` |
| `text.secondary` | `#6B6964` | `#A3A09A` |
| `text.tertiary` | `#7A7772` | `#77746F` |
| `text.bodySoft` | `#4A4845` | `#BDBAB4` |
| `text.disabled` | `#7A7772` sobre muted | `#55524E` |

**CTA**

| Token | Light | Dark |
|---|---|---|
| `cta.primary` (fondo / texto) | `#121212` / `#FFFFFF` | `#F2F0EC` / `#121212` |
| `cta.onScene` (fondo / texto) | `#FFFFFF` / `#121212` | igual |
| `cta.commit` (fondo / texto) | `#FF5B1F` / `#121212` | igual |

**Escenas** (iguales en ambos modos)

| Token | Valor |
|---|---|
| `scene.plate` | `#141312` |
| `scene.deep` | `#0C0B0A` |
| `scene.deeper` | `#0E0D0C` |
| `scene.celebration` | `#161616` |
| `scene.medal` | `#2E2B28` / `#34312E` |
| `scene.dotRing` | `#1F1D1B` |
| `onDark.primary` | `#FFFFFF` |
| `onDark.body` | `#E8E6E1` |
| `onDark.secondary` | `#D8D6D1` |
| `onDark.meta` | `#A8A6A1` |
| `onDark.tertiary` | `#8C8A85` |

**Ember**

| Token | Valor |
|---|---|
| `ember` | `#FF5B1F` |
| `ember.onText` (texto sobre Ember) | `#121212` |
| `ember.textOnDark` | `#FF8A5C` |
| `ember.deep` (error, destructivo y texto Ember sobre claro) | `#C23D0B` |
| `ember.glow` | `rgba(255,91,31,.12 / .14 / .24 / .28 / .35)` |

**Recovery**

| Token | Light | Dark |
|---|---|---|
| `recovery` | `#6E8FB3` | igual |
| `recovery.light` | `#8FB0D1` | igual |
| `recovery.tintBg` | `#E7EDF4` | `rgba(110,143,179,.18)` |
| `recovery.tintText` | `#3F6188` | `#A9C0DA` |
| `recovery.surface` | `#1A2129` | igual |
| `recovery.glow` | `rgba(110,143,179,.28)` | igual |
| `recovery.gradient` | `#A9B4C0`, `#B9CCE3`, `#A9BFD8`, `#BACCE1`, `#8FAACB`, `#1E2E42`, `#EDF1F6`, `#141B23` | igual |

**ELLIE**

| Token | Light | Dark |
|---|---|---|
| `ellie.linen` | `#EFE7DD → #F3EEE7` | `#221B15`, `#171411`, `#241E18`, `#1A1714` |
| `ellie.linenAlt` | `#EDE4D8`, `#F3EDE5`, `#E2D7CA`, `rgba(237,228,216,.78)` | — |
| `ellie.textSecondary` | `#72655A` (D-17) | `#B3A594` |
| `ellie.orb` | `#FFFFFF → #F6E9DE` / `#F8EDE3 → #E6CCB8` / `#E9D1BE → #CFAE95` / `#CFAC92` | igual |
| `ellie.halo` | `rgba(255,150,90,.28)` | más tenue |
| `ellie.shadow` | `rgba(120,80,50,.12–.14)` | — |
| `ellie.input` | `rgba(255,255,255,.82)` | `rgba(28,27,25,.82)` (D-13) |

**Vidrio, overlays y otros**

| Token | Light | Dark |
|---|---|---|
| `overlay` | `rgba(18,18,18,.32)` | `rgba(0,0,0,.55)` |
| `glass.nav` | `rgba(247,246,243,.82–.88)` | `rgba(18,17,16,.82–.88)` |
| `glass.tab` | `rgba(247,246,243,.74)` | `rgba(30,29,27,.72)` |
| `glass.statusbar` | `rgba(247,246,243,.8)` | `rgba(18,17,16,.8)` |
| `glass.onPhoto` | `rgba(255,255,255,.12–.16)` | igual |
| `scrim` | `rgba(20,19,18,.55 → .96)` | igual |
| `chart.muted` | `#CFCCC6` | `#55524E` |
| `studio` | `#FAFAF8 → #F0EFEC → #E7E5E1` (+ `#ECEBE7`) | igual |

### 7.2 Tipografía

Fuente del sistema; cifras tabulares siempre.

| Nivel | Tamaño / peso | Tracking | Interlineado |
|---|---|---|---|
| micro | 9–10 / 600 | .01em | — |
| eyebrow | 11 / 600, mayúsculas | .08em (.06 / .05 variantes) | 1,2 |
| caption | 12 / 400–700 | — | 1,3 |
| meta | 13 / 400–600 | — | 1,4 |
| label | 14 / 500–600 | — | 1,4 |
| body | 15 / 400–600 | — | 1,45–1,5 |
| bodyL | 16 / 400–500 | — | 1,45 |
| cta | 17 / 600 | — | 1,4 |
| sub | 18 / 600–700 | — | 1,3 |
| section | 20 / 600 | — | 1,2 |
| title | 22 / 24 / 26 / 28 · 600–700 | −.01 a −.015em | 1,1 |
| question | 32 / 600 | −.02em | 1,1 |
| displayS | 34–44 / 600 | −.03em | 1 |
| displayM | 56–80 / 600 | −.045em | .85–.9 |
| displayL | 88–112 / 600 | −.055em | .84 |
| displayXL | 220 / 600 | −.07em | .8 |
| wordmark | 11 / 700 | .22em | — |

No están en el handoff: 14, 16, 18, 24, 26 y el uso de 700.

### 7.3 Espaciado

`2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36`.
- Margen lateral 20 (16 para controles flotantes).
- 32 entre secciones.
- ~120 al final en pantallas con tab bar.
- Filas: 56 mínimo (60–64 con dos líneas).

### 7.4 Radios

| Token | Valor | Uso |
|---|---|---|
| `pill` | 999 | CTA, chips, segmented |
| `circle44` | 22 | botones de icono, avatar |
| `circle36` | 18 | cerrar en hoja |
| `tab` / `lightbox` | 34 | tab bar, caja de luz |
| `tabItem` | 28 | ítem activo |
| `sheet` | 28 arriba | hojas |
| `rise` | 28–32 arriba | superficie que sube sobre hero |
| `card` | 24 | cards y tiles |
| `cardCompact` | 20 | Reto de la semana, filas destacadas |
| `input` | 14–16 | inputs y fichas |
| `thumb` | 12–13 | miniaturas |
| `capsule` | 9–10 (7 en preview) | retícula de 33 |
| `chipSmall` | 6–8 | chips pequeños |
| `bar` | 2–3 | barras de progreso |

### 7.5 Sombras

| Token | Light | Dark |
|---|---|---|
| `subtle` | `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05)` | borde interior `rgba(255,255,255,.06)` |
| `cover` | `0 18px 40px rgba(20,19,18,.22)` | `0 0 0 1px rgba(255,255,255,.07), 0 24px 56px rgba(0,0,0,.55)` |
| `ellie` | `0 1px 2px rgba(0,0,0,.04), 0 14px 34px rgba(120,80,50,.12)` | — |
| `float.tab` | `0 0 0 .5px rgba(0,0,0,.07), 0 12px 32px rgba(0,0,0,.10)` | `0 0 0 .5px rgba(255,255,255,.1), 0 16px 40px rgba(0,0,0,.55)` |
| `sheet` | `0 -12px 32px rgba(0,0,0,.12)` | `0 0 0 .5px rgba(255,255,255,.08), 0 -16px 40px rgba(0,0,0,.5)` |
| `dialog` | `0 12px 32px rgba(0,0,0,.18)` | `0 0 0 1px rgba(255,255,255,.06), 0 18px 44px rgba(0,0,0,.5)` |
| `commit` | `0 12px 32px rgba(255,91,31,.28)` | igual |
| `toast` | `0 12px 32px rgba(0,0,0,.2)` | igual |
| `lightbox` | — | `0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)` |
| `ring.*` | anillos de foco `0 0 0 2px …` y halos Ember `0 0 0 3–10px rgba(255,91,31,.12–.28)` | igual |

### 7.6 Blur

- 20: vidrio de navegación, botones sobre foto, status bar.
- 24: tab bar.
- 12–18: detalles puntuales.
- Saturate 180 % (160 % en variantes).
- Android: alternativa sólida (D-28).

### 7.7 Movimiento

Pulsación .97 y las curvas/duraciones de §5.1.

---

## 8. Fase 0.5 (cerrada)

Cada paso termina con `npx tsc --noEmit`, `npm test`, `npm run lint` y build de iOS en el simulador iPhone 17 (iOS 26.2). Android queda pendiente por paso (§8.1).

### Paso 0 · Entradas del usuario

| Entrada | Estado |
|---|---|
| `npx supabase login` | ⏳ Pendiente: la CLI devuelve `AccessTokenRequiredError`. Bloquea solo el paso 4 (tipos) |
| Cuenta de prueba (entorno de desarrollo) | ✅ Facilitada; usada solo en tiempo de ejecución |
| Android | ✅ Decidido: se verifica iOS ahora y Android queda pendiente por paso (§8.1) |
| `uploads/` | ✅ Eliminada por el usuario |

### Paso 1 · Seguimiento versionado + `.gitignore`

- `MIGRATION_PROGRESS.md` movido a `docs/migration/` (versionado).
- `.gitignore`: carpeta del handoff y `.claude/settings.local.json`.
- `.claude/settings.json` versionado.
- Commit `chore: migration tracking + gitignore handoff`.

### Paso 2 · Reproducir bugs (sin tocar código, con Metro visible)

| Bug | Acción | Hipótesis |
|---|---|---|
| B1 · "Activar plan" falla | ELLIE → pedir plan → Activar; revisar en Supabase si la fila existe con `is_active` | `awardGamificationEvent` (`gamification.ts:84`) relanza un `PostgrestError` que no es `Error`; cae al mensaje genérico aunque el plan se guardó (`ellie-actions.ts:119-168`) |
| B2 · Aviso amarillo tras el Quiz | Completar un quiz y leer el aviso | Misma RPC `award_gamification_event` fallando en `awardGamificationEventBestEffort` |
| B3 · Pestañas de WorkoutDetail | Probar a mano | Código correcto (`WorkoutDetailScreen.tsx:979-1005`); probable fallo de la automatización previa |
| B4 · "Ver todos" en Logros | Probar a mano | Código correcto (`BadgeGridCard` → `PROFILE_ROUTES.Achievements`) |
| B5 · "Cerrar sesión" | Probar a mano | `ProfileScreen.tsx:370` sin `catch`: si falla, el error se pierde |

Resultado (2026-09-30, iPhone 17 · iOS 26.2, cuenta de desarrollo):

| Bug | Resultado | Evidencia y causa |
|---|---|---|
| B1 · Activar plan | ✅ **Confirmado** | La app muestra "No pudimos activar el plan nutricional.", pero el plan **sí se guarda** (fila `49e0f1e2…`, `is_active: true`, source `ellie`). Falla después la RPC `award_gamification_event` con **Postgres `42P10`**: *"there is no unique or exclusion constraint matching the ON CONFLICT specification"*. El `PostgrestError` no es `instanceof Error` y cae al mensaje genérico (`ellie-actions.ts:159-166`) |
| B2 · Aviso tras el Quiz | ✅ **Confirmado** | `console.warn`: `[quiz-submit] El intento se guardó, pero la recompensa quedó pendiente.` con el mismo `42P10`. El intento se guarda; los puntos y badges no se otorgan. **Misma causa raíz que B1** (backend) |
| B3 · Pestañas de WorkoutDetail | ❌ No reproducido | Las tres pestañas cambian al tocarlas. En la auditoría previa Maestro, al buscar "Ejercicios" por texto, tocaba la etiqueta de métrica "EJERCICIOS" |
| B4 · "Ver todos" en Logros | ❌ No reproducido | Navega a Logros (5/12 badges) |
| B5 · Cerrar sesión | ❌ No reproducido | Vuelve a Login |

Consecuencia: la RPC de gamificación falla en quiz y nutrición (comprobado); como todos los eventos usan la misma RPC, lo previsible es que también fallen entrenos, Core 33 y récords (sin comprobar). La definición SQL no está en el repo; leerla requiere `supabase login`. No se ha tocado la base de datos.

Método: Maestro 2.10 (JDK portátil) sobre el simulador; los avisos de JS se leen por el inspector de Hermes (CDP), porque Metro 0.84 no los imprime en la terminal. Las credenciales solo se usaron en tiempo de ejecución.

### Pasos 3–7 · Resolución (cambio de prioridad del usuario, 2026-09-30)

| Paso | Resultado |
|---|---|
| 3 · Correcciones B1/B2 | ⏸ **Pendiente backend.** No se corrige ni en la app ni en la base de datos. Causa raíz documentada arriba (RPC `award_gamification_event`, Postgres `42P10`). Queda para la fase de backend: leer la definición SQL, añadir la restricción única que el `ON CONFLICT` necesita (o corregir el `ON CONFLICT`) y, en la app, hacer que un fallo de recompensa no invalide un plan ya guardado (`awardGamificationEventBestEffort`, `gamification.ts:96`) |
| 4 · Tipos de Supabase | ✅ **Resuelto 2026-10-01** con los tipos generados por Lovable (BK-02, §14) |
| 5 · Borrar `PlaceholderScreen` | ✅ Commit `5664fdd chore: remove unused PlaceholderScreen`. `tsc`, `jest` (34/34) y lint en verde; iOS arranca y navega las 5 tabs |
| 6 · Dependencias | ↪ **Movidas al inicio de la fase 2**, cuando se usen. Orden y versiones se mantienen: Reanimated 4.6.x + worklets 0.12.x (4.7 exige RN ≥ 0.86) → `@gorhom/bottom-sheet@5` → `react-native-haptic-feedback@3` → `@react-native-community/blur@4.4` |
| 7 · Cierre | ✅ Este documento |

Funcionalidad nueva (Social, HealthKit, Scan, etc.): después de la migración visual, cada una en su propia rama.

### 8.1 Verificación Android pendiente

| Paso | iOS | Android |
|---|---|---|
| 1 · Seguimiento + `.gitignore` | n/a (sin código) | n/a |
| 5 · Borrar `PlaceholderScreen` | ✅ | ⏳ Pendiente |
| Fase 1 · Tokens v2 | ✅ (0 píxeles de diferencia en 5 tabs × Light/Dark) | ⏳ Pendiente |
| Fase 2 · Dependencias | ✅ `pod install` + build + arranque | ⏳ Pendiente (ver §8.3) |
| Fase 2 · Primitivas y catálogo | ✅ (catálogo revisado en Light/Dark/Escena; P1 abierto) | ⏳ Pendiente (ver §11.5) |

### 8.3 Android · a revisar (sin compilar todavía)

| Tema | Qué revisar |
|---|---|
| Reanimated 4.6 + worklets 0.12 | Build con nueva arquitectura (`newArchEnabled=true`); plugin `react-native-worklets/plugin` último en Babel |
| `@gorhom/bottom-sheet@5` | Gestos y teclado dentro de hojas; `BottomSheetModalProvider` en `AppProviders` |
| `react-native-haptic-feedback@3` | Permiso `VIBRATE` y equivalencias de tipos de impacto |
| `@react-native-community/blur@4.4` | **Blur real solo en iOS.** En Android: fondo sólido con `theme.v2.blur.androidFallbackAlpha` (.96) sobre `glass.*` (D-28) |
| `boxShadow` | Sombras multicapa e `inset` de `theme.v2.shadow` en la nueva arquitectura |
| Tipografía | Roboto con `fontVariant: ['tabular-nums']` |
| Auth (fase 3) | Teclado: `KeyboardAvoidingView` solo en iOS; en Android depende de `adjustResize` (revisar que campo y CTA queden visibles) |
| Onboarding (fase 3) | Selector de fecha nativo en diálogo (`display="default"`); back de Android vuelve a la pregunta anterior (`BackHandler`); regla de peso/altura con `snapToInterval` y háptica `selection` |

### 8.2 Pendiente backend

| ID | Tema | Detalle |
|---|---|---|
| BK-01 | ✅ **Resuelto 2026-10-01** (backend). ~~RPC `award_gamification_event` falla (`42P10`)~~ | `gamification_events` tiene `UNIQUE (user_id, event_type, reference_id)`; catálogo de eventos y alias (BACKEND_SUMMARY §6). La app usa los nombres nuevos (§14.2). Resuelve la causa de B1 y B2 |
| BK-02 | ✅ **Resuelto 2026-10-01**. ~~Tipos de Supabase desactualizados~~ | `src/types/supabase.ts` reemplazado por los tipos generados por Lovable con el esquema completo (§14.1) |
| BK-03 | ✅ **Resuelto 2026-10-01**. ~~Onboarding · nivel sin columna~~ | Se guarda en `profiles.training_level` (`beginner`/`intermediate`/`advanced`) |
| BK-04 | ✅ **Resuelto 2026-10-01**. ~~Onboarding · duración sin columna~~ | Se guarda en `profiles.preferred_session_minutes` (20/35/45/60; "60 o más" = 60) |
| BK-05 | ✅ **Resuelto 2026-10-01**. ~~"Rendimiento" guardado como `improve_health`~~ | `profiles.goal = 'performance'`; añadido en Perfil, Editar perfil, Nutrición, ELLIE, Inicio y Descubrir ejercicios (§14.2) |
| BK-06 | Onboarding · género y avatar | Ya no se piden (decisión del usuario: seguir el diseño). Usuarios nuevos: `gender = null` y sin avatar (iniciales hasta que se elija en Perfil). **Análisis (2026-09-30)**: en el repo no hay ningún cálculo que use el género (ni TMB/TDEE ni calorías; `daily_calorie_goal` solo se lee). Único uso: el contexto en texto de ELLIE (`shared/domain/ellie-context.ts:496`), que con `null` envía "Género declarado: No indicado". El código de la edge function `ellie-chat` (que genera los planes nutricionales) no está en este repo: **revisar en backend** si estima calorías con el género; si es así, pedirlo en ese momento (al pedir/activar un plan) cuando falte, sin añadirlo al onboarding |

---

## 11. Fase 2 · Primitivas — resumen para leer en 2 minutos (2026-09-30)

Trabajo autónomo. **Sin commits**: ver §11.6 para hacerlos en orden.

### 11.1 Qué quedó hecho

- **Bloque A (dependencias)**: commit ya hecho por el usuario (`ec5f041`). Reanimated 4.6.0 + worklets 0.12.2, `@gorhom/bottom-sheet` 5.2.14, `react-native-haptic-feedback` 3.0.0, `@react-native-community/blur` 4.4.1.
- **Primitivas v2** en `src/components/v2/` (solo `theme.v2.*`, responden a Light, Dark y `SceneScope`; toda superficie tocable escala a .97):

| Primitiva | Archivo | Notas |
|---|---|---|
| `TextV2`, `Eyebrow` | `TextV2.tsx` | `variant` = `theme.v2.type.*`; `tone` primary/secondary/tertiary/bodySoft/disabled/ember/recovery/inverse |
| `Button` | `Button.tsx` | primary · secondary · outline · text · commit (Ember) · onScene; lg 56 / md 48 / sm 32; `loading` (etiqueta, sin spinner), `success` (check Ember + texto), `disabled` |
| `IconButton`, `BackButton` | `IconButton.tsx` | muted · glass (blur real en iOS) · solid; 44/36; `badge` Ember |
| `Row` | `Row.tsx` | fila plana 56/64 con divisor 1 pt, `value`, `trailing="chevron"`, `destructive` |
| `SectionHeader` | `SectionHeader.tsx` | título 20/600 o eyebrow, acción "Todo ›" |
| `Segmented` | `Segmented.tsx` | indicador deslizante con muelle (~320 ms), `badge`, variante `compact` (D-34) |
| `SwitchV2` | `Switch.tsx` | 51×31 del prototipo |
| `Sheet` | `Sheet.tsx` | `Modal` + Reanimated + gesture-handler (P1 resuelto) |
| `ToastProvider` / `useToast()` | `Toast.tsx` | píldora 44 con check Ember, 2,2 s; `withTabBar` → 104 pt (D-27) |
| `Skeleton`, `SkeletonGroup` | `Skeleton.tsx` | pulso 1,4 s / .45 compartido |
| `Scrim` | `Scrim.tsx` | recetas `bottom` y `hero` |
| `GlassSurface`, `GlassHeader` | `GlassSurface.tsx`, `GlassHeader.tsx` | blur iOS; Android relleno al .96 |
| `MetricTrio` | `MetricTrio.tsx` | tres columnas con divisores 1 pt, `source: 'health'` |
| `HealthTag` | `HealthTag.tsx` | ♡ Salud 10 pt + 11/500 |
| `Rings` | `Rings.tsx` | 3 anillos SVG animados (geometría 64/49/34 a 156 pt) |
| `HexMedal` | `HexMedal.tsx` | conseguida / bloqueada con anillo de progreso Ember |
| `EllieOrb`, `EllieSurface` | `EllieOrb.tsx`, `EllieSurface.tsx` | respira 3,2 s; pensando 1,2 s; offline sin halo y desaturada; banda de lino |
| helpers | `PressableScale.tsx`, `haptics.ts`, `useThemeV2.ts`, `index.ts` | |

- **Ajustes tras la revisión (2026-09-30)**:
  - `StatusBarV2` (`StatusBarV2.tsx`): `style="auto"` pone contenido claro en Dark y dentro de cualquier `SceneScope`, oscuro en Light; `"light"` para heros fotográficos fuera de escena. Se monta una vez por pantalla (pila de `StatusBar` de React Native: el último montado gana y el anterior se restaura al desmontar). Android: `translucent` + fondo transparente.
  - `Segmented` compacto unificado con el grande (D-34).
  - `MetricTrio`: la primera columna sin padding izquierdo y la última sin derecho, alineadas con el margen de 20.
  - `SwitchV2` con pomo invertido (D-33).
  - Catálogo: foto `images/esfuerzo.jpg` del paquete con el tratamiento del hero horneado (`saturate(.4) contrast(1.08) brightness(.7)`) en `src/assets/v2/photos/esfuerzo.jpg` (PLACEHOLDER).
  - Verificado en el catálogo en Light, Dark y Escena.
- `ThemeV2ModeScope` (en `ThemeProvider.tsx`) + `useAppTheme` actualizado: fuerza `theme.v2` a Light/Dark en un subárbol sin tocar la preferencia del usuario ni el tema antiguo. Test añadido (lógica real).
- `AppProviders.tsx`: `BottomSheetModalProvider` (bloque A), `ToastProvider` y, solo en `__DEV__`, `DevCatalogHost`.
- **Catálogo de desarrollo**: `src/dev/V2CatalogScreen.tsx` + `src/dev/DevCatalogHost.tsx`.
- Verificación: `tsc`, lint y `jest` (49/49) en verde. Revisión visual del catálogo en Light, Dark y Escena: correcta salvo P1 y los detalles de §11.3.

### 11.2 Decisiones asumidas (revisar)

| # | Decisión |
|---|---|
| DA-01 | Nombres `TextV2` y `SwitchV2` para no chocar con `Text`/`Switch` de React Native; el resto sin sufijo dentro de `components/v2` |
| DA-02 | En `SceneScope` la CTA primaria ya es blanca; se mantiene además `variant="onScene"` para CTA sobre foto fuera de escena |
| DA-03 | CTA secundaria dentro de escena: vidrio `glass.onPhoto` (translúcida), por la regla de "tinte translúcido en oscuro" |
| DA-04 | ~~Pomo blanco siempre~~ → **sustituida por D-33** (pomo invertido al encender) |
| DA-05 | ~~Indicador `surface.raised` en el compacto~~ → **sustituida por D-34** (mismo criterio que el grande) |
| DA-06 | Háptica solo en Segmented e interruptor (`selection`); `Button` la activa con `haptic` |
| DA-07 | `loading` = etiqueta + "…" y opacidad .7, sin spinner (handoff §5) |
| DA-08 | `BackButton` exige `onPress` (no llama a `navigation.goBack` por su cuenta) para no depender del contexto de navegación |
| DA-09 | Medalla conseguida: relleno `#2E2B28`, borde Ember 1,5 pt e icono blanco; bloqueada: relleno muted, icono terciario y anillo Ember de progreso |
| DA-10 | Paradas del degradado de la esfera aproximadas desde §3.4; offline = grises desaturados |
| DA-11 | Toast con `cta.primary` (negro en Light, marfil en Dark), como el prototipo |
| DA-12 | El catálogo usa un selector global Light/Dark/Escena en lugar de tres columnas (a 393 pt no caben) |
| DA-13 | ~~Hojas en portal con tema global~~ → **resuelto**: `Sheet` usa `Modal` de React Native y conserva el contexto (tema, escena, auth, navegación). El toast sigue en `ToastProvider` global |
| DA-14 | `GlassHeader` de 52 pt + safe area; título `cta` (17/600) |
| DA-15 | Skeleton dentro de escena: `border.onDarkStrong` (trazos discretos) |

### 11.3 Problemas y bloqueos

| # | Problema | Estado |
|---|---|---|
| P1 | **`Sheet` no se presentaba** | ✅ **Resuelto (2026-09-30)**. Diagnóstico: raíz envuelta en `GestureHandlerRootView` (correcto); `@gorhom/bottom-sheet` 5.2.14 es la última 5.x y declara compatibilidad con Reanimated ≥ 4. Con altura fija (`snapPoints`) también fallaba, así que no era la medición dinámica; el fallo estaba en el montaje por portal (`@gorhom/portal`): intermitente (una vez abrió con logs de depuración, lo que apunta a una condición de carrera) en React 19.2 + RN 0.85 Fabric + Reanimated 4.6. **Solución**: `Sheet` reescrita sobre `Modal` de React Native + Reanimated (subida 380 ms `easing.sheet`) + gesture-handler (arrastrar para cerrar), `KeyboardAvoidingView`, cierre con fondo, ✕ o back de Android (`onRequestClose`). Se quitó `BottomSheetModalProvider` de `AppProviders`. Verificado: abrir, cerrar con ✕, reabrir, cerrar tocando el fondo y volver a abrir (11/11). `@gorhom/bottom-sheet` queda instalado pero sin uso (ver §9) |
| P2 | **`AppDelegate.swift` no reenviaba URLs** | ✅ **Resuelto**. Añadidos `application(_:open:options:)` y `application(_:continue:restorationHandler:)` → `RCTLinkingManager`. Verificado con `xcrun simctl openurl booted athelete://dev/catalog` con la app abierta. Universal links: preparado, pero inactivo hasta tener el entitlement Associated Domains. Debería arreglar también el enlace de recuperación de contraseña con la app abierta (no probado) |
| P3 | Maestro `scrollUntilVisible` falla dentro del catálogo | Abierto (solo herramienta; se usan swipes fijos) |
| P4 | Barra de estado oscura sobre fondo oscuro en Dark/escena | ✅ **Resuelto** con `StatusBarV2` (reutilizable, ver §11.1) |
| P5 | Interruptor en escena blanco sobre blanco | ✅ **Resuelto** (D-33) |
| P6 | En el catálogo la `EllieSurface` no llega a sangre | Abierto (layout del catálogo, no de la primitiva) |

### 11.4 Cómo abrir el catálogo

- **Menú de desarrollo** de React Native (⌘D en el simulador) → **"Catálogo v2"**.
- O con `xcrun simctl openurl booted athelete://dev/catalog` (app abierta o cerrada) y aceptar "Open".
- Arriba: selector Light / Dark / Escena. Botón ✕ o "Cerrar catálogo" para salir.
- Solo existe en `__DEV__`; no toca navegación ni pantallas.

### 11.5 Pendientes de Android

Además de §8.3: blur de `IconButton` glass y `GlassSurface` → relleno sólido al .96 (ya implementado por `Platform.OS`, sin probar); `boxShadow` en botones Ember, toast, segmented compacto y medallas; animaciones de Reanimated (Segmented, Switch, Rings, EllieOrb, Skeleton, Toast); `@gorhom/bottom-sheet` (además de P1); háptica `selection`; tipografía Roboto tabular en `TextV2`; menú de desarrollo y URL del catálogo. Nuevos: `Sheet` sobre `Modal` (`statusBarTranslucent`, back con `onRequestClose`, teclado sin `KeyboardAvoidingView` en Android); `StatusBarV2` (`translucent`, fondo transparente, iconos claros/oscuros); interruptor con pomo animado.

### 11.6 Commits propuestos (en este orden)

Revisado el 2026-09-30: como la fase 2 aún no estaba commiteada, los arreglos de P1, D-33 y del punto 5 van en commits propios donde el archivo es nuevo (`Sheet.tsx`, `Switch.tsx`, `StatusBarV2.tsx`, `AppDelegate.swift`). `Segmented.tsx` y `MetricTrio.tsx` entran ya corregidos en su primer commit. Por sus imports, cada commit solo depende de los anteriores (`tsc` del conjunto final en verde; no se compiló cada commit por separado).

| # | Mensaje | Archivos |
|---|---|---|
| 1 | `feat(ui): add v2 base primitives (text, buttons, rows, segmented)` | `src/components/v2/{haptics.ts,useThemeV2.ts,PressableScale.tsx,TextV2.tsx,Button.tsx,IconButton.tsx,Row.tsx,SectionHeader.tsx,Segmented.tsx}` |
| 2 | `feat(ui): add v2 surfaces (toast, skeleton, scrim, glass header, metrics)` | `src/components/v2/{HealthTag.tsx,MetricTrio.tsx,Scrim.tsx,Skeleton.tsx,GlassSurface.tsx,GlassHeader.tsx,Toast.tsx}` |
| 3 | `feat(ui): add v2 identity primitives (rings, medal, ELLIE orb and surface)` | `src/components/v2/{Rings.tsx,HexMedal.tsx,EllieOrb.tsx,EllieSurface.tsx}` |
| 4 | `feat(ui): add v2 Sheet on React Native Modal` (P1) | `src/components/v2/Sheet.tsx` |
| 5 | `feat(ui): add v2 switch with contrasting knob (D-33)` | `src/components/v2/Switch.tsx` |
| 6 | `feat(ui): add StatusBarV2 and v2 components index` | `src/components/v2/StatusBarV2.tsx`, `src/components/v2/index.ts` |
| 7 | `feat(dev): add v2 primitives catalog and ThemeV2ModeScope` | `src/dev/V2CatalogScreen.tsx`, `src/dev/DevCatalogHost.tsx`, `src/assets/v2/photos/esfuerzo.jpg`, `src/app/AppProviders.tsx`, `src/providers/ThemeProvider.tsx`, `src/hooks/useAppTheme.ts`, `__tests__/themeV2.test.tsx` |
| 8 | `fix(ios): forward URLs and universal links to React Native Linking` (P2) | `ios/Athelete/AppDelegate.swift` |
| 9 | `docs: phase 2 primitives summary` | `docs/migration/MIGRATION_PROGRESS.md` |

Todos con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## 9. Pendiente de decisión

| Tema | Detalle |
|---|---|
| Body Science | Existe en código, sin entrada visible; sin lugar en v2 |
| Favoritos (rails y pantallas) | Solo el chip "Solo favoritos" existe en v2 |
| Hidratación (tarjetas propias) | v2 la absorbe en Tu día y Nutrición |
| RecoveryGuidance | Card de Inicio que abre ELLIE |
| Premium | Solo flag `is_premium` (siempre `false`); sin UI |
| `@gorhom/bottom-sheet` | Sin uso tras P1. Propuesta: `npm uninstall @gorhom/bottom-sheet` (solo JS, sin pods) |

---

## 10. Registro

### 2026-09-29 · Fase 0
- Auditoría de `src/` y del handoff.
- `.gitignore`: añadida la carpeta del handoff (sin commit).
- Primer `MIGRATION_PROGRESS.md` (perdido al reemplazar la carpeta).

### 2026-09-30 · Cierre de la fase 0
- Paquete completo verificado.
- Análisis de shell, `support.js` y Quiz Light.
- Desviaciones D-01…D-32, tokens y plan de la fase 0.5.
- Documento recreado.

### 2026-09-30 · Fase 0.5 · paso 1
- Documento movido a `docs/migration/` y versionado.
- `.gitignore`: carpeta del handoff y `.claude/settings.local.json`. `.claude/settings.json` versionado.
- Commit `chore: migration tracking + gitignore handoff`.

### 2026-09-30 · Cierre de la fase 0.5
- Bugs reproducidos: B1 y B2 confirmados (misma causa backend, `42P10`); B3, B4 y B5 no reproducidos.
- B1/B2 y tipos de Supabase: pendientes de backend (§8.2).
- `PlaceholderScreen` eliminado (`5664fdd`).
- Dependencias movidas al inicio de la fase 2.

### 2026-09-30 · Fase 1 · Tokens v2
- Commits: `8cebf32` colores, `1858342` escenas, `ca77c85` tipografía/espaciado/radios, `8226341` sombras/blur/movimiento.
- Verificación: `tsc`, `jest` (48/48) y lint en verde. Capturas de las 5 tabs en Light y Dark antes y después: 0 píxeles de diferencia fuera de la barra de estado; el bundle servido incluye los tokens nuevos.
- Android: pendiente.

---

## 12. Fase 3 · Auth y Onboarding (recorrido del usuario)

Orden: Login → Crear cuenta → Recuperar/Restablecer → Intro → Onboarding 8 pasos → Bienvenida de ELLIE. Desde el grupo 2 **sin Xcode** (reinstalación de IT): sin build, simulador, Maestro ni capturas; verificación solo con `tsc` + lint (+ `jest` si hay lógica). Nada de dependencias nativas nuevas.

> **Commits de la fase 3**: usar la secuencia consolidada de **§12.7**. Los comandos de cada grupo (§12.1–§12.6) son orientativos: `index.ts`, `Scrim.tsx` y `AuthHeroLayout.tsx` acumulan cambios de varios grupos y esos commits sueltos no compilarían por separado.

### 12.0 Pendiente de validación visual

| Pantalla | Referencias (Light y Dark) | Estados a probar | Dudas / sin verificar |
|---|---|---|---|
| Login | `AUTH_01_LOGIN_*`, `AUTH_02_LOGIN_ERROR_*` | normal; error de credenciales (aro + sacudida + frase); errores de validación por campo; teclado abierto con contraseña enfocada; "Entrando…" | **Dark sin verificar** (la sesión se cortó antes de las capturas Dark). Recorte de la foto del hero en pantallas pequeñas. El título del hero queda bajo la barra de estado al hacer scroll con el teclado |
| Crear cuenta | `AUTH_03_REGISTER_*` | vacía (CTA inactiva); requisitos cumpliéndose uno a uno (pop del check Ember); CTA activa; "Creando cuenta…"; error de Supabase (p. ej. correo ya registrado) bajo la contraseña; teclado con la contraseña enfocada (requisitos y CTA visibles); estado "Revisa tu correo" tras registrarse | Hero de 230 pt con foto `barra-mujer.jpg` (recorte); CTA inactiva con el estilo `disabled` v2 en vez de negro al 22 % (D-36); enlace "¿Ya tienes cuenta?" añadido (handoff §7, no está en el HTML); tracking del título 24 (−.015em en el token, 0 en el HTML) |
| Recuperar contraseña | `AUTH_04_FORGOT_*`, `AUTH_05_FORGOT_SENT_*` | formulario; correo inválido (aro + frase); "Enviando…"; enlace enviado (disco del sobre con pop); "Reenviar" (toast "Te enviamos otro enlace"); teclado abierto | El disco del candado usa `scene.plate` / `scene.deep`; el disco del sobre en Dark usa `shadow.subtle` (borde) en vez del brillo blanco del HTML (D-15); "Reenviar" sale en `text.primary` (HTML: secundario) |
| Restablecer contraseña | `AUTH_06_RESET_*`, `AUTH_07_RESET_SUCCESS_*` | requisitos en vivo (8, número, mayúscula, coinciden — D-38: 4 filas en vez de 3); CTA inactiva/activa; "Guardando…"; error de Supabase; éxito (check Ember 72 con halo); enlace caducado (estado nuevo, sin referencia); teclado con "Repite la contraseña" enfocada | Probar con un enlace real de recuperación (requiere P2/AppDelegate). "Para {correo}" sale del `session.user.email` de recuperación |
| Intro deslizable | `ONB_01_INTRO` (escena: misma en Light y Dark) | deslizar entre las 3 fotos; "Siguiente" avanza; los puntos (22/6 pt) siguen al swipe; "Empezar" llama a `onComplete`; iPhone pequeño (el texto no debe chocar con los puntos) | Posición vertical del texto calculada sobre los controles fijos (no la del HTML, donde texto, puntos y CTA forman un bloque); la animación de cambio de texto del HTML (push) se sustituye por el propio swipe |
| Onboarding · 8 pasos | `ONB_02_STEP_01_*` … `ONB_02_STEP_08_*` | cada paso con "Siguiente" inactivo hasta responder; back y back de Android entre pasos; transición (entra por la derecha al avanzar, por la izquierda al volver); nombre con teclado (CTA visible); fecha: hoja con el selector del sistema (iOS spinner) y "Listo"; peso/altura: arrastrar la regla (háptica por unidad, aguja fija, bordes desvanecidos); objetivo: tiles con foto y check Ember; nivel: barras + radio; días: − / + y la semana; equipamiento: multiselección con check Ember; duración: cápsulas con punto Ember en la recomendada; "Terminar" → Bienvenida | Regla: valores iniciales 70 kg / 170 cm (el HTML muestra 76/170 de ejemplo); el selector de fecha va en la `Sheet` v2 (el HTML solo dice "selector del sistema"); en el paso 1 no hay back (el usuario ya está dentro, sin intro previa); "Rendimiento" se guarda como `performance` (desde 2026-10-01, BK-05) |
| Bienvenida de ELLIE | `ONB_03_ELLIE_WELCOME_*` | al aparecer guarda el perfil en segundo plano ("Guardando tu perfil…", salidas inactivas); guardado OK → "Ir a Inicio" → Inicio y "Hablar con ELLIE" → pestaña ELLIE ("Abriendo tu inicio…"); fallo al guardar (sin red) → frase de error + "Reintentar" en lugar de la primaria; resumen (días, min, objetivo) según las respuestas | La fila "Tu primera sesión" no tiene sesión real detrás (DA-27); el halo de la esfera (1,9× del HTML vs 128 + 34 pt); fondo de lino en Dark con `linen[2]` → `linen[3]` → `bg` |

### 12.1 Grupo 1 · Login (AUTH_01, AUTH_02) — cerrado 2026-09-30

- **Qué cambió**: `LoginScreen` reescrito con v2 (lógica de `signIn`, validación y navegación intactas). Nuevas primitivas: `TextField` (campo 54 pt, aro de error Ember profundo / Ember claro en oscuro, sacudida, ojo para contraseña), `Wordmark` (Λ + ATHELETE, PLACEHOLDER del logotipo), `ThemeToggleButton` (vidrio, luna/sol), `AuthHeroLayout` (foto + scrim `auth` + superficie que sube 28 pt; `KeyboardAvoidingView` + scroll al final en `keyboardDidShow` para que campo y CTA queden sobre el teclado). Token `surface.field` (`#EFEEEA` / `#262422`). Foto `src/assets/v2/photos/overhead.jpg` con `saturate(.4) contrast(1.1) brightness(.72)` horneado. Helper `features/auth/loginError.ts` + test.
- **Desviaciones**: D-35 (abajo): relleno de campos `surface.field` en lugar de "blanco con borde" del handoff (manda el HTML). Error en oscuro con `#FF8A5C` (HTML) en vez de `#C23D0B` en ambos modos (handoff §4).
- **Verificado** (antes del corte): Light normal, error de credenciales y teclado. Dark pendiente (§12.0).
- **Bloqueos**: ninguno.
- **Comandos git**:

```bash
git add src/theme/v2/colors.ts src/components/v2/{Scrim.tsx,TextField.tsx,Wordmark.tsx,ThemeToggleButton.tsx,AuthHeroLayout.tsx,index.ts} src/assets/v2/photos/overhead.jpg
git commit -m "feat(ui): add v2 text field, wordmark, theme toggle and auth hero layout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/screens/auth/LoginScreen.tsx src/features/auth/loginError.ts __tests__/loginError.test.ts
git commit -m "feat(auth): migrate Login to v2 (AUTH_01, AUTH_02)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### 12.2 Grupo 2 · Crear cuenta (AUTH_03) — 2026-09-30 (sin Xcode)

- **Qué cambió**: `RegisterScreen` reescrito con v2: hero 230 pt (`barra-mujer.jpg` horneada `saturate(.4) contrast(1.08) brightness(.7)`, scrim `authShort` `.5 → .2 @45% → .8`, eyebrow "ATHELETE" 11/700 tracking .28em + título 24/600), back de vidrio, campos Nombre / Correo / Contraseña, **requisitos en vivo** (8 caracteres, número, mayúscula) con check Ember, CTA inactiva hasta cumplir todo, nota legal 12 terciaria. Tras `signUp` se mantiene el estado de verificación de correo (Supabase), con el estilo "Revisa tu correo" de AUTH_05.
- **Primitivas nuevas**: `RequirementList` (aro 18 → check Ember con pop), `AuthFormLayout` (pantallas de Auth sin foto, usada también en el grupo 3). `AuthHeroLayout` admite `brand="eyebrow"` y `scrim`; `Scrim` añade `authShort`.
- **Lógica**: `features/auth/passwordRules.ts` (+ test 2/2). `signUp(name, email, password)` sin cambios.
- **Decisiones asumidas**: DA-16 se quita "Confirmar contraseña" (el diseño no la tiene; el ojo permite revisarla). DA-17 la política de contraseña del registro pasa a 8+ caracteres, número y mayúscula (solo UI; el login sigue aceptando contraseñas antiguas de 6+). DA-18 se mantiene el paso "Revisa tu correo" porque Supabase exige verificación (el prototipo salta a la Intro). DA-19 se añade "¿Ya tienes cuenta? Iniciar sesión" (handoff §7 lo lista como CTA secundaria).
- **Desviaciones**: D-36 (CTA inactiva).
- **Bloqueos**: sin Xcode, sin validación visual.
- **Comandos git**:

```bash
git add src/components/v2/{RequirementList.tsx,AuthFormLayout.tsx,AuthHeroLayout.tsx,Scrim.tsx,index.ts} src/assets/v2/photos/barra-mujer.jpg src/features/auth/passwordRules.ts __tests__/passwordRules.test.ts
git commit -m "feat(ui): add v2 requirement list and auth form layout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/screens/auth/RegisterScreen.tsx
git commit -m "feat(auth): migrate Crear cuenta to v2 with live password requirements (AUTH_03)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### 12.3 Grupo 3 · Recuperar y Restablecer (AUTH_04 a AUTH_07) — 2026-09-30 (sin Xcode)

- **Qué cambió**: `ForgotPasswordScreen` y `ResetPasswordScreen` reescritos sobre `AuthFormLayout` (barra con back 44 + título 15/600 secundario, contenido a 24 pt de la barra, campo y CTA sobre el teclado). Recuperar: disco oscuro con candado, título 24, campo, "Enviar enlace"; enviado: disco claro con el sobre, "Revisa tu correo", primaria "Volver a iniciar sesión" y "Reenviar" (vuelve a llamar a `requestPasswordReset` y confirma con toast). Restablecer: dos campos + requisitos en vivo, "Guardar contraseña" inactiva hasta cumplirlos, éxito con check Ember 72 + halo y "Iniciar sesión" (llama a `finishPasswordRecovery`, como antes).
- **Lógica**: `requestPasswordReset`, `updateRecoveredPassword`, `finishPasswordRecovery` y el control de `isPasswordRecoveryActive` / `passwordRecoveryError` sin cambios. Validación de la nueva contraseña: de "6+ y coinciden" a `resetPasswordRequirements` = las reglas de Crear cuenta (8+, número, mayúscula) + "Coinciden" (D-38, ajuste del 2026-09-30).
- **Decisiones asumidas**: DA-20 en "enlace enviado" la primaria del prototipo ("Abrir enlace (demo)", simulación) pasa a "Volver a iniciar sesión" y se quita "Caduca en 30 minutos" (la caducidad la define Supabase; no se puede afirmar). DA-21 el estado "enlace no válido/caducado" (no diseñado) se resuelve con la misma composición: disco, título, frase y "Pedir un enlace nuevo".
- **Desviaciones**: D-36 (CTA inactiva). Disco del sobre en Dark con borde en vez de brillo blanco (criterio de D-15).
- **Bloqueos**: sin Xcode, sin validación visual. Probar el enlace real exige un correo de recuperación (y el reenvío de URLs de P2).
- **Comandos git**:

```bash
git add src/screens/auth/ForgotPasswordScreen.tsx src/screens/auth/ResetPasswordScreen.tsx
git commit -m "feat(auth): migrate password recovery and reset to v2 (AUTH_04 to AUTH_07)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### 12.4 Grupo 4 · Intro deslizable (ONB_01) — 2026-09-30 (sin Xcode)

- **Qué cambió**: `VisualOnboardingScreen` reescrita como escena (`SceneScope`) a pantalla completa: `FlatList` paginada con las 3 fotos del prototipo (`overhead`, `movilidad` nueva horneada `saturate(.4) contrast(1.08) brightness(.74)`, `esfuerzo`), degradado `#161616` (0 → .92 entre 35 % y 75 %), título 28/700 (−.01em) y texto 17 `onDark.secondary`, puntos 6 pt (activo 22 pt blanco) y CTA blanca "Siguiente" / "Empezar". Se mantiene la API (`onComplete`) y el lugar en el flujo (primer arranque, antes de Login; `lib/visualOnboarding.ts` sin cambios).
- **Desviaciones**: D-37 (copy "técnica en video").
- **Decisiones asumidas**: DA-22 swipe además del botón (el handoff la llama "deslizable"; el HTML solo avanza con el botón). DA-23 la Intro sigue apareciendo antes del Login la primera vez (como hoy), no entre Crear cuenta y el onboarding como en el recorrido del prototipo; el recorrido dev "Recorrer onboarding" (grupo 5) la muestra en el orden del prototipo.
- **Limpieza pendiente** (no borrado): `src/components/onboarding/VisualOnboardingPagination.tsx` y `src/assets/images/visual-onboarding/*` (+ sus exports en `src/assets/images/index.ts`) quedan sin uso.
- **Bloqueos**: sin Xcode, sin validación visual.
- **Comandos git**:

```bash
git add src/screens/onboarding/VisualOnboardingScreen.tsx src/assets/v2/photos/movilidad.jpg
git commit -m "feat(onboarding): migrate intro slides to v2 (ONB_01)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### 12.5 Grupo 5 · Onboarding 8 pasos (ONB_02) + "Recorrer onboarding" — 2026-09-30 (sin Xcode)

- **Qué cambió**: el onboarding v1 (9 pantallas en stack) se sustituye por una sola pantalla `OnboardingScreen` → `OnboardingFlow` (8 preguntas + Bienvenida de ELLIE). `OnboardingWizard`: back 44 + "Tú · 1 de 8" 13/600, `StepProgress` (8 segmentos de 4 pt, hueco extra entre bloques), eyebrow "01 · Tú" + pregunta 32/600 (−.025em), cuerpo del paso con transición lateral (Reanimated, 320 ms), CTA fija "Siguiente"/"Terminar" sobre vidrio. Pasos en `features/onboarding/components/OnboardingSteps.tsx`.
- **Primitivas nuevas (v2)**: `StepProgress`, `RulerInput` (regla con marcas cada 12 pt, aguja fija, bordes con degradado en vez de `mask-image` — D-30), `PhotoChoiceTile` (tile 196 pt con foto, scrim y check Ember), `ChoiceTile` + `IconChoiceContent` (tiles de equipamiento y cápsulas de duración: seleccionado = relleno `cta.primary` con contenido invertido).
- **Datos** (`features/onboarding/onboardingModel.ts`, test 6/6): se guardan solo columnas existentes vía `completeOnboarding` → `updateOnboardingProfile`: `name`, `birth_date`, `weight`, `height`, `goal`, `training_days_per_week`, `available_equipment` (etiquetas en español, como las lee ELLIE) y `onboarding_completed`. Sin guardar (pendiente de backend): nivel (BK-03), duración (BK-04). `gender` y `avatar_key` quedan en `null` (BK-06). "Rendimiento" → `improve_health` (BK-05). **Actualización 2026-10-01**: nivel, duración y `performance` ya se guardan (§14.2). Cambios mínimos: `OnboardingData.gender` admite `null`, `availableEquipment?` opcional, y `updateOnboardingProfile`/`completeOnboarding` aceptan `name` opcional.
- **Navegación**: `OnboardingStackNavigator` registra solo `Flow`. Las respuestas se guardan en la Bienvenida; al quedar el perfil completo `RootNavigator` pasa a las pestañas. "Hablar con ELLIE" abre la pestaña ELLIE mediante `lib/postOnboarding.ts` (intención de un solo uso que lee `MainTabNavigator` al montar).
- **Modo dev "Recorrer onboarding"**: nueva entrada en el menú de desarrollo (junto a "Catálogo v2") y URL `athelete://dev/onboarding`. Muestra Intro → 8 pasos → Bienvenida con datos de ejemplo; **no llama a Supabase, no crea usuarios ni guarda nada**; ✕ arriba a la derecha para salir; al terminar, toast "Recorrido terminado · iría a … (sin guardar)". Solo en `__DEV__` (`src/dev/DevOnboardingWalkthrough.tsx`).
- **Decisiones del usuario aplicadas**: 8 pasos exactos sin género ni avatar; "Rendimiento" → `improve_health` (sustituido el 2026-10-01 por `performance`, BK-05).
- **Decisiones asumidas**: DA-24 los pasos sin respuesta por defecto (fecha, objetivo, nivel, equipamiento, duración) exigen elegir antes de "Siguiente"; peso/altura y días arrancan en 70 kg / 170 cm / 3 días. DA-25 el selector de fecha del sistema se abre en una `Sheet` con "Listo" (iOS) o en el diálogo nativo (Android); máximo hoy, mínimo 1920. DA-26 sin back en la primera pregunta del flujo real (el usuario ya inició sesión; no hay pantalla previa).
- **Limpieza pendiente** (no borrado): pantallas v1 `src/screens/onboarding/{WelcomeScreen,AvatarPickerScreen,BirthDateScreen,GenderSelectionScreen,WeightInputScreen,HeightInputScreen,TrainingFrequencyScreen,GoalSelectionScreen,ProfileSetupCompleteScreen}.tsx`, sus rutas en `ONBOARDING_ROUTES`/`OnboardingStackParamList`, `src/components/onboarding/*` y `src/components/auth/*` (ya solo los usan esas pantallas).
- **Bloqueos**: sin Xcode, sin validación visual. `@react-native-community/datetimepicker` ya estaba instalado (no se añade nada nativo).

### 12.6 Grupo 6 · Bienvenida de ELLIE (ONB_03) — 2026-09-30 (sin Xcode)

- **Guardado (ajuste del 2026-09-30)**: el perfil se guarda **al mostrar** la Bienvenida, en segundo plano (`saveOnboardingProfile`: escribe sin refrescar el perfil, así la app no sale de la Bienvenida). Mientras guarda, las salidas están inactivas; si falla, se muestra la frase de error y "Reintentar". Las salidas solo navegan: `refreshProfile()` marca al usuario como completado y `RootNavigator` pasa a las pestañas (Inicio o ELLIE). `completeOnboarding` se mantiene (guardar + refrescar) para compatibilidad.
- **Qué cambió**: `features/onboarding/components/EllieWelcome.tsx`: fondo de lino (`#EDE4D8 → #F3EDE5 → bg` en Light; `#241E18 → #1A1714 → bg` en Dark), esfera de ELLIE 128 respirando, eyebrow "ELLIE · Tu coach", voz 26/400 "Hola, {nombre}. Ya tengo tu punto de partida.", texto 15 secundario, trío días/sem · min · objetivo con divisores, fila "Tu primera sesión" (foto 56, radio 16), CTA "Ir a Inicio" y "Hablar con ELLIE". Ambas guardan el perfil; si falla se muestra la frase de error y se puede reintentar.
- **Decisiones asumidas**: DA-27 la fila "Tu primera sesión" no apunta a una sesión real (no hay rutina recomendada antes de tener perfil): muestra "Sesión de inicio · {min} · {nivel}" y lleva a Inicio como "Ir a Inicio". DA-28 ~~el perfil se guarda al salir de la Bienvenida~~ → sustituida por la decisión del usuario: se guarda al mostrarla (ver arriba).
- **Bloqueos**: sin Xcode, sin validación visual.
- **Comandos git (grupos 5 y 6)**:

```bash
git add src/components/v2/{StepProgress.tsx,RulerInput.tsx,PhotoChoiceTile.tsx,ChoiceTile.tsx,index.ts} src/assets/v2/photos/{hero-entreno.jpg,hiit.jpg,cuerdas.jpg}
git commit -m "feat(ui): add v2 step progress, ruler input and choice tiles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/features/onboarding src/screens/onboarding/OnboardingScreen.tsx src/navigation/OnboardingStackNavigator.tsx src/navigation/MainTabNavigator.tsx src/lib/postOnboarding.ts src/constants/routes.ts src/types/navigation.ts src/types/auth.ts src/services/supabase/profile.ts src/providers/AuthProvider.tsx __tests__/onboardingModel.test.ts
git commit -m "feat(onboarding): migrate onboarding to the v2 8-step flow and ELLIE welcome (ONB_02, ONB_03)" -m "Saves only existing profile columns; level and session length are shown but not stored (pending backend). Gender and avatar are no longer asked." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/dev/DevOnboardingWalkthrough.tsx src/dev/DevCatalogHost.tsx
git commit -m "feat(dev): add 'Recorrer onboarding' walkthrough without saving data" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### 12.7 Comandos git consolidados de la fase 3 (en este orden)

Cubren todos los archivos pendientes. Las primitivas van primero (incluido `index.ts`), así cada commit siguiente solo depende de los anteriores. `tsc` del conjunto final en verde; no se compiló cada commit por separado.

```bash
# 1 · primitivas v2 de Auth y Onboarding + fotos horneadas
git add src/theme/v2/colors.ts src/components/v2/{Scrim.tsx,TextField.tsx,Wordmark.tsx,ThemeToggleButton.tsx,AuthHeroLayout.tsx,AuthFormLayout.tsx,RequirementList.tsx,StepProgress.tsx,RulerInput.tsx,PhotoChoiceTile.tsx,ChoiceTile.tsx,index.ts} src/assets/v2/photos/{overhead.jpg,barra-mujer.jpg,movilidad.jpg,hero-entreno.jpg,hiit.jpg,cuerdas.jpg}
git commit -m "feat(ui): add v2 auth and onboarding primitives" -m "Text field, wordmark, theme toggle, auth hero/form layouts, requirement list, step progress, ruler input and choice tiles. Package photos with the prototype treatment baked in (PLACEHOLDER)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 2 · Login (AUTH_01, AUTH_02)
git add src/screens/auth/LoginScreen.tsx src/features/auth/loginError.ts __tests__/loginError.test.ts
git commit -m "feat(auth): migrate Login to v2 (AUTH_01, AUTH_02)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 3 · Crear cuenta (AUTH_03)
git add src/screens/auth/RegisterScreen.tsx src/features/auth/passwordRules.ts __tests__/passwordRules.test.ts
git commit -m "feat(auth): migrate Crear cuenta to v2 with live password requirements (AUTH_03)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 4 · Recuperar y restablecer (AUTH_04–AUTH_07)
git add src/screens/auth/ForgotPasswordScreen.tsx src/screens/auth/ResetPasswordScreen.tsx
git commit -m "feat(auth): migrate password recovery and reset to v2 (AUTH_04 to AUTH_07)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 5 · Intro (ONB_01)
git add src/screens/onboarding/VisualOnboardingScreen.tsx
git commit -m "feat(onboarding): migrate intro slides to v2 (ONB_01)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 6 · Onboarding 8 pasos + Bienvenida de ELLIE (ONB_02, ONB_03)
git add src/features/onboarding src/screens/onboarding/OnboardingScreen.tsx src/navigation/OnboardingStackNavigator.tsx src/navigation/MainTabNavigator.tsx src/lib/postOnboarding.ts src/constants/routes.ts src/types/navigation.ts src/types/auth.ts src/services/supabase/profile.ts src/providers/AuthProvider.tsx __tests__/onboardingModel.test.ts
git commit -m "feat(onboarding): migrate onboarding to the v2 8-step flow and ELLIE welcome (ONB_02, ONB_03)" -m "The welcome saves the profile in the background when it appears (retry on failure); its buttons only navigate. Saves only existing profile columns; level and session length are shown but not stored (pending backend). Gender and avatar are no longer asked." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 7 · Recorrido de desarrollo
git add src/dev/DevOnboardingWalkthrough.tsx src/dev/DevCatalogHost.tsx
git commit -m "feat(dev): add 'Recorrer onboarding' walkthrough without saving data" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 8 · Documento
git add docs/migration/MIGRATION_PROGRESS.md
git commit -m "docs: phase 3 auth and onboarding progress" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 13. Fase 4 · Navegación final (2026-09-30, sin Xcode)

Verificación: `tsc` + eslint de los archivos tocados + `jest` (16 suites, 62 tests). Sin build, simulador, Maestro ni capturas. Sin dependencias nuevas.

### 13.1 Qué cambió

- **Estructura**:
  ```
  RootStack (native-stack, key={flow})
  ├─ auth        → AuthFlow (sin cambios)
  ├─ onboarding  → OnboardingFlow (sin cambios)
  └─ app
     ├─ MainTabs (TabBarV2): Home · Workouts · Ellie · Progress · Community
     └─ pantallas compartidas (encima de los tabs, la barra se oculta sola):
        Profile, EditProfile, Achievements, Notifications, Core33, WorkoutDetail,
        WorkoutSession, ExerciseDetail, CreateRoutine, EditRoutine, AddExerciseToRoutine,
        QuizLanding, QuizQuestion, QuizResult, PersonalRecords, RegisterPr,
        NutritionPlan, BodyScience, BodyScienceArticle
  ```
- **Rutas**: `TAB_ROUTES` (con `Community`, sin `Profile`) + un único `APP_ROUTES` (un nombre por pantalla). Eliminados `HOME_/WORKOUTS_/ELLIE_/PROGRESS_/PROFILE_ROUTES` y los duplicados con prefijo (`WorkoutPersonalRecords`, `ProgressRegisterPr`, `ProgressChallenge`, `Challenge` → `Core33`, `*Root`).
- **Tipos** (`src/types/navigation.ts`): `MainTabParamList`, `AppStackParamList`, `RootStackParamList`, helpers `AppScreenProps<'X'>`, `TabScreenProps<'X'>`, `RootNavigation`. Todas las pantallas usan props tipadas: `tsc` detecta rutas o parámetros rotos. Sin `as never`, `as any` ni `getState().routeNames` en pantallas (búsqueda limpia; solo `safeGoBack` recorre navegadores, a propósito).
- **Eliminados**: `src/navigation/{Home,Workouts,Ellie,Progress,Profile}StackNavigator.tsx`.
- **Barra de pestañas v2** (`src/navigation/TabBarV2.tsx`): píldora de vidrio 68 pt, a 16 de los lados, `bottom = max(24, inset − 10)`, radio 34, `GlassSurface kind="tab"` + `shadow.floatTab`; ítems 62×56 radio 28, Lucide 22 (`House`, `Dumbbell`, `Sparkles`, `TrendingUp`, `Users`) + etiqueta `micro` 10/600; activo relleno `cta.primary` con contenido `cta.primaryText` (fundido 250 ms), inactivo opacidad .72; háptica `selection` al cambiar. Se oculta con el teclado y cuando una pantalla llama a `setTabBarVisible(false)` (chat de ELLIE).
- **`useTabBarMetrics`**: ya no usa `useBottomTabBarHeight` (lanzaba fuera de los tabs); calcula la geometría v2 (`height` = 68 + separación inferior; `bottomClearance` = máx(120, height + 16)).
- **Comunidad** (`src/screens/tabs/CommunityScreen.tsx`): v2 puro; avatar 44 → Perfil, título 28 "Comunidad", círculo con `Users`, "Muy pronto" y una frase. Sin CTA.
- **Perfil**: pantalla apilada. Sin `useTabBarMotion`/`useTabBarMetrics` (lanzaban fuera de los tabs); `BackButton` v2 arriba (también en carga y error); margen inferior por safe area.
- **TEMP-01 · acceso temporal a Perfil**: el avatar de `HomeHeader` (Inicio v1) es pulsable ("Perfil") → `Profile`. Se sustituye al migrar Inicio (avatar 44 sobre el hero del shell). ✅ **Resuelto 2026-10-01** (§15.1): el avatar del hero v2 abre Perfil; `HomeHeader` queda sin uso.
- **Core 33 · entrada única**: `src/features/core33/core33Entry.ts` (`core33EntryState`, `resolveCore33Entry`; estados `intro | explore | ready | active | completed` como punto de extensión) + `useOpenCore33()` + test. Lo usan Inicio, Progreso, Notificaciones y Perfil. Hoy todo resuelve a `Core33` (ChallengeScreen ya decide intro / hábitos / tracker).
- **Navegaciones que se habrían roto en ejecución y se corrigieron**: `getParent()?.navigate(TAB)` desde pantallas que ahora viven en el stack raíz (Notificaciones, Sesión, Plan nutricional) → `navigate('MainTabs', {screen})`; desde tabs (Inicio) → `navigate('Workouts' | 'Ellie')`; selección de ruta por `routeNames` en Récords, Detalle de rutina, Detalle de ejercicio, Crear rutina y Añadir a rutina → nombres fijos; Perfil fuera de los tabs (hooks de la barra).
- **`safeGoBack`**: fallbacks tipados (`AnyRouteName` o `{name, params}`) + helper `tabFallback('Workouts')`. Las listas de varios tabs pasan a `MainTabs` (vuelve al tab en el que estaba el usuario).
- **Enlaces**: sin cambios. `athelete://dev/catalog` y `dev/onboarding` los atiende `DevCatalogHost` con `Linking`, fuera del navegador; la recuperación de contraseña sigue en `AuthProvider` + `AuthStack.ResetPassword`; `NavigationContainer` no tiene `linking`.

### 13.2 Decisiones asumidas

| ID | Decisión |
|---|---|
| DA-29 | Se elimina la "compactación" de la barra al hacer scroll (v1). `TabBarMotionProvider` se mantiene por `setTabBarVisible` (ELLIE); los `onScroll` de v1 siguen conectados pero ya nada lee `compactProgress` (se limpian al migrar cada tab) |
| DA-30 | Los tabs muestran su pantalla raíz sin stack anidado; volver a pulsar el tab activo no hace nada (no hay pila que vaciar) |
| DA-31 | Fallbacks de "volver sin historial" → `MainTabs` sin pantalla (el último tab activo), salvo donde había un único destino claro (`tabFallback`) |
| DA-32 | `CreateRoutine` y `EditRoutine` siguen siendo la misma pantalla registrada dos veces (como en v1) |
| DA-33 | Perfil temporal: se mantiene la pantalla v1 con un `BackButton` v2 encima; su migración visual va en la fase 5 |
| DA-34 | `backBehavior` por defecto de bottom-tabs (`firstRoute`): back de Android en un tab que no es Inicio vuelve a Inicio; en Inicio sale de la app |
| DA-35 | Body Science sigue registrada pero sin punto de entrada (igual que antes de la fase 4) |

### 13.3 Android (sin compilar)

- La barra usa el relleno sólido al .96 de `GlassSurface` (D-28) y `boxShadow` (nueva arquitectura); revisar la sombra `floatTab`.
- Teclado: se oculta en `keyboardDidShow`/`keyboardDidHide` (iOS usa `Will`).
- Back físico: detalle → atrás; Perfil → tab de origen; tab ≠ Inicio → Inicio; Inicio → sale (DA-34).
- Safe area inferior con navegación por gestos vs 3 botones: `bottom = max(24, inset − 10)`.

### 13.4 Pendiente de validación visual (flujos a probar en el simulador)

| # | Flujo | Qué comprobar |
|---|---|---|
| 1 | Barra de pestañas | 5 tabs, estado activo (relleno + fundido), Light/Dark, vidrio real; oculta con el teclado; oculta en el chat de ELLIE y visible al salir; no aparece en ninguna pantalla de detalle. El contenido de cada tab no queda tapado (clearance 120) |
| 2 | Inicio → avatar → Perfil | Perfil con `BackButton`; Editar perfil / Logros / Plan nutricional / Core 33 → atrás a Perfil → atrás a Inicio |
| 3 | Comunidad → avatar → Perfil | Volver deja en Comunidad. Barra de estado correcta al cambiar de tab |
| 4 | Inicio → tarjeta de rutina → Detalle → Empezar → Sesión | Detalle de ejercicio desde la sesión; salir; terminar la sesión vuelve al tab Inicio |
| 5 | Entrenos → Rutina → Detalle → Editar → Añadir ejercicio | Atrás a Editar; Crear rutina → al guardar reemplaza por el detalle de la nueva rutina |
| 6 | Entrenos → Ejercicios → Detalle de ejercicio → Agregar a rutina | Crear nueva / añadir a una existente (reemplaza por Editar) |
| 7 | Récords desde Inicio (récord reciente), Progreso y Notificaciones | Misma pantalla; Registrar récord → "Continuar" vuelve a Récords; cambiar de ejercicio en el historial |
| 8 | Core 33 desde Inicio, Progreso, Notificaciones y Perfil | Abre la misma pantalla con el estado correcto (intro / tracker / completado); atrás vuelve al origen |
| 9 | Notificaciones → cada destino | Entrenos, ELLIE, Progreso, Inicio (hidratación) cambian de tab y cierran Notificaciones; Quiz, Nutrición (con registro), Récords y Core 33 se apilan |
| 10 | Plan nutricional → "Hablar con ELLIE" | Abre el tab ELLIE (desde Perfil, Progreso y Notificaciones) |
| 11 | Quiz | Inicio → Quiz → Pregunta → Resultado → "Otra ronda" (reemplaza) / volver a Quiz; salir a mitad de ronda (`popTo` QuizLanding) |
| 12 | Body Science | Sin punto de entrada hoy (DA-35); nada que probar salvo que se añada uno |
| 13 | Fin del onboarding | "Hablar con ELLIE" abre el tab ELLIE; "Ir a Inicio" abre Inicio |
| 14 | Back de Android | En cada detalle y en Perfil; en tabs según DA-34 |
| 15 | Enlaces | `xcrun simctl openurl booted athelete://dev/catalog` y `…/dev/onboarding` con la app abierta y cerrada; enlace real de recuperación de contraseña |

Dudas sin verificar: composer de ELLIE (`marginBottom` = altura v2 de la barra, ahora 92 pt en iPhone con isla vs ~83 antes); `StatusBarV2` de Comunidad queda montado al cambiar de tab (en `auto` coincide con el tema, igual que v1).

### 13.5 Commits propuestos

Los cambios de código no se pueden separar en commits que compilen por sí solos (`routes.ts`, `types/navigation.ts`, `MainTabNavigator.tsx` y `HomeScreen.tsx` los comparten todos), así que va **un commit de código + uno de documento**. Nota: los archivos v1 tocados conservan su estilo; solo las líneas cambiadas siguen Prettier.

```bash
git add -A src/navigation src/constants/routes.ts src/types/navigation.ts src/hooks/useTabBarMetrics.ts src/features/core33/core33Entry.ts src/features/core33/useOpenCore33.ts src/features/home/components/HomeHeader.tsx src/screens __tests__/core33Entry.test.ts __tests__/safeGoBack.test.ts
git commit -m "feat(nav): v2 navigation with shared root stack, floating tab bar and Comunidad tab" -m "Tabs: Inicio, Entrenos, ELLIE, Progreso, Comunidad. Perfil leaves the tab bar and opens from the avatar (temporary entry on Inicio, TEMP-01). Detail and immersive screens live once in the root stack with typed routes; removes the per-tab stacks, duplicated routes and getParent/routeNames hacks. Single Core 33 entry point." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

git add docs/migration/MIGRATION_PROGRESS.md
git commit -m "docs: phase 4 navigation" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 14. Backend (Lovable · Supabase) — 2026-10-01 · **cerrado**

Fuente de verdad: [`docs/backend/BACKEND_SUMMARY.md`](../backend/BACKEND_SUMMARY.md). Todos los cambios del backend son aditivos. La app **no** crea migraciones ni toca la base de datos: el backend lo gestiona Lovable.

### 14.1 Estado

| Tema | Estado |
|---|---|
| BK-01 · `award_gamification_event` (`42P10`) | ✅ Resuelto en backend (UNIQUE completa, catálogo y alias, modo `log`). B1 y B2 dejan de fallar por esta causa (pendiente de comprobar en el simulador) |
| BK-02 · tipos de Supabase | ✅ `src/types/supabase.ts` = tipos de Lovable (esquema completo, incluye `__InternalSupabase`, `Tables`/`TablesInsert`/`TablesUpdate`). Mismo export `Database`, sin cambios en los imports; `tsc` sin errores. El cliente (`createClient`) sigue sin tipar con `Database`, así que no cambia nada en tiempo de ejecución |
| Estado general | ✅ **Backend cerrado** (2026-10-01, 19:20 UTC). Quedan solo los pendientes de §14.4 |
| BK-03 / BK-04 / BK-05 · onboarding | ✅ Resueltos (columnas `training_level`, `preferred_session_minutes` y `goal = performance`) |
| BK-06 · género | Sigue opcional (`gender` puede ser `null`). Pendiente de backend: confirmar si `ellie-chat` usa el género para calcular calorías |
| Series por ejercicio y Comunidad | ✅ Tablas y RPC creadas en backend. La app **no** las usa todavía: entran con sus pantallas (§14.3) |

### 14.2 Cambios en la app (2026-10-01)

- **Gamificación** (`services/supabase/gamification.ts`):
  - Respuesta nueva `{awarded, event_id, points_added, total_points, new_badges, reason}` normalizada en `normalizeAwardResult`: `badgesUnlocked` = `new_badges`, `totalPoints` = `total_points`, `alreadyProcessed` = `reason === 'duplicate'`.
  - `GamificationEventType` = catálogo del backend; `referenceId` opcional (se envía vacío).
- **Eventos**:
  - `core33_streak_7` con `participation_id` (antes `core33_day_completed` + `…:streak_7`).
  - `quiz_master_unlocked` sin referencia (antes `quiz_completed` + `quiz_master`).
  - **Nuevo** `hydration_logged` con la fecha local al registrar agua (`addHydrationAmount`, best effort: si falla, no deshace el agua guardada).
  - Sin cambios porque ya cumplían: `personal_record_created` (id del récord), `nutrition_activated` (id del plan), `nutrition_logged` (`YYYY-MM-DD`), `core33_day_completed` (`participation_id:YYYY-MM-DD`), `workout_completed`, `custom_workout_created`, `core33_completed`.
- **Quiz**:
  - Los puntos que se muestran en el resultado son los que concede el servidor (`points_added`). Si no concede nada en ese momento (reintento duplicado o fallo), se usan los del intento guardado.
  - La app sigue enviando `_points` solo a título informativo; en modo `strict` el servidor los ignora.
- **Escrituras directas**: comprobado que la app **no** escribe `profiles.points` ni inserta en `user_badges` (solo los lee en `profile-overview.ts` y `ellie.ts`).
- **Onboarding**:
  - `training_level` (Principiante → `beginner`, Intermedio → `intermediate`, Avanzado → `advanced`) y `preferred_session_minutes` (20/35/45/60) se guardan en `updateOnboardingProfile`;
  - "Rendimiento" → `performance`.
- **Objetivo `performance` en el resto de la app**:
  - etiqueta "Rendimiento" en Perfil, Plan nutricional y contexto de ELLIE (`ellie-context.ts`);
  - opción en Editar perfil;
  - Inicio prioriza rutinas `hiit`/`cardio`;
  - Descubrir ejercicios usa `fullbody` (DA-36).
- **Tests**: `gamification.test.ts` (contrato nuevo, referencia vacía, duplicados), `quizSubmission.test.ts` (puntos del servidor), `onboardingModel.test.ts` (nivel, duración, `performance`). `tsc` + eslint + jest (16 suites, 66 tests) en verde.

Decisiones asumidas:
- DA-36: con `performance`, Inicio prioriza `hiit`/`cardio` y Descubrir ejercicios usa `fullbody` (antes, al guardarse como `improve_health`, priorizaba movilidad).
- DA-37: los eventos sin referencia envían `_reference_id: ''`. **Confirmado con los tipos** (`_reference_id?: string`, no admite `null`) y con el alias del backend ("referencia vacía").
- Hidratación (BACKEND_SUMMARY §6, actualización 19:20 UTC): `hydration_logged` se envía en **cada** registro de agua con la fecha del día. Los puntos se dan una vez al día (las siguientes llamadas devuelven `duplicate`), pero el servidor reevalúa los badges de hidratación en cada llamada y los devuelve en `new_badges`. La app ya lo hacía así (`addHydrationAmount`, única vía de escritura de agua); solo se corrigió el comentario.
- `workout_templates.source = 'custom'` (rutinas creadas en la app móvil) se puede compartir (BACKEND_SUMMARY §8.1, actualizado).

### 14.3 Qué usará cada pantalla pendiente (sin implementar todavía)

**Sesión** (fase 7 · Pausa/Descanso, tras validar en el simulador):

| Necesidad | Tabla / RPC del backend |
|---|---|
| Ejercicios planificados al empezar | `workout_session_exercises` (única por `session_id, position`) |
| Cada serie (reps, kg, duración, calentamiento, descanso real) | `workout_session_sets`: `INSERT … ON CONFLICT (session_id, exercise_position, set_index) DO UPDATE` |
| Compatibilidad con lo que ya lee la app | seguir escribiendo `workout_sessions.completed_exercises` |
| Pausa que no cuenta como entreno | `workout_sessions.paused_at`, `paused_total_sec` |
| "Guardar para después" | `workout_sessions.status = 'saved'` |
| Volumen | `workout_sessions.volume_kg` (lo calcula el servidor al completar; vacío si no hay series) |
| "Registrar récord" condicional en el Resumen | RPC `detect_session_prs(_session_id)` → guardar con `INSERT INTO personal_records … ON CONFLICT (user_id, session_set_id) DO NOTHING` (`source = 'session'`) |

**Comunidad** (fase 7, tras validar en el simulador):

| Pantalla | Tablas / RPC |
|---|---|
| Alta en Comunidad / nombre de usuario | `ensure_social_settings`, `set_username` |
| Feed (SOCIAL_01) | `get_feed`, `get_friend_activity`; me gusta directo en `social_post_likes` |
| Crear publicación / Compartir entreno (SOCIAL_02, 13) | `create_post`; fotos en `social-photos` (`{uid}/{post_id}/…`, `post_id` generado en la app, sin EXIF, JPG/PNG/WebP) |
| Publicación y comentarios (SOCIAL_03) | `social_post_comments` (insert directo), `delete_comment`; editar o borrar mi post con `UPDATE` de `body`/`deleted_at` |
| Rutina compartida (SOCIAL_04) | `save_shared_routine` |
| Amigos y solicitudes (SOCIAL_05) | `find_user_by_username`, `send_friend_request`, `respond_friend_request`, `cancel_friend_request`, `create_friend_invite`, `redeem_friend_invite`, `get_social_profiles` |
| Perfil de amigo (SOCIAL_06) | `get_social_profile`, `block_user`, `content_reports` |
| Retos (SOCIAL_07 a 12) | `get_my_challenges`, `get_challenge_board`, `join_official_challenge`, `respond_challenge_invite`, `create_friend_challenge`, `add_manual_contribution`, `leave_challenge`, `cancel_friend_challenge`, `mark_challenge_celebrated` |
| Privacidad (SOCIAL_14) | `social_settings` |
| Notificaciones | `social_notifications` (`UPDATE` de `read_at`) |
| Fotos de perfil de otros | URL firmada de `profile-photos`; si falla, `avatar_key` o avatar por defecto |

La moderación (`is_moderator`, `set_moderator`, `moderate_content`, `moderation_queue`) es del panel interno, no de la app.

### 14.4 Pendientes y responsables

**Backend** (cerrado salvo esto):

| Pendiente | Responsable | Cuándo |
|---|---|---|
| Activar el modo `strict` de gamificación | Backend, con aviso de Nicolás | Tras revisar la auditoría de `gamification_events.metadata.validation` (`strict_would`) y ajustar el catálogo si hace falta. La app móvil ya usa los nombres nuevos |
| Cerrar el `UPDATE` directo de `profiles.points` y el `INSERT` directo en `user_badges` | Backend, con aviso de Nicolás | Cuando la web deje de escribir puntos directamente (`GamificationContext` de la web). La app móvil ya solo usa la RPC |
| Tipos de archivo (JPG/PNG/WebP) en `social-photos` y `profile-photos`, y 5 MB en `profile-photos`, desde Cloud → Storage | Nicolás (manual) | Cuanto antes; mientras tanto la app valida el tipo |
| Verificar la limpieza diaria de fotos (`social-photos-cleanup`, 03:17 UTC) | Nicolás / backend | Tras las primeras publicaciones con foto: comprobar que borra las de posts eliminados (≤ 1 día) y conserva 30 días las retiradas por moderación |

**Producto y app:**

| Pendiente | Responsable | Cuándo |
|---|---|---|
| Decidir si `exercise_reps` cuenta en retos entre amigos | Producto (Nicolás) | Sin fecha |
| Confirmar si `ellie-chat` usa el género para calorías (BK-06) | Backend | Sin fecha |
| Comprobar en el simulador: quiz (puntos del servidor y badge), activar plan nutricional (B1), registrar agua (badge al cumplir la meta), racha Core 33 | App (validación visual) | Con Xcode |

---

## 15. Fase 3 · Inicio y Notificaciones (2026-10-01, sin Xcode)

Fuente: `Home.dc.html` / `HomeDark.dc.html` (estados en su script) y capturas HOME_01 a HOME_09. Verificación: `tsc` + eslint de los archivos tocados + `jest`. Todo con datos reales de Supabase, a través de los servicios existentes.

### 15.1 Grupo 1 · Inicio (HOME_01 a HOME_07)

**Qué cambió**
- **`HomeScreen` reescrita en v2**:
  - hero fotográfico de 500 pt (escena) con los 6 modos;
  - una superficie que sube 32 pt sobre el hero (radio 32), con: Tu día (anillos), banda de ELLIE, Tu mejor marca, Para entrenar esta semana, banner del Quiz y banner de ATHELETE Wear.
  - Componentes en `src/features/home/v2/`: `HomeHero`, `DayRingsCard`, `BestMarkCard`, `WeekCarousel`, `QuizBanner`, `WearBannerV2`, `BlockError`, `homePhotos`, `homeLabels`.
- **`features/home/homePriority.ts` reescrito** (lógica pura, 17 tests):
  - `resolveHomeMode` con el orden del prototipo: usuario nuevo → todo completado → entreno hecho → sesión guardada → prioridad (Core 33 o entreno);
  - el modo `nutrition` de v1 desaparece: la nutrición vive en su anillo;
  - helpers: `buildDayRings`, `allDoneLine`, `prCurve`, `bestMarkParts`, `quizMastery`, `homeDateLine`, `toGlasses`.
- **Cómo se calcula el modo** (datos reales, `fetchHomeOverview` ampliado):
  - **Usuario nuevo**: ninguna sesión completada nunca (`count` de `workout_sessions` con `completed = true`).
  - **Entreno hecho hoy**: alguna sesión completada con fecha local de hoy. Antes solo se leía la última sesión del día, que podía no ser la completada.
  - **Core 33 cerrado hoy**: los `habit_logs` del día de la participación activa (`completedToday >= totalHabits`). Se expone también `todayHabits` para los segmentos.
  - **Retomar**: la sesión `saved` más reciente; si no hay, la reanudable de hoy (`in_progress`, o `canceled` con progreso). Ver DA-38.
  - **Prioridad**: regla actual de v1. Core 33 si hay reto activo sin cerrar; si no, entreno.
- **Contenido por modo**:
  - `core33`: "Core 33 · Día N" ("Último día" en el día 33), N / 33, 3 segmentos con los nombres reales de los hábitos y "Cerrar el día" → Core 33.
  - `workout`: rutina recomendada n.º 1 con minutos, ejercicios y kcal → Detalle de rutina.
  - `resume`: "Sesión guardada · {título}", hechos / total y "Retomar · {min}" → Sesión.
  - `workoutDone`: "{min} min de {tipo}" y "Siguiente: cerrar Core 33".
  - `new`: la rutina principiante más corta.
  - `allDone`: 3 checks y la línea de lo cerrado → Progreso.
- **Fotos del hero por modo**: paquete con el tratamiento horneado (`saturate .45 · contrast 1.08 · brightness .78`), PLACEHOLDER, en `src/assets/v2/photos/home/` (`hero-core`, `hero-entreno`, `total`, `esfuerzo`, `movilidad`, `overhead`). Wear: `mancuerna-bn` en grises (`contrast 1.12 · brightness .78`). Ancho máximo 900 px, 532 KB en total.
- **Avatar del hero → Perfil (TEMP-01 resuelto). Campana** con punto Ember si hay avisos pendientes (`useNotificationsOverview().unreadCount`).
- **Tu día**:
  - anillos 156 (radios 64 / 49 / 34, pista `surface.track`: D-01 en Dark);
  - anillo 1 = Core 33 (hábitos) en los modos entreno / retomar / entreno hecho si hay reto activo; si no, Entreno ("{min} de {meta} min");
  - anillo 2 = Nutrición (kcal registradas / objetivo del plan; "sin plan" a 0);
  - anillo 3 = Hidratación en vasos con "+1".
  - "+1" llama a `addHydrationAmount(250)`: guarda de verdad y envía `hydration_logged`. Refresca Inicio y el overview de ELLIE (notificaciones).
- **ELLIE**: frase de `useEllieData().heroInsight` (lógica existente `generateSmartInsights`) → tab ELLIE.
- **Tu mejor marca**:
  - el ejercicio del último récord, su mejor marca (`getBestPR`), NUEVO si es de hoy y la mini curva de su historial (D-12 en Dark);
  - "Récords" → Récords; "Registrar" → pantalla Registrar PR (con selector de ejercicio);
  - vacío: "Registra tu primera marca…".
- **Para entrenar esta semana**: las 8 rutinas recomendadas actuales (score por objetivo), en tarjetas 210 × 280 → Detalle; "Todo" → Entrenos.
- **Quiz**: puntos reales (`profiles.points` vía overview de ELLIE) + progreso hacia Quiz Master (DA-40) → Quiz.
- **Wear**: destino actual (`WearPreviewModal`).
- **Estados por bloque**:
  - skeleton v2 mientras carga;
  - error en línea con "Reintentar" (solo ese bloque);
  - si falla el overview, el hero muestra "No pudimos cargar tu día" con reintento y el resto sigue.
- **Refresco al volver a Inicio** (`useFocusEffect`, sin el primer montaje): overview de Inicio, de ELLIE, récords, quiz y biblioteca.
- **Dev "Ver modos de Inicio"** (`src/dev/homeModeOverride.ts` + menú en `DevCatalogHost`, que solo se monta con `__DEV__`):
  - cicla auto → nuevo → todo → hecho → retomar → Core 33 → entreno, con un toast;
  - es solo visual: no escribe datos, y `useHomeModeOverride()` devuelve `null` fuera de `__DEV__`;
  - los modos sin datos muestran textos neutros.
- **Otros cambios**: `WorkoutSession.status` admite `saved`; `ProfileRecord` expone `trainingLevel` y `preferredSessionMinutes`.

**Desviaciones**
- D-01 (pista de anillos en Dark), D-12 (mini curva en Dark) y D-16 (banner del Quiz en Dark con borde interior) vía tokens.
- CTAs del hero con la altura de `Button` v2 (56 / 48) en lugar de 52 / 48.
- El "?" gigante del Quiz usa `surface.muted` (Light `#EFEEEA` frente a `#F4F2EE`; Dark `#2A2826` frente a `#24221F`).
- Las fotos remotas de las rutinas no tienen el filtro horneado: llevan una capa oscura al 18 % + degradado.

**Decisiones asumidas**

| ID | Decisión |
|---|---|
| DA-38 | **Retomar** = la sesión `saved` más reciente; si no hay, la reanudable de hoy (`in_progress`, o `canceled` con progreso, que es como la app "guarda para después" hoy). Cuando Sesión escriba `saved`, se retira el caso `canceled`. Pendiente: abrir una sesión `saved` de otro día requiere el flujo de Sesión v2 (`fetchEffectiveWorkoutSession` solo mira hoy) |
| DA-39 | **Meta de agua en vasos de 250 ml**: `profiles.daily_water_goal` se interpreta en vasos (convención de toda la app: Inicio, ELLIE, Progreso, Nutrición; por defecto 14). Vasos = `water_ml / 250` redondeado |
| DA-40 | **"Nivel" del Quiz**: no existe un sistema de niveles. Se muestra el progreso hacia el badge Quiz Master (categorías con mejor puntuación 100 / categorías activas); "Quiz Master desbloqueado" al completarlo |
| DA-41 | La CTA de la banda de ELLIE abre el tab ELLIE ("Hablar con ELLIE"); el tab no admite un prompt inicial |
| DA-42 | Hero `workout` = rutina recomendada n.º 1; hero `new` = la rutina principiante más corta (si no hay principiantes, la más corta) |
| DA-43 | `allDone` también se da sin reto activo (entreno hecho = día cerrado); la línea solo nombra lo cerrado ("Entreno y agua cerrados.") |
| DA-44 | Meta del anillo Entreno = `preferred_session_minutes` del perfil; si no hay, la duración de la rutina del hero; si no, 30 |
| DA-45 | La nutrición del anillo abre el registro del día (`NutritionLogModal`, todavía v1) si hay plan; si no, Plan nutricional. Hidratación → Plan nutricional |

**Omitido (anotado)**
- "Reto de la semana": depende de Comunidad en la app.
- La línea de Apple Health (HOME_07): sin HealthKit.
- La mini animación de la cifra al sumar un vaso.

**Componentes que dejan de usarse (no se han borrado)**
- `features/home/components/`: `ChallengeBannerCard`, `DailyStatusGrid`, `HomeHeader`, `HomePriorityCard`, `HomeSectionHeader`, `HydrationOverviewCard`, `NutritionOverviewCard`, `QuizPromoCard`, `RecentPRCard`, `RecoveryGuidanceCard`, `TodayWorkoutCard`, `WearBanner` (v1) y `WorkoutCarousel`.
- `features/notifications/components/NotificationBadgeButton` (solo lo usaba `HomeHeader`).
- Assets `homeCore33Editorial` y `homeTrainingEditorial`.
- Siguen en uso: `WearPreviewModal` y `bodyScienceThumbNutrition` (Body Science).

**Pendiente de validación visual · Inicio** (Light y Dark en cada modo; forzarlo con el menú dev "Ver modos de Inicio" o con datos reales)

| Modo | Cómo conseguirlo con datos reales | Qué comprobar |
|---|---|---|
| Usuario nuevo (HOME_05) | Cuenta sin ninguna sesión completada | Hero "Tu primera sesión" con la rutina más corta; anillos a 0 + frase; sin "+1" |
| Entreno pendiente (HOME_01) | Sin entreno hoy y sin Core 33 activo, o con Core 33 ya cerrado hoy | Rutina n.º 1, trío min / ejercicios / kcal, Empezar → Detalle |
| Core 33 prioridad (HOME_02) | Core 33 activo con hábitos pendientes hoy | Día N / 33, segmentos con nombres, "Cerrar el día" → Core 33; "Último día" en el día 33 |
| Sesión guardada (HOME_04) | Empezar un entreno, marcar algún ejercicio y salir sin terminar | Hechos / total, segmentos, "Retomar · min" → Sesión |
| Entreno hecho (HOME_03) | Completar un entreno con Core 33 activo sin cerrar | Check, "{min} min de {tipo}", "Siguiente: cerrar Core 33" |
| Todo completado (HOME_06) | Entreno completado + Core 33 cerrado (o sin reto) | 3 checks, línea de lo cerrado, "Ver tu semana" → Progreso |

Además:
- **Avatar → Perfil; campana → Notificaciones** (punto si hay pendientes).
- **Tu día:** porcentaje; "+1" suma un vaso de verdad (y el badge de hidratación al cumplir la meta); anillo de nutrición con y sin plan.
- **Bloques:**
  - ELLIE con la frase real;
  - Tu mejor marca con y sin récords (NUEVO si es de hoy);
  - carrusel con *snap*;
  - Quiz con puntos y la barra de Quiz Master;
  - Wear abre la vista previa.
- **Estados:** skeletons en la primera carga; error de cada bloque (modo avión) y reintento; volver a Inicio desde otra pestaña refresca los datos.
- **Barra de estado:** clara sobre el hero.
- **Android:** sombra de las tarjetas (`boxShadow`); halo radial del hero (SVG).


### 15.2 Grupo 2 · Notificaciones (HOME_08 y HOME_09)

**Qué cambió**
- **`NotificationsScreen` reescrita en v2**: `GlassHeader` con `BackButton` y "Notificaciones", `StatusBarV2`. Bloques:
  - **Para hoy · N**: los avisos pendientes reales de `useNotificationsOverview` (nudges de ELLIE: entreno, Core 33, agua, nutrición).
    - El primero va **destacado**: foto 168 pt, degradado lateral, etiqueta HOY / ÚLTIMO DÍA (Core 33 en el día 33) / EN CURSO (azul, hidratación) y flecha.
    - El resto en filas con miniatura de 48.
    - Fotos por destino: Core 33 → `hero-core`, entreno → `total`, agua → `movilidad`, nutrición → `hero-entreno`, resto → `overhead`.
    - Los destinos siguen igual que antes, incluido "registrar nutrición" con `openLog`.
  - **Todo al día** (HOME_09): check Ember 56 + "Te avisaremos cuando haya algo para hoy." cuando no hay pendientes.
  - **Banda de ELLIE**: `heroInsight` (lógica existente) → tab ELLIE.
  - **Hitos**: carrusel de tarjetas 150.
    - Badges de `user_badges` (título e icono de `ALL_BADGES`, fecha `earned_at`) + los 3 récords más recientes, ordenados por fecha, como mucho 6.
    - "Fresh" si son de hoy: placa oscura en ambos modos y texto blanco (D-03); las demás con `shadow.subtle` (borde interior en Dark, D-15).
    - Badge → Logros; récord → Récords.
  - **Actividad reciente** (línea de tiempo): sesiones completadas de los últimos 7 días (overview de ELLIE), agua de hoy en vasos y kcal registradas hoy. Como mucho 5, hoy primero.
  - **"Activa tu plan nutricional"** al final, si no hay plan → tab ELLIE (como antes).
- **Estados:** skeleton en la primera carga; error con "Reintentar" (sin romper la banda de ELLIE); refresco al volver (`useFocusEffect`).
- **Lógica pura** en `features/notifications/notificationsModel.ts` (`buildTodayItems`, `buildMilestones`, `buildActivity`, `relativeDay`, `photoForDestination`) + `__tests__/notificationsModel.test.ts` (4 tests).

**Desviaciones / decisiones**
- DA-46: el hexágono del hito se aproxima con un rectángulo redondeado de 44 × 48 y un aro Ember (sin `clip-path`). `HexMedal` v2 empieza en 58 pt.
- DA-47: el número de "Para hoy" cuenta solo los avisos pendientes; "Activa tu plan nutricional" va aparte, abajo, como "Configuración pendiente".
- Las miniaturas usan las fotos horneadas del hero (filtro .45 / 1.08 / .78 en lugar de .4 / 1.08 / .7).

**Omitido (anotado)**
- La hora del mensaje de ELLIE ("hace 1 h"): ese dato no existe.
- La actividad de Quiz: los intentos no se exponen con fecha en la app.
- Todo lo social (solicitudes, me gusta, retos): depende de Comunidad.

**Componentes que dejan de usarse (no se han borrado)**
- `features/notifications/components/`: `NotificationItemRow`, `NotificationsEmptyState`, `NotificationIcon` (solo lo usaba `NotificationItemRow`) y `NotificationBadgeButton` (solo `HomeHeader`).

**Pendiente de validación visual · Notificaciones** (Light y Dark)
- **Con pendientes (HOME_08):** destacada con foto y etiqueta correcta (HOY, ÚLTIMO DÍA en el día 33 de Core 33, EN CURSO azul en agua); filas con miniatura; cada toque lleva a su destino.
- **Sin pendientes (HOME_09):** "Todo al día" (día completo: entreno, Core 33, agua y nutrición registrados).
- **Hitos:** con badge de hoy (placa oscura) y antiguos; carrusel horizontal.
- **Actividad:** con entrenos de la semana, agua y kcal de hoy; sin datos no aparece.
- **Plan:** la fila "Activa tu plan nutricional" aparece solo sin plan.
- **Navegación:** back y back de Android vuelven a Inicio; skeleton y error (modo avión).

### 15.3 Comandos git (fase 3 · Inicio y Notificaciones)

Incluyen los dos commits pendientes de la tarea anterior (tipos y onboarding), en un orden en el que cada commit compila.

```bash
# 1 · Tipos de Supabase (BK-02), pendiente de la tarea anterior
git add src/types/supabase.ts
git commit -m "chore(types): replace Supabase types with the full generated schema" -m "Resolves BK-02." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 2 · Onboarding: nivel, duración y objetivo performance (pendiente de la tarea anterior; incluye exponer nivel y duración en ProfileRecord)
git add src/types/auth.ts src/features/onboarding/onboardingModel.ts src/services/supabase/profile.ts src/screens/tabs/ProfileScreen.tsx src/screens/nutrition/NutritionPlanScreen.tsx src/screens/profile/EditProfileScreen.tsx src/shared/domain/ellie-context.ts src/hooks/useExerciseDiscovery.ts __tests__/onboardingModel.test.ts
git commit -m "feat(onboarding): save training level, session length and the performance goal" -m "Resolves BK-03, BK-04 and BK-05; adds Rendimiento to ELLIE, Perfil, Editar perfil and Nutrición and exposes both fields on ProfileRecord." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 3 · Inicio v2
git add src/shared/domain/types.ts src/services/supabase/fitness.ts src/hooks/useHomeFeed.ts src/features/home/homePriority.ts src/features/home/v2 src/assets/v2/photos/home src/dev/homeModeOverride.ts src/dev/DevCatalogHost.tsx src/screens/tabs/HomeScreen.tsx __tests__/homePriority.test.ts
git commit -m "feat(home): v2 Inicio with real-data hero modes, day rings and blocks" -m "Six hero modes from Supabase data (new user, all done, workout done, saved session, Core 33 or workout), Tu día rings with a working +1 glass, ELLIE, best mark, weekly routines, Quiz and Wear. Per-block skeleton, empty and error states, refresh on focus and a dev-only mode override. Resolves TEMP-01." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 4 · Notificaciones v2
git add src/features/notifications/notificationsModel.ts src/screens/home/NotificationsScreen.tsx __tests__/notificationsModel.test.ts
git commit -m "feat(notifications): v2 notifications with today, milestones and activity" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 5 · Documento
git add docs/migration/MIGRATION_PROGRESS.md
git commit -m "docs: phase 3 Inicio and Notificaciones" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 16. Validación en simulador · correcciones (2026-10-02)

Build en Xcode 27 / iOS 27.0 (iPhone 17).

- **Build iOS**
  - `Podfile` `post_install`: el deployment target de los pods con menos de iOS 15 se sube al mínimo de la app (Xcode 27 los rechaza).
  - `AppDelegate.swift` + `Info.plist`: ciclo de vida UIScene (`SceneDelegate`), obligatorio con el SDK de iOS 27. Los enlaces `athelete://` llegan por la escena; en arranque en frío se pasan como launch option.
- **Números display recortados** (onboarding días, hero de Inicio, Quiz)
  - Con `lineHeight` menor que ~1,2× el tamaño de letra, iOS recorta el glifo: un 5 se leía como un 3.
  - `theme.v2.typography` aplica `tightLine()`: interlineado seguro + `marginVertical` negativo, de modo que la caja sigue siendo la del prototipo. Se aplica a los tokens `display*` y `title*`, y a los tamaños sobrescritos en `DaysStep`, `HomeHero` y `QuizBanner`.
- **Bienvenida de ELLIE desplazada**
  - En Fabric, un `LinearGradient` con padding usado como contenedor se desplaza a sí mismo y a sus hijos por el padding.
  - `EllieWelcome` y `EllieSurface` (banda de ELLIE en Inicio y Notificaciones) pasan a usar un `View` con padding y el gradiente como fondo absoluto. La Bienvenida va de borde a borde y el contenido respeta el área segura.
- **"No pudimos guardar tu perfil"**
  - Supabase devolvía `23514 profiles_training_level_check`: el backend acepta `principiante | intermedio | avanzado` (comprobado contra la base de datos), no los valores en inglés que indica `BACKEND_SUMMARY.md` §1. Se corrigió el mapeo.
  - `goal = performance`, `preferred_session_minutes` (20/35/45/60), `available_equipment` y los nulos de `gender` / `avatar_key` / `profile_photo_url` se aceptan.
  - Log del error completo (`code`, `message`, `details`, `hint`) en `__DEV__`. **Backend:** corregir `BACKEND_SUMMARY.md` §1 (valores de `training_level`).
- **"5 días/sem" en la Bienvenida:** el resumen usa `answers.days`, el mismo valor del paso. El "3" que se veía en el paso era un 5 con la parte de arriba recortada (ver el punto de los números display).
- **Herramientas dev nuevas**
  - `athelete://dev/onboarding?step=0…7` y `athelete://dev/welcome[?status=error]`.
  - En iOS, también como argumento de arranque, sin el diálogo "Open in…": `xcrun simctl launch booted <bundle> -devTool "athelete://dev/welcome?status=error"`.

---

## 17. Inicio · card de descubrimiento de Core 33 (HOME_10 y HOME_11, 2026-10-02)

**Qué cambió**
- **`Core33InviteCard`** bajo "Tu día", en dos variantes:
  - **HOME_10 · invitación**: "33 días. Una intención.", 33 cápsulas con el Día 1 en Ember (respirando) y "Descubrir Core 33".
  - **HOME_11 · empezar otro**: "Core 33 · N completado(s)", "Elige tu siguiente intención.", los días 1–32 en Ember suave, el 33 en Ember sólido y "Empieza otro Core 33".
  - Oscura en ambos modos: Light `#141312` con sombra; Dark `#1B1917` con borde interior (HomeDark). Halo Ember radial arriba a la derecha.
- **Nueva primitiva `DayCapsules`** (`src/components/v2`): retícula de días `empty | soft | full`, 11 por fila, 14 pt, radio 5, hueco 4, día opcional "respirando" y extremos "Día 1 · Día N". La reutilizará Core 33.
- **Visibilidad**, con datos reales: lógica pura en `features/core33/core33Invite.ts` (4 tests) y datos en `fetchHomeOverview.core33History` (participaciones `completed`).
  - No aparece si hay un reto activo: vive en el hero.
  - El estado "elegido pero no iniciado" no existe aún en la app (una participación es activa desde que empieza); cuando exista, entra en `hasCurrentChallenge`.
  - Variante = "empezar otro" si hay al menos un Core 33 completado; si no, "invitación".
  - "Empezar otro" aparece desde el día siguiente al día 33. El día 33 se calcula como `start_date + 32`, porque las participaciones no guardan fecha de completado; si alguien completara tarde, la card podría salir el mismo día del completado.
- **"Ahora no"** (`useCore33InviteDismissals`):
  - oculta la card sin confirmación;
  - vuelve a los 14 días;
  - tras el segundo descarte ya no aparece en Inicio;
  - el contador se reinicia al completar otro Core 33.
  - Se persiste en AsyncStorage por usuario (`@athelete/core33-invite-v1:<userId>`).
- **Menú dev "Ver modos de Inicio"**: entradas nuevas "Usuario nuevo + Core 33 invitación" y "Entreno pendiente + empezar otro Core 33". El override fuerza la card e ignora los descartes.
  - En iOS se puede arrancar directamente en un override: `-homeOverride <índice>` (1 = invitación, 7 = empezar otro).
  - Vista previa de la card en Light y Dark: `athelete://dev/core33-card[?mode=dark]`, o `-devTool` con esa URL.
- **Hero**: la línea de fecha se arma uniendo partes, así que sin racha no hay separador. También tolera valores no numéricos.

**Pendiente**
- **CTA sin destino (TODO):** un único punto de conexión, `useOpenCore33Discovery()` en `features/core33/useOpenCore33.ts`. Hoy no navega. Cuando existan la Intro (3 momentos) y "Explorar retos", se conecta con la entrada inteligente (`resolveCore33Entry`): nunca vio la Intro → Intro → Explorar; vio la Intro o completó uno → Explorar.
- **Backend (recomendado):** mover los descartes de la card al perfil (fecha del último descarte, número de descartes y completados al descartar) para que valgan entre dispositivos; hoy son locales.
- **Backend (opcional):** un `completed_at` en `challenge_participations` permitiría calcular "desde el día siguiente al completado" con exactitud.

**Validar en el simulador** (Light y Dark)
- Cuenta sin Core 33: la card aparece bajo "Tu día"; "Ahora no" la oculta; no aparece con un reto activo.
- Tras completar un Core 33: la variante "empezar otro" sale al día siguiente del día 33.
- La CTA no hace nada (esperado).

**Dev (2026-10-02):** el menú de desarrollo incluye "Restablecer card de Core 33", que borra los descartes guardados del usuario actual. La card vuelve a aparecer en Inicio sin reiniciar la app. Los pendientes de backend de esta card están en `BACKEND_TODO.md` (BT-02, BT-03).


## 18. Entrenos · módulo completo (WORKOUTS_01–07, EXERCISE_01–02, 2026-10-03)

> **Leer en 2 minutos.** Todo con datos reales de Supabase y primitivas v2. Verificado con capturas Light y Dark contra `references/`. Estado del código: `tsc` sin errores, eslint sin errores (solo los warnings habituales de estilos dinámicos) y `jest` 95/95.

### 18.1 Qué quedó hecho, por pantalla
| Pantalla | Ref. | Estado |
|---|---|---|
| Entrenos · Rutinas | WORKOUTS_01 | ✅ Hero "Tu próxima sesión", chips por tipo con conteos reales, lista de rutinas y favoritos (corazón) |
| Rutinas · solo favoritos | WORKOUTS_02 / STATE_06 | ✅ Vacío con "Ver todas" |
| Entrenos · Ejercicios | WORKOUTS_03 | ✅ Buscador, mosaico de zonas, equipamiento en burbujas, conteos reales |
| Lista filtrada | WORKOUTS_04 | ✅ Nueva ruta `ExerciseList` (zona, equipamiento, búsqueda, A–Z, favoritos) |
| Filtros | WORKOUTS_05 | ✅ Hoja con zona, equipamiento y nivel; CTA "Ver N ejercicios" |
| Detalle de rutina | WORKOUTS_06 | ✅ Hero 470 con cifras, Routine Path, "Trabaja" / "Necesitas", CTA fija (Empezar / Continuar / Retomar · X de Y / Ver sesión), menú "…" del propietario |
| Nueva rutina (3 pasos) | WORKOUTS_07 | ✅ Identidad → Elegir ejercicios (bandeja ordenable) → Revisar; ajuste por ejercicio en hoja; misma pantalla para Editar |
| Exercise Detail · MoveKit | EXERCISE_01 | ✅ Light a sangre / Dark caja de luz; prescripción, "tu mejor" → Récords, músculos Ember / Recovery Blue, técnica esencial + completa + errores comunes expandibles, CTA fija "Agregar a rutina" |
| Pantalla completa | EXERCISE_02 | ✅ Parámetro `fullscreen` y botón en el reproductor; píldora de controles |
| Estados | — | ✅ Skeleton, error con "Reintentar" (`BlockError`) y vacío en cada pantalla que carga datos |

**MoveKit:** el video es un PLACEHOLDER (`MOVEKIT_POSTER`). Los controles (1× / 0,5×, pantalla completa, play/pausa y segmentos de fase) están visibles; play/pausa está inactivo. Único punto de integración: `src/features/workouts/movekit/MoveKitPlayer.tsx` (`TODO(movekit)`). No se instaló ninguna librería de video.

**Herramientas dev** (solo `__DEV__`): menú "Ver pantallas de Entrenos" (cicla las 11 pantallas), deep link `athelete://dev/workouts?screen=routines|favorites|exercises|list|filters|detail|create1|create2|create3|exercise|fullscreen` y argumentos de lanzamiento iOS `-devTool <url>` / `-themeMode light|dark`. `CreateRoutine` acepta `devStep` (precarga sin guardar).

### 18.2 Decisiones asumidas
| ID | Decisión |
|---|---|
| DA-48 | Se carga la biblioteca completa (rutinas y ejercicios) y se filtra en el dispositivo; sin paginación. Los conteos son reales |
| DA-49 | Orden "A–Z" en lugar de "Relevancia" (no hay señal de relevancia) |
| DA-50 | Favoritos de rutinas y ejercicios en AsyncStorage (hooks existentes) → BT-12 |
| DA-51 | `workout_templates.type` es texto libre (p. ej. `full_body`): se normaliza con `normalizeWorkoutType` / `typeLabel` |
| DA-52 | "Tu próxima sesión" = rutina recomendada n.º 1 (`recommendRoutines`, mismo score que Inicio) |
| DA-53 | Miniaturas anatómicas por zona (`bodyPart`) como PLACEHOLDER, recortadas de `anatomia.jpg` (handoff §16); sin la nota "Miniaturas temporales… 3D" |
| DA-54 | Scan visible sin acción (`TODO`) |
| DA-55 | Detalle de rutina: se conservan "Trabaja" y "Necesitas" (sin pestañas); `ChevronRight` en lugar de rotate-3d (3D descartado); menú "…" del propietario con un Alert (Editar / Eliminar) |
| DA-56 | CTA "Retomar · X de Y" para sesiones `saved` o `canceled` con progreso (criterio de DA-38) |
| DA-57 | Asistente: kcal con `estimateCalories` de la app (no `min × 7` del prototipo); enfoque y tags se infieren (sin campos); al guardar se reemplaza por el detalle (no hay pantalla "Rutina guardada") |
| DA-58 | Prescripción del detalle de ejercicio = `recommendations.hypertrophy` ("3 × 10"); se oculta si la biblioteca trae "-". "Tu mejor" = mejor récord del ejercicio (peso; si no, reps, tiempo o distancia) |
| DA-59 | Técnica esencial = `coachingCues` (máx. 3); técnica completa = `howToPerform`. Sin cues, los 3 primeros pasos son la esencial y el resto, la completa |

### 18.3 Desviaciones nuevas
- **D-39** · Paso 2 del asistente en Dark: footer oscuro coherente (el prototipo lo deja claro, error del prototipo).
- **D-40** · Filtro del paso 2 por **zona** en lugar de equipamiento (consistente con la lista de ejercicios).
- **D-41** · Orden de la bandeja con flechas ↑ ↓ en lugar del asa de arrastre (sin librería de gestos nueva).
- **D-42** · Ajuste de series / reps / tiempo / descanso en una hoja (`ExerciseAdjustSheet`) en lugar de controles en línea.
- **D-43** · MoveKit sin tempo ("Tempo 2-1-1"), sin la etiqueta de fase de la pantalla completa ("03 Pausa · 1 s abajo") y sin el paso de técnica que se ilumina con el loop: no hay datos de fases (BT-14). Los segmentos muestran un fotograma fijo (fase 2 de 4).
- **D-44** · Técnica completa sin título por paso y errores comunes sin consecuencia: la biblioteca guarda solo texto (BT-14).
- **D-45** · CTA deshabilitada del paso 1 en Light algo más clara que la referencia (estilo de D-36).

### 18.4 Bloqueos y pendientes
- **Backend** (en `BACKEND_TODO.md`): BT-12 favoritos, BT-13 videos MoveKit, BT-14 técnica estructurada (tempo, fases, títulos, consecuencias, recomendaciones "-"), BT-15 `type` libre, BT-16 conteos y paginación.
- **Diseño / assets:** las 7 miniaturas anatómicas definitivas por zona (hoy recortes PLACEHOLDER), póster MoveKit real y foto de Scan.
- **Producto:** Scan (definir el flujo y el reconocimiento); "Relevancia" como orden.
- **App:** "Agregar a rutina" (`AddExerciseToRoutine`) sigue en v1; play/pausa de MoveKit al integrar el video.

### 18.5 Checklist de validación (Light y Dark)
- [ ] Entrenos · Rutinas: chips con conteos, corazón (persiste al reabrir), hero → detalle, "+" → asistente.
- [ ] Solo favoritos sin favoritas → vacío y "Ver todas".
- [ ] Ejercicios: buscar, zona, equipamiento y "Ver todos" abren la lista con el filtro correcto; filtros → "Ver N ejercicios".
- [ ] Detalle de rutina: Empezar (crea sesión) / Continuar / Retomar; compartir; "…" solo en rutinas propias (Editar / Eliminar); toque en un ejercicio → detalle.
- [ ] Asistente: nombre obligatorio, tipo, nivel y duración; elegir y ordenar ejercicios; ajustar; Guardar → detalle de la nueva rutina. Editar una rutina propia carga sus datos y "Guardar cambios".
- [ ] Exercise Detail: favorito, "tu mejor" → Récords, expandir técnica y errores, pantalla completa (abrir y cerrar), "Agregar a rutina".
- [ ] Sin red: cada pantalla muestra el error y "Reintentar" recupera.
- [ ] Atajo: menú dev "Ver pantallas de Entrenos" o `xcrun simctl launch booted <bundle> -devTool "athelete://dev/workouts?screen=<key>" -themeMode dark`.

### 18.6 Componentes viejos sin uso (no borrados; comprobado con grep)
- `src/features/workouts/components/`: CreateRoutineCard, ExerciseBodyPartRail, ExerciseDiscoveryHub, ExerciseFilterGroup, ExerciseFiltersModal, ExerciseLibraryHeader, ExerciseLibraryPanel, ExerciseListItem, ExerciseMediaHero, ExerciseRecommendationCard, FeaturedWorkoutCard, RoutineBuilderHeader, RoutineDiscoveryCard, RoutineDiscoveryPanel, RoutineDiscoverySection, RoutineExerciseLibraryPicker, RoutineExerciseRow, RoutineHeroCard, RoutineMetadataForm, WorkoutListItem, WorkoutQuickFilterChips, WorkoutSearchBar, WorkoutsHeader y WorkoutThumbnail (solo la usan componentes sin uso y `home/components/WorkoutCarousel`, también sin uso).
- Hooks: `usePaginatedWorkoutLibrary`, `usePaginatedExerciseLibrary`, `useWorkoutDiscovery`.
- **Siguen en uso:** `WorkoutSegmentedControl` (Progreso, ELLIE) y `WorkoutSessionExerciseRow` (Sesión).

### 18.7 Commits (en este orden; cada uno compila: verificado con `tsc` sobre una copia de HEAD)
Incluyen también lo pendiente de las tareas anteriores (card de Core 33, BACKEND_TODO, herramientas dev). `HomeScreen` depende del modelo de Entrenos (`recommendRoutines`) y `DevCatalogHost` mezcla las herramientas de Core 33 y Entrenos, por eso la card de Core 33 va después de Entrenos.

```bash
# 1 · Modelo de Entrenos y primitivas v2
git add src/components/v2/DayCapsules.tsx src/components/v2/EquipmentBubble.tsx src/components/v2/ExerciseRow.tsx src/components/v2/FilterChip.tsx src/components/v2/RoutinePath.tsx src/components/v2/RoutineRow.tsx src/components/v2/SearchField.tsx src/components/v2/WorkoutHero.tsx src/components/v2/ZoneMosaic.tsx src/components/v2/IconButton.tsx src/components/v2/index.ts src/features/workouts/workoutsModel.ts src/features/workouts/workoutAssets.ts src/assets/v2/workouts __tests__/workoutsModel.test.ts src/features/home/v2/homeLabels.ts
git commit -m "feat(ui): v2 primitives and model for Entrenos" -m "SearchField, FilterChip, ExerciseRow, RoutineRow, RoutinePath, ZoneMosaic, EquipmentBubble, WorkoutHero, DayCapsules; IconButton studio variant. Pure workouts model (filters, counts, type normalization, recommendations) with tests and placeholder assets." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 2 · Pantallas de Entrenos
git add src/types/navigation.ts src/constants/routes.ts src/navigation/RootNavigator.tsx src/screens/tabs/WorkoutsScreen.tsx src/screens/workouts/ExerciseListScreen.tsx src/screens/workouts/WorkoutDetailScreen.tsx src/screens/workouts/CreateRoutineScreen.tsx src/screens/workouts/ExerciseDetailScreen.tsx src/features/workouts/v2 src/features/workouts/movekit
git commit -m "feat(workouts): v2 Entrenos, routine detail, 3-step builder and MoveKit exercise detail" -m "Rutinas / Ejercicios with real counts, filtered exercise list and filters sheet, routine detail with Routine Path, 3-step routine builder, exercise detail with a single MoveKit placeholder integration point and fullscreen param. Error states with retry." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 3 · Card de Core 33 en Inicio + herramientas dev
git add src/features/core33/core33Invite.ts __tests__/core33Invite.test.ts src/features/core33/useCore33InviteDismissals.ts src/features/core33/useOpenCore33.ts src/features/home/v2/Core33InviteCard.tsx src/features/home/homePriority.ts __tests__/homePriority.test.ts src/services/supabase/fitness.ts src/screens/tabs/HomeScreen.tsx src/dev/homeModeOverride.ts src/dev/DevCore33CardPreview.tsx src/dev/DevCatalogHost.tsx src/dev/devWorkoutsScreens.ts src/navigation/navigationRef.ts src/app/AppProviders.tsx src/providers/ThemeProvider.tsx
git commit -m "feat(home): Core 33 discovery card and dev screen tools" -m "Invite / start-another card under Tu día with 14-day dismissals. Inicio uses the shared routine recommendation. Dev only: Inicio overrides with the card, card preview, Entrenos screen cycler and deep links, iOS launch arguments for theme and tools." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 4 · Documentación
git add docs/migration/MIGRATION_PROGRESS.md docs/backend/BACKEND_TODO.md
git commit -m "docs: Entrenos module, Core 33 card and backend todo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### 18.8 Ajuste: Rutinas explora, la lista vive aparte (2026-10-03)
- **D-46** · **Decisión de producto (Nicolás).** Rutinas funciona igual que Ejercicios: la raíz sirve para explorar y la lista vive en su propia pantalla. Se aparta del prototipo (WORKOUTS_01 / 02), que tiene chips y la lista en la raíz.
  - **Raíz:** hero "Tu próxima sesión" y "+" en la cabecera, sin cambios. El buscador ("Buscar entre N rutinas") va entre el hero y "Por tipo"; abre "Todas las rutinas" con el foco en la búsqueda. "Por tipo" tiene cards para los 5 tipos (Fuerza, Cardio, HIIT, Movilidad, Full body) y otras 3 para Favoritas, Tus rutinas y Todas las rutinas (icono sobre escena oscura, con borde interior en Dark). Todas llevan conteo y ninguna tiene estado seleccionado. Se eliminan los chips y la lista.
  - **`RoutineListScreen`** (ruta `RoutineList`, parámetros `type`, `collection: 'favorites' | 'mine' | 'all'` y `focusSearch`): GlassHeader con título, buscador "Buscar en …", conteo y A–Z, y la lista con `RoutineRow`. Estados: skeleton (STATE_02), vacío de Favoritas (STATE_06 con "Ver todas las rutinas"), vacío por tipo o colección, sin resultados de búsqueda y error con Reintentar.
  - **"Tus rutinas"** = `created_by` del usuario, incluidas las de ELLIE (`isMyRoutine`), excepto las editoriales.
- **Correcciones:**
  - **`ExerciseRow`:** el músculo nunca se trunca. Si equipo y nivel no caben a su lado, pasan a una segunda línea sin el punto inicial. Verificado con Espalda ("Dorsal ancho", "Deltoides posteriores").
  - **Protección de la status bar:** nueva primitiva `StatusBarShield`, una franja glass (`glass.statusbar`) que aparece con los primeros 12 pt de scroll. Se usa en Entrenos. Inicio no tenía este patrón: es candidata a usarlo.
- **Dev:**
  - `typeList` abre la lista de Fuerza y `favoritesList`, la lista real de Favoritas.
  - `favorites` abre el vacío de STATE_06 de forma forzada (`devEmpty`, solo `__DEV__`).
  - `list` acepta `&zone=<key>`.
- **Limpieza:** el commit `21ac3e1` añadió por error 48 copias de archivos (en `src/features/home/v2/` y `src/features/workouts/`), creadas por un script de verificación. Se quitan en el commit de limpieza.

## 19. Sesión · módulo completo (SESSION_01–07, STATE_09, 2026-10-03)

> **Leer en 2 minutos.** Sesión con datos reales y registro serie a serie (`workout_session_exercises` / `workout_session_sets`), pausa que no cuenta en la duración, descansos con +30 s, Resumen con volumen del servidor y récords detectados, error al guardar sin perder datos y "Retomar" de una sesión guardada otro día. Verificado con capturas Light y Dark (la sesión es escena oscura en ambos modos). `tsc` sin errores, eslint sin errores, `jest` 103/103 (7 nuevos del temporizador y las series).

### 19.1 Qué quedó hecho, por pantalla
| Pantalla | Ref. | Estado |
|---|---|---|
| Sesión activa | SESSION_01 | ✅ Modo foco: cabecera glass (atrás → diálogo, "…" → menú), cronómetro 68 con pulso Ember y pausa 44, segmentos por ejercicio, hechos comprimidos, tarjeta "AHORA · n DE m" con **"Serie 2 de 3"**, **reps y kg editables**, descanso y check 64 que registra la serie; "Después" con miniaturas |
| En pausa | SESSION_02 | ✅ "SESIÓN EN PAUSA", reloj congelado al 50 %, "En pausa desde hace", progreso, ficha compacta y "Continuar entrenamiento". El descanso en curso también se congela |
| Menú "…" | SESSION_03 | ✅ Guardar para después · Finalizar entrenamiento ("n de m · se guarda así") · Salir sin guardar (con confirmación) |
| Descanso entre ejercicios / series | SESSION_03 / 04 | ✅ Anillo 236 Recovery Blue con cuenta atrás, +30 s, Saltar descanso, ficha "Hecho · …" / "Serie 1 de 3 · …" y la siguiente pieza. Usa el descanso planificado |
| Fin del descanso | SESSION_05 | ✅ Últimos 3 s en Ember (#FF8A5C); en cero, háptica, "Tu turno" 1,5 s y vuelve la tarjeta activa |
| Salir del entreno | SESSION_06 | ✅ Diálogo Light (blanco) / Dark (#1C1B19): Seguir entrenando · Guardar y salir (`saved`) |
| Todo hecho | — | ✅ "Seis de seis. Cierra la sesión." + "Finalizar entreno" |
| Resumen de cierre | SESSION_07 | ✅ Nueva ruta `WorkoutSummary`: hero con check, trío **Duración real · Volumen (servidor) · Series**, "n de m ejercicios", logro desbloqueado (badges de `workout_completed`), banda ELLIE, Listo y "Registrar récord" si `detect_session_prs` devuelve algo |
| Error al guardar | STATE_09 | ✅ Cifras conservadas, "Reintentar ahora" (sincroniza primero las series pendientes) y "Continuar sin sincronizar" (queda en la cola del teléfono) |
| Retomar | HOME_04 | ✅ Inicio abre la sesión `saved` exacta (`sessionId`), aunque sea de otro día |

**Datos (BACKEND_SUMMARY §3.5):**
- al abrir: `workout_session_exercises` con lo planificado (upsert, sin pisar);
- cada serie: upsert `ON CONFLICT (session_id, exercise_position, set_index) DO UPDATE`;
- al terminar un ejercicio: su fila pasa a `completed` y se actualiza `completed_exercises` (compatibilidad);
- pausa: `paused_at` / `paused_total_sec`;
- "Guardar para después": `status = 'saved'`;
- "Salir sin guardar": `canceled`;
- al completar: `workout_completed` (igual que antes) y `detect_session_prs`;
- al registrar récords: `personal_records` con `source = 'session'` y `session_set_id` (`ON CONFLICT DO NOTHING`) y `personal_record_created` por cada uno.

**Offline:** las series y el cierre que fallan quedan en `@athelete/session-outbox-v1:<userId>` (AsyncStorage) y se reenvían en orden al abrir una sesión o al reintentar. Las dos escrituras son idempotentes.

**Dev** (solo `__DEV__`, sin escrituras):
- menú "Ver pantallas de Sesión";
- deep link `athelete://dev/session?screen=active|paused|menu|restExercise|restSet|restEnd|exit|allDone|error|summary|summaryPreview`: la rutina "Total Body Dumbbell" con el estado forzado (`devState`);
- `summary` abre la última sesión completada o, si no hay, la vista previa.

### 19.2 Decisiones asumidas
| ID | Decisión |
|---|---|
| DA-60 | "Guardar para después" deja `paused_at`: el tiempo fuera cuenta como pausa. Al retomar: `in_progress`, la pausa se suma a `paused_total_sec` y `date` pasa a hoy (cuenta para el día en que se termina) |
| DA-61 | Resuelve DA-38: "Retomar" = la última `saved` de cualquier día o la `in_progress` de hoy. `canceled` con progreso deja de ser reanudable (se elimina `isResumableSession`). El detalle de rutina también ofrece "Retomar" para una `saved` |
| DA-62 | Plan: 3 series si la rutina no las indica, descanso 60 s si es 0. Ejercicios por tiempo: la serie registra la duración planificada (sin reps) |
| DA-63 | kg propuesto = la serie anterior del ejercicio; si no hay, el último peso del usuario para ese ejercicio; si tampoco, vacío (BT-17). Reps propuestas = las planificadas o las de la serie anterior |
| DA-64 | Duración real = fin − inicio − pausas (en segundos en el Resumen; en minutos en `duration`) |
| DA-65 | Trío del Resumen: Duración · **Volumen** (kg, del servidor) · **Series**; los ejercicios van en la línea del hero. Sin volumen (sin pesos) → kcal estimadas |
| DA-66 | "Registrar récord" abre una hoja con los récords detectados (anterior → nuevo) y los registra todos juntos |
| DA-67 | La imagen de la tarjeta actual es el recorte anatómico de la zona del ejercicio (o la foto de la rutina); las miniaturas, las de la biblioteca. Sin fotos por ejercicio (PLACEHOLDER) |
| DA-68 | La frase de ELLIE del Resumen es el insight principal de ELLIE (se recarga al abrir) |
| DA-69 | Salir sin guardar pide confirmación (Alert del sistema) antes de descartar |
| DA-70 | Sin gesto de volver en Sesión y Resumen: se sale por "Salir del entreno" / "Listo" |

### 19.3 Desviaciones nuevas
- **D-47** · Tarjeta activa: en lugar de "3 × 12 · series × reps", muestra reps y kg editables de la serie actual y el descanso. La línea bajo el nombre dice "Serie 2 de 3 · 3 × 12".
- **D-48** · Se quita la acción "deshacer" sobre los ejercicios hechos (fila no interactiva).
- **D-49** · "Técnica 3D" → "Técnica" (abre el Exercise Detail · MoveKit; el 3D se descartó).
- **D-50** · Resumen sin "Compartir" (Comunidad pendiente) y sin la variante Apple Health (SESSION_08).
- **D-51** · Banda de ELLIE del Resumen sin eyebrow (como el prototipo): `EllieSurface` acepta `eyebrow=""`.
- **D-52** · En el descanso, los segmentos solo marcan lo hecho (no el ejercicio en curso).
- **D-53** · **Textos del diálogo "Salir del entreno".** El prototipo (Overlays.dc.html) dice "Seguir entrenando" (primaria) y "Guardar y salir" (secundaria). Se sustituyen por tres acciones: **Guardar para después** (primaria), **Salir sin guardar** (en Ember, destructiva) y **Cancelar**.
  - **Referencia:** handoff §7, tabla WORKOUT SESSION, fila "Salir del entreno (diálogo)": propósito "Decidir", CTA principal **Guardar para después**, secundaria **Salir sin guardar / Seguir**; y fila "Sesión en pausa", cuyo menú "…" lista Guardar para después · Finalizar entrenamiento · Salir sin guardar.
  - **Por qué:** el diálogo también se abre desde la pausa y el descanso, y desde el botón atrás de Android; ahí hace falta una salida que no guarde y una que no haga nada. El texto de apoyo y el estilo (blanco en Light, #1C1B19 en Dark) no cambian.

### 19.4 Bloqueos y pendientes
- **Backend** (`BACKEND_TODO.md`): BT-17 peso planificado, BT-18 confirmar volumen y tipos de récord, BT-19 caducidad de `saved`, BT-20 descanso real.
- **App:** compartir en Comunidad desde el Resumen; Apple Health (SESSION_08); fotos por ejercicio; "deshacer" una serie.
- **Sin usar desde la v2 (no borrados, comprobado con grep):** `WorkoutSessionExerciseRow`; en `useWorkoutSession`, `persistCompletedExercises`, `completeSession`, `saveSessionForLater` y `resumeSession`, y sus servicios en `fitness.ts` (`persistWorkoutSessionExercises`, `completeWorkoutSession`, `cancelWorkoutSession`, `resumeWorkoutSession`).

### 19.5 Checklist de validación (en el simulador o el dispositivo, Light y Dark)
- [ ] Detalle de rutina → Empezar: crea la sesión y sus `workout_session_exercises`; el cronómetro corre.
- [ ] Registrar una serie con reps y kg editados → descanso "entre series" con el descanso planificado; +30 s suma; Saltar vuelve; al llegar a 0 vibra y sale "Tu turno".
- [ ] Última serie de un ejercicio → descanso "entre ejercicios" y el ejercicio sale en "hechos".
- [ ] Pausa 1 min → al continuar el cronómetro no suma ese minuto; un descanso en curso se congela.
- [ ] Atrás → diálogo; "Guardar y salir" → Inicio muestra "Retomar"; al tocarlo vuelve a la misma serie (también al día siguiente).
- [ ] Menú → Finalizar con ejercicios pendientes → Resumen con "n de m".
- [ ] Menú → Salir sin guardar → confirmación → Inicio sin "Retomar".
- [ ] Completar todo → Resumen: duración sin pausas, volumen del servidor, series; "Registrar récord" si hay récord nuevo → registra y deja de aparecer; los puntos llegan una vez.
- [ ] Modo avión al finalizar → STATE_09; "Reintentar ahora" sin red sigue en error; "Continuar sin sincronizar" → Inicio; al volver la red y abrir una sesión, se sincroniza.
- [ ] Atajo: menú dev "Ver pantallas de Sesión" o `xcrun simctl launch booted <bundle> -devTool "athelete://dev/session?screen=<key>" -themeMode dark`.

### 19.6 Commits (en este orden; cada uno compila, verificado con `tsc` sobre una copia de HEAD)
```bash
# 1 · Modelo y servicios de sesión (series, pausa, guardado, récords, cola offline)
git add src/features/session/sessionModel.ts __tests__/sessionModel.test.ts src/services/supabase/session.ts src/services/supabase/fitness.ts
git commit -m "feat(session): per-set session model and services" -m "Plan, set cursor, clock without pauses and rest timer with tests. Supabase: planned exercises, set upserts, pause, saved for later, completion with workout_completed, detect_session_prs and session PRs, offline outbox. Saved sessions of any day are the resumable ones (DA-38)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 2 · Pantallas de Sesión y Resumen
git add src/features/session/useSessionRunner.ts src/features/session/v2/SessionViews.tsx src/features/session/v2/ExitDialog.tsx src/screens/workouts/WorkoutSessionScreen.tsx src/screens/workouts/WorkoutSummaryScreen.tsx src/features/gamification/badgeIcons.ts src/screens/home/NotificationsScreen.tsx src/components/v2/EllieSurface.tsx src/types/navigation.ts src/constants/routes.ts src/navigation/RootNavigator.tsx src/screens/tabs/HomeScreen.tsx
git commit -m "feat(session): v2 workout session, pause, rest and summary" -m "Focus mode with editable reps and kg per set, pause that does not count, rest between sets and exercises with +30 s and Tu turno, exit dialog and menu, save error with retry, summary with real duration, server volume, sets and detected records. Inicio resumes the exact saved session." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 3 · Herramientas dev
git add src/dev/devSessionScreens.ts src/dev/devWorkoutsScreens.ts src/dev/DevCatalogHost.tsx
git commit -m "feat(dev): session screen states and deep links" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

# 4 · Documentación
git add docs/migration/MIGRATION_PROGRESS.md docs/backend/BACKEND_TODO.md docs/migration/SESSION_CHECKPOINT.md
git commit -m "docs: Sesión module and backend todo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### 19.7 Ajustes tras la prueba real (2026-10-03)
- **Hero y Detalle leen lo mismo.** Un solo `fetchPendingSessions` (filas `in_progress` o `saved`) y una sola regla, `selectPendingSession`: la `in_progress` de hoy y, si no hay, la `saved` más reciente de cualquier día; el Detalle la restringe a su rutina. Antes eran dos consultas con prioridad distinta (el hero preferia `saved`; el Detalle, `in_progress`).
- **Sesión pendiente primero.** Una `saved` o `in_progress` va antes que "Tu primera sesión" y que cualquier otro modo.
- **Anillo "Entreno".** Suma los minutos activos (sin pausas) de las sesiones de hoy completadas, guardadas y en curso, cada fila una vez. Una sesión en curso sin pausar cuenta hasta su **última actividad registrada** (`duration`, que la app reescribe en cada serie y al pausar o reanudar), no hasta "ahora": cerrar la app o bloquear el teléfono no suma minutos.
- **Guardar para después ya no falla en silencio.** Si no se puede guardar, aparece STATE_09 con las cifras y "Reintentar ahora" (el reloj queda congelado); "Continuar sin sincronizar" deja el guardado en la cola del teléfono y se reenvía al abrir una sesión.
- **Resumen:** volumen NULL → "—". Récords `duration` y `distance` mostrados y registrados (BT-18 resuelto).

**Cuenta de prueba de la app:** `falcon1989@gmail.com` · user id `7d143a1f-bf73-4481-b8d2-03f0b2e73ec5` (la contraseña no se guarda en el repositorio).

**Verificación con esa cuenta (2026-10-03, solo lectura):**
- Tiene 2 sesiones: una `canceled` y "Intro to Strength" `in_progress` (`paused_total_sec` 507, `duration` 4: la pausa y el latido de actividad sí se escriben).
- **0 sesiones completadas** → "Tu primera sesión" era correcto para esa cuenta. (La sesión de mayo "Reinicio de Empuje Nicolas" es de otra cuenta, no de esta.)
- **`workout_session_exercises` vacío** para la sesión en curso: la creación de los ejercicios planificados falló sin avisar. El `upsert … ON CONFLICT` pasa a ser "leer las posiciones que existen e insertar las que faltan" (idempotente), se reintenta antes de guardar o completar, y un fallo lleva a STATE_09; en `__DEV__` la pantalla muestra la causa técnica. **Pendiente de confirmar** con una sesión nueva en esta cuenta que las filas se crean.

## 20. Lote de backend integrado (2026-10-03)

> **Leer en 2 minutos.** Lovable aplicó el lote; la app lo usa. Verificado contra la base real con la cuenta de prueba `falcon1989@gmail.com` (id `7d143a1f-bf73-4481-b8d2-03f0b2e73ec5`): existen todas las columnas y la tabla `user_favorites`; las 9 categorías vienen pobladas (ninguna NULL). `tsc` sin errores, eslint sin errores, `jest` 118/118. Detalle del backend: `BACKEND_SUMMARY.md` §7; pendientes: `BACKEND_TODO.md`.

### 20.1 Qué quedó hecho
| # | Punto | Resultado |
|---|---|---|
| 0 | Tipos | `src/types/supabase.ts` a mano: `user_favorites`, `planned_weight_kg`, `rest_actual_sec`, `cancel_reason`, `core33_*` en `profiles` y `routine_category` |
| 1 | Favoritos | `user_favorites` es la fuente de verdad (React Query compartido, UI optimista y toast de error al revertir). Migración única de AsyncStorage con upsert y marca `@athelete/favorites-migrated-v1:<userId>`. Cubre Favoritas de Entrenos, el corazón del Detalle y los ejercicios |
| 2 | Peso planificado | kg inicial: serie anterior → último peso usado → `planned_weight_kg` → vacío. Se copia a `workout_session_exercises` y se conserva al editar una rutina |
| 3 | Descanso real | `rest_actual_sec` = descanso real **antes** de la serie (sin pausas, con +30 s), en el mismo upsert; la primera serie lleva NULL. Test con pausa y con +30 s |
| 4 | `cancel_reason` | "Salir sin guardar" → `canceled` + `'user'`. `in_progress` de otro día: sin series → `canceled` + `'expired'`; con series → `saved` |
| 5 | Core 33 en el perfil | "Ahora no" escribe `core33_invite_dismissed_at`; el valor local se sube una vez y se borra; el reset dev pone la columna a `null`. `core33_intro_seen_at` / `core33_completed_at`: solo tipos y servicios |
| 6 | Categoría | Las 5 tarjetas del diseño y `RoutineList` agrupan las 9 `routine_category` (tabla en D-55; NULL → solo "Todas"). Mapeo local del texto libre eliminado |
| 7 | Series y reps (A3) | Parser tolerante `parseSetsReps` (`src/shared/domain/setsReps.ts`) con unidades `reps`, `s`, `m`, `máx` y "por lado" |
| 8 | Docs | BT-03, BT-12, BT-15, BT-17, BT-19 y BT-20 resueltos; BT-21 nuevo; `BACKEND_SUMMARY.md` §7 |

**Punto 4 · el cambio `in_progress` → `saved` no existía:** antes solo se había propuesto. Se implementa aquí (`settleAbandonedSessions` en `fitness.ts`): la sesión queda `saved` congelada en su última serie. Cuando el usuario empieza otra rutina, la que estaba en curso se trata igual (con series → `saved`; sin series → `canceled` + `'user'`).

**Punto 7 · de dónde salen las series y reps:**
- La **Sesión** y el **Detalle de rutina** las leen de `template_exercises` (`sets`, `reps`, `duration`, números); `recommended_sets_reps` solo se usa cuando una fila de la rutina no trae reps ni tiempo.
- El **Detalle de ejercicio** (la prescripción) sí leía `recommended_sets_reps`, con un regex `^(\d+)x(.+)$` que mostraba "- × -" para varias formas y habría lanzado una excepción con un objeto. En datos reales hay dos formas: por objetivo y `{sets, reps}` suelto.
- `workout_session_sets` ya tiene `duration_sec` y `distance_m`: las series en segundos y metros los usan (se registra la cantidad planificada). Las series en "máx" registran las reps escritas. El Resumen no muestra el esquema por ejercicio; las unidades aparecen en las filas de récords (`duration`, `distance`).

### 20.2 Decisiones asumidas
| ID | Decisión |
|---|---|
| DA-71 | Favoritos: la migración sube solo ids con formato uuid y borra las claves locales aunque pertenezcan a otra cuenta del mismo dispositivo (eran globales al dispositivo) |
| DA-72 | Un "like" repetido (`23505`) no es un error; quitar un favorito inexistente tampoco |
| DA-73 | `rest_actual_sec` se calcula como `total − restante`: excluye las pausas por construcción y suma el +30 s |
| DA-75 | Filas de rutina sin reps ni tiempo: el plan toma el esquema recomendado del ejercicio de la biblioteca (objetivo hipertrofia; si no existe, otro). El plan espera a la biblioteca antes de crear la sesión |
| DA-76 | Un rango (`12–15`) propone el mínimo como valor inicial; la unidad `máx` deja las reps vacías para escribirlas |

### 20.3 Desviaciones nuevas
- **D-54** · **Core 33 "Ahora no" sin tope de dos descartes** (se mantiene; el tope vuelve con `core33_invite_dismiss_count`, BT-22). Con una sola fecha en el perfil no se puede saber cuántas veces se descartó: la tarjeta vuelve cada 14 días hasta que el usuario actúe. Se conserva el aplazamiento de 14 días y el reinicio al completar otro Core 33 (un descarte anterior al día 33 del último reto terminado ya no cuenta). Para recuperar el tope haría falta un contador en el perfil.
- **D-55** · **Tarjetas "Por tipo": las 5 del diseño, agrupando las 9 `routine_category`.** Mismos textos y fotos que antes (Fuerza, Cardio, HIIT, Movilidad y Full body; fotos del paquete `barra`, `cuerdas`, `hiit`, `movilidad` y `total`), sin fotos de relleno. El paquete trae 4 tarjetas con foto; Full body es la quinta de D-46. Correspondencias (propuesta aplicada):

  | Tarjeta | `routine_category` |
  |---|---|
  | Fuerza | `fuerza`, `tren_superior`, `tren_inferior`, `core` |
  | Cardio | `cardio`, `acondicionamiento` |
  | HIIT | `hiit` |
  | Movilidad | `movilidad` |
  | Full body | `cuerpo_completo` |

  Una rutina sin categoría (NULL) solo aparece en "Todas". Con las 34 rutinas visibles para la cuenta de prueba: Fuerza 17, Full body 6, Cardio 5, Movilidad 5, HIIT 1. La categoría concreta ("Tren superior", "Core"…) sigue visible en la cabecera del Detalle de rutina.
- **D-56** · El tope de dos descartes que documentaba BT-03 deja de aplicarse (ver D-54).

### 20.4 Pendientes
- **Diseño:** no hay UI para editar el peso planificado de una rutina (no está en el diseño); la app solo lo lee y lo conserva. Fotos definitivas para 4 categorías de rutina.
- **Backend:** BT-21 (estructurar `recommended_sets_reps`; propuesta sin aplicar); contador de descartes de Core 33 si se quiere el tope.
- **Sin probar escribiendo:** favoritos (altas y bajas), `rest_actual_sec`, `cancel_reason`, la migración local y el "Ahora no" del perfil; no se hicieron escrituras de prueba (ver 20.5).

### 20.5 Cómo verificarlo con `falcon1989` en el simulador
- [ ] **Favoritos:** en Entrenos, un corazón en una rutina → aparece en "Favoritas" y en el Detalle; reinstala o cierra sesión y vuelve a entrar: sigue. En el modo avión, el corazón vuelve atrás y sale un toast de error. Si había favoritos locales antiguos, aparecen tras el primer inicio de sesión.
- [ ] **Categorías:** las tarjetas de Entrenos muestran las 9 categorías con su conteo (Fuerza 2, Full body 6, Tren superior 7…); cada una abre su lista; "Todas" incluye las rutinas sin categoría.
- [ ] **Series y reps:** Detalle de ejercicio → "3 × 12–15" (en vez de "- × -"); una rutina con ejercicios sin reps muestra el esquema recomendado.
- [ ] **Peso inicial:** una serie nueva propone la anterior; en un ejercicio sin historial, el `planned_weight_kg` si lo tiene.
- [ ] **Descanso:** registra dos series con un descanso con pausa y +30 s; en la base, `rest_actual_sec` de la segunda serie ≈ el descanso real, y la primera serie NULL.
- [ ] **Salir sin guardar:** `canceled` con `cancel_reason = 'user'`.
- [ ] **Core 33:** "Ahora no" en la tarjeta → `profiles.core33_invite_dismissed_at` con fecha y la tarjeta desaparece; menú dev "Restablecer card de Core 33" → la columna vuelve a `null`.

### 20.6 Conteos de rutinas (comprobación)
La base tiene más rutinas de `fuerza` y `cuerpo_completo` que las que muestra Entrenos para la cuenta de prueba (`falcon1989@gmail.com`, id `7d143a1f-bf73-4481-b8d2-03f0b2e73ec5`), pero **no es un filtro ni un límite de la app**:
- La consulta es `workout_templates` con `created_by = yo OR is_public = true OR created_by IS NULL`, sin límite ni rango, y después `dedupeFeaturedTemplates` (quita duplicados de rutinas destacadas por `source`).
- Sin ningún filtro, esa cuenta ya ve solo **34 rutinas** (todas de sistema, públicas, `created_by` NULL): Fuerza (`fuerza`) 2 y Full body (`cuerpo_completo`) 6. El filtro de la app da las mismas 34 y ninguna tiene `source`, así que el deduplicado no quita nada.
- La diferencia con el conteo de la base (16 y 8) viene de lo que la seguridad por filas (RLS) no deja ver a esta cuenta: rutinas privadas de otros usuarios u otras filas no visibles. No se cambió nada.

## 21. QA pendiente de Sesión (anotado el 2026-10-03, sin investigar todavía)

Cuenta de prueba: `falcon1989@gmail.com` (id `7d143a1f-bf73-4481-b8d2-03f0b2e73ec5`). La prueba real de Sesión solo llegó a pausar; falta comprobar con escrituras reales:

- [ ] **Series reales** escritas en `workout_session_sets` (la prueba tuvo 3 series atascadas en la cola local y 0 filas en la base; ver el diagnóstico de `workout_session_exercises`, clave foránea `workout_session_sets_exercise_fk`).
  - **Arreglo aplicado el 2026-10-04 (solo app):** los ejercicios planificados (`workout_session_exercises`) se crean antes de reenviar la cola y antes de cada serie; al terminar o guardar se sincronizan las series pendientes y, si alguna no llega, aparece STATE_09 en vez de dar la sesión por guardada. Un fallo de serie queda en la consola (`[session] Serie sin guardar`).
  - **Cómo verificarlo con falcon1989:** (1) empezar una rutina, registrar 3 series y terminar. (2) Comprobar en `workout_session_exercises` una fila por ejercicio de la sesión y en `workout_session_sets` las 3 series (con `rest_actual_sec` desde la segunda). (3) Repetir con modo avión: registrar series, terminar → STATE_09; reactivar la red y "Reintentar ahora" → las series y la sesión llegan. (4) La cola local `@athelete/session-outbox-v1:<id>` queda vacía. (5) Si había 3 series atascadas de la prueba anterior, abrir esa sesión y comprobar que se reenvían.
- [ ] **Favoritos** en `user_favorites` (altas, bajas, reversión con toast al fallar y migración de AsyncStorage).
- [ ] **`cancel_reason = 'user'`** al "Salir sin guardar".
- [ ] **"Ahora no" de Core 33** en `profiles.core33_invite_dismissed_at`, y el reset dev a `null`.
- [ ] **Evento `personal_record_created` del 2026-10-03 a la 01:16 sin récord de sesión asociado:** ¿fue un récord manual? Revisar `personal_records` (`source`, `session_set_id`) de ese día.

## 22. Progreso · Resumen, Récords y Logros (2026-10-03)

> **Leer en 2 minutos.** El tab Progreso (Resumen y Retos), los Récords y los Logros pasan a v2, fieles a las referencias (PROGRESS_01–04, STATE_03, RECORDS_01–02, ACHIEVEMENTS_01–02, OVERLAY_01) en Light y Dark. Cuenta de prueba: `falcon1989@gmail.com` (id `7d143a1f-bf73-4481-b8d2-03f0b2e73ec5`). `tsc` y eslint sin errores, `jest` 140/140 (nuevos: `progressModel`, `recordsBadges`). Checkpoint: `PROGRESS_CHECKPOINT.md` (COMPLETADO).

### 22.1 Qué quedó hecho
| Pantalla | Ref. | Estado |
|---|---|---|
| Resumen · semana | PROGRESS_01 | ✅ Hero "Fuerza total · desde enero" (+N %, curva), Semana/Mes, trío Sesiones · Entreno · Racha, frase de comparación, cápsulas de la semana, Nutrición (proteína) e Hidratación (días al objetivo), banda de ELLIE y "Tus marcas" |
| Resumen · mes | PROGRESS_02 | ✅ Calendario de minutos por día con leyenda Menos–Más |
| Resumen · vacío | PROGRESS_04 | ✅ "Tu evolución empieza aquí", curva discontinua, cápsulas vacías (es el estado real de `falcon1989`) |
| Cargando / error | STATE_03 | ✅ Skeleton con hero y hoja; error con "Reintentar" |
| Retos | PROGRESS_03 | ✅ Hero con los 33 puntos de Core 33 (o "Descubrir Core 33"), racha actual / mejor racha, Completados |
| Récords · lista | — | ✅ Una tarjeta por ejercicio (2 columnas), vacío, cargando, error |
| Récord personal | RECORDS_01 | ✅ Placa oscura (cifra, "NUEVO", delta desde la primera marca, curva a sangre) e Historial con diferencia y origen (**De una sesión** / **Manual**) |
| Registrar récord | RECORDS_02 | ✅ Hoja con los 5 `pr_type` y su unidad, pasos, comparación con la mejor marca y notas; sin ejercicio, empieza por un buscador |
| Nuevo récord | OVERLAY_01 | ✅ Celebración (hexágono Ember, cifra) si supera la mejor marca |
| Logros | ACHIEVEMENTS_01 | ✅ "7 / 12", barra Ember y 4 repisas (Constancia, Retos, Fuerza, Hábitos y conocimiento) |
| Detalle de logro | ACHIEVEMENTS_02 | ✅ Hoja conseguido (con fecha) o bloqueado (con "3 de 7" y aro de progreso) |

**Datos:** minutos = duración activa sin pausas (`ended_at − started_at − paused_total_sec`, la misma regla que el anillo de Inicio); volumen = `volume_kg` del servidor (NULL no cuenta); récords de `personal_records` con `source` y `session_set_id`; logros de `user_badges`.

**Escritura (una sola):** "Guardar récord" inserta en `personal_records` con `source = 'manual'` y otorga `personal_record_created` con el id del récord como referencia (idempotente). Los récords de una sesión los registra el Resumen de sesión (`source = 'session'`).

**Primitivos nuevos** (`src/components/v2/`): `ProgressCurve`, `WeeklyCapsules`, `HeatCalendar`, `RecordCard`, `StepperField`, `Celebration`; `HexMedal` rehecho (aro Ember alrededor del icono, igual que el diseño).

**Dev** (solo `__DEV__`): menú "Ver pantallas de Progreso" y `athelete://dev/progress?screen=<key>[&scroll=N]` con `summary | data | month | empty | loading | error | retos | records | recordsEmpty | recordsLoading | recordsError | recordDetail | recordSheet | recordCelebration | achievements | achievementSheet | achievementLocked | achievementsEmpty | achievementsLoading | achievementsError`. Los estados "con datos" usan datos de ejemplo (`progressFixtures.ts`); no se lee ni se escribe nada.

### 22.2 Decisiones asumidas
| ID | Decisión |
|---|---|
| DA-77 | Los minutos de Progreso son la duración activa sin pausas de las sesiones `completed` (cada fila una vez); los totales suman segundos y se redondean a minutos |
| DA-78 | El hero usa el volumen medio por sesión y mes desde enero. Si hay menos de 2 meses con `volume_kg`, pasa a una variante de constancia ("Constancia · desde …": sesiones y minutos). Sin sesiones este año: estado vacío |
| DA-79 | Meta semanal: sesiones = `profiles.training_days_per_week` (por defecto 3) y minutos = sesiones × `preferred_session_minutes` (por defecto 35) |
| DA-80 | "Racha" = días seguidos con una sesión completada, que acaba hoy o ayer; "Mejor racha" = el tramo más largo del historial cargado |
| DA-81 | La frase del mes compara los días activos con los meses anteriores del año ("Tu mes más constante desde junio"); la de la semana, con la semana pasada hasta el mismo día |
| DA-82 | Récords: una tarjeta por ejercicio con el tipo de su marca más reciente; la mejor marca es la de mayor valor (a igual peso, más repeticiones). "NUEVO" = registrada hoy |
| DA-83 | Registrar récord: el valor inicial es la mejor marca + 5 kg; pasos de 2,5 kg, 1 rep, 5 s y 10 m. "Supera tu mejor marca por …" solo compara dentro del mismo tipo |
| DA-84 | Un récord manual se elimina con pulsación larga en el historial; los de sesión están protegidos |
| DA-85 | Los 12 badges de la app se reparten en las 4 repisas: Constancia (primer entreno, semana constante, racha 7, hidratación ×3, ×7, semana hidratada), Retos (Core 33), Fuerza (primer PR, primera rutina propia), Hábitos y conocimiento (nutrición, Quiz Master, primer quiz) |
| DA-86 | El progreso de un logro se mide en el dispositivo (racha, semana, Core 33, hidratación de 30 días); los de una sola vez no muestran progreso (BT-24) |
| DA-87 | No hay "nivel" en la referencia ni en la app: no se muestra. Los puntos ya viven en Perfil |
| DA-88 | Se descargan las sesiones desde el 1 de enero o 120 días atrás (lo más antiguo), para el hero y la racha (BT-23) |

### 22.3 Desviaciones nuevas
- **D-57** · Resumen · Mes: el trío es Sesiones · Entreno · Días activos (como el prototipo, no la captura PROGRESS_02, que repite el trío de la semana).
- **D-58** · La banda de ELLIE usa el patrón de Inicio (voz y "Hablar con ELLIE →") en vez de solo la flecha.
- **D-59** · Sin la fila de Apple Health ni el peso corporal (PROGRESS_05 está fuera de alcance).
- **D-60** · La curva de un récord dibuja las marcas reales (hasta 6): con pocas marcas tiene menos nodos que la captura.
- **D-61** · Logros: las repisas no alternan la banda de fondo de la captura.
- **D-62** · Retos: sin "Próximo reto" (no hay catálogo, BT-01) y sin el icono de llama en "Racha actual". Completados lista solo el Core 33 terminado.
- **D-63** · Se añade una pantalla de lista de récords (el diseño solo tiene el carrusel y el detalle).
- **D-64** · `HexMedal` cambia de aspecto en todas partes (Notificaciones, Resumen de sesión, Retos) para igualar el diseño.

### 22.4 Bloqueos y pendientes
- **Backend** (`BACKEND_TODO.md`): BT-23 agregados de entrenos; BT-24 progreso de logros; dependen de BT-01 (catálogo) y BT-02 (`completed_at`) los "Próximo reto" y el historial de retos.
- **Sin probar escribiendo:** guardar un récord (celebración y puntos), borrar un récord manual y el vínculo con un récord de sesión; la cuenta de prueba no tiene sesiones ni récords.
- **Sin usar desde la v2 (no borrados, comprobado con grep):** `features/progress/components/` (ActiveChallengeCard, AiAnalysisCard, BodyScienceProgressCard, HydrationProgressCard, NutritionProgressCard, PersonalRecordsCard, ProgressBarChart, ProgressChartCard, ProgressChartTooltip, ProgressRangeSwitch, ProgressSegmentedControl, TrainingProgressCard); `features/pr/components/` (ExercisePrSummaryCard, PrForm, PrHistoryItem, PrHistoryList); `features/profile/components/AchievementBadgeGrid.tsx`. `BadgeGridCard` sigue en uso (Perfil).

### 22.5 Checklist de validación (Light y Dark, con `falcon1989`)
- [ ] Progreso → Resumen vacío: hero "Tu evolución empieza aquí", cápsulas vacías, "Tu primera marca aparecerá aquí".
- [ ] Tras completar un entreno: aparece en la semana con los minutos activos (sin pausas), el hero y el trío se actualizan al volver al tab, y la racha suma.
- [ ] Mes: el día entrenado se pinta según los minutos; la leyenda coincide.
- [ ] Hidratación y Nutrición de la semana reflejan los registros; tocar abre el plan.
- [ ] Récords: "Registrar récord" desde Inicio, desde Progreso y desde el detalle; los 5 tipos con su unidad; "Supera tu mejor marca por …" correcto.
- [ ] Guardar un récord que supera la mejor marca: celebración y +25 puntos una sola vez (repetir no suma); uno que no la supera: toast.
- [ ] Un récord detectado en una sesión aparece como "De una sesión"; uno manual, como "Manual" (y se puede eliminar con pulsación larga).
- [ ] Logros: la colección cuenta los badges de `user_badges`; el progreso de los bloqueados avanza con la racha, la semana y la hidratación; la hoja muestra la fecha o el avance.
- [ ] Sin red: Resumen, Récords y Logros muestran el error y "Reintentar" recupera.
- [ ] Atajo: menú dev "Ver pantallas de Progreso" o `-devTool "athelete://dev/progress?screen=<key>" -themeMode dark`.

### 22.6 Commits (en este orden; sin `git add -A`)
```bash
# 1 · Lógica pura, datos y tipos
git add src/features/progress/progressModel.ts src/features/progress/recordsModel.ts src/features/progress/badgesModel.ts __tests__/progressModel.test.ts __tests__/recordsBadges.test.ts __tests__/homePriority.test.ts __tests__/notificationsModel.test.ts src/services/supabase/trainingHistory.ts src/services/supabase/fitness.ts src/shared/domain/types.ts src/shared/domain/personal-records.ts src/hooks/usePersonalRecords.ts src/hooks/useProgressSummary.ts src/lib/queryInvalidation.ts src/types/navigation.ts
git commit -m "feat(progress): aggregates, records and badges models with tests" -m "Weekly and monthly minutes without pauses (same rule as the Inicio ring), server volume, streaks, hero, records grouping and formatting per pr_type, badge shelves and progress. Records carry source and session set; manual records are written with source manual." -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"

# 2 · Primitivos v2
git add src/components/v2/ProgressCurve.tsx src/components/v2/WeeklyCapsules.tsx src/components/v2/HeatCalendar.tsx src/components/v2/RecordCard.tsx src/components/v2/StepperField.tsx src/components/v2/Celebration.tsx src/components/v2/HexMedal.tsx src/components/v2/index.ts
git commit -m "feat(ui): v2 progress primitives and redesigned HexMedal" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"

# 3 · Herramientas dev (antes de las pantallas: usan los datos de ejemplo)
git add src/dev/devProgressScreens.ts src/dev/progressFixtures.ts src/dev/DevCatalogHost.tsx
git commit -m "feat(dev): progress screen states and deep links" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"

# 4 · Pantallas de Progreso, Récords y Logros
git add src/features/progress/v2 src/screens/tabs/ProgressScreen.tsx src/screens/home/PersonalRecordsScreen.tsx src/screens/pr/RegisterPrScreen.tsx src/screens/profile/AchievementsScreen.tsx
git commit -m "feat(progress): v2 Resumen, Retos, Récords and Logros" -m "Evolution hero, week and month, nutrition and hydration, ELLIE and marks; record list and detail with history and origin; Registrar récord sheet for the five pr_types with a celebration on a new best; achievement shelves with progress rings and detail sheet. Loading, empty and error states." -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"

# 5 · Documentación
git add docs/migration/MIGRATION_PROGRESS.md docs/migration/PROGRESS_CHECKPOINT.md docs/backend/BACKEND_TODO.md
git commit -m "docs: Progreso module, QA pending and backend todo" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

## 23. ELLIE · portada, chat y puntos de entrada (2026-10-04)

Cuenta de prueba: falcon1989@gmail.com (id 7d143a1f-bf73-4481-b8d2-03f0b2e73ec5). **No se envió ningún mensaje real a ELLIE**: todos los estados se vieron con fixtures (`athelete://dev/ellie?screen=<key>`, menú "Ver pantallas de ELLIE"). La conexión real solo se validó con tsc.

**Hecho**
- Portada (ELLIE_01): orbe 116, voz (`heroInsight` o saludo), dos respuestas rápidas, "Retomar conversación" (último mensaje del hilo real), "También puedo", escaneo, "Para leer con ELLIE", campo flotante.
- Chat (ELLIE_02/03, STATE_08): voz sin burbuja, pastilla del usuario, indicador de escritura, estados enviando/enviado/fallido con "Reintentar", sin conexión, error de servidor, límite, tarjeta de plan nutricional (Activar / Otra versión / Ajustar / Por qué), tarjeta de rutina (Guardar / Empezar), teclado sin tapar el campo, scroll al último mensaje, menú "Nueva conversación" (borra el hilo único).
- Backend reutilizado sin cambios: `ellie-chat`, `chat_messages`, `saveEllieWorkout`, `saveEllieNutritionPlan`. `callEllieChat.onError` recibe además el status HTTP (2.º argumento opcional).
- Entradas: Inicio (CTA según estado), Progreso ("Analiza mi semana"), Notificaciones (banda y "Activa tu plan nutricional"), Nutrición (vacío/CTA) abren `EllieChat` con el prompt del prototipo (`useOpenEllieChat`, `ELLIE_ASKS`). Onboarding sigue abriendo el tab (primer contacto = portada).
- Primitivos nuevos: `EllieLinen`, `EllieComposer`. Lógica pura con tests: `chatModel.ts`, `resultParsing.ts`.

**Desviaciones**
- **DA-89** · Las dos respuestas de la portada son "Ajustar mi rutina de hoy" / "Quiero un plan nutricional" (prompts reales); el diseño muestra una propuesta proactiva ("Sí, ajústalo / Mejor completo") que el backend no ofrece (BT-28).
- **DA-90** · "Para leer con ELLIE": tres temas fijos con fotos PLACEHOLDER; abren el chat con una pregunta (BT-29).
- **DA-91** · Escanear una máquina: tarjeta inerte con aviso (como en Entrenos).
- **DA-92** · Sin lista de conversaciones: una sola conversación; "Nueva conversación" la borra tras confirmar (BT-25).
- **DA-93** · Sin conexión se detecta al fallar un envío (no hay NetInfo en el proyecto); el límite se deduce de 429/402 (BT-26).
- **DA-94** · Sin texto progresivo: indicador "escribiendo" hasta recibir la respuesta completa (BT-27).
- **DA-95** · Resumen de sesión: el diseño no tiene entrada a ELLIE; se deja la banda sin acción.
- **D-65** · Tarjeta de rutina: foto PLACEHOLDER si la rutina no trae imagen.

**QA real pendiente (lo hace el usuario)**
1. Abrir ELLIE desde el tab: saludo y "Retomar conversación" con el hilo real.
2. Tocar una respuesta rápida: llega el mensaje y la respuesta; pastilla pasa de enviando a enviado.
3. Plan nutricional: aparece la tarjeta; Activar plan (verifica el plan en Nutrición); Otra versión; Ajustar.
4. Rutina: Guardar y Empezar (abre el detalle de la rutina guardada).
5. Modo avión: enviar → "No enviado · Reintentar"; reactivar red y reintentar.
6. Entradas: CTA de Inicio, Progreso, Notificaciones y Nutrición envían su prompt una sola vez.
7. Teclado: el campo no queda tapado; scroll al último mensaje.
8. Nueva conversación: confirma y borra el hilo.
9. Límite (429): comprobar el aviso cuando ocurra.

## 24. Perfil + Ajustes (PROFILE_01–03, HEALTH_02–03, 2026-10-04)

Cuenta de prueba: falcon1989@gmail.com (id 7d143a1f-bf73-4481-b8d2-03f0b2e73ec5). **Sin escrituras de prueba**: las pantallas se vieron con fixtures (`athelete://dev/profile?screen=<key>`, menú "Ver pantallas de Perfil") y las escrituras reales solo se validaron con tsc.

**Hecho**
- **Perfil** (`screens/tabs/ProfileScreen.tsx`, ruta `Profile` desde el avatar): retrato a sangre de 460 pt con Editar y Ajustes, cifras (sesiones, racha, puntos), Vitrina (3 últimas medallas + la siguiente en progreso → Logros v2), Tu trayectoria (medallas, récords y primera sesión), plan 2 × 2 y enlace a Ajustes. Estados: cargando, error con reintento y "Completa tu perfil" para quien no terminó el onboarding.
- **Editar perfil** (`screens/profile/EditProfileScreen.tsx`): foto, nombre, fecha de nacimiento (selector del sistema), peso, altura, objetivo, nivel, días y minutos por sesión. Validaciones del modelo (`profileModel.ts`) = CHECK de `profiles` (nivel `principiante|intermedio|avanzado`, minutos 5–240, objetivos del onboarding incluido `performance`). Guardar solo con cambios y valores válidos; estados guardando / guardado ✓ / error. Solo se escribe lo que cambió (`updateProfileDetails`, ampliada con `trainingLevel` y `preferredSessionMinutes`). Mapeos reutilizados del onboarding.
- **Ajustes** (`screens/profile/SettingsScreen.tsx`): Mi plan, Comunidad, Integraciones, Preferencias (Apariencia Claro/Oscuro/Sistema con el ThemeProvider y tres interruptores) y Cuenta (correo, cambiar contraseña, cerrar sesión, eliminar cuenta).
- **Apple Health** (`HealthSettingsScreen`): pantalla de referencia como placeholder.
- Primitivos nuevos: `FormRow` y `StepperButtons`. `GlassHeader` admite una acción ancha (`minWidth` en lugar de `width`).
- Datos nuevos: `ProfileRecord.createdAt`, `fetchProfileStats`/`useProfileStats`, `useBadgeShelves`, `useProfilePhotoUri`.

**Desviaciones**
- **DA-96** · Comunidad ("Amigos y retos", "Privacidad social") queda deshabilitada con "Próximamente" hasta el módulo Comunidad.
- **DA-97** · Apple Health: pantalla placeholder; "Conectar" solo avisa que llegará pronto (no hay HealthKit). Siempre "Sin conectar".
- **DA-98** · Editar perfil añade foto, Nivel y Minutos por sesión (no aparecen en PROFILE_02, pedidos en el módulo). Peso con paso de 0,5 kg.
- **DA-99** · Cambiar contraseña reutiliza el flujo de recuperación existente: envía el enlace al correo (no se pide la contraseña actual en la app). El diseño no tiene esta fila.
- **DA-100** · Eliminar cuenta: UI con doble confirmación; la acción final avisa de que no está disponible (BT-30). Fila no presente en el diseño.
- **DA-101** · Los interruptores de notificaciones solo guardan la preferencia en el teléfono (BT-31). No hay selector de unidades: el diseño no lo incluye (peso en kg, altura en cm).
- **D-66** · El retrato usa una foto PLACEHOLDER (`hero-entreno`) si el usuario no tiene foto; con foto se muestra la suya.
- **D-67** · La trayectoria muestra como máximo 5 hitos (medallas con fecha, récords y primera sesión).

**QA real pendiente (lo hace el usuario con falcon1989)**
1. Perfil desde el avatar de Inicio: nombre, objetivo, días, cifras y vitrina coinciden con tus datos; tocar la vitrina abre Logros.
2. Editar → cambiar peso/nivel/minutos/objetivo → Guardar: comprobar `profiles` (`weight`, `training_level`, `preferred_session_minutes`, `goal`) y que Perfil, Inicio y Entrenos lo reflejan. Probar el límite: minutos 5 y 240 guardan; valores fuera de rango no se pueden elegir.
3. Cambiar foto: sube a `profile-photos/<id>/avatar`, se ve en Perfil y en el avatar de Inicio (puede tardar un refresco).
4. Error de guardado: con modo avión, Guardar muestra el aviso y deja reintentar.
5. Ajustes: Apariencia cambia el tema al instante; interruptores se recuerdan al reabrir.
6. Cambiar contraseña: llega el correo con el enlace. Cerrar sesión: pide confirmación y vuelve a Auth.
7. Eliminar cuenta: ambas confirmaciones, y el aviso final (BT-30).
8. Usuario sin onboarding (cuenta nueva): "Completa tu perfil" y Editar con valores por defecto.

## 25. Nutrición · hoy, registro e hidratación (NUTRI_01–03, 2026-10-04)

Cuenta de prueba: falcon1989@gmail.com (id 7d143a1f-bf73-4481-b8d2-03f0b2e73ec5). **Sin escrituras de prueba**: se vio con datos de ejemplo (`athelete://dev/nutrition?screen=<key>`, menú "Ver pantallas de Nutrición"); las escrituras reales solo se validaron con tsc.

**Hecho**
- **Nutrición** (`screens/nutrition/NutritionPlanScreen.tsx`, ruta `NutritionPlan`): indicador de 270° de kcal, tres columnas de macros, depósito de agua con "+1 vaso", tarjeta de ELLIE ("Ajustar con ELLIE") y "Registrar comida" fijo. Sin plan: indicador sin meta y "Crear con ELLIE". Estados: cargando, error con reintento, sin plan y sin registros, objetivos cumplidos.
- **Registrar nutrición** (`features/nutrition/v2/NutritionLogSheet.tsx`): lo registrado se suma a los totales del día (atajos +250/+500/+750, calorías escritas y macros de 5 en 5 g). Guardando y error dentro de la hoja. Funciona con y sin plan. Misma escritura y misma adherencia que v1 (`upsertTodayNutritionLog`); `nutrition_logged` sigue enviándose una vez por día.
- **Hidratación** (`hooks/useHydration.ts`): el vaso aparece al instante en Nutrición e Inicio, las escrituras se encolan (toques rápidos no se pisan) y se revierte si falla. `hydration_logged` lo envía `addHydrationAmount` en cada llamada (las medallas se evalúan igual); no se duplica.
- **Modelo único** (`features/nutrition/nutritionModel.ts`, 9 tests): totales, progreso, vasos, litros, textos, hoja y adherencia. `homePriority` (anillos de Inicio) y `progressModel` (proteína e hidratación de Progreso) usan sus mismas funciones (`toGlasses`, `ratio`, `formatThousands`); un test comprueba que Nutrición, anillos de Inicio y Progreso dan los mismos números. Tras escribir se invalidan las consultas de Inicio, ELLIE, Perfil y Progreso.
- Primitivos nuevos: `ArcGauge`, `MacroColumn`, `WaterTank`; `GlassHeader` admite `subtitle`.
- Inicio: el anillo de Nutrición abre Nutrición con la hoja de registro (`openLog`), el de Hidratación abre Nutrición, y su "+1" usa `useHydration`. El modal v1 de Inicio deja de usarse.
- ELLIE: "Crear con ELLIE" → "Quiero un plan nutricional"; "Ajustar con ELLIE" → "Ajusta mi plan nutricional" (nuevo `ELLIE_ASKS.adjustNutrition`). Plan activado por ELLIE sigue siendo `nutrition_plans.is_active`.

**Desviaciones**
- **DA-102** · El diseño no tiene lista de comidas, búsqueda de alimentos ni detalle del plan: el registro es el total del día, igual que el backend. Las pantallas v1 de comidas / estructura / guías quedan sin uso (BT-32 para el registro por alimento).
- **DA-103** · El escáner de comida no tiene entrada en las referencias de Nutrición: no se añadió (módulo Scan, BT-33).
- **DA-104** · Solo se pueden sumar vasos (el diseño solo tiene "+1 vaso"); no hay forma de quitar uno.
- **DA-105** · La hoja de registro también está disponible sin plan (el diseño muestra "Consumido hoy" en ese caso); la adherencia solo se calcula con plan.
- **DA-106** · En Dark el arco del indicador conserva la pista clara del prototipo; el depósito usa los mismos azules en ambos modos y "+1 vaso" es translúcido.
- **D-68** · El subtítulo es "Hoy · {objetivo del perfil}". Los valores de la hoja se limitan a 5.000 kcal y 500 g por registro.

**QA real pendiente (lo hace el usuario con falcon1989)**
1. Sin plan: Nutrición muestra "Sin plan activo" y "Crear con ELLIE" abre el chat con su prompt (se envía al llegar).
2. Con plan (actívalo desde ELLIE): indicador y macros coinciden con `nutrition_plans` y con `daily_nutrition_logs` de hoy.
3. Registrar comida: +250 y +10 g de proteína → Guardar; comprobar `daily_nutrition_logs` (suma, adherencia) y que Inicio y Progreso muestran lo mismo. Repetir el mismo día: no duplica puntos (`nutrition_logged`).
4. Error: en modo avión, Guardar deja la hoja abierta con el aviso.
5. Agua: +1 vaso responde al instante; 5 toques rápidos suman 5 en `daily_hydration_logs`; llegar a la meta otorga la medalla de hidratación una sola vez por regla del servidor.
6. Inicio: tocar el anillo de Nutrición abre la hoja; "+1" del anillo de agua se refleja en Nutrición.
7. Progreso: proteína media e hidratación semanal coinciden tras registrar.

## 26. Lote de backend integrado (BT-22, BT-23, BT-24, BT-30, BT-31 · 2026-10-04)

Sin cambios en la base, sin `npx supabase`. Los tipos de `src/types/supabase.ts` se actualizaron a mano. La columna de fin de `workout_sessions` es `ended_at`; la app no usa `completed_at` para el fin de una sesión (los `completed_at` que quedan son de series, ejercicios de la sesión y quiz).

**Hecho**
- **BT-30 · Eliminar cuenta:** `requestAccountDeletion` (`functions.invoke('delete-account', POST)`) → `mapDeleteAccountResponse` (200 → eliminada; 409 `last_admin` → aviso sin cerrar sesión; 401 → cerrar sesión; 500 o sin conexión → "Reintentar"). Con 200 se limpian las claves locales del usuario (cola offline, marcas de migración, preferencias antiguas, favoritos antiguos) y se cierra sesión (con un cierre local si el servidor ya no conoce al usuario). Doble confirmación y estado "Eliminando…".
- **BT-22 · Core 33 (resuelve D-54):** "Ahora no" guarda fecha y contador (+1); con 2 descartes la tarjeta no vuelve; la regla de 14 días y "un descarte anterior al día 33 del último reto no cuenta" siguen. `resetCore33InviteCounter` queda con `TODO(core33)` para completar un Core 33. El reset dev pone el contador a 0 y la fecha a null.
- **BT-31 · Notificaciones:** los 3 interruptores leen y escriben `profiles.notification_prefs` con cambio inmediato y vuelta atrás con aviso. Migración única desde AsyncStorage (se sube y se borra la clave).
- **BT-23 · Progreso · Resumen:** `get_progress_summary(_from, _tz)` con la zona del dispositivo; se deja de descargar sesiones. La respuesta se expresa como la entrada del modelo (`summaryToSessions`): días, minutos, rachas, sesiones por mes y volumen medio por mes salen de la RPC. Todo lo que muestra el Resumen viene de ella; el anillo de Inicio de hoy sigue local.
- **BT-24 · Logros:** `get_badge_progress()` para current / target / earned / category. Se borraron las categorías, los targets y `buildBadgeStats`. Contador "N / total" desde los datos; un badge sin icono usa el genérico; una categoría desconocida va a una repisa "Otros".

**Supuestos que conviene confirmar con el primer QA** (no tengo el JSON real de las RPC):
- `get_progress_summary` → `{days:[{date, sessions, active_seconds}], months:[{month:'YYYY-MM', avg_volume_kg, sessions}]}` (como se pidió).
- `get_badge_progress` → lista (o `{badges:[…]}`) de `{badge_id, category, current, target, earned, earned_at?, title?, description?, icon?}`. Si no trae título/descripción/icono se usan los de `ALL_BADGES` y, si no, el id y el icono genérico. La fecha de logro sale de `user_badges` si la fila no la trae.
- Los dos parsers son tolerantes (números como texto, listas ausentes, filas sin id).

**QA real pendiente (falcon1989)**
1. Eliminar cuenta: usar una cuenta desechable, NO falcon1989. Comprobar 200 (vuelve a Auth, claves locales borradas), el aviso de última administradora (409) sin cerrar sesión y "Reintentar" en un 500.
2. Core 33: "Ahora no" dos veces (cambiando `core33_invite_dismissed_at` si hace falta esperar los 14 días) → la tarjeta no vuelve. Reset dev: contador 0 y fecha null.
3. Ajustes: activar/desactivar los tres interruptores y comprobar `profiles.notification_prefs`; en modo avión el interruptor vuelve atrás con aviso. Si había valores antiguos en el teléfono, se suben una vez.
4. Progreso · Resumen (semana y mes): minutos por día, sesiones, racha y curva de volumen coinciden con tus sesiones (zona horaria del teléfono). Comparar con el anillo de Inicio de hoy.
5. Logros y vitrina del Perfil: 13 logros, categorías y progreso de la RPC; "N / 13".

## 27. Core 33 · descubrimiento, intro, retos, día a día y final (2026-10-04)

Cuenta de prueba: falcon1989@gmail.com (id 7d143a1f-bf73-4481-b8d2-03f0b2e73ec5). **Sin escrituras de prueba**: se vio con datos de ejemplo (`athelete://dev/core33?screen=<key>`, menú "Ver pantallas de Core 33"); las escrituras reales solo se validaron con tsc.

**Hecho**
- **Entrada única** (`core33Entry.ts`, `useOpenCore33`, `useOpenCore33Discovery`): reto activo o completado → pantalla del día; nunca vio la intro → Intro → Explorar; vio la intro o ya completó uno → Explorar. La tarjeta de invitación de Inicio y el "Descubrir" de Progreso usan `useOpenCore33Discovery`. Perfil, Ajustes y Notificaciones ya pasaban por `useOpenCore33`.
- **Intro** (3 momentos, `core33_intro_seen_at` al salir o saltar), **Explorar retos**, **Detalle**, **Tu Core 33 está listo** (empezar con estados guardando y error) y **el día** (número grande de días cerrados, 33 cápsulas, rachas, "Hoy" con 3 hábitos, final con "Explorar otro Core 33"). Celebración al completar el día 33 (`Celebration`).
- **Hábitos optimistas** (`useCore33Day`): el toque se ve al instante, las escrituras van en cola (el cierre del día se detecta una sola vez aunque se toquen dos seguidos) y un fallo devuelve el hábito con un aviso.
- **Final:** al completar el día 33 se escribe `core33_completed_at` y se reinicia el contador de descartes (`resetCore33InviteCounter`, quitado el `TODO(core33)`). Los eventos `core33_completed` / `core33_finisher` salen una sola vez por la `reference_id` de la participación.
- **Modelo único:** `shared/domain/core33.ts` (lo usan Inicio, Progreso, Perfil y ELLIE) cuenta el día por fechas (no por milisegundos) y con la zona horaria; añade días perdidos. `core33Model.ts` arma la vista del día. 21 tests nuevos.
- Primitivo nuevo: `CapsuleGrid`. `startCore33Challenge` recibe el reto del catálogo.

**Desviaciones**
- **DA-107** · Catálogo de 5 retos en la app (`core33Catalog.ts`); el elegido se guarda en `habits` con ids `core33:<reto>:<n>` y las categorías `training|health|mind` por posición (BT-01 baja a Media).
- **DA-108** · "Elegir este reto" → "Listo" no persiste el reto preparado: "Empezar más tarde" no guarda nada. Antes de BT-01 no hay estado "preparado".
- **DA-109** · Fotos de los retos PLACEHOLDER (barra, movilidad, cuerdas); Recupera mejor y Come con intención usan su figura (7:30, 3·14·2).
- **DA-110** · Sin entrada a ELLIE en Core 33 (el diseño no la tiene).
- **D-69** · **Días perdidos** (no están en el diseño): no terminan el reto; el día del reto avanza por calendario, el número grande son los días cerrados y el reto termina al cerrar 33 (regla ya existente del backend). Solo cortan la racha; el hero muestra "Llevas N días sin cerrar. El reto termina cuando cierres 33."
- **D-70** · **Dejar el reto** (no está en el diseño): menú "…" del día → "Dejar este reto" con confirmación; la participación queda `abandoned` y se vuelve a Explorar retos.
- **D-71** · Inicio calcula el día 33 del último reto con `profiles.core33_completed_at` cuando es posterior a `start_date + 32`, así completar tarde no muestra la tarjeta "Empieza otro" el mismo día.
- **D-73** · **Un solo reto activo (hasta BT-36):** empezar un reto ya no abandona el activo. El servicio lo vuelve a comprobar justo antes de crear y, si hay uno activo, lanza `Core33AlreadyActiveError`; "Listo" muestra "Ya tienes un Core 33 activo…" y el botón pasa a "Ir a mi reto". El activo solo se deja desde "Dejar este reto".
- **D-72** · La pantalla v1 `ChallengeScreen` se retiró del repositorio (la ruta `Core33` apunta a la nueva y el hook cambió de API); las vistas v1 de `features/core33/components` quedan sin uso. "Próximo reto" e historial: el backend no los soporta (BT-01 / BT-02); Progreso · Retos sigue listando los completados.

**QA real pendiente (falcon1989)**
1. Tarjeta de invitación → Intro (primera vez) → Explorar → Detalle → Listo → "Comenzar Día 1": se crea la participación en `challenge_participations` (3 hábitos `core33:<reto>:<n>`) y se abre el día. Comprobar `profiles.core33_intro_seen_at`. Segunda vez: la tarjeta lleva a Explorar.
2. Error al empezar (modo avión): el botón avisa y deja reintentar.
3. Día a día: marcar y desmarcar hábitos (`habit_logs`); marcar los tres seguidos y rápido cierra el día una sola vez (`core33_day_completed` y puntos una vez). Un fallo de red devuelve el hábito con un aviso.
4. Inicio (hero y anillos) y Progreso · Retos muestran el mismo día, días cerrados y racha que la pantalla del día.
5. Día perdido: dejar un día sin cerrar → "Llevas N días sin cerrar…" y la racha vuelve a 0.
6. Completar el día 33 (con una cuenta de prueba que ya esté en el día 33): celebración, `status completed`, `core33_completed_at`, `core33_invite_dismiss_count = 0`, medalla `core33_finisher` una sola vez.
7. Dejar el reto: confirma, queda `abandoned` y vuelve a Explorar.
8. Zona horaria: con el teléfono en otra zona, el día del reto cambia a medianoche local.
9. Empezar con un reto ya activo (otro dispositivo o estado antiguo): "Listo" avisa y lleva al reto activo; no se crea una segunda participación.
10. "Dejar este reto": si el servidor rechaza `status = 'abandoned'` (BT-37), la app muestra el aviso y el reto sigue activo; comprobar el valor en la fila.


## 28. Quiz · portada, inicio de desafío, ronda y resultado (2026-10-04)

Cuenta de prueba: falcon1989@gmail.com (id 7d143a1f-bf73-4481-b8d2-03f0b2e73ec5). **Sin escrituras de prueba**: las escrituras reales (`quiz_attempts`, `quiz_completed`, `quiz_master_unlocked`) solo se validaron con tsc y tests de lógica. **Sin capturas Light/Dark**: el binario instalado en el simulador es anterior a Reanimated nativo (se cierra al arrancar) y las pantallas dev exigen sesión iniciada; hay que hacerlas tras recompilar. Plan y mapeo dato → fuente: `QUIZ_CHECKPOINT.md`.

**Hecho**
- **Portada** (QUIZ_01): puntos, semana de juego, desafío del día, desafíos con el récord en un anillo, progreso a Quiz Master y últimas rondas, con skeleton, error con reintento y vacío.
- **Inicio de desafío** (QUIZ_02, nueva ruta `QuizChallenge`), **ronda** (QUIZ_03–06: respuesta con un toque, +N flotante, racha ×2/×3 que enciende barra y fondo, respuesta correcta y explicación si existe, salir con confirmación también con el gesto atrás) y **resultado** (QUIZ_07–09: anillo, mensaje por nivel, puntos / racha / total, "Repasemos esto", "Otra ronda" y "Siguiente desafío").
- **Guardado en el Resultado**: guarda al llegar (guardando, error con reintento, aviso si el intento se guardó pero la recompensa quedó pendiente). El `id` del intento es estable, así que reintentar no duplica filas ni eventos. Salir sin guardar pide confirmación.
- **Celebración** (`Celebration`) por cada medalla de `new_badges` de la respuesta del servidor (`first_quiz`, `quiz_master`); la regla de Quiz Master que decide si se envía el evento vive en `completesQuizMaster` (modelo puro).
- **Estado estable en segundo plano**: la ronda vive en un reducer y las preguntas no se vuelven a pedir (sin refetch, una entrada de caché por ronda; "Otra ronda" sortea otras).
- **Modelo puro** `features/quiz/quizModel.ts` (racha, puntos, resumen, mejor intento, récord, Quiz Master, selección y barajado de la ronda, semana, desafío del día, historial); `quizMastery` de Inicio delega en él. 31 tests nuevos.
- **Primitivos v2 nuevos**: `ProgressRing`, `SegmentMeter`, `AnswerTile`; `Celebration.valueSize`; `haptics.error`.
- **Conexiones**: Inicio (banner) y Notificaciones ya abrían `QuizLanding`; Logros lee `get_badge_progress` (se invalida al guardar). El diseño no tiene entrada desde Progreso, Retos, Logros ni ELLIE.
- **Dev**: menú "Ver pantallas de Quiz" y `athelete://dev/quiz?screen=<clave>` (24 estados con datos de ejemplo, sin leer ni escribir).

**Desviaciones**
- **DA-111** · La racha ×2/×3 se calcula en la app y viaja en `points_earned` / `answers[].pointsEarned`; el Resultado muestra `points_added` del servidor (BT-38).
- **DA-112** · "NIVEL N" no tiene datos: la etiqueta de la card es el estado real (SIN JUGAR · N RONDAS · COMPLETADA).
- **DA-113** · "Desafío del día" derivado: rota por día entre las categorías no completadas (BT-40).
- **DA-114** · Las fotos de las categorías son PLACEHOLDER (overhead, barra, movilidad) con el tratamiento del handoff horneado (`assets/v2/photos/quiz`), elegidas por palabra clave del slug; las desconocidas rotan.
- **DA-115** · "Repasemos esto" muestra el texto de las preguntas falladas (no hay campo de tema, BT-40).
- **DA-116** · El guardado ocurre en la pantalla de Resultado (no al pulsar "Ver resultado") para tener guardando / error con reintento; el bono de 25 puntos por ronda perfecta ya existía y se mantiene.
- **DA-117** · Una categoría con menos de 10 preguntas juega con las que tenga; "perfecto" y los niveles se miden por proporción (≥ 60 % = medio).
- **DA-118** · El récord es el mejor `score` (porcentaje) de `quiz_attempts`; "nuevo récord" exige superarlo.
- **D-74** · **Quiz Master en la portada** (no está en el diseño): fila con una barra de un segmento por categoría y la línea "N de M categorías al 100 %".
- **D-75** · **Últimas rondas** con datos reales (el prototipo trae dos de ejemplo); sin rondas, la sección no aparece.
- **D-76** · El halo de la ronda y del resultado es un degradado lineal vertical (el prototipo usa radial); las ondas del resultado son anillos animados.
- **D-77** · Ronda y resultado son escena en Light y Dark (valores de Light, como D-04, D-05, D-06, D-18, D-19, D-20).

**Bloqueos y pendientes**: BT-38 (puntos con racha), BT-39 (que el servidor decida `quiz_master`), BT-40 (tema, nivel, foto y desafío del día). Si la portada se abre sin que el resumen de Quiz haya cargado, "Nuevo récord" puede mostrarse en la primera ronda de una categoría ya jugada (el récord previo se toma del resumen cacheado).

**Checklist de QA real (falcon1989)**: `QA_CHECKLIST.md` · Bloque 9b (13 pasos: portada, ronda, segundo plano, guardado y reintento, récord, niveles, repetir, Primer Quiz, Quiz Master, Logros, error sin red y puntos con racha).

**Componentes v1 sin uso (no borrados)**: `features/quiz/components/QuizAnswerOption`, `QuizCategoryCard`, `QuizProgressHeader`, `QuizScoreSummaryCard`; `features/home/components/QuizPromoCard`.
