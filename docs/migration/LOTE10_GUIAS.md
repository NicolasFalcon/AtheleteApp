# Lote 10 · Guías (tutoriales)

Solo app. Diseño: handoff v2.15 §25.4 (COACH_01) y `TOURS` de `Athelete App.dc.html`.

Estado al 21-10-2026:
- Hecho en código.
- **Sin compilar y sin probar**.
- Solo `tsc --noEmit` (0 errores). Sin jest, sin eslint y sin tests nuevos.
- Sin commits.
- No cambia ninguna lógica de Ruta, Comunidad, ELLIE, Sesión ni MoveKitPlayer: las guías solo envuelven elementos para poder señalarlos.

## 1 · Sistema de guías (25.4)

- **Un tour por pantalla**, con los pasos, textos y destinos del prototipo (máximo 4).
  - Aparece **0,9 s** después de entrar en la pantalla, la primera vez.
  - **Se marca como vista al mostrarse**, una vez por usuario.
  - **Saltar** la cierra; **Siguiente / Entendido** avanza o termina.
  - En los pasos "toca", tocar el elemento iluminado avanza solo, a los 0,3 s, y su acción ocurre igual (abrir Tu semana, sumar un vaso…).
  - Cambiar de pantalla la cierra.
- **"Visto"** se guarda en el dispositivo y por usuario (`@athelete/guides/<userId>`). Otra cuenta en el mismo iPhone vuelve a verlas.
- **Anclas estables** (25.10.9): `GuideAnchor id="…"` envuelve el elemento sin cambiar su comportamiento. El toque se detecta con `onTouchEnd` del contenedor. No se busca nada por texto.
- **Vista** (§25.4):
  - Velo `rgba(10,9,8,.64)` en cuatro paneles. El hueco tiene 6 pt de margen, y por él los toques llegan al elemento real.
  - Anillo Ember de 2 pt y halo de 8 pt al 22 %.
  - Ficha `#141312`, radio 22, a 16 pt de los lados: debajo del elemento si está en la mitad superior, encima si no, y a 330 pt sin elemento. Flecha de 14 pt girada 45°.
  - "● GUÍA · n DE N", Saltar, título 17/600, texto 14 `#D8D6D1`, y puntos de 4 pt (el activo de 16 pt en Ember).
  - Botón: pill blanca de 44 pt, o "● Toca lo iluminado" con un punto que respira.
  - Transiciones de 0,35 s `cubic-bezier(.2,.8,.2,1)`.
  - Si el elemento queda fuera de la vista, primero se desplaza el scroll para dejarlo en torno al 42 % de la altura.
- **Cuándo no aparece:**
  - con una hoja abierta (`Sheet` se registra al abrirse; si se abre una hoja, la guía en curso se cierra);
  - si la app no está activa (diálogos del sistema, como permisos);
  - en **Sesión activa** y en **Ruta en grabación** (`WorkoutSession`, `RouteActive`);
  - mientras está la pantalla de arranque: espera a que desaparezca.
- **"Reducir movimiento":** sin transiciones ni fundidos, el scroll salta sin animación y el punto de "Toca lo iluminado" queda fijo.

## 2 · Ajustes → "Ver guías de nuevo"

- Fila en "Sonidos y vibración" que reinicia **todas** las guías. El diseño no tiene reinicio por pantalla: el prototipo solo tiene "Reiniciar guías".
- Muestra el toast "Las guías volverán a aparecer". Cada guía sale la próxima vez que se entra en su pantalla.

## 3 · Textos es / en

- Todos los pasos y los textos de la ficha (GUÍA · n DE N / GUIDE · n OF N, Saltar/Skip, Siguiente/Next, Entendido/Got it, Toca lo iluminado/Tap the highlighted area) están en es y en, según el idioma del perfil.
- La fila de Ajustes queda en español, como el resto de esa pantalla.

## Pantallas con guía

| Pantalla | Pasos | Destinos |
|---|---|---|
| Inicio | 4 | Portada (hero) · Tu día (anillos) · +1 vaso (toca) · Tu semana (toca) |
| Tu semana | 4 | Días · Cambiar/Elegir rutina (tarjeta de hoy) · Otra/Sesión con ELLIE (hoy) · Planificar la semana |
| Core 33 | 3 | Sin elemento iluminado (25.4) |
| Escanear máquina | 3 | Marco · Galería · Disparar (toca). Solo con la cámara activa. |
| Cámara de Calorías | 3 | Galería · Sin foto · Foto al plato (toca). Solo con la cámara activa. |
| Progreso | 3 | Curva (hero) · Cápsulas de la semana · Retos (toca), en Resumen |
| Ruta (Preparar) | 3 | Deporte · Privacidad · Comenzar (toca), antes de grabar |

**Diferencias con el prototipo:**

| Prototipo | App | Motivo |
|---|---|---|
| **Sesión activa** (4 pasos) | **Sin guía** | La regla "no aparece durante una sesión" choca con una guía que vive dentro de la sesión. Se aplicó la regla. Si se quiere, se puede activar después (por ejemplo, al abrir la sesión antes de la primera serie). |
| **Progreso · "Plan de la semana"** | Paso **omitido** | La entrada no existe en la app (25.10.11). Progreso queda con 3 pasos. |
| **Tu semana, paso 1:** "arrastra un día sobre otro" | "Usa Mover para cambiar una sesión de día" | En la app no hay arrastre (lote 8). |
| **Escanear, paso 1:** el marco "se vuelve Ember" | Texto sin esa frase | La app no tiene ese efecto. |
| **Progreso, paso 1:** "mes a mes" | "a lo largo del tiempo" | Se ajusta a la curva de la app. |
| **Sesión:** "Técnica 3D" | — | No aplica (sin guía en Sesión). |

## Archivos

**Nuevos:**
- `src/features/guides/guideTours.ts` (tours y textos es/en)
- `src/features/guides/guideStore.ts`
- `src/features/guides/GuideAnchor.tsx` (`GuideAnchor` y `useGuide`)
- `src/features/guides/GuideOverlay.tsx`

**Modificados:**
- App: `src/app/App.tsx` (overlay y usuario), `src/app/LaunchOverlay.tsx` (avisa al terminar).
- Componentes: `src/components/v2/Sheet.tsx` (bloquea las guías), `src/features/vision/v2/CameraCapture.tsx`.
- Inicio: `src/screens/tabs/HomeScreen.tsx`, `src/features/home/v2/DayRingsCard.tsx`.
- Tu semana: `src/screens/week/WeekScreen.tsx`, `src/features/week/v2/WeekParts.tsx`.
- Resto de pantallas: `src/screens/core33/Core33Screen.tsx`, `src/screens/tabs/ProgressScreen.tsx`, `src/screens/route/RoutePrepScreen.tsx`.
- Ajustes: `src/screens/profile/SettingsScreen.tsx` ("Ver guías de nuevo").

## Qué probar en el iPhone

1. **Primera vez con una cuenta:**
   - Al terminar la pantalla de arranque, Inicio muestra su guía. Comprobar el velo, el anillo, la ficha debajo o encima y la flecha.
   - El paso "+1 vaso" se completa tocando el +1 (el vaso se suma).
   - El paso "Tu semana" abre Tu semana, y allí aparece su guía.
2. **Saltar** cierra la guía, y no vuelve a aparecer al volver a esa pantalla.
3. **Cada pantalla de la tabla** muestra su guía una sola vez:
   - Core 33 sin elemento iluminado (ficha a 330 pt).
   - Escanear y Calorías solo con la cámara activa: no aparecen sobre el permiso de cámara.
   - Ruta solo en Preparar: tocar Comenzar empieza a grabar y la guía desaparece.
4. **Scroll:** en Tu semana y Progreso, los pasos de más abajo se desplazan solos para verse.
5. **No aparece:** con una hoja abierta (si se abre una hoja durante una guía, se cierra), con el diálogo de permisos del sistema, en Sesión activa ni con una ruta grabando.
6. **Ajustes → "Ver guías de nuevo":** toast, y todas las guías vuelven a salir. Con otra cuenta en el mismo iPhone, se ven de nuevo.
7. **"Reducir movimiento"** activado: sin animaciones en la guía.
8. **Idioma del perfil en inglés:** textos en inglés.

## Pendiente o abierto

- **Sesión activa sin guía:** hay que decidir si se activa (y cuándo) a pesar de la regla.
- **Progreso · "Plan de la semana":** el paso vuelve cuando exista la entrada.
- **`Alert.alert` de la app:** no se detecta (no cambia el estado de la app). Los diálogos del sistema sí bloquean las guías.
