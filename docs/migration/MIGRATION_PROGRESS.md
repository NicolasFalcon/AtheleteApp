# ATHELETE v2 · Migration Progress

Rama: `feature-migration` · Fuente única: `migration-source/ATHELETE Alive Minimalism/` (handoff v2, índice visual, `*.dc.html`, `Athelete App.dc.html`, `support.js`, `images/`, `icons/`, `references/`). El resto de `migration-source/` se ignora. Si el código contradice el handoff, manda el handoff; los valores exactos salen de los HTML.

> Este documento se versiona en `docs/migration/`. La carpeta del handoff (`migration-source/ATHELETE Alive Minimalism/`) sigue en `.gitignore`.
> Recreado el 2026-09-30 tras reemplazar la carpeta del handoff (la versión anterior se perdió).

---

## 0. Estado por fase

| Fase | Estado | Cierre |
|---|---|---|
| 0 · Auditoría | ✅ Cerrada | 2026-09-30 |
| 0.5 · Prerrequisitos y bugs | ✅ Cerrada (bugs B1/B2 pendientes de backend, §8.2; dependencias movidas a la fase 2) | 2026-09-30 |
| 1 · Tokens | 🟡 En planificación | — |
| 2 · Primitivas (incluye instalar las 4 dependencias) | ⏳ | — |
| 3 · Pilotos (Ajustes, Inicio, Detalle de rutina, Progreso, hoja Registrar récord) | ⏳ | — |
| 4 · Navegación final | ⏳ | — |
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

Nota: en QuizDark, la ronda y el resultado son escenas oscuras en ambos modos; esas líneas deben ser idénticas a `Quiz.dc.html`.

---

## 7. Tokens para la fase 1

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
| 4 · Tipos de Supabase | ⏸ **Pendiente backend** (requiere `supabase login`; ref `eqbabbaxfwqfhbtrraoz`) |
| 5 · Borrar `PlaceholderScreen` | ✅ Commit `5664fdd chore: remove unused PlaceholderScreen`. `tsc`, `jest` (34/34) y lint en verde; iOS arranca y navega las 5 tabs |
| 6 · Dependencias | ↪ **Movidas al inicio de la fase 2**, cuando se usen. Orden y versiones se mantienen: Reanimated 4.6.x + worklets 0.12.x (4.7 exige RN ≥ 0.86) → `@gorhom/bottom-sheet@5` → `react-native-haptic-feedback@3` → `@react-native-community/blur@4.4` |
| 7 · Cierre | ✅ Este documento |

Funcionalidad nueva (Social, HealthKit, Scan, etc.): después de la migración visual, cada una en su propia rama.

### 8.1 Verificación Android pendiente

| Paso | iOS | Android |
|---|---|---|
| 1 · Seguimiento + `.gitignore` | n/a (sin código) | n/a |
| 5 · Borrar `PlaceholderScreen` | ✅ | ⏳ Pendiente |

### 8.2 Pendiente backend

| ID | Tema | Detalle |
|---|---|---|
| BK-01 | RPC `award_gamification_event` falla (`42P10`) | Afecta a quiz y nutrición (comprobado) y previsiblemente al resto de eventos. Puntos y badges no se otorgan. Incluye el arreglo de B1 en la app |
| BK-02 | Tipos de Supabase desactualizados | Faltan `personal_records`, `chat_messages`, `quiz_*`, `user_badges` |

---

## 9. Pendiente de decisión

| Tema | Detalle |
|---|---|
| Body Science | Existe en código, sin entrada visible; sin lugar en v2 |
| Favoritos (rails y pantallas) | Solo el chip "Solo favoritos" existe en v2 |
| Hidratación (tarjetas propias) | v2 la absorbe en Tu día y Nutrición |
| RecoveryGuidance | Card de Inicio que abre ELLIE |
| Premium | Solo flag `is_premium` (siempre `false`); sin UI |

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
