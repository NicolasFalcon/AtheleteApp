# ELLIE · Flujo completo de las cards de Rutina y Plan nutricional (v2.18)

Complementa las secciones 28.3 (rutina) y 28.4 (nutrición) del handoff, que definen las medidas y los estilos. Este documento define **el comportamiento**: puntos de entrada, cada acción y su resultado, los estados, los mensajes del chat, qué se guarda y cuándo, y los casos límite.

Prototipo de referencia: `Ellie.dc.html` (UI) y `Athelete App.dc.html` (lógica: `rpAdjust`, `nuReady`, `nuAdjust`, `activatePlan`).

---

## 0. Reglas comunes a las dos cards

1. **Nada se guarda ni se activa hasta que el usuario confirma.** Una propuesta, una v2 o una edición en la hoja son borradores.
2. **Solo la última versión de cada tipo de card está viva.** Al llegar una versión nueva, la anterior pasa a "Reemplazada/o por la v2". Queda al 55 % de opacidad, sin acciones ni ajustes rápidos, y se puede seguir leyendo en el historial del chat.
3. **Los ajustes rápidos y "Otra versión" son mensajes del usuario.** El texto del chip aparece como píldora negra del usuario. Después ELLIE muestra el estado "pensando" (~1,5 s en el prototipo) y responde "Hecho. Esta es la versión 2." con la card nueva.
4. **El botón Ajustar (sliders) no abre ninguna pantalla.** Rellena el input del chat con "Ajusta la rutina: " o "Ajusta el plan: " y lo enfoca para que el usuario escriba. Al enviarlo, ELLIE responde con una v2, igual que un chip.
5. **Enviar cualquier mensaje cierra la hoja de detalle abierta**, sea de rutina o de nutrición.
6. **El input del chat siempre está disponible.** Las cards nunca bloquean la conversación.
7. **Versiones:** la primera respuesta es v1. Las siguientes son "V2 · <AJUSTE>", con el texto del ajuste en mayúsculas en el badge. En producción, si el usuario sigue ajustando se numeran V3, V4…; el badge muestra siempre el último ajuste.
8. **Cifras:** las kcal, los macros, los pesos y el desglose de "Cómo lo calculé" los da el backend (28.1). El prototipo usa datos ilustrativos.

---

## 1. Card de Rutina

### 1.1 Puntos de entrada

| Origen | Mensaje del usuario | Modo de la card |
|---|---|---|
| Chat libre | "Arma una rutina de 30 min para hoy" | NUEVA (sin rutina de origen) |
| Chat libre | "Ajusta mi rutina de hoy a 30 minutos" | AJUSTADA (parte de la rutina planificada, ej. Total Body) |
| Portada de ELLIE · "También puedo" → Entrenamiento | Mensaje prefijado | Según la petición |
| Inicio · Banda de ELLIE (entreno pendiente) | "Ajusta mi rutina de hoy…" | AJUSTADA |

ELLIE responde primero con una frase. Ejemplos: "Te propongo esta sesión de 30 minutos." o "Hoy tenías Total Body. Te la dejo en 30 minutos." Después, con la card.

### 1.2 Diagrama

```
Usuario pide rutina
  └─► ELLIE: frase + CARD (NUEVA | AJUSTADA)           estado: abierta
        │
        ├─ Chip (Más corta · Sin banco · Más pierna · Menos intensidad)
        │   o mensaje libre / Ajustar (sliders → input prellenado)
        │     └─► CARD V2 · <AJUSTE>                     la anterior: reemplazada
        │
        ├─ Guardar ─────────────────────────────────►   estado: guardada
        │                                                 └─ Ver en Entrenos › → tab Entrenos
        │
        └─ Ver y aprobar ─► HOJA DE DETALLE
              ├─ tocar ejercicio (Principal) ─► expandido: video · pautas · músculo principal
              │     ├─ Cambiar por variante ─► lista de hasta 3 variantes ─► elegir ─► fila "Cambiado"
              │     └─ Quitar ─► fila fuera, pasa a "Quitados"
              │        (totales y bloque Cambios se recalculan en vivo)
              ├─ Empezar ahora ─► cierra hoja ─► Sesión activa con la rutina tal como está en la hoja
              ├─ Guardar en mis rutinas ─► cierra hoja ─► card en estado guardada
              └─ Descartar / ✕ / swipe abajo ─► cierra hoja; card sigue abierta, ediciones de la hoja se pierden
```

### 1.3 Acciones de la card

| Acción | Resultado |
|---|---|
| **Ver y aprobar** | Abre la hoja de detalle de esa versión. |
| **Guardar** | Guarda la rutina en Mis rutinas sin abrir la hoja. La card pasa a "Guardada" (check Ember con athPop) + "Ver en Entrenos ›". Desaparecen los ajustes rápidos. |
| **Ajustar** (sliders) | Input prellenado "Ajusta la rutina: ", con foco. |
| **Chip de ajuste rápido** | Mensaje del usuario + card V2. |
| **Ver en Entrenos ›** (guardada) | Va a la tab Entrenos, donde la rutina aparece en Mis rutinas. |

### 1.4 Contenido de la card

- Badge: NUEVA · AJUSTADA · V2 · <AJUSTE>.
- Meta: "<min> min · <N> ejercicios · <nivel>".
- Músculos (pills llenas) y equipamiento (pills con contorno).
- Razonamiento de ELLIE: qué cambió y por qué, en una frase. Ej. "Basada en tu Total Body: recorté de 6 a 5 ejercicios y bajé el descanso para que quepa en 30 min."
- Lista compacta: el calentamiento siempre va primero y después los ejercicios principales. Se muestran como máximo 6 filas; si hay más, "+N más".
- Formato del detalle: `series × reps · unidades × carga · descanso` ("3 × 10 · 2 × 14 kg · 60 s"). Sin carga (peso corporal): `3 × 12 · 45 s`.
- Etiquetas de cambio: Ajustado (mismo ejercicio con otros parámetros) · Añadido (nuevo) · Cambiado (sustituye a otro).
- Quitados al final: "Quitado: ~~nombre~~", una línea por ejercicio.

### 1.5 Hoja de detalle

- Eyebrow "PROPUESTA DE ELLIE · <NIVEL>"; en las versiones posteriores, "PROPUESTA DE ELLIE · V2 · <NIVEL>".
- **Totales en vivo:** min · ejercicios · series.
  - Al quitar un ejercicio, la duración baja 5 min (mínimo 10).
  - Las series se suman a partir de la lista actual.
  - En producción la duración la recalcula el backend.
- **Bloque Cambios:**
  - Título "CAMBIOS VS TU <RUTINA ORIGEN>" en la v1 ajustada y "CAMBIOS VS VERSIÓN 1" en las v2.
  - Filas Añadidos (incluye Cambiados) · Ajustados · Quitados (incluye los quitados en la hoja).
  - Se oculta si no hay cambios. Una rutina NUEVA no tiene bloque hasta que el usuario edita algo.
- **Bloques:**
  - CALENTAMIENTO y VUELTA A LA CALMA: filas fijas, no expandibles.
  - PRINCIPAL: "<N> ejercicios · <N> series". Filas expandibles, una abierta a la vez.
- **Fila expandida:**
  - Video 16:9 con play.
  - Pautas.
  - "Músculo principal".
  - "Cambiar por variante" + "Quitar".
- **Variantes:** hasta 3 del mismo grupo muscular que no estén ya en la rutina. Título "Variantes · <grupo>". Elegir una sustituye la fila, la marca como "Cambiado" y cierra la expansión.
- Nota: "Nada se guarda hasta que la apruebes."
- Footer: "Empezar ahora" · "Guardar en mis rutinas" · "Descartar".

### 1.6 Estados de la card de rutina

| Estado | Cuándo | Acciones visibles |
|---|---|---|
| Abierta | Última versión, sin guardar | Ver y aprobar · Guardar · Ajustar + chips |
| Guardada | Tras Guardar (card u hoja) | Ver en Entrenos › |
| Reemplazada | Existe una versión posterior | Ninguna (55 %) |
| Pensando | Entre el mensaje del usuario y la v2 | Indicador de ELLIE en el chat; la card anterior sigue abierta hasta que llega la nueva |

### 1.7 Qué se guarda

- **Guardar (card):** la versión tal como la propuso ELLIE.
- **Guardar en mis rutinas (hoja):** la versión con las ediciones de la hoja (variantes y quitados).
- **Empezar ahora:** inicia la sesión con la versión de la hoja. Decisión pendiente de producto: si además se guarda en Mis rutinas. Propuesta: no guardarla en Mis rutinas; la sesión queda en el historial y el Resumen ofrece "Guardar rutina".
- **Descartar:** no guarda nada y pierde las ediciones de la hoja.
- Guardar una v2 no borra ni modifica la rutina de origen (Total Body).

### 1.8 Errores y casos límite

| Caso | Comportamiento |
|---|---|
| Sin conexión al pedir o ajustar | Error estándar de ELLIE (mensaje no enviado + Reintentar). La card anterior no cambia. |
| Falla Guardar | El botón vuelve a su estado + snackbar "No se pudo guardar. Intenta de nuevo." La card sigue abierta. |
| Quitar todos los ejercicios principales | Deshabilitar "Quitar" en el último ejercicio principal (mínimo 1). |
| Sin variantes disponibles | Ocultar "Cambiar por variante". |
| Cerrar la hoja con ediciones | Se descartan sin confirmación, porque la card conserva la propuesta. |
| Guardar una versión antigua | No es posible: las cards reemplazadas no tienen acciones. |

---

## 2. Card de Plan nutricional

### 2.1 Puntos de entrada

| Origen | Mensaje del usuario |
|---|---|
| Chat libre | "Quiero un plan nutricional" |
| Nutrición sin plan · "Crear plan con ELLIE" (Ember + AURA small) | Mensaje prefijado; abre el chat |
| Portada de ELLIE · "También puedo" → Nutrición | Mensaje prefijado |

### 2.2 Diagrama

```
Usuario pide plan
  ├─ ¿Preferencias guardadas? NO
  │     └─► ELLIE: "Antes de proponerte un plan, cuatro preguntas rápidas. Solo te las hago esta vez."
  │           └─► CARD DE PREGUNTAS ─► Listo
  │                 ├─ se envía resumen como mensaje del usuario ("Sin lactosa · Omnívora · 4 comidas")
  │                 └─ la card de preguntas se resume: TUS PREFERENCIAS + chips + Cambiar
  └─ SÍ ─► directo a la card del plan
        │
        ▼
  ELLIE: "Con tu objetivo de ganar músculo y 6 días de entreno, te propongo este punto de partida."
  CARD DEL PLAN (PROPUESTA)                              estado: abierta
        │
        ├─ Otra versión · chip (Más proteína · Más económico · Menos cocina · Otra cena)
        │   o mensaje libre / Ajustar (sliders → input prellenado)
        │     └─► CARD V2 · <AJUSTE>                       la anterior: reemplazado
        │
        └─ Ver y activar ─► HOJA DE DETALLE
              ├─ tira de semana: elegir día ─► comidas de ese día (Entreno / Descanso)
              ├─ comida · Cambiar ─► Equivalentes (hasta 3) ─► elegir ─► comida "Cambiado"
              ├─ Lista de compras · Ver lista completa / Ver menos
              ├─ Activar plan ─► Activando… ─┬─ OK ─► cierra hoja ─► card "Plan activo" · Ver en Nutrición ›
              │                              └─ fallo ─► mensaje de error + "Reintentar" (shake)
              └─ Descartar / ✕ / swipe abajo ─► cierra hoja; card sigue abierta
```

### 2.3 Card de preguntas previas

- **Alergias o intolerancias** (selección múltiple): Ninguna · Lactosa · Gluten · Frutos secos · Mariscos · Otra.
  - "Ninguna" es exclusiva: al elegirla se desmarcan las demás, y al elegir otra opción se desmarca "Ninguna".
  - Por defecto está marcada "Ninguna".
- **Tipo de alimentación** (una): Omnívora · Vegetariana · Vegana · Sin cerdo · Otra. Por defecto, Omnívora.
- **Alimentos que no te gustan** (texto libre, opcional).
- **Comidas al día:** 3 · 4 · 5. Por defecto, 4.
  - Con 3 desaparece la merienda.
  - Con 5 se añade "Media mañana · 11:00".
- **Listo** está siempre habilitado, porque todo tiene valor por defecto. Al pulsarlo se envía un mensaje del usuario con el resumen: alergias como "Sin <x>" ("Otra" → "Con restricciones") · dieta · "<N> comidas" · "No me gusta: <texto>" si lo hay.
- **Resumen "TUS PREFERENCIAS"** con chips. "Cambiar" reabre la card de preguntas con los valores actuales; al pulsar Listo de nuevo llega una propuesta nueva.
- Las preferencias se guardan en el perfil y no se vuelven a preguntar. Se editan desde Perfil → Preferencias de alimentación o con "Cambiar".

### 2.4 Acciones de la card del plan

| Acción | Resultado |
|---|---|
| **Ver y activar** | Abre la hoja de detalle de esa versión. |
| **Otra versión** | Mensaje del usuario "Otra versión" + card V2: mismas cifras y otras comidas. |
| **Ajustar** (sliders) | Input prellenado "Ajusta el plan: ", con foco. |
| **Chip** | Mensaje del usuario + card V2 con el ajuste aplicado (ej. Más proteína sube a 185 g y cambia comida, merienda y cena). |
| **Ver en Nutrición ›** (activo) | Abre Nutrición · contador del día con la meta del plan. |

La card **no** tiene un "Activar" directo: el plan solo se activa desde la hoja, tras ver el detalle.

### 2.5 Contenido de la card del plan

- Badge PROPUESTA · V2 · <AJUSTE>.
- Kcal/día (sage) + 3 macros con gramos y %. Proteína en Ember.
- "Cómo lo calculé": una línea de cálculo (BMR · factor de actividad · ajuste por objetivo = objetivo) + aviso "Estimación orientativa. No reemplaza a un profesional."
- Chips de las preferencias aplicadas.
- Razonamiento de ELLIE (solo en las v2): qué cambió respecto a la versión anterior.
- "UN DÍA DE EJEMPLO": una fila por comida (momento + hora · plato + macros · kcal). Las comidas cambiadas llevan la etiqueta "Cambiado".
- "Ajustar por entreno": "Entreno 2.950" · "Descanso 2.700".

### 2.6 Hoja de detalle

- Eyebrow "PROPUESTA DE ELLIE · <OBJETIVO>"; en las versiones posteriores, "PROPUESTA DE ELLIE · V2 · <OBJETIVO>".
- **OBJETIVOS DEL DÍA:** kcal · Proteína · Carbos · Grasas.
- **CÓMO LO CALCULÉ (clave / valor):**
  - Metabolismo basal (BMR).
  - Factor de actividad.
  - Ajuste por objetivo.
  - Mínimo de seguridad: si el objetivo queda por debajo del mínimo, se sube al mínimo y se indica.
  - Objetivo diario, en negrita.
  - Debajo, el aviso.
- **TU SEMANA:** L–D, con punto Ember lleno los días de entreno y anillo gris los de descanso. Al abrir la hoja está seleccionado el día actual (L en el prototipo). Bajo la tira:
  - Entreno: "<Día> · Entreno · 2.950 kcal" · "+100 kcal en la comida respecto a la base".
  - Descanso: "<Día> · Descanso · 2.700 kcal" · "−150 kcal: menos carbohidrato en la cena".
  - Con el ajuste por entreno desactivado: "Mismo objetivo todos los días".
- **Comidas del día elegido:** "<momento> · <hora>" · kcal · plato · macros · ingredientes con cantidad · "Cambiar".
  - "Cambiar" despliega "Equivalentes · mismas kcal (±5 %) y proteína similar", con hasta 3 opciones (nombre · kcal · P).
  - Elegir una sustituye la comida **solo ese día** y la marca como "Cambiado".
  - Un día se puede cambiar sin afectar a los demás; en el prototipo, los días alternos ya llevan comidas distintas.
- **LISTA DE COMPRAS · SEMANA:** "<N> productos". Suma los ingredientes de los 7 días con los cambios aplicados, ordenados por cantidad. Muestra 6; "Ver lista completa" / "Ver menos". Las cantidades ≥ 1000 se muestran en kg o l con coma decimal.
- **Footer:** "Activar plan" + "Descartar".

### 2.7 Activación

| Paso | UI |
|---|---|
| Pulsar Activar plan | Botón en "Activando…", deshabilitado. |
| Éxito | La hoja se cierra. La card pasa a "Plan activo" (check Ember 32 pt) + "Ver en Nutrición ›". Desaparecen los ajustes rápidos. |
| Fallo | La hoja sigue abierta. Aparece un mensaje de error rojo sobre el footer (icono + texto) y el botón pasa a "Reintentar" con shake. Al cerrar la hoja tras un fallo, la card vuelve a "abierta". |

El prototipo fuerza un fallo en el primer intento para enseñar el estado; en producción, el fallo depende de la respuesta del backend.

**Efectos de activar:**
- El perfil pasa a tener plan (`hasPlan`).
- Nutrición deja de mostrar "Meta estimada por tu perfil, sin plan activo." y usa la meta del plan del día (Entreno/Descanso).
- El anillo de Nutrición de Inicio usa la meta del plan.
- Las comidas cambiadas en la hoja y la lista de compras se guardan con el plan.

**Si ya hay un plan activo** y se activa otro, el nuevo sustituye al anterior. En producción, confirmar antes con "Ya tienes un plan activo. ¿Sustituirlo?" · "Sustituir" · "Cancelar" (decisión pendiente).

### 2.8 Estados de la card del plan

| Estado | Cuándo | Acciones visibles |
|---|---|---|
| Abierta | Última versión, sin activar | Ver y activar · Otra versión · Ajustar + chips |
| Activando / error | La hoja está abierta | La card no cambia |
| Plan activo | Tras activar | Ver en Nutrición › |
| Reemplazado | Existe una versión posterior | Ninguna (55 %) |
| Pensando | Entre el mensaje del usuario y la v2 | Indicador de ELLIE |

Con el plan ya activo, la hoja de esa card no se vuelve a abrir. Para cambiar el plan se pide otro a ELLIE.

### 2.9 Errores y casos límite

| Caso | Comportamiento |
|---|---|
| Sin conexión al pedir o ajustar | Error estándar de ELLIE (mensaje no enviado + Reintentar). |
| Falla la activación | Ver 2.7. |
| Preferencias incompatibles (ej. Vegana + objetivo de proteína alto) | ELLIE lo explica en la frase previa y propone igualmente el plan más cercano. |
| Objetivo por debajo del mínimo de seguridad | Se sube al mínimo; la fila "Mínimo de seguridad" indica "Aplicado · <valor>". |
| Sin equivalentes para una comida | Ocultar "Cambiar". |
| Cerrar la hoja con comidas cambiadas | Los cambios se descartan sin confirmación. |

---

## 3. Mensajes de ELLIE (copy)

| Momento | Texto |
|---|---|
| Rutina nueva | "Te propongo esta sesión de 30 minutos." |
| Rutina ajustada | "Hoy tenías Total Body. …" + razonamiento en la card |
| Nutrición · antes de las preguntas | "Antes de proponerte un plan, cuatro preguntas rápidas. Solo te las hago esta vez." |
| Nutrición · propuesta | "Con tu objetivo de ganar músculo y 6 días de entreno, te propongo este punto de partida." |
| Cualquier v2 | "Hecho. Esta es la versión 2." |
| Razonamientos de v2 · rutina | Más corta: "Versión 2 más corta: quité la zancada inversa. Quedan 4 ejercicios en 22 min." · Menos intensidad: "Versión 2 más suave: una serie menos y pesos un 10 % más bajos. Misma estructura." |
| Razonamientos de v2 · nutrición | Otra versión: "Versión 2: mismas cifras y comidas distintas en todo el día." · Más proteína: "…Sube a 185 g al día." · Más económico: "Versión 2 más económica: legumbre en la comida y tortilla en la cena." · Menos cocina: "Versión 2 con menos cocina: comida en 10 minutos y merienda sin fuego." · Otra cena: "Versión 2: cambié la cena por merluza con boniato." |

---

## 4. Datos que necesita cada card (contrato orientativo)

**Rutina:** `id`, `version`, `mode` (nueva | ajustada), `sourceRoutineId?`, `adjustLabel?`, `title`, `minutes`, `level`, `muscles[]`, `equipment[]`, `reasoning`, `warmup[] {name, detail}`, `main[] {id, name, image, video, sets, reps, units, kg?, rest, tag?, muscleGroup, primaryMuscle, tips[], variants[]}`, `cooldown[]`, `removed[] {name}`, `status` (open | saved | replaced).

**Plan nutricional:** `id`, `version`, `adjustLabel?`, `goal`, `kcal`, `macros {p, c, g, pct}`, `calc {bmr, activityFactor, trainingDays, goalAdjustPct, safetyMin, safetyApplied}`, `prefs {allergies[], diet, dislikes, mealsPerDay}`, `reasoning?`, `trainingAdjust {enabled, trainKcal, restKcal, trainNote, restNote}`, `week[7] {type: train|rest, kcal, meals[] {slot, time, name, kcal, p, c, g, tag?, ingredients[] {name, qty, unit}, equivalents[]}}`, `shopping[] {name, qty, unit}`, `status` (open | activating | error | active | replaced).

---

## 5. Estados demostrables en el prototipo (índice lateral)

- Rutina · propuesta nueva · ajustada con cambios · v2 tras ajuste rápido · aprobada y guardada.
- Nutrición · preguntas previas · propuesta · otra versión (v2) · plan activado.

## 6. Decisiones pendientes

1. "Empezar ahora" en la rutina: ¿guarda también en Mis rutinas? (propuesta en 1.7).
2. Confirmación al sustituir un plan nutricional ya activo (2.7).
3. Numeración a partir de la V3 en ajustes sucesivos (regla 0.7).
