# Comunidad · Fase 0 · Mapa y plan

**Fecha:** 2026-10-06 · **Rama:** `feature-migration` · **Estado:** plan, sin código ni cambios de base.
**Fuente visual:** solo `migration-source/ATHELETE Alive Minimalism/` (`Social.dc.html` + `SocialDark.dc.html`, índice `ATHELETE_V2_VISUAL_REFERENCE_INDEX.md`, handoff §5, §6, §7 y §11).
**Backend leído:** `docs/social/SOCIAL_SCHEMA_PROPOSAL.md` (propuesta original, anterior a lo aplicado), `docs/backend/BACKEND_SUMMARY.md` y `src/types/supabase.ts`.
**Jerarquía de fuentes:** lo **aplicado** (`supabase.ts` y `BACKEND_SUMMARY`) manda; la propuesta se usa para las **reglas de negocio** (privacidad, quién ve qué, estados de amistad, límites y moderación). Las diferencias están en la sección 8.

## 0. Lo que cambia el plan (léelo primero)

1. **El backend de Comunidad ya existe.** `BACKEND_SUMMARY` (2026-10-01) y los tipos de Supabase traen las 16 tablas, las RPC, el bucket `social-photos`, los cron y la moderación (probados con rollback). Los "huecos" de la sección 6 son por lo tanto pocos: lo que el diseño pide y el esquema aprobado no cubre.
2. **Diferencias propuesta vs aplicado: sección 8.** Ninguna cambia el reparto A/B/C ni su orden; una (posts automáticos) hay que verificar antes de la tanda A.
3. **Numeración de BT.** BT-41 y BT-42 ya están usados (género "Otro" y Scan). Los huecos de Comunidad empiezan en **BT-43**.
4. **El diseño no trae tres cosas que el backend sí pide**: (a) elegir **nombre de usuario** (`ensure_social_settings`); (b) **reportar y bloquear** (requisito de App Store 1.2, decisión Q11: antes de lanzar); (c) **notificaciones sociales** en Notificaciones. Las tres se resuelven con primitivas v2 existentes y se registran como decisiones D-xx cuando se implementen (sección 5).
5. **Decisiones de producto que se apartan del prototipo** (están en `SOCIAL_SCHEMA_PROPOSAL §12`):
   - Q3: la búsqueda es **solo por nombre de usuario exacto** o por enlace de invitación; el prototipo filtra por nombre real.
   - Q13: **no se sugieren** "personas de tus retos"; el prototipo tiene la sección "En tus retos".
   - Q6: "Repeticiones de un ejercicio" no se ofrece entre amigos. Hoy ya hay series (BT-17 a BT-20 resueltos), así que conviene revisarlo (BT-45).
   - Q7: el adjunto de entreno lleva **calorías en lugar de volumen**. Hoy `volume_kg` ya existe (BT-18), así que conviene revisarlo (BT-44).

## 1. Inventario de referencias de Comunidad

Capturas en `references/<ID>_LIGHT.png` y `_DARK.png`. "Escena" = una sola captura válida para ambos modos.

### 1.1 Pantallas (módulo `social`, archivo visual `Social`)

| ID | Pantalla | Id del prototipo | Estados y variantes (del prototipo) | L/D |
|---|---|---|---|---|
| SOCIAL_01_FEED | Feed (hub, segmento Feed) | `feed` | Posts por tipo (récord, entreno con foto, entreno ligero, rutina, logro), línea de actividad agrupada ("Carlos y Sofía ya completaron…"), me gusta marcado, "Escribe algo…" arriba; insignias de número en las pestañas Retos y Amigos | Ambos |
| SOCIAL_02_POST_CREATE | Crear publicación | `publicar` | Texto (≤ 280), foto opcional, **adjunto** de 5 tipos (Entrenamiento, Rutina, Récord, Logro, Reto) con métricas no editables; chip de audiencia | Ambos |
| SOCIAL_03_POST_DETAIL | Publicación y comentarios | `post` | Post arriba, comentarios planos, campo fijo abajo, comentario recién enviado entra al final | Ambos |
| SOCIAL_04_SHARED_ROUTINE | Rutina compartida | `rutinaSoc` | Hero, autor, recorrido, "Guardar rutina" → "Ver en Entrenos" (guardada), "Empezar" | Ambos |
| SOCIAL_05_FRIENDS | Amigos y solicitudes (hub, segmento Amigos) | `amigos` | Búsqueda; grupos Solicitudes recibidas · Amigos · Enviadas · En tus retos; botón Agregar / Solicitado / Amigos; aceptar/ignorar | Ambos |
| SOCIAL_06_FRIEND_PROFILE | Perfil de amigo | `amigo` | Amigo / no amigo / solicitado; con o sin rutinas; línea de lo privado ("no comparte peso corporal ni nutrición"); récords, retos en común, actividad reciente | Ambos |
| SOCIAL_07_CHALLENGES | Retos (hub, segmento Retos) | `retos` | Reto oficial (evento oscuro), retos entre amigos como filas (nuevo / activo / completado), invitación pendiente, vacío | Ambos |
| SOCIAL_08_OFFICIAL | Reto oficial ATHELETE | `retoOficial` | No unido / unido / +5 +10 +15 manual / completado (→ SOCIAL_12); semana en barras; ranking solo entre amigos | Ambos |
| SOCIAL_09_FRIENDS_CHALLENGE | Reto entre amigos | `retoAmigos` | Activo, esperando que acepten (`pending`), completado (ayer: "Eres el primero"), con y sin actividad | Ambos |
| SOCIAL_10_INVITE | Invitación a reto | `retoInv` | Misma vista con quién invita; Unirme / Ahora no | Ambos |
| SOCIAL_11_CREATE_CHALLENGE_01…05 | Crear reto (5 pasos) | `crearReto` | 1 tipo (6 métricas) · 2 objetivo · 3 duración (3 días / 1 semana / 2 semanas) · 4 amigos · 5 revisión con vista previa | Ambos |
| SOCIAL_12_CHALLENGE_DONE | Reto completado | `retoOk` | Escena oscura: cifra final, puntos, badge, posición entre amigos; Compartir / Listo | **Escena** |
| SOCIAL_13_SHARE_WORKOUT | Compartir entreno completado | `compartir` | Composer con el adjunto de la sesión (con récord si lo hubo) | Ambos |
| SOCIAL_14_PRIVACY | Privacidad social | `privSocial` | Audiencia Amigos / Público; 7 interruptores (Entrenamientos, Récords, Logros, Fotos, Rutinas, Peso corporal —apagado—, Permitir solicitudes); bloque "Así te ven tus amigos" | Ambos |

### 1.2 Estados del sistema y overlays de Comunidad

| ID | Qué es | L/D |
|---|---|---|
| STATE_01_LOADING_FEED | Esqueleto del Feed (avatar, dos líneas, media 4:3, reacciones) | Ambos |
| STATE_04_EMPTY_FEED | Feed sin amigos: tres retratos apagados, "Buscar" o "Invitar", el reto oficial como salida | Ambos |
| STATE_05_EMPTY_CHALLENGES | Sin retos: reto oficial + "Entre amigos" vacío con "Crear reto" | Ambos |
| STATE_07_ERROR_FEED | Feed sin conexión: qué pasa, qué sigue funcionando y Reintentar | Ambos |
| OVERLAY_02_TOAST | Confirmación al publicar / guardar rutina ("Ver en Entrenos") | Ambos |
| OVERLAY_01_CELEBRATION | Celebración nivel 3 (reto completado, Core 33, récord) | Escena |

**Sin captura** (el diseño no lo trae): elegir nombre de usuario, reportar, bloquear, usuarios bloqueados, notificaciones sociales, aviso "contenido retirado", estados de error de Retos y Amigos, vacío de comentarios. Ver sección 5.3.

### 1.3 Entradas desde otras pantallas

| Desde | Qué hace | Destino | Estado en la app hoy |
|---|---|---|---|
| Tab bar (5.º ítem) | Comunidad | Hub (Feed · Retos · Amigos) | `CommunityScreen` es un placeholder "Muy pronto"; la tab y la cabecera con avatar → Perfil ya existen |
| Hub (cabecera) | Avatar 44 pt → Perfil; botón privacidad; "+" negro | Perfil · SOCIAL_14 · SOCIAL_02 | Solo el avatar |
| Perfil (vista propia) | Acceso a Comunidad y a Privacidad social (`goCom`, `goPriv`) | SOCIAL_01 · SOCIAL_14 | No existe |
| Ajustes → sección Comunidad | "Amigos y retos" → hub; "Privacidad social" → SOCIAL_14 | | Filas deshabilitadas con "Próximamente" (`SettingsScreen.tsx:210`) |
| Inicio · "Reto de la semana" | Tocar → reto oficial; al volver va a Comunidad · Retos | SOCIAL_08 | La card **no está implementada** en Inicio v2 (solo en el catálogo dev) |
| Notificaciones (HOME_08/09) | El diseño solo trae avisos personales (entreno, Core 33, hidratación, plan) | — | El backend sí genera `social_notifications` (sección 5.3) |
| Resumen de sesión (SESSION_07) | "Compartir" secundaria → SOCIAL_13 con la sesión | SOCIAL_13 | `WorkoutSummaryScreen` ya dice "sin Compartir (Comunidad pending)" |
| Récord nuevo (toast / Registrar récord) | "¿Compartir tu récord?" → composer con adjunto Récord (propuesta §6.1; el handoff solo lo cita como adjunto) | SOCIAL_02 | No existe |
| Logros / Vitrina | Compartir un logro (adjunto Logro) | SOCIAL_02 | No existe |
| Core 33 completado | Post de logro "Core 33" (`core33:<participation_id>`); el handoff no pone botón, la propuesta §6.1 lo ofrece | SOCIAL_02 | No existe |
| Reto completado (SOCIAL_12) | Compartir → publicación con el reto adjunto | SOCIAL_02 | No existe |
| Rutina propia (Detalle de rutina) | Compartir una rutina creada por el usuario (Q15) | SOCIAL_02 (adjunto Rutina) | No existe |
| Feed vacío / Retos vacío (STATE_04/05) | Buscar · Invitar · Crear reto · reto oficial | SOCIAL_05 · SOCIAL_11 · SOCIAL_08 | No existe |
| Perfil de amigo | "Retar" → Crear reto con ese amigo; retos en común → SOCIAL_08/09; posts → SOCIAL_03 | | No existe |
| Deep link `athelete://` | Enlace de invitación (`redeem_friend_invite`) | SOCIAL_05 | No existe (Universal Link pendiente, BT-48) |

Los handlers `goCom`, `goCarlosPR` y `goRutSoc` que quedan en `Home.dc.html` son de la sección "Comunidad" de Inicio, **eliminada** por el handoff (§1, "Qué ignorar"). No se implementan.

## 2. Datos por pantalla y su origen

Leyenda: **T** = tabla con RLS (lectura/escritura directa), **R** = RPC, **S** = Storage con URL firmada. "Falta" apunta a la sección 6.

### SOCIAL_01 · Feed
| Dato | Origen |
|---|---|
| Posts, autor, `liked_by_me`, contadores | R `get_feed(_limit, _before)` (paginación por fecha) |
| Avatar y nombre de autores | R `get_social_profiles(ids)`; foto con `can_view_profile_photo` (URL firmada) |
| Foto del post | S `social-photos` (`{autor}/{post_id}/…`, URL firmada) |
| Línea de actividad | R `get_friend_activity(_limit)` (se borra a los 30 días). **Agrupar** "Carlos y Sofía…" se hace en la app |
| Me gusta / quitar | T `social_post_likes` insert / delete |
| Cabecera "N amigos · N retos activos" | T `friendships` (conteo) + R `get_my_challenges().active` |
| Insignias de Retos / Amigos | Invitaciones: `get_my_challenges().invitations`; solicitudes: T `friend_requests` (recibidas `pending`) |

### SOCIAL_02 / 13 · Crear publicación y Compartir entreno
| Dato | Origen |
|---|---|
| Adjunto (métricas no editables) | Lo arma el servidor en R `create_post(_type, _source_id, _body, _photo_path, …)`. La app solo muestra una vista previa con datos que ya tiene (sesión, récord, rutina, badge, reto) |
| Qué categorías ofrecer | T `social_settings.share_*` (si `share_records = false` no se ofrece Récord; si `share_photos = false` no se ofrece foto) |
| Foto | S subir a `{uid}/{post_id}/…` con `post_id` generado en la app; JPG/PNG/WebP, 5 MB, sin EXIF |
| Volumen "9.120 kg" y récord "si lo hubo" | **Falta** (BT-44): el adjunto de entreno lleva calorías |

### SOCIAL_03 · Publicación y comentarios
| Dato | Origen |
|---|---|
| Post | R `get_feed` (o el post ya cargado) |
| Comentarios | T `social_post_comments` select (sin `parent_id`); autores con `get_social_profiles` |
| Comentar | T insert. Borrar el propio: R `delete_comment` |
| Reportar / ocultar | T `content_reports` insert (sección 5.3) |

### SOCIAL_04 · Rutina compartida
| Dato | Origen |
|---|---|
| Hero, autor, ejercicios | `attachment` del post (`title, difficulty, duration_min, exercises[{exercise_id, name, sets, reps, rest_time}]`); miniaturas e imagen desde la biblioteca local por `exercise_id` |
| Guardar rutina | R `save_shared_routine(_post_id)` → `template_id` (copia "Tuya", `copied_from_*`) |
| Empezar | Guardar y abrir la copia (el diseño no define qué pasa sin guardar: se propone guardar primero) |

### SOCIAL_05 · Amigos y solicitudes
| Dato | Origen |
|---|---|
| Amigos | T `friendships` (`user_low` / `user_high`) + `get_social_profiles` |
| Última actividad del amigo ("Entrenó hoy · Press banca") | R `get_friend_activity` (el último por amigo; sin actividad en 30 días, "Amigos desde…" desde `friendships.created_at`) |
| Recibidas / enviadas | T `friend_requests` por `receiver_id` / `sender_id` y `status` |
| Aceptar / rechazar / cancelar | R `respond_friend_request`, `cancel_friend_request` |
| Buscar | R `find_user_by_username(_username)` (exacto; Q3). Filtrar la lista de amigos por nombre se hace en la app |
| Agregar | R `send_friend_request(_target)` (`sent`, `pending`, `already_friends`, `not_accepting`, `unavailable`) |
| Invitar | R `create_friend_invite()` (token, 7 días, un uso, máx. 5 activos) → hoja de compartir del sistema; canjear: `redeem_friend_invite` |
| "3 amigos en común" | **Falta** (BT-46) |
| "En tus retos" (personas sugeridas) | **No va** (Q13); si producto lo quiere, falta (BT-46) |

### SOCIAL_06 · Perfil de amigo
| Dato | Origen |
|---|---|
| Foto, objetivo, racha, sesiones, logros, "Amigos desde" | R `get_social_profile(_user_id)` (`relationship`, `streak_days`, `friends_since`, `sessions_total`, `badges_total`) |
| Récords (3) | Mismo RPC (`records`) |
| Posts recientes (2) | Mismo RPC (`recent_posts`) |
| Línea de lo privado | Mismo RPC (`hidden_categories`) |
| Peso | Mismo RPC, solo si lo comparte |
| Retos en común | El esquema lo define en `common_challenges`, pero `BACKEND_SUMMARY` no lo lista: **verificar** (BT-46) |
| Rutinas del amigo ("hasRut") | **Verificar**: no hay RPC de rutinas compartibles de un amigo; hoy solo llegan por posts de tipo rutina |
| Agregar / Retar / Bloquear | `send_friend_request` · `create_friend_challenge` (SOCIAL_11 con el amigo marcado) · `block_user` |

### SOCIAL_07 · Retos
| Dato | Origen |
|---|---|
| Oficial, entre amigos, invitaciones, completados | R `get_my_challenges()` → `{active, invitations, recently_completed, official}` |
| Participantes y avatares apilados | `get_challenge_board` o `get_social_profiles` |
| Progreso propio | Del propio RPC |

### SOCIAL_08 · Reto oficial
| Dato | Origen |
|---|---|
| Cifra, objetivo, días restantes | `get_challenge_board` → `challenge` |
| Semana en barras | T `social_challenge_contributions` (lectura propia, por `occurred_at`) |
| Ranking entre amigos y total de participantes | `get_challenge_board` → `board` (yo + amigos) y `participants_total` (agregado sin nombres) |
| Unirme / salir | R `join_official_challenge`, `leave_challenge` |
| +5 +10 +15 | R `add_manual_contribution(_challenge_id, _amount)` (1–100 por registro, 300 al día, solo `allow_manual`) |
| Puntos y badge | Los da el servidor (`social_award_official`); la app no llama a `award_gamification_event` |

### SOCIAL_09 / 10 · Reto entre amigos e Invitación
| Dato | Origen |
|---|---|
| Ranking, mensaje de distancia | `get_challenge_board` (la frase se compone en la app con datos) |
| Actividad del reto | **Verificar**: el prototipo lista "Carlos completó su 4.º entreno"; `get_challenge_board` no declara actividad. Si no la trae, falta (BT-46) |
| Aceptar / rechazar | R `respond_challenge_invite(_challenge_id, _accept)` |
| Cancelar (creador) | R `cancel_friend_challenge` |

### SOCIAL_11 · Crear reto
| Dato | Origen |
|---|---|
| Tipos | Métricas de `social_challenges.metric`; entre amigos: `workouts`, `strength_sessions`, `minutes_trained`, `core33_habit_days`, `mobility_minutes` (5 de las 6 del diseño; `exercise_reps` oculta, Q6) |
| Rangos del objetivo | Validados en la RPC (entrenos 1–14, fuerza 1–10, minutos 30–900, hábitos 1–14, movilidad 15–300). Los mismos topes se copian a un modelo puro de la app |
| Amigos | `friendships` + `get_social_profiles` (solo amigos; la RPC rechaza extraños) |
| Crear | R `create_friend_challenge(_metric, _goal, _duration_days, _invitee_ids)` → `{challenge_id, title}` |

### SOCIAL_12 · Reto completado
| Dato | Origen |
|---|---|
| Cifra final, puntos, badge, posición | `get_my_challenges().recently_completed` + `participants.final_rank_among_friends` |
| Marcar vista | R `mark_challenge_celebrated` |
| Compartir | R `create_post('challenge', challenge_id)` |

### SOCIAL_14 · Privacidad social
| Dato | Origen |
|---|---|
| Audiencia y 7 interruptores | T `social_settings` (`audience`, `share_workouts`, `share_records`, `share_achievements`, `share_photos`, `share_routines`, `share_body_weight`, `allow_friend_requests`) |
| Primera vez | R `ensure_social_settings(_username)` (crea la fila; `invalid_username` o `username_taken`) |
| Cambiar usuario | R `set_username` |
| "Así te ven tus amigos" | Texto compuesto en la app a partir de los interruptores |

## 3. Pantallas v1 de Comunidad que ya existen

| Pieza | Estado |
|---|---|
| `src/screens/tabs/CommunityScreen.tsx` | **Placeholder v2** ("Muy pronto"): cabecera con avatar → Perfil y título a 28 pt. Se reemplaza por el hub. |
| `TAB_ROUTES.Community` (`constants/routes.ts`, `MainTabNavigator`, `TabBarV2`) | Listo (quinta pestaña). |
| Ajustes → "Amigos y retos", "Privacidad social" | Filas deshabilitadas con "Próximamente". Se activan con las tandas B y C. |
| `WorkoutSummaryScreen` | Sin botón "Compartir" (comentario "Comunidad pending"). |
| Pantallas, hooks o servicios sociales v1 | **No hay ninguna**: no existe `features/social`, ni servicio, ni rutas. Todo el código es nuevo. |
| `types/supabase.ts` | Ya regenerado con las tablas y RPC sociales. |

## 4. Primitivas v2

### 4.1 Se reutilizan
`Segmented` (Feed · Retos · Amigos) · `GlassHeader` / `GlassSurface` (cabeceras y footers de vidrio) · `IconButton` (el "+" negro) · `TextV2` · `Button` · `Row` + `Switch` (Privacidad) · `SearchField` · `Sheet` (hojas) · `ExitDialog` como modelo del diálogo (`features/session/v2`) · `Toast` / `useToast` · `Skeleton` / `SkeletonGroup` · `Celebration` · `ChoiceTile` y `StepProgress` (Crear reto) · `StepperField` (objetivo) · `FilterChip` · `SectionHeader` · `MetricTrio` · `RecordCard` / `ProgressCurve` (récords del amigo) · `HexMedal` y `Showcase` (logros) · `RoutinePath` y `WorkoutHero` (Rutina compartida) · `ExerciseRow` · `WeeklyCapsules` / `DayCapsules` (semana del reto) · `ProgressRing` · `ProfileAvatar` (+ `profile-photo` para URL firmada) · `TextField` · `FormRow` · `Scrim` · `EmptyState`-style de `BlockError`.

### 4.2 Nuevas (en `components/v2` salvo que se indique)
| Primitiva | Uso | Notas |
|---|---|---|
| `AvatarStack` | Cabecera del hub, filas de reto, ranking | Avatares solapados con contador "+N" |
| `PersonRow` (Friend Row) | Amigos, solicitudes, enviadas, bloqueados | Avatar + nombre + línea + botón de estado (`Agregar` primaria pequeña · `Solicitado` neutra · `Amigos` texto con check). No es una `Row` de Ajustes (handoff §5) |
| `ReactionBar` | Posts | Me gusta con contador y comentar; sin métricas de vanidad |
| `PostCard` (en `features/social/v2`) | Feed y detalle | Cabecera + texto + cuerpo por tipo + `ReactionBar`. **Seis composiciones propias, no una genérica** (handoff §5: no fusionar) |
| `RecordPostBlock`, `RoutinePostBlock`, `AchievementPostBlock`, `ChallengePostBlock`, `WorkoutPostBlock` | Cuerpos de `PostCard` | El de récord no es la placa de "Tu mejor marca" (handoff §5) |
| `ActivityLine` | Feed | Una línea, sin acciones |
| `CommentRow` y `CommentComposer` | Detalle | Campo fijo abajo con vidrio; plano, sin hilos |
| `AttachmentPreview` | Composer | Métricas no editables del adjunto, con sello "de Athelete" |
| `ChallengeRow` | Retos | Avatares apilados, barra Ember, línea humana |
| `OfficialChallengeHero` | Retos y Reto oficial | Evento oscuro con cifra display y barras de la semana (escena oscura en ambos modos) |
| `RankBars` | Reto entre amigos y oficial | Barras; tu fila en Ember |
| `ChallengeTypeTile` (o `ChoiceTile` con contenido) | Crear reto, paso 1 | Ícono + título + subtítulo |
| `PrivacyToggleRow` | Privacidad | `Row` + `Switch` con frase (si `Row` no basta) |
| `ReportSheet` | Reportar post / comentario / usuario | `Sheet` con motivos (`ChoiceTile`/filas) y detalle opcional de 500 caracteres. **Sin diseño propio**: ver 5.3 |
| `ConfirmDialog` | Bloquear, eliminar publicación | Generalizar `ExitDialog` |
| `UsernameSheet` | Primer acceso | `Sheet` + `TextField` con validación `^[a-z0-9_.]{3,24}$` |

Servicios, modelos y hooks puros nuevos (con tests): `features/social/socialModel.ts` (rangos de retos, textos de rankings y distancias, agrupar actividad, reglas de qué adjuntos se ofrecen según privacidad, validación de usuario), `services/supabase/social*.ts` y hooks de React Query.

## 5. Reparto en tandas de UI

### 5.1 Reparto pedido (A · B · C) y lo que se ajusta

| Tanda | Contenido | Pantallas de diseño |
|---|---|---|
| **A · contenido y feed** | Hub (Feed · Retos · Amigos) como contenedor, Feed, Crear publicación, Compartir entreno, Publicación y comentarios, Rutina compartida; STATE_01, 04, 07; toast | SOCIAL_01, 02, 03, 04, 13 |
| **B · personas** | Amigos y solicitudes, Perfil de amigo, Privacidad social; elegir usuario; invitación por enlace | SOCIAL_05, 06, 14 |
| **C · retos y moderación** | Retos, Reto oficial, Reto entre amigos, Invitación, Crear reto (5 pasos), Reto completado; notificaciones sociales; reportar / bloquear y moderación | SOCIAL_07, 08, 09, 10, 11 (×5), 12 |

**Total: 14 pantallas de diseño** (5 + 3 + 6; SOCIAL_11 son 5 pasos de una misma pantalla y SOCIAL_13 es una variante de SOCIAL_02).

### 5.2 Propuesta: tres ajustes y otro orden

1. **Orden B → A → C, no A → B → C.** El feed necesita amigos para tener contenido, y el composer depende de Privacidad (`share_*`) y del nombre de usuario. Con B primero, A se prueba con contenido real.
2. **Reportar y bloquear salen de C y se reparten.** La decisión Q11 y App Store 1.2 los exigen **antes de publicar contenido ajeno**. Bloquear y la lista de bloqueados van en **B** (Perfil de amigo y Privacidad); reportar post/comentario va en **A** (detalle y menú del post). En C queda el aviso "contenido retirado" y el resto de la moderación (la cola de revisión es interna, no es app).
3. **Hub y servicios base en B, no en A.** El contenedor (`Segmented` + cabecera) y los servicios compartidos (nombre de usuario, `social_settings`, perfiles) los necesita B primero.
4. **Notificaciones sociales** van en C pero **solo como filas** dentro de Notificaciones; la insignia de la campana puede adelantarse a B (solicitudes recibidas).

### 5.3 Contenido de cada tanda (con lo que el diseño no trae)

**B · personas (3 pantallas de diseño + 3 nuevas)**
- Hub con cabecera, `Segmented` y rutas; sustituye `CommunityScreen`.
- SOCIAL_05 Amigos, SOCIAL_06 Perfil de amigo, SOCIAL_14 Privacidad.
- Nuevas, sin diseño: **elegir nombre de usuario** (hoja en el primer acceso), **invitar con enlace** (hoja del sistema con el token; ya hay "Invitar" en STATE_04), **Usuarios bloqueados** (fila en Privacidad, lista con "Desbloquear").
- Activa las filas de Ajustes.
- Modelos puros: validación de usuario, estado de relación, textos "Así te ven".

**A · contenido (5 pantallas de diseño + 2 nuevas)**
- SOCIAL_01 Feed con sus seis composiciones, paginación y estados (carga, vacío, error).
- SOCIAL_02 Crear y SOCIAL_13 Compartir (mismo composer; el entry desde el Resumen de sesión; entradas desde récord, logro y rutina).
- SOCIAL_03 Detalle con comentarios, SOCIAL_04 Rutina compartida.
- Foto: `react-native-image-picker` (ya instalado), recorte/redimensión, sin EXIF, subida a `social-photos`.
- Nuevas, sin diseño: **Reportar** (hoja con 6 motivos: spam, acoso, desnudez, violencia, autolesión, otro), **Confirmar eliminar publicación**.
- Entrada desde `WorkoutSummaryScreen`: botón "Compartir" secundario.

**C · retos y notificaciones (6 pantallas de diseño + 2 nuevas)**
- SOCIAL_07 Retos, 08 Oficial, 09 Entre amigos, 10 Invitación, 11 Crear reto, 12 Completado.
- Card "Reto de la semana" de Inicio (usa `get_my_challenges().official`).
- Nuevas, sin diseño: **notificaciones sociales** (filas de solicitud, aceptada, me gusta, comentario, invitación, reto empezado/completado/por terminar, contenido retirado, dentro de Notificaciones en un grupo "Comunidad" con las mismas filas planas; marcar como leída con `UPDATE read_at`), **aviso "contenido retirado"**.
- `Celebration` para el reto completado; "Compartir" abre SOCIAL_02 con el adjunto de reto.

**Decisiones D-xx a registrar al implementar** (propuestas): nombre de usuario obligatorio al entrar; búsqueda exacta (sin filtrar por nombre real); sin sección "En tus retos"; hoja de reportar; diálogo de bloquear; usuarios bloqueados dentro de Privacidad; grupo "Comunidad" en Notificaciones.

## 6. Huecos del backend (no se piden todavía)

BT-41 y BT-42 están usados; se numera desde **BT-43**. Ninguno bloquea la tanda B.

| BT | Qué falta | Afecta a | Prioridad | Bloquea |
|---|---|---|---|---|
| BT-43 | **Términos de uso y contacto de soporte para contenido de usuarios.** App Store 1.2 pide aceptar términos, canal de reporte y respuesta en 24 h. No hay columna ni pantalla (p. ej. `profiles.terms_accepted_at`) y el proceso de moderación sigue abierto (BT-08) | Lanzamiento de Comunidad | Alta | Sí, para publicar |
| BT-44 ✅ | **Resuelto (2026-10-07).** ~~Volumen y récord en el adjunto de entreno.~~ `create_post` hoy arma calorías (Q7). Con series (BT-17, BT-18) conviene añadir `volume_kg` y el récord detectado por `detect_session_prs` | SOCIAL_01, 02, 13 | Media | No (se muestran calorías) |
| BT-45 | **Reto de repeticiones entre amigos** (`exercise_reps`): hoy se rechaza (Q6). Con series ya existe la base para sumarlas solas. `BACKEND_SUMMARY §7` lo deja como decisión de **producto**, sin fecha | SOCIAL_11 paso 1 | Baja | No (5 de 6 tipos) |
| BT-46 | **Datos que el prototipo muestra y la API no declara**: (a) amigos en común; (b) retos en común en `get_social_profile` (`common_challenges` está en el esquema pero no en `BACKEND_SUMMARY`); (c) actividad por reto en `get_challenge_board`; (d) rutinas compartibles de un amigo (perfil); (e) personas sugeridas "En tus retos" (descartado por Q13) | SOCIAL_05, 06, 09 | Baja | No (se omiten o se derivan en la app) |
| BT-47 | **Listados de amigos y solicitudes en una sola RPC** (`get_friends_overview`: amigos con su última actividad, recibidas, enviadas, conteos). Hoy son 3 o 4 lecturas | SOCIAL_05, hub | Media | No (rendimiento) |
| BT-48 | **Enlace universal de invitación** (`apple-app-site-association` y dominio); con `athelete://` basta para desarrollo (`SOCIAL_SCHEMA_PROPOSAL §11`) | Invitar | Media | No |
| BT-49 | **Límites de frecuencia** (publicaciones, comentarios, solicitudes y reportes por hora) en las RPC e inserciones directas (`SOCIAL_SCHEMA_PROPOSAL §11`) | Abuso | Media | No, pero antes del lanzamiento |
| BT-50 | **Contador de no leídas de `social_notifications`** y "marcar todas como leídas" en una llamada (hoy `select count` + `UPDATE` por fila) | Notificaciones | Baja | No |
| BT-51 | **Cuentas suspendidas** desde moderación (hoy a mano en Auth) y **aviso al reportante** de la resolución | Moderación | Baja | No |
| BT-52 ✅ | **Resuelto (2026-10-07):** la limpieza diaria borra las huérfanas de más de 24 h. ~~Subidas huérfanas de `social-photos`.~~ No hay `reserve_post_id` ni carpeta `drafts/` (sección 8): si la foto se sube y `create_post` falla, el archivo queda sin post y la limpieza diaria solo cubre posts borrados o retirados | SOCIAL_02 | Baja | No (la app borra la subida si falla la publicación) |

Verificaciones previas a la tanda A (sin cambio de backend): firma exacta de `get_feed` (campos de autor y `attachment`), tamaño del ranking en `get_challenge_board`, qué devuelve `get_friend_activity` por `kind`, y los valores válidos de `social_activity.kind` y `social_notifications.type` para escribir los textos.

## 7. Riesgos

### Privacidad
- **Peso corporal**: apagado por defecto (`share_body_weight = false`). `get_social_profiles` devuelve `weight` solo si se comparte. La UI no debe mostrarlo ni cachearlo si viene `null`.
- **Nutrición nunca** se muestra (Q14). La línea del perfil de amigo debe leerse de `hidden_categories`, no del cliente.
- **Foto de perfil de otros**: solo con relación (`can_view_profile_photo`). Ante un fallo de la URL firmada, mostrar `avatar_key` o iniciales; sin relación, no se pide foto (DA-S5).
- **Fotos de posts**: URL firmada con caducidad. No guardar la URL firmada en caché persistente ni en logs. Quitar **EXIF/GPS** antes de subir (el servidor no lo hace); verificar que `react-native-image-picker` con redimensión reescribe el archivo sin metadatos.
- **Búsqueda exacta**: no hay forma de enumerar usuarios (correcto). La UI no debe sugerir nombres.
- **Bloqueo**: nada de lo del otro debe seguir visible ni en caché de React Query tras `block_user`; invalidar feed, amigos, retos y notificaciones.
- **Cuenta eliminada**: el cascado borra lo social; la app debe tratar autores sin perfil como "Usuario eliminado".
- **Logs y analítica**: no registrar contenido de posts, comentarios ni nombres de usuario.

### Contenido de otros usuarios
- **Texto y fotos de terceros** se renderizan solo como texto plano (sin Markdown, sin enlaces activos). Límite de 280 caracteres en la app antes del servidor.
- **Comentarios y posts ocultos**: el cliente debe respetar `hidden_at`, `removed_at` y `deleted_at` (el servidor ya los filtra; la UI no debe mostrar el esqueleto vacío).
- **Reportar oculta al instante para el reportante** (`can_view_post`): la UI debe quitar el post sin recargar.
- **Adjuntos**: las métricas vienen del servidor; no calcular ni "arreglar" cifras en la app.

### Moderación
- Requisito de App Store 1.2: reportar y bloquear **antes de la primera versión con contenido ajeno** (Q11); ver 5.2 y BT-43.
- La cola (`moderation_queue`, `moderate_content`) no es parte de la app; hoy se usa desde Supabase Studio con `nicolas.falcon0@gmail.com` como `admin`. Falta el **compromiso de 24 h** y un contacto publicado (BT-08, BT-43).
- Con 3 reportes de personas distintas el contenido se oculta solo: riesgo de **reportes coordinados**. Mitigación: la revisión humana restaura (los reportes pasan a `dismissed`) y BT-49 limita la frecuencia.
- Reportes de `user` no ocultan nada: hay que dejar claro en la hoja que se revisará.

### Rendimiento del feed
- `get_feed` pagina por fecha (`_before`): usar `FlatList` con `onEndReached`, tamaño de página de 10 a 15 y **sin** realtime en v1.
- Cada post pide avatar y foto firmada: **pedir las URL firmadas por lote y por pantalla**, con caché de sesión y renovación antes de los 60 min (como `profile-photo.ts`); no una llamada por celda.
- `get_social_profiles(ids)` se llama una vez por página con los ids únicos.
- Imágenes: reservar el hueco con `photo_width` y `photo_height` (ya se guardan) para que el feed no salte; `Image` con `resizeMode` y tamaño de miniatura; esqueleto STATE_01.
- Me gusta con **actualización optimista** y reversión si falla; invalidar solo el post.
- `social_activity` caduca a 30 días: no depender de ella para historial.
- Reanimated en 6 composiciones con fotos grandes: medir en un iPhone real antes de añadir animaciones de entrada por celda.

### Producto y calendario
- El diseño y las decisiones de producto se separan en cuatro puntos (sección 0, punto 5): hay que confirmarlos antes de B y A (búsqueda por usuario exacto, sin "En tus retos", calorías en vez de volumen, sin repeticiones entre amigos).
- La tanda C depende de que el cron `social-maintenance-hourly` cierre retos; probar con retos de 3 días en un entorno con fechas reales.
- Comunidad **no es parte del lote de TestFlight de Scan**, pero sí necesita iPhone real para fotos y enlaces de invitación.

## 8. Diferencias propuesta vs aplicado

Fuente de lo aplicado: `src/types/supabase.ts` (tablas, columnas y firmas de RPC) y `BACKEND_SUMMARY` §1, §2, §3, §5, §7 y §8. Las políticas RLS, los CHECK y el cuerpo de las RPC **no están en el repo**: lo que sigue se deduce de los tipos y del resumen, y lo no comprobable se marca **verificar**.

### 8.1 Diferencias relevantes

| # | Propuesta | Aplicado | Impacto en la UI y en el plan |
|---|---|---|---|
| 1 | Vista `social_profiles` (§5.1) | Reemplazada por la RPC `get_social_profiles(_user_ids)` (`BACKEND_SUMMARY §8.2`). Existe además `social_can_see_identity(_target, _viewer)` | Un id que el visitante no puede ver puede **no volver** en la respuesta. La app debe tolerar filas ausentes ("Usuario") y pedir perfiles por lote. Sin cambio de tandas |
| 2 | Reservar el `post_id` con `reserve_post_id()` o subir a `drafts/` y moverlo (§7.1); job semanal de `drafts/` | No existe `reserve_post_id` ni `drafts`. La app genera el `post_id` y sube a `{uid}/{post_id}/…`; `create_post` recibe `_photo_path` (sin `_post_id`) | La app sube primero y publica después. Si publicar falla, hay que borrar la subida (BT-52). Afecta a la tanda A |
| 3 | Miniatura de 640 px junto a la original (§7.1) | No se menciona. Límite de 5 MB y JPG/PNG/WebP | La app sube **una sola** imagen redimensionada (propuesta: 1080 px de lado mayor, JPEG 0,8) y reserva el hueco con `photo_width/height`. Para el feed conviene pedir la firma de la URL por lote. Tanda A |
| 4 | Lectura de `profile-photos` para dueño, amigos, solicitud pendiente o **reto compartido** (§7.3) | Dueño, amigos, solicitud pendiente, o quien **puede ver alguna publicación o comentario vigente** del autor (`BACKEND_SUMMARY §5`). **No** incluye "reto compartido" | (a) Los participantes de un reto entre amigos son amigos, así que no se pierde nada. (b) Quien comenta en el post de un amigo **muestra su foto real a todos los que ven ese post**, aunque no sean amigos entre sí. Decisión pendiente: mostrar solo `avatar_key` o iniciales en los comentarios de no amigos (la propuesta DA-S5 lo hace en la búsqueda). Tandas A y B |
| 5 | Al retirar un post, sus fotos se borran del bucket (§4.13) | La foto se conserva **30 días** por si se restaura y luego se elimina (`BACKEND_SUMMARY §5`). El autor borrado: se borra en la siguiente ejecución diaria (máx. un día) | Sin cambio de UI. Mientras tanto nadie puede verla. Mencionar en la política de privacidad |
| 6 | Los posts **siempre** los publica el usuario; la actividad breve es automática (Q5, §6) | **Resuelto (7-oct-2026, backend):** no hay posts automáticos; solo `create_post` publica. Lo que se genera solo es `social_activity` y los aportes a retos (`BACKEND_SUMMARY §1`) | Sin cambio: el plan se mantiene. El Feed solo muestra lo que el usuario publicó |
| 7 | `get_social_profile` con `common_challenges` (§5.2) | **Resuelto (7-oct-2026, backend):** el servidor no lo devuelve | El perfil de otra persona **no** muestra "retos en común" (quitado en W1). Tanda B |
| 8 | "Eliminar amigo": `DELETE` en `friendships` por cualquiera de los dos (§4.3) | Backend la está aplicando como RPC `remove_friend` (7-oct-2026) | Se conecta en W2 (acción secundaria en SOCIAL_06) |
| 9 | Revocar un enlace de invitación con `UPDATE revoked_at` | Existe la columna `revoked_at`; no hay RPC de revocar | Sin pantalla en el diseño. Como mucho, "invitar" crea uno nuevo (máx. 5 activos). Tanda B |
| 10 | `workout_templates.source` solo `custom` (Q15) | Se aceptan `custom` **y vacío** (la web las deja vacías); las copias usan `shared` (`BACKEND_SUMMARY §8.1`) | Una rutina es compartible si `created_by = yo`, no es copia (`copied_from_post_id` nulo) y no es de ELLIE (`created_by_ai` no verdadero). No filtrar por `source = 'custom'` en la app. Tanda A |
| 11 | Repeticiones entre amigos ocultas hasta tener series (Q6) | Sigue bloqueado (`exercise_reps` rechazado). Decisión de producto abierta (`BACKEND_SUMMARY §7`) | Sin cambio: 5 de 6 tipos en Crear reto. Ver BT-45 |
| 12 | `social_activity` con 30 días (Q9) | Igual; el cron `social-maintenance-hourly` limpia y cierra/caduca retos | Sin diferencia. La app no depende de ella para historial |
| 13 | Restringir los tipos de archivo desde el bucket | **Pendiente manual** (Nicolás, `BACKEND_SUMMARY §7`); mientras tanto la app valida | La app **debe** validar JPG/PNG/WebP y 5 MB antes de subir. Tanda A |
| 14 | Revertir una sesión completada deshace los aportes (§6.2) | No deshace un reto ya completado ni su recompensa (`BACKEND_SUMMARY §8.3`) | No prometer "deshacer" en textos de retos. Tanda C |
| 15 | Reportes ocultan al reportante al instante (§4.12) | Probado: reporte ×2 sin duplicados. No se prueba explícitamente el ocultado | Verificar que `get_feed` y los comentarios ya excluyen lo reportado por mí; si no, la app lo oculta en cliente al reportar. Tanda A |
| 16 | Funciones extra | Aplicado añade `get_friend_activity`, `get_my_challenges`, `leave_challenge`, `mark_challenge_celebrated`, `social_streak_days`, `can_view_social_photo`, `social_challenges_maintenance`, `verify_cleanup_token` | Se usan en las pantallas (sección 2). Las tres últimas son internas, la app no las llama |

### 8.2 Lo que coincide (se mantiene el plan)

Tablas y columnas de `social_settings`, `friend_requests`, `friendships`, `friend_invites`, `social_posts`, likes, comentarios, `social_activity`, retos (3 tablas), `social_notifications`, `user_blocks`, `content_reports`, `app_moderators`, `moderation_actions` y la vista `moderation_queue`. También: `workout_templates.copied_from_post_id/copied_from_user_id`, las RPC de amistad, publicación, retos y moderación con las firmas esperadas, y que los likes, comentarios, reportes y notificaciones leídas van directo con RLS.

### 8.3 Reglas de negocio de la propuesta que la UI debe respetar

| Tema | Regla |
|---|---|
| Categorías de privacidad | Entrenamientos, Récords, Logros, Fotos, Rutinas, Peso corporal (apagado por defecto) y Permitir solicitudes. La nutrición **nunca** se comparte (Q14) |
| Qué ofrece el composer | Sin adjunto de Récord si `share_records = false`; sin foto si `share_photos = false`; sin rutina si `share_routines = false`. Nunca solo texto: el post lleva adjunto o foto (Q4). Fotos solo en entreno y `photo` (DA-S4) |
| Texto | Publicación ≤ 280 caracteres; comentario de 1 a 500; detalle del reporte ≤ 500 |
| Audiencia | `friends` o `public`. Lo público se ve **solo en el perfil**, nunca en un feed (Q2). Apagar una categoría oculta también lo anterior (Q2b) |
| Quién ve qué | Un amigo ve según los interruptores; un no amigo con perfil público ve lo mismo salvo "amigos desde" y retos en común; un no amigo con perfil de amigos ve solo nombre, avatar, objetivo, racha y el botón Agregar o "No acepta solicitudes" |
| Estados de amistad | `relationship`: `self`, `friends`, `request_sent`, `request_received`, `none`. Botón: Agregar → Solicitado → Amigos. `send_friend_request` devuelve `sent`, `pending`, `accepted` (el otro ya me había enviado una), `already_friends`, `not_accepting`, `unavailable`, `invalid`. "Ignorar" = `declined` sin avisar. Con "Permitir solicitudes" apagado nadie te envía, tú sí, y las ya recibidas siguen pendientes (Q12, DA-S2) |
| Invitación por enlace | Un uso, 7 días, máx. 5 activos; crea la amistad directo, sin solicitud (DA-S1) |
| Búsqueda | Solo por nombre de usuario **exacto** (`^[a-z0-9_.]{3,24}$`, sin distinguir mayúsculas). Sin listados ni sugerencias (Q3, Q13) |
| Retos | Solo se invita a amigos. Duración 3, 7 o 14 días. Entre amigos: 0 puntos, sin entrada manual. Oficial: puntos y badge, entrada manual de 1 a 100 por registro y 300 al día (DA-S7). Comparación solo entre amigos; el total de participantes es un número sin nombres. Invitación caduca al empezar el reto o a los 7 días (Q16) |
| Moderación | Reportar y bloquear antes de lanzar (Q11). Con 3 reportes `open` de personas distintas el contenido se oculta para todos hasta revisión (DA-S6). Reportes de `user` no ocultan nada. Bloquear borra la amistad, cancela solicitudes y no avisa al bloqueado; ninguno ve nada del otro |
| Puntos | Nunca por likes, comentarios, publicar ni agregar amigos |
