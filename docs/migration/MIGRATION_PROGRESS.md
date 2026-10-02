# ATHELETE v2 · Migration Progress

Rama: `feature-migration` · Fuente única: `migration-source/ATHELETE Alive Minimalism/` (handoff v2, índice visual, `*.dc.html`, `Athelete App.dc.html`, `support.js`, `images/`, `icons/`, `references/`). El resto de `migration-source/` se ignora. Si el código contradice el handoff, manda el handoff; los valores exactos salen de los HTML.

> Este documento se versiona en `docs/migration/`. La carpeta del handoff (`migration-source/ATHELETE Alive Minimalism/`) sigue en `.gitignore`.
> Recreado el 2026-09-30 tras reemplazar la carpeta del handoff (la versión anterior se perdió).

---

> **Fase 2 (2026-09-30)**: resumen en 2 minutos, decisiones asumidas, problemas y commits propuestos en **§11**.
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
