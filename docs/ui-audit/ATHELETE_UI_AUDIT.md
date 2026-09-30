# Auditoría visual de Athelete

Fecha: 2026-09-25
Alcance: captura y documentación del estado real de la app en el simulador iOS (iPhone 17, iOS 26.2), sin cambios de código, estilos ni navegación.

Cuenta usada: cuenta personal del usuario (nicolas.falcon0@gmail.com), confirmada explícitamente como aceptable para esta auditoría (no era una cuenta de prueba con datos ficticios). Algunas capturas muestran nombre, email, peso, edad y fecha de nacimiento reales.

Herramientas: `xcrun simctl` (screenshots) + Maestro CLI 2.10.0 con un JDK portátil instalado en `~/.local-jdk` (sin tocar Homebrew/sudo) para automatizar tap/scroll. Todas las capturas fueron tomadas navegando la app real en ejecución; ninguna fue generada a partir de código o mockups.

---

## 1. Inventario de pantallas

Estructura de navegación real (confirmada por lectura de código en `src/navigation/`): `RootNavigator` → `AuthStackNavigator` | `OnboardingStackNavigator` | `MainTabNavigator` (5 tabs, cada uno con su propio stack).

| # | Módulo | Pantalla (route) | Estado | Capturada |
|---|--------|-------------------|--------|-----------|
| 1 | Auth | Login | Implementada | ✅ `00-auth-01-login.png` |
| 2 | Auth | Register | Implementada | ❌ no navegada (requería cerrar sesión de nuevo; se priorizó no interrumpir la sesión activa) |
| 3 | Auth | ForgotPassword | Implementada | ❌ no navegada |
| 4 | Auth | ResetPassword | Implementada (flujo deep-link) | ❌ no accesible sin email de recuperación real |
| 5 | Onboarding | Welcome, Avatar, BirthDate, Gender, Weight, Height, TrainingFrequency, GoalSelection, Complete | Implementadas | ❌ no navegadas — la cuenta usada ya completó el onboarding; no hay forma de re-entrar sin crear una cuenta nueva |
| 6 | Onboarding | VisualOnboardingScreen (intro swipeable) | Implementada, se muestra una sola vez | ❌ no navegada (ya vista previamente por la cuenta) |
| 7 | Home | Home (dashboard) | Implementada | ✅ `01-home-01-inicial.png`, `01-home-02-scroll.png`, `01-home-03-scroll-final.png` |
| 8 | Home | Notifications | Implementada | ✅ `01-home-04-notifications.png` |
| 9 | Workouts | Workouts root — tab "Rutinas" | Implementada | ✅ `03-workouts-01-rutinas.png` |
| 10 | Workouts | Workouts root — tab "Ejercicios" (biblioteca) | Implementada | ✅ `03-workouts-02-ejercicios.png` |
| 11 | Workouts | Ejercicios filtrados por zona (ej. Pecho) | Implementada | ✅ `03-workouts-03-ejercicios-pecho.png` |
| 12 | Workouts | ExerciseDetail | Implementada | ✅ `03b-exercise-detail-01.png` |
| 13 | Workouts | WorkoutDetail — tab "Resumen" | Implementada | ✅ `03c-workout-detail-01.png` |
| 14 | Workouts | WorkoutDetail — tabs "Ejercicios" / "Reviews" | Implementadas | ❌ no capturadas — el tap no logró cambiar de sub-tab (posible problema de hit-target, ver hallazgos) |
| 15 | Workouts | WorkoutSession (checklist activo) | Implementada | ✅ `03d-workout-session-01.png` |
| 16 | Workouts | Modal "¿Guardar para continuar después?" | Implementada | ✅ `03e-workout-session-modal-guardar.png` |
| 17 | Workouts | CreateRoutine / EditRoutine (wizard, paso 1 de 3) | Implementada | ✅ `03f-create-routine-01.png` (pasos 2 y 3 no navegados para no crear datos falsos) |
| 18 | Workouts | AddExerciseToRoutine | Implementada | ❌ no navegada (dentro del wizard de creación, no se completó el flujo) |
| 19 | Ellie | Ellie root (accesos rápidos) | Implementada | ✅ `04-ellie-01-inicial.png` |
| 20 | Ellie | Chat de Ellie | Implementada | ✅ `04-ellie-02-chat.png` |
| 21 | Progress | Dashboard — Entreno / Nutrición / Hidratación / PRs | Implementada | ✅ `05-progress-01-inicial.png`, `05-progress-02-scroll.png`, `05-progress-03-scroll2.png` |
| 22 | Progress | Retos (tab) | Implementada | ✅ `05-progress-04-retos.png` |
| 23 | Progress | BodyScience / BodyScienceArticleDetail | Implementada en código (`src/screens/progress/BodyScienceScreen.tsx`) | ❌ **no accesible** — no se encontró ningún punto de entrada visible en Home, Progress ni Ellie durante esta sesión |
| 24 | Core 33 | Core33Tracker (dentro de ChallengeScreen) | Implementada | ✅ `06-core33-01-tracker.png` |
| 25 | Core 33 | Core33Intro / Core33HabitSelection / Core33Summary | Implementadas | ❌ no accesibles — la cuenta ya tiene el reto iniciado (día 33/33), por lo que solo se muestra el Tracker |
| 26 | PR | PersonalRecords (detalle por ejercicio) | Implementada | ✅ `07-personal-records-01.png` |
| 27 | PR | RegisterPr | Implementada | ✅ `08-register-pr-01.png` (sin guardar, para no crear datos) |
| 28 | Quiz | QuizLanding ("Aprende y gana") | Implementada | ✅ `10-quiz-landing-01.png` |
| 29 | Quiz | QuizQuestion | Implementada | ✅ `11-quiz-question-01.png` |
| 30 | Quiz | QuizResult | Implementada | ✅ `12-quiz-result-01.png` |
| 31 | Nutrition | NutritionPlan (plan activo) | Implementada | ⚠️ **bloqueada por bug** — ver hallazgos. Se capturó la tarjeta de plan generado por Ellie (`16-nutrition-plan-01-ellie-card.png`) y el error al activarlo (`16-nutrition-plan-02.png`) |
| 32 | Profile | Profile — tab "Perfil" | Implementada | ✅ `13-profile-01-inicial.png` |
| 33 | Profile | Profile — tab "Plan" (en realidad ancla de scroll, no ruta propia) | Implementada | ✅ `13-profile-02-plan.png` |
| 34 | Profile | Achievements ("Logros") | Implementada | ✅ `14-achievements-01.png` (vista embebida); el botón "Ver todos" no navegó dentro de la app — ver hallazgos |
| 35 | Profile | EditProfile | Implementada | ✅ `15-edit-profile-01.png` |
| 36 | Profile | Preferencias (apariencia, notificaciones) | Implementada — sección dentro de Profile, no ruta propia | ✅ visible en `14-achievements-01.png` / `13-profile-02-plan.png` |
| 37 | Profile | Cuenta / Cerrar sesión | Implementada | ✅ visible en las mismas capturas; el tap sobre "Cerrar sesión" no completó la acción en esta sesión (ver hallazgos) |
| 38 | Común | `PlaceholderScreen.tsx` | Definida en código, **no registrada en ningún navigator** | ❌ inaccesible — código muerto/scaffold, no es una pantalla real de producto |
| 39 | Modales | Presentación modal nativa (`presentation: 'modal'`) | **No existe** en ningún navigator | — todos los "modales" observados (ej. guardar sesión) son overlays dentro de la misma pantalla, no rutas modales de React Navigation |
| 40 | Settings | Pantalla de Settings dedicada | **No existe** | — la configuración vive dentro de Profile (Preferencias/Cuenta) |

### Notas sobre rutas duplicadas
Varias pantallas están registradas de forma independiente en varios stacks de tabs (Home, Workouts, Progress, Profile, Ellie) pero usan el mismo componente: `WorkoutDetail`, `WorkoutSession`, `ExerciseDetail`, `CreateRoutine`/`EditRoutine`, `AddExerciseToRoutine`, `PersonalRecords`, `RegisterPr`, `Challenge`, `NutritionPlan`. Se documentan una sola vez en este informe.

---

## 2. Recorrido de navegación realizado

1. Login (cuenta real) → Home
2. Home → Notificaciones → volver
3. Home → tab Workouts → tab Ejercicios → filtro "Pecho" → detalle de ejercicio → volver
4. Workouts → "Ver rutina" → WorkoutDetail (Resumen) → "Empezar rutina" → WorkoutSession → modal "Guardar para continuar después" → "Guardar y salir" → WorkoutDetail ("Reanudar sesión")
5. Workouts → "+" → CreateRoutine (paso 1 de 3) → volver sin guardar
6. Tab Ellie → chat (mensaje ya existente en el historial de la cuenta)
7. Tab Progress → Dashboard → scroll → tab Retos → "Continuar reto" → Core33Tracker
8. Progress → PR badge → PersonalRecords (detalle) → "Registrar nuevo PR" → RegisterPr (sin guardar)
9. Home → tarjeta "Aprende y gana puntos" → QuizLanding → categoría "Entrenamiento" → 10 preguntas respondidas → QuizResult
10. Tab Profile → Perfil / Plan / Logros / Preferencias / Cuenta (misma pantalla, scroll) → "Editar" → EditProfile → volver
11. Ellie → acción rápida "Plan nutricional" → chat con tarjeta de plan generado → "Activar plan" → **error** "No pudimos activar el plan" → Home → tarjeta "Sin plan" → volvió a abrir el chat de Ellie (no una pantalla NutritionPlan dedicada)

---

## 3. Hallazgos observables (comprobados en la app real)

1. **Bug confirmado — Activar plan nutricional falla.** Al pedirle a Ellie un plan nutricional y tocar "Activar plan", la app muestra un diálogo nativo de error: *"No pudimos activar el plan — No pudimos activar el plan nutricional."* (`16-nutrition-plan-02.png`). No se pudo llegar a la pantalla `NutritionPlanScreen` con un plan activo por este motivo.
2. **Warning de desarrollo visible en runtime.** Tras completar el quiz apareció un banner amarillo de React Native: *"Open debugger to view warnings."* (`12-quiz-result-01.png`), señal de que algo dispara un `console.warn` durante ese flujo. No se identificó la causa exacta (fuera del alcance de esta auditoría visual).
3. **Las tarjetas "Plan nutricional" (Ellie) y "Sin plan" (Home) no navegan a una pantalla dedicada.** Ambas abren el chat de Ellie con un mensaje predefinido en lugar de ir directo a `NutritionPlanScreen`, lo cual es inconsistente con tarjetas equivalentes como "Registrar PR" o "Ver rutina", que sí navegan directo.
4. **Sub-tabs "Ejercicios"/"Reviews" dentro de WorkoutDetail no respondieron al tap** en varios intentos (con Maestro, usando coordenadas verificadas contra la jerarquía de accesibilidad). Puede ser un problema real de hit-target/z-index del componente de tabs, o una limitación del entorno de automatización; no se pudo confirmar cuál con certeza — **hipótesis, requiere validación manual**.
5. **"Ver todos" en Logros no navegó dentro de la app** en el intento realizado — la sesión de automatización terminó en el springboard de iOS, lo que sugiere que el tap cayó fuera del área táctil del botón o se disparó un gesto del sistema. **Hipótesis, requiere validación manual** (no se pudo confirmar si es un bug de la app o un error de coordenadas de la automatización).
6. **"Cerrar sesión" no completó el logout** en el intento final de esta sesión (se optó por no insistir para no perder el estado de la cuenta antes de terminar la auditoría). **Hipótesis, requiere validación manual.**
7. **`PlaceholderScreen.tsx` es código muerto.** Existe en `src/screens/common/` pero no está registrado en ningún navigator — no es alcanzable por ningún usuario.
8. **No hay pantalla de Settings dedicada ni modales nativos de React Navigation.** Toda la configuración vive dentro de Profile como secciones de scroll, y los overlays (como el diálogo de guardar sesión) se implementan como componentes superpuestos, no como rutas `presentation: 'modal'`.

## 4. Componentes compartidos observados

- `src/components/ui/`: `Button`, `PrimaryButton`, `SecondaryButton`, `Card`, `Chip`, `CircularProgress`, `EmptyState`, `HorizontalItemRail`, `Loader`, `ProgressBar`, `SearchField`, `SectionTitle`, `SegmentedControl`, `TabIcon`, `TextInput` — primitivas de diseño reutilizadas en toda la app.
- `FloatingTabBar` (tab bar inferior flotante) — consistente en las 5 pestañas principales.
- Tarjetas con patrón "icono + título + CTA con flecha" repetidas en Home, Ellie, Progress y Profile (ej. "Ver rutina →", "Consultar guía →", "Ver insights →").
- Botones tipo pill negro/blanco para segmentación (Rutinas/Ejercicios, Dashboard/Retos, Semana/Mes, Claro/Oscuro/Sistema).

## 5. Oportunidades de consistencia visual (observaciones, no confirmadas como problemas de diseño)

- El patrón de navegación de tarjetas es inconsistente: algunas tarjetas navegan directo a una pantalla (ej. "Ver rutina"), otras abren el chat de Ellie con un mensaje prellenado (ej. "Plan nutricional", "Sin plan"). Esto podría confundir el modelo mental del usuario sobre qué esperar al tocar una tarjeta.
- Los sub-tabs (Rutinas/Ejercicios, Resumen/Ejercicios/Reviews, Dashboard/Retos, Perfil/Plan/Logros/Preferencias/Cuenta) usan el mismo estilo visual pero se comportan distinto: algunos son pantallas separadas, otros son anclas de scroll dentro de la misma pantalla. Vale la pena unificar el patrón o al menos el feedback visual.
- Las capturas de "Ejercicios" en Workouts, Home y Progress muestran los mismos datos placeholder de biblioteca ("Total Body Dumbbell", "Athletic Conditioning") repetidos — sugiere contenido semilla limitado más que un problema visual.

---

## 6. Índice de capturas

Todas las capturas están en `docs/ui-audit/screenshots/`. Ver también los contact sheets en `docs/ui-audit/contact-sheets/` agrupados por módulo:

- `contact-sheet-01-auth-onboarding.png`
- `contact-sheet-02-home.png`
- `contact-sheet-03-workouts.png`
- `contact-sheet-04-ellie.png`
- `contact-sheet-05-progress-core33.png`
- `contact-sheet-06-pr-quiz.png`
- `contact-sheet-07-profile.png`
- `contact-sheet-08-nutrition.png`

| Archivo | Pantalla |
|---|---|
| `00-auth-01-login.png` | Login |
| `01-home-01-inicial.png` | Home (tope) |
| `01-home-02-scroll.png` | Home (scroll medio) |
| `01-home-03-scroll-final.png` | Home (scroll final) |
| `01-home-04-notifications.png` | Notifications |
| `03-workouts-01-rutinas.png` | Workouts — Rutinas |
| `03-workouts-02-ejercicios.png` | Workouts — Ejercicios (landing) |
| `03-workouts-03-ejercicios-pecho.png` | Ejercicios filtrados — Pecho |
| `03b-exercise-detail-01.png` | ExerciseDetail |
| `03c-workout-detail-01.png` | WorkoutDetail — Resumen |
| `03d-workout-session-01.png` | WorkoutSession |
| `03e-workout-session-modal-guardar.png` | Modal guardar sesión |
| `03f-create-routine-01.png` | CreateRoutine — paso 1 |
| `04-ellie-01-inicial.png` | Ellie — landing |
| `04-ellie-02-chat.png` | Ellie — chat |
| `05-progress-01-inicial.png` | Progress — Dashboard (tope) |
| `05-progress-02-scroll.png` | Progress — Dashboard (scroll) |
| `05-progress-03-scroll2.png` | Progress — Dashboard (scroll, Hidratación/PRs) |
| `05-progress-04-retos.png` | Progress — Retos |
| `06-core33-01-tracker.png` | Core 33 — Tracker |
| `07-personal-records-01.png` | PersonalRecords (detalle) |
| `08-register-pr-01.png` | RegisterPr |
| `10-quiz-landing-01.png` | QuizLanding |
| `11-quiz-question-01.png` | QuizQuestion |
| `12-quiz-result-01.png` | QuizResult |
| `13-profile-01-inicial.png` | Profile — Perfil |
| `13-profile-02-plan.png` | Profile — Plan/Logros/Preferencias |
| `14-achievements-01.png` | Achievements (embebido) |
| `15-edit-profile-01.png` | EditProfile |
| `16-nutrition-plan-01.png` | Ellie — respuesta plan nutricional (texto) |
| `16-nutrition-plan-01-ellie-card.png` | Ellie — tarjeta de plan generado |
| `16-nutrition-plan-02.png` | Error al activar plan |
| `16-nutrition-plan-03-empty.png` | Ellie — landing (tras error) |

---

## 7. Pantallas no capturadas (resumen con motivo)

| Pantalla | Motivo |
|---|---|
| Register, ForgotPassword, ResetPassword | No se cerró sesión de forma sostenida para no perder el estado de la cuenta antes de terminar la auditoría |
| Todo el flujo de Onboarding (9 pantallas + intro visual) | La cuenta usada ya completó el onboarding; no hay forma de reabrirlo sin una cuenta nueva |
| WorkoutDetail — tabs "Ejercicios"/"Reviews" | El tap no cambió de sub-tab en ningún intento |
| AddExerciseToRoutine | No se completó el wizard de creación de rutina para evitar crear datos falsos |
| CreateRoutine — pasos 2 y 3 | Mismo motivo |
| BodyScience / BodyScienceArticleDetail | No se encontró punto de entrada visible en la UI durante esta sesión |
| Core33Intro / HabitSelection / Summary | La cuenta ya tiene el reto iniciado en día 33/33; solo se muestra el Tracker |
| NutritionPlan con plan activo | Bloqueada por el bug de activación (hallazgo #1) |
| Achievements — vista completa ("Ver todos") | El tap salió de la app al springboard de iOS en el intento realizado |
