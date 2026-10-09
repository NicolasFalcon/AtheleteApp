# ATHELETE v2.12 · Delta contra lo migrado

Fecha: 2026-10-08 · Rama `feature-migration`. Solo análisis: no se tocó código ni se instaló nada.

## 0. Cómo se hizo (y una salvedad)

**No se pudo hacer `git diff HEAD~1` del paquete.** `migration-source/ATHELETE Alive Minimalism/` está en `.gitignore` (línea 81), así que git no guarda ninguna versión previa. Con `git diff --stat` el resultado es vacío.

En su lugar el delta sale de tres fuentes:

1. El changelog del propio handoff: **§22 "Actualizaciones v2.12"**, **§11B Ruta**, el índice visual (51 IDs "Capturado (v2.12)", 17 pendientes).
2. `MIGRATION_PROGRESS.md`: lo que ya está decidido o hecho (D-xx, DA-xx).
3. El código actual: `EllieOrb`, `EllieLinen`, `TabBarV2`, `HomeScreen`, `BestMarkCard`, `OfficialChallengeHero`, `postModel`, `package.json`, `Info.plist`.

**No abrí capturas.** El §22 y el índice dan el alcance con suficiente detalle. Las capturas de las pantallas nuevas conviene abrirlas al implementar cada una. La salvedad: lo que v2.12 cambió *en silencio* y no aparece en §22 no se detecta con este método. Para evitarlo en el futuro, conviene sacar el paquete del `.gitignore` o guardar una copia por versión.

**Líneas base.** Antes de v2.12 la app tenía hecho: Inicio (con Tu mejor marca), ELLIE con orbe lino, tab bar con Lucide, Progreso, Core 33, Sesión, Nutrición y Comunidad conectada W1 a W7. Ruta y Retos oficiales con recompensas aparecen como "funcionalidad nueva" pendiente (handoff línea 1642). `MIGRATION_PROGRESS.md` no menciona Ruta en ningún sitio.

Decisiones que **no** se vuelven a proponer: D-55 (5 tarjetas de categoría), Wear como línea de ropa, Comunidad W1 a W7, D-58 (banda ELLIE), D-62 y D-107.

---

## 1. Resumen ejecutivo

| # | Bloque v2.12 | Tipo | Tamaño | ¿Impacta lógica conectada? |
|---|---|---|---|---|
| A | Navbar (iconos propios, activa Ember sin pill, Halo) | Restyling | S | No |
| B | Quitar "Tu mejor marca" de Inicio | Eliminación | S | Sí (tests y atajo a Registrar récord) |
| C | ELLIE: Living Halo, fondo neutro, acciones con Halo mini | Restyling | M | Sí, solo visual en 5 sitios |
| D | ELLIE modo voz (nuevo) | Feature | L | Sí (chat de ELLIE) |
| E | Inicio: banda ELLIE nueva + sección de reto a ancho completo | Restyling + feature | M | Sí (retos oficiales) |
| F | Retos oficiales: vista, recompensas, badges | Feature | L | **Sí, contradice una decisión de backend** |
| G | Comunidad: feed rediseñado, tipo de post Ruta | Restyling + feature | M | Sí (`PostType`, `create_post`) |
| H | Ruta (Running/Ciclismo, planear, compartir) | Feature nueva | XL | Sí (puntos, retos, ELLIE, Perfil, Progreso) |

---

## 2. ⚠️ Impacta backend o lógica ya conectada

| Área | Qué cambia en v2.12 | Qué hay hoy | Acción |
|---|---|---|---|
| **Retos · puntos** | Cada reto oficial da "+150 puntos" (también +300, +250, +100, +120) y un badge propio. | `MIGRATION_PROGRESS` §1.1 punto 8: "No hay puntos por social". Backend: `social_challenge_completed` vale 0 puntos. | **Contradicción explícita.** Decidir con el equipo de backend si los oficiales otorgan puntos y badge (evento nuevo en la RPC de gamificación, probablemente `official_challenge_completed`). Si no, la UI muestra una recompensa que no existe. |
| **Retos · métricas** | "50 km en octubre" (Ruta), "10.000 pasos 7 días" (Salud), "100 dominadas" (repeticiones). | Métricas del servidor: `workouts`, `strength_sessions`, `minutes_trained`, `core33_habit_days`, `mobility_minutes`. W5 ocultó el tipo "Repeticiones". | Hacen falta métricas `distance_km`, `steps` y repeticiones por ejercicio, más el origen de los aportes. Sin ellas solo funcionan 12 sesiones de fuerza y 7 días de movilidad. |
| **Retos · catálogo** | "Retos del mes" y "Lo que viene" con "Avisarme". | No hay catálogo (D-62, BT-01). | Backend: lista de próximos retos y tabla de avisos. |
| **Retos · portada** | Foto propia por reto. | `OfficialChallengeHero` usa un asset fijo (`TODO(social-wire)` por `cover_path`). | Ahora `cover_path` y los textos fijos del oficial deben salir del reto. |
| **Comunidad · tipo Ruta** | Nuevo tipo de post con mapa, cifra 40 pt y metadato "Ruta planificada · Parque 5K". | `PostType` = `workout, record, routine, achievement, challenge, photo`. **No hay posts automáticos**: solo `create_post`. | Añadir `route` en el servidor (check del tipo, snapshot de `attachment`) y en `PostType`/`postBodyKind`. |
| **Comunidad · privacidad de ruta** | "Ocultar inicio y final" ON por defecto; los demás ven el recorrido recortado. | No existe. | El recorte tiene que hacerse **en el servidor**: si el cliente manda el recorrido completo, cualquiera lo ve. |
| **Perfil / Progreso** | "Actividad reciente" con mapa (Perfil), "Al aire libre · Este mes" (Progreso). | Datos solo de entrenos. | Necesitan la tabla de actividades de Ruta. |
| **Inicio · récord** | Sin "Tu mejor marca". | `BestMarkCard`, `RecentPRCard`, `bestMark` en `HomeScreen`, `homePriority.test.ts` ("Tu mejor marca con y sin récords"), QA §15 y paso 7 de QA §13. | Quitar. Pierde el acceso directo a *Registrar récord* desde Inicio: queda Progreso, Detalle de ejercicio y Resumen. |
| **ELLIE · contexto** | "ELLIE recibe distancia, ritmo, desnivel y FC de cada actividad para ajustar el plan de fuerza." | `useEllieChat` y la edge function actual no conocen Ruta. | Ampliar el contexto cuando exista la tabla de actividades. |
| **ELLIE · voz** | Modo voz: escucha, piensa, responde. | Solo chat de texto. | Backend: STT y TTS (ver §6). |
| **Sesión / Core 33 / anillos** | Sin cambios explícitos. | — | **Pregunta abierta:** ¿una Ruta cuenta como entreno para los anillos, la racha y Core 33? v2.12 no lo dice. Hasta decidirlo, Ruta no escribe en `workout_sessions`. |
| **Nutrición** | Solo el botón "Crear con ELLIE" pasa a Ember con Halo mini. | — | Visual; sin lógica. |

---

## 3. Delta por bloque

### A · Navbar (§6 Tab bar v2.12) · S

- **Hoy:** `TabBarV2` usa `House, Dumbbell, Sparkles, TrendingUp, Users` de Lucide y un pill relleno con el color CTA en el tab activo.
- **v2.12:** barra de 64 pt (radio 26), iconos propios `icons/tab-*.svg` (con variante `-on`, trazo 1,6), **sin fondo, pill ni círculo** en el activo, label Ember `#FF5B1F` 600 en Light y Dark, inactivo al 50 %. ELLIE usa el Living Halo de 22 a 24 pt.
- **Choca con D-32** (iconos con Lucide): v2.12 pide explícitamente iconos propios para el tab bar. Es una excepción acotada; el resto de la app sigue con Lucide.
- Bajar de 58 a 64 pt afecta `useTabBarMetrics` y los 104 pt de D-27 del toast; revisar.

### B · Inicio · S

- Quitar `BestMarkCard`, `RecentPRCard` y la lógica `bestMark`. Orden nuevo: Tu día → **banda ELLIE** → **reto** → Para entrenar esta semana.
- **Banda ELLIE:** ya existe (D-58) con otra forma. v2.12 la define a ancho completo, sin borde ni divisores, Halo de 56 pt "lit", lavado Ember suave. Copy fijo: "ELLIE" · "Siempre aquí para tu entrenamiento." · "Hablar con ELLIE →". Hay que revisar `EllieSurface` y D-58.
- **Sección de reto:** 420 pt a ancho completo, sin radio ni borde, dos estados: con reto oficial (74 / 100, barra Ember, CTA circular) y sin reto (100 dominadas, avatares, CTA → Retos oficiales). No es el `HomeChallengeState` de Core 33; es otra sección.
- **Card de Ruta:** según §11B va entre Tu día y la invitación a Core 33/ELLIE (placa oscura de 316 pt; después de la actividad muestra la ruta real). El orden exacto con la tarjeta de Core 33 (HOME_10/11, §17) hay que comprobarlo contra el prototipo.

### C · ELLIE identidad (§22.1 y §22.2) · M

- **Living Halo** sustituye al orbe: núcleo grafito `#0B0A09` / `#1C1A17`, contorno `#3A3430`, Ember `#FF5B1F`. Estados **idle, listening, thinking, speaking** y offline. El `EllieOrb` actual solo tiene `breathing | thinking | offline`, con degradado marfil → melocotón.
- Hay un componente de referencia en el paquete: `ellie-orb.js` (12 KB, usa canvas/DOM). Se reimplementa con `react-native-svg` + Reanimated (ya instalados) o, si el rendimiento no alcanza, con Skia (§6).
- **Fuera por completo el peach/arena/beige/perla.** Tocan: `EllieLinen`, `EllieSurface`, tokens `ellie.orb`, `ellie.linen`, `ellieLinenLight/Dark/Alt` en `palette.ts`/`colors.ts`, y `EllieWelcome` del onboarding (fondo `#EDE4D8 → #F3EDE5`).
- Nuevo fondo: Light `#F7F6F3`, superficies `#FFFFFF`, chips `#EFEEEA`, divisores `#E4E2DD`; Dark `#121110`; voz `#0C0B0A`/`#0E0D0C`. **Supersede D-13 y D-17 en lo que toquen a ELLIE.**
- **Regla global (§22.2):** toda acción de IA lleva Halo mini (20 a 22 pt) y la principal es pill Ember con texto blanco. Aplicado hoy: Generar ruta, Crear con ELLIE, Sí ajústalo. Hay que recorrer todas las acciones de IA actuales (sparkles) y cambiarlas.

### D · Modo voz de ELLIE · L

Escena oscura en ambos temas, Halo de 176 pt, micrófono principal Ember, cuatro estados (ELLIE_04 a 07, ya capturados). Es **funcionalidad nueva**, no restyling: ver §6.

### F · Retos oficiales (§22.4) · L

- Vista nueva "Retos oficiales": hero fotográfico B/N, "Más retos para este mes" con composiciones alternadas, "Lo que viene" en carrusel; "Unirme / Dentro", "Avisarme / Te avisaremos". IDs: `SOCIAL_15_OFFICIAL_LIST`.
- Bloque de recompensa en cada reto: badge hexagonal propio, "+N puntos · Badge [nombre]", condición.

| Reto | Puntos | Badge (provisional) | Condición |
|---|---|---|---|
| 100 dominadas | +150 | Semana de tracción | Completar las 100 dominadas |
| 50 km en octubre | +300 | Octubre en ruta | Sumar 50 km con Ruta |
| 12 sesiones de fuerza | +250 | Mes de fuerza | Completar las 12 sesiones |
| 7 días de movilidad | +100 | Cuerpo libre | Completar los 7 días |
| 10.000 pasos diarios | +120 | Paso firme | 10.000 pasos 7 días |

- **Los 5 badges finales no están dibujados** (handoff §15, "TO CREATE"). Se usa el placeholder hexagonal; no bloquear la implementación esperando el artwork. `HexMedal` ya existe (D-64).
- Los textos de Inicio y de `OfficialChallengeHero` ("100 dominadas", "Semana de tracción") hoy son fijos: deben venir del reto (ver §2).

### G · Comunidad · feed (§22.5) · M

Lógica, navegación, likes, comentarios, perfiles y privacidad **sin cambios**, así que W1 a W7 no se rehacen. Es restyling de `PostCard`/`PostBodies`/cabecera:

- Cabecera: "Comunidad" 34/800, avatar con anillo Ember, tabs subrayadas con indicador Ember de 36 × 3 que se desliza.
- Composer "¿Qué entrenaste hoy?" con "+" Ember de 48 pt.
- Una composición por tipo (hoy `postBodyKind`: `workoutPhoto, workoutLight, record, routine, achievement, challenge, photo`): foto B/N a sangre de 480 pt, tipográfico sin foto, récord placa 340 pt con cifra 104/800, rutina con 4 miniaturas 3:4, logro/reto en banda con glow y badge de 96 pt, actividad de amigos como línea. **Nuevo: Ruta** (mapa a ancho completo, distancia 72/800).
- 52 pt entre posts, sin divisores.
- La foto en B/N en iOS sigue el criterio de D-29 (capa oscura; desaturación pendiente).

### H · Ruta · XL (feature nueva, §11B y Planear ruta v2.9)

Pantallas (18 IDs `ROUTE_*`, más `HOME_15 a 17`, `SOCIAL_16`):

1. **Selector** Salir ahora / Planear ruta.
2. **Preparar** (Running y Ciclismo): mapa a sangre, GPS listo, pausa automática, privacidad (hoja con dos mapas), CTA Comenzar en Ember.
3. **En curso** (oscuro en ambos temas): distancia display 112, tiempo, ritmo o velocidad, FC y desnivel; pausa de 72 pt; **Pausa** con mapa al 50 %.
4. **Resultado**: mapa de portada (500/560 pt), cifra 96, métricas, parciales, perfil de desnivel, banda ELLIE; pie "Compartir en Comunidad / Compartir / Listo".
5. **Compartir fuera** 9:16 con tres estilos (Mapa, Foto, Minimal).
6. **Planear con ELLIE** (configuración, generando ~1,5 s, generada, "Otra opción") y **a mano** (tocar puntos, editar, deshacer), **Preview**, **Tus rutas** (usar, renombrar, eliminar, vacío), **GPS listo con ruta**, **Tracking con ruta**, **Desviado de ruta** (píldora "Te alejaste de la ruta · A 200 m", sin pausar ni dar giro a giro) y **Resultado con ruta planeada**.
7. Integraciones: card en Inicio, post en Comunidad, detalle desde Comunidad, "Actividad reciente" en Perfil, "Al aire libre" en Progreso.

Reglas relevantes: las rutas guardadas son siempre privadas; el post y las piezas externas usan el recorrido real; V1 no incluye clubs, segmentos, rankings, heatmaps ni navegación.

**Datos que faltan (backend):** tabla de actividades (tipo, inicio/fin, distancia, polilínea, desnivel, parciales, FC, visibilidad, `hide_endpoints`), tabla de rutas guardadas (privadas), función de recorte en servidor para otros espectadores, y un generador de rutas para "Generar ruta con ELLIE" (hay que decidir: edge function con un servicio de rutas, o proveedor externo).

**Capturas pendientes:** el índice marca como pendientes ROUTE_09 a ROUTE_25 (17, todas de Planear). El prototipo `Route.dc.html` es la fuente para esas, sin captura de apoyo.

---

### I · ATHELETE Wear (añadido el 2026-10-09, Fase 2) · M

Corrección: la primera versión de este documento daba Wear por sin cambios. v2.12 sí lo toca: la card de Inicio pasa a "Hecho para durar. · Ver colección →" y hay colección y ficha de producto (WEAR_01 a 03). Sigue siendo línea de ropa, no un dispositivo ni una tienda dentro de la app (no hay carrito, pago ni pedidos).

- **Card de Inicio** (156 pt, foto B/N, wordmark, "Ver colección →") → colección. Sustituye al banner "Próximamente".
- **Colección** (WEAR_01): hero B/N "Hecho para durar.", "Seis piezas para entrenar todos los días…", pieza base a ancho completo, rejilla de dos columnas, pausa editorial ("Menos ruido. Más entrenamiento."), accesorio en tile horizontal y cierre "Sé de los primeros" con "Avísame del lanzamiento".
- **Ficha** (WEAR_02 y 03): galería de 3 fotos (540 pt), nombre, precio, descripción, tallas en pills (la agotada tachada), tres datos en filas y pie fijo con el CTA y una nota. Estados: sin talla, con talla, talla agotada, talla única y Próximamente (con fecha).
- **Wear Product Tile** (3 variantes: base 440, rejilla 236, horizontal 132); solo "Próximamente" se marca; sin Ember.
- **Sin backend:** catálogo de ejemplo local (`wearCatalog.ts`, `TODO(wear)`); el CTA final queda en "Próximamente" y "Avísame" es visual (BT-53).
- **Contradicción a vigilar:** el handoff ("En pausa: no se enlaza desde la presentación hasta el lanzamiento") y `Wear.dc.html` (presentación sin productos) siguen describiendo la versión anterior; las capturas WEAR_01 a 03 y el índice muestran colección y ficha. Se siguió lo último.

## 4. Lo que **no** cambia (no tocar)

Auth y onboarding, Sesión (pausa, descanso, resumen), Core 33 (salvo el orden en Inicio), Nutrición (salvo el botón), Quiz, Perfil/Ajustes, Scan, Apple Health, Entrenos, Comunidad W1 a W7 (datos, reglas, notificaciones, moderación), D-55 y las demás decisiones de `MIGRATION_PROGRESS`.

## 5. Orden de trabajo sugerido

1. **Decisiones previas (sin código):** puntos de retos oficiales (§2), si Ruta cuenta como entreno, proveedor de mapas, generador de rutas.
2. **A + C + B** (restyling sin backend): navbar, Living Halo y fondos neutros, quitar Tu mejor marca. Es lo más barato y lo más visible.
3. **G** feed rediseñado (sin el tipo Ruta todavía) y **E/F** Inicio + Retos oficiales con el placeholder de badge, conectando solo lo que el servidor ya da.
4. **Backend de Ruta** en paralelo mientras se hace el prototipo de la UI con datos de ejemplo (como se hizo con Comunidad).
5. **H** Ruta por tandas: Preparar/En curso/Resultado → compartir → Planear → integraciones.
6. **D** Voz de ELLIE, cuando el backend de STT/TTS esté decidido.

## 6. Librerías nativas necesarias (nada instalado)

Base real del repo: **RN 0.85.2**, React 19.2.3, New Architecture ya activada en Android (`newArchEnabled=true`), Reanimated 4.6, `react-native-svg` 15, `react-native-linear-gradient`, `react-native-image-picker`. **No hay ninguna librería de mapas, ubicación, audio ni voz.** `Info.plist` ya tiene `NSLocationWhenInUseUsageDescription` pero **vacío**; faltan los demás permisos.

> Las versiones y la compatibilidad con la New Architecture de RN 0.85 **no las verifiqué contra el registro de npm ni los repos**: confirmar en cada README antes de instalar. Donde digo "revisar" es porque no tengo certeza.

### Ruta

| Necesidad | Opción recomendada | Alternativa | Notas |
|---|---|---|---|
| Mapa con estilo propio (lino/carbón, ruta Ember, capas punteadas) | `@rnmapbox/maps` | `@maplibre/maplibre-react-native` | El handoff pide "SDK cartográfico con un estilo propio". Ambos permiten estilos propios y capas de línea. MapLibre no requiere cuenta de pago; Mapbox exige token y licencia. `react-native-maps` (Apple/Google) **no** sirve para el estilo ni para capas finas. Revisar soporte de Fabric en la versión actual. |
| Ubicación en primer plano | `@react-native-community/geolocation` o `react-native-geolocation-service` | — | Suficiente para "Preparar" (GPS listo, precisión). |
| Ubicación en **segundo plano** (pantalla apagada) | `react-native-background-geolocation` (Transistorsoft) | `expo-location` + TaskManager (requiere `expo-modules-core`) | Una actividad de running con la pantalla bloqueada la necesita. La de Transistorsoft es de pago para Android en release. Ajustar ahorro de batería. |
| Rutas "por calles" (unir puntos) y generador | Servicio de enrutado (Mapbox Directions, OpenRouteService, GraphHopper) por **backend** | — | No es una librería nativa; es una decisión de servicio y de coste. |
| Instantánea del mapa para post y pieza 9:16 | `react-native-view-shot` o el snapshot del propio SDK de mapas | — | Para "Mapa / Foto / Minimal". |
| Compartir fuera (Historia, WhatsApp, Guardar) | `react-native-share` + `@react-native-camera-roll/camera-roll` | `Share` de RN | Instagram Stories requiere el esquema y el ID de app de Meta. |
| FC y desnivel | `react-native-health` (HealthKit, iOS) | — | Apple Health sigue sin integrarse (fase 7); la FC en Ruta depende de eso. |
| Háptica / pantalla encendida | `react-native-haptic-feedback` (ya está), `react-native-keep-awake` o similar | — | Mantener la pantalla encendida durante la actividad. |

**iOS (Info.plist y capacidades):** `NSLocationWhenInUseUsageDescription` (rellenar), `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes` → `location`, y, para fotos, `NSPhotoLibraryAddUsageDescription`. **Android:** `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION` y un servicio en primer plano con notificación (Android aún no compilado, §8.1). Apple exigirá justificación del uso de ubicación en segundo plano en la revisión.

### Voz de ELLIE

| Necesidad | Opción | Notas |
|---|---|---|
| Captura de micrófono | `react-native-audio-api` o `react-native-live-audio-stream` | Para enviar audio a un STT propio. |
| STT en el dispositivo | `@react-native-voice/voice` (Apple Speech) | Revisar mantenimiento y soporte New Architecture: ha tenido periodos sin actualizaciones. Alternativa: STT en servidor (Whisper o similar) vía edge function. |
| TTS | `react-native-tts` o TTS en servidor | `AVSpeechSynthesizer` en iOS es gratis pero suena sintético. Una voz neuronal requiere servicio externo y streaming. |
| Sesión de audio (hablar con auriculares, interrupciones) | `AVAudioSession` (módulo nativo propio o de la librería de audio) | Define quién gana si suena música. |
| Reacción del Halo a la voz (nivel de audio) | Nivel de micrófono de la librería de audio → valor compartido de Reanimated | El `ellie-orb.js` de referencia reacciona al nivel (`react`). |
| Animación del Halo | `react-native-svg` + Reanimated (ya instalados); `@shopify/react-native-skia` solo si no alcanza | Skia añade peso nativo; probar primero sin él. |

**iOS:** `NSMicrophoneUsageDescription` y, si se usa Apple Speech, `NSSpeechRecognitionUsageDescription`.

### Solo se puede probar en un iPhone real

- **GPS real** y su precisión (el simulador solo simula rutas con GPX), desviación de ruta, pausa automática al detenerse, parciales por km.
- **Ubicación en segundo plano** con pantalla bloqueada y app en segundo plano; consumo de batería en 30 a 60 min.
- **Micrófono**, ruido, cortes por llamada o auriculares/AirPods, reconocimiento de voz y TTS; el simulador no es representativo.
- **Compartir a Historias/WhatsApp** y guardar en Fotos.
- **Frecuencia cardíaca** (HealthKit con Apple Watch).
- **Háptica** de pausa, desvío y finalizar.
- **Rendimiento del mapa** con la ruta larga (miles de puntos) y de la animación del Halo mientras escucha.

Probable también solo en dispositivo: el blur real del tab bar y la desaturación de fotos B/N (D-29), ya pendientes.

## 7. Pendientes y riesgos

- **Contradicción de puntos** (§2): sin resolver, la UI de recompensas miente.
- **Segundo plano**: lo más fácil de subestimar de Ruta; define si el feature es utilizable.
- **Coste de mapas y rutas**: decisión de producto antes de elegir SDK.
- **Android sin compilar** (§8.1): Ruta añade permisos y servicio en primer plano que ahí no están probados.
- **Artwork de los 5 badges** y **capturas ROUTE_09 a 25**: dependen de diseño; no bloquean.
- **Preguntas abiertas para diseño**: ¿Ruta cuenta como entreno (anillos, racha, Core 33)? ¿Orden exacto de las cards de Inicio con Ruta, Core 33 y reto?
- **Verificado en ficheros**: v2.12 está presente en el paquete (handoff dice "DESIGN FREEZE v2.12 · CERRADO"); `Home.dc.html` ya no contiene "mejor marca".
