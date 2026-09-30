# Athelete — Handoff para Claude Code Design

Este documento acompaña a `ATHELETE_UI_AUDIT.md` y las capturas en `docs/ui-audit/screenshots/` y `docs/ui-audit/contact-sheets/`. Está pensado para importarse en Claude Code Design como punto de partida de una futura revisión visual — no propone rediseños, solo documenta el estado actual.

## Qué es Athelete

App móvil de fitness (React Native 0.85, iOS/Android) con seguimiento de entrenamientos, nutrición, progreso, récords personales, un coach conversacional con IA ("ELLIE") y un reto de hábitos de 33 días ("Core 33"). Backend sobre Supabase.

## Identidad visual actual (observada en las capturas, no confirmada contra tokens de diseño)

- **Paleta**: base clara (blanco/gris muy claro `#F5F5F0`-ish) con acentos en negro puro para CTAs primarios y texto de alto contraste. Colores de estado (verde, azul, naranja) aparecen en badges de dificultad y métricas, pero no se auditó su consistencia sistemática.
- **Tipografía**: sans-serif bold para títulos grandes (Home, encabezados de sección), peso regular para cuerpo de texto.
- **Forma**: esquinas muy redondeadas en casi todos los componentes — botones pill, tarjetas con radio grande, tab bar flotante con forma de píldora.
- **Modo oscuro**: existe un selector Claro/Oscuro/Sistema en Preferencias (`13-profile-02-plan.png`), pero esta auditoría se hizo enteramente en modo claro/sistema — el modo oscuro no fue verificado visualmente.
- **Iconografía**: set de íconos lineales simples (mancuerna, brote/hoja para nutrición, gota para hidratación, trofeo para PRs, cerebro para quiz) consistente entre módulos.

## Inventario de módulos (ver detalle completo en ATHELETE_UI_AUDIT.md)

1. **Auth** — Login, Register, ForgotPassword, ResetPassword
2. **Onboarding** — wizard de 8 pasos + intro visual swipeable
3. **Home** — dashboard con tarjeta prioritaria (entreno o Core 33), resumen "Tu día", notificaciones
4. **Workouts** — biblioteca de rutinas y ejercicios, detalle, sesión activa, creación de rutina
5. **Ellie** — coach IA conversacional con accesos rápidos y tarjetas generativas (planes, recomendaciones)
6. **Progress** — dashboard de métricas (entreno, nutrición, hidratación), PRs, retos
7. **Core 33** — reto de hábitos de 33 días, embebido dentro de Progress → Retos
8. **Quiz** — trivia de fitness/nutrición/ciencia del cuerpo con puntos
9. **Nutrition** — plan generado por Ellie (parcialmente bloqueado por bug, ver hallazgos)
10. **Profile** — datos personales, plan actual, logros, preferencias, cuenta

## Patrones compartidos

- Tarjeta "prioridad" en Home: imagen de fondo oscura + badge "PRIORIDAD" + CTA blanco pill. Se reutiliza para mostrar el entreno del día o el reto Core 33 activo, lo que sea más urgente.
- Grid de stats 2x2 (Total/Tiempo, Prom/Activos, etc.) reutilizado en Progress y Profile.
- Segmented control pill negro/blanco para alternar vistas dentro de una misma pantalla (Rutinas/Ejercicios, Dashboard/Retos, Semana/Mes, Claro/Oscuro/Sistema).
- Tab bar flotante de 5 ítems (`FloatingTabBar`) con el ítem activo relleno en negro.
- Tarjetas "icono + texto + flecha →" para navegación secundaria, usadas de forma inconsistente: algunas navegan directo, otras abren el chat de Ellie (ver hallazgo de UX abajo).

## Restricciones de UX detectadas durante la auditoría

- **No existe pantalla de Settings dedicada** — vive dentro de Profile como secciones de scroll.
- **No hay modales nativos de React Navigation** (`presentation: 'modal'`) — los overlays (ej. confirmación al salir de una sesión de entreno) se implementan como componentes superpuestos dentro de la misma pantalla.
- **Rutas duplicadas por tab**: pantallas como `WorkoutDetail`, `PersonalRecords`, `RegisterPr`, `Challenge` y `NutritionPlan` están registradas de forma independiente en varios stacks (Home, Workouts, Progress, Profile, Ellie) pero comparten el mismo componente visual — cualquier cambio de diseño debe aplicarse una sola vez pero probarse desde cada tab de entrada.
- **Navegación inconsistente en tarjetas de acción rápida**: ver hallazgo #3 en la auditoría — algunas tarjetas van directo a la pantalla destino, otras abren el chat de Ellie con un mensaje prellenado.
- **Bug activo**: activar un plan nutricional generado por Ellie falla con un error nativo (ver hallazgo #1). Cualquier trabajo de diseño sobre el módulo de Nutrition debería considerar que el estado "con plan activo" no pudo verificarse visualmente en este momento.

## Objetivos sugeridos para la futura revisión de diseño

(Sugerencias basadas en lo observado, a validar con el equipo — no son decisiones tomadas)

1. Unificar el patrón de navegación de tarjetas de acción rápida (directo vs. vía chat de Ellie).
2. Definir un tratamiento visual consistente para distinguir "sub-tab = pantalla nueva" vs. "sub-tab = ancla de scroll", ya que hoy se ven idénticos pero se comportan distinto.
3. Revisar y confirmar visualmente el modo oscuro (no evaluado en esta auditoría).
4. Evaluar si el patrón de tarjeta "PRIORIDAD" en Home escala bien cuando hay más de un elemento urgente (hoy solo se vio un caso a la vez: entreno o Core 33).
5. Auditar el contenido semilla de la biblioteca de ejercicios/rutinas, que se repite idéntico en varios módulos (Home, Workouts, Progress).

## Enlaces relativos

- Inventario completo y hallazgos: [`ATHELETE_UI_AUDIT.md`](./ATHELETE_UI_AUDIT.md)
- Capturas individuales: [`screenshots/`](./screenshots/)
- Contact sheets por módulo: [`contact-sheets/`](./contact-sheets/)

## Cómo abrir esto en Claude Code Design

En una sesión de Claude Code dentro de este repo, pídele a Claude que "cree un Design a partir de docs/ui-audit/ para Athelete" (o usa el flujo de Claude Docs/Design del cliente) y adjunta este archivo junto con `ATHELETE_UI_AUDIT.md` y las imágenes de `screenshots/` y `contact-sheets/` como material de referencia. Claude puede leer estos archivos directamente del repo sin necesidad de subirlos manualmente.
