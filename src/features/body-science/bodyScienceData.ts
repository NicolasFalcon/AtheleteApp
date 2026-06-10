export type BodyScienceArticle = {
  id: string;
  title: string;
  category: 'Training' | 'Recovery' | 'Nutrition' | 'Mindset';
  summary: string;
  readTimeMinutes: number;
  content: string;
};

export const bodyScienceArticles: BodyScienceArticle[] = [
  {
    id: 'progressive-overload',
    title: '¿Qué es la sobrecarga progresiva?',
    category: 'Training',
    summary: 'El principio fundamental para ganar fuerza y construir músculo a lo largo del tiempo.',
    readTimeMinutes: 4,
    content: `La sobrecarga progresiva es el aumento gradual del estrés que se aplica al cuerpo durante el ejercicio. Es el principio más importante para ganar fuerza y masa muscular a largo plazo.

## Por qué importa

Tu cuerpo se adapta a las demandas que le impones. Si siempre levantas el mismo peso con las mismas repeticiones, tu cuerpo no tiene razón para crecer. La sobrecarga progresiva fuerza una adaptación continua.

## Cómo aplicarla

Hay varias formas de aplicar sobrecarga progresiva:

**1. Aumentar el peso** — Añade incrementos pequeños (1-2.5 kg) cuando puedas completar todas las repeticiones con buena forma.

**2. Aumentar las repeticiones** — Si hiciste 3×8, intenta 3×10 antes de subir peso.

**3. Aumentar las series** — Añade una serie extra para aumentar el volumen total.

**4. Reducir el descanso** — Periodos de descanso más cortos aumentan el estrés metabólico.

**5. Mejorar el tempo** — Ralentiza la fase excéntrica (bajada) para más tiempo bajo tensión.

## Ejemplo práctico

Semana 1: Sentadilla 60 kg × 3 series × 8 reps
Semana 2: Sentadilla 60 kg × 3 series × 10 reps
Semana 3: Sentadilla 62.5 kg × 3 series × 8 reps
Semana 4: Sentadilla 62.5 kg × 3 series × 10 reps

## Conclusión clave

Registra tus entrenos. Si no los registras, estás adivinando, y adivinar no construye músculo.`,
  },
  {
    id: 'compound-lifts',
    title: 'Por qué los ejercicios compuestos son tan efectivos',
    category: 'Training',
    summary: 'Los movimientos multiarticulares reclutan más músculo, queman más calorías y construyen fuerza funcional.',
    readTimeMinutes: 5,
    content: `Los ejercicios compuestos — sentadillas, peso muerto, press de banca, press militar, remos — son la base de cualquier programa serio de entrenamiento. Aquí te explicamos por qué.

## ¿Qué los hace "compuestos"?

Un ejercicio compuesto involucra movimiento en dos o más articulaciones. La sentadilla mueve cadera, rodilla y tobillo simultáneamente. Compara esto con una extensión de pierna, que solo mueve la rodilla.

## Beneficios de los ejercicios compuestos

**Más músculo reclutado por repetición.** Una sola serie de peso muerto trabaja glúteos, isquiotibiales, cuádriceps, erectores, trapecios, antebrazos y core. Necesitarías 5 o más ejercicios de aislamiento para cubrir los mismos músculos.

**Mayor respuesta hormonal.** El reclutamiento de gran masa muscular dispara mayor liberación de testosterona y hormona del crecimiento comparado con el trabajo de aislamiento.

**Mayor gasto calórico.** Más músculos trabajando = más gasto energético, tanto durante como después del entreno (EPOC).

**Fuerza funcional.** Los movimientos compuestos imitan actividades de la vida real — levantar cosas, empujar, jalar. Construyen coordinación y estabilidad que el aislamiento no puede replicar.

**Eficiencia de tiempo.** Un programa construido alrededor de 4-5 ejercicios compuestos se puede hacer en 45 minutos y cubrir todo el cuerpo.

## Los 5 grandes

1. **Sentadilla** — Rey del tren inferior
2. **Peso muerto** — Cadena posterior completa
3. **Press de banca** — Empuje superior
4. **Press militar** — Fuerza y estabilidad de hombro
5. **Remo con barra** — Tracción superior

## Tip de programación

Coloca los ejercicios compuestos al inicio de tu sesión cuando estés más fresco. Deja el aislamiento (curls, elevaciones laterales) para el final.`,
  },
  {
    id: 'sleep-muscle-growth',
    title: 'Sueño y crecimiento muscular: lo básico',
    category: 'Recovery',
    summary: 'Por qué dormir 7-9 horas de calidad es innegociable para la recuperación y el rendimiento.',
    readTimeMinutes: 4,
    content: `No creces en el gimnasio — creces mientras duermes. Entender la relación entre sueño y reparación muscular puede transformar tus resultados.

## Qué pasa durante el sueño

**Liberación de hormona del crecimiento.** Hasta el 75% de la hormona del crecimiento (GH) diaria se secreta durante el sueño profundo (fases 3-4). La GH es fundamental para la reparación muscular, el metabolismo de grasa y la regeneración de tejidos.

**Síntesis de proteína.** Tu cuerpo acelera la síntesis de proteína muscular durante el sueño, usando los aminoácidos de tu ingesta diaria de proteína para reparar el microdaño del entrenamiento.

**Recuperación del sistema nervioso.** Tu sistema nervioso central (SNC) se recupera durante el sueño. Un SNC fatigado significa contracciones más débiles, tiempos de reacción más lentos y mayor riesgo de lesión.

## ¿Cuánto sueño necesitas?

La investigación muestra consistentemente que **7-9 horas** es lo óptimo para atletas. Estudios en sujetos con falta de sueño muestran:

- 10-30% de disminución en rendimiento de fuerza
- Aumento de cortisol (hormona catabólica)
- Sensibilidad a la insulina reducida (peor partición de nutrientes)
- Función cognitiva y motivación deterioradas

## Tips de higiene del sueño para atletas

1. **Horario consistente** — Acuéstate y despierta a la misma hora, incluso fines de semana.
2. **Cuarto fresco** — 18-20°C es óptimo para el sueño profundo.
3. **Sin pantallas 1h antes de dormir** — La luz azul suprime la melatonina.
4. **Evita la cafeína después de las 2 PM** — La cafeína tiene una vida media de 6 horas.
5. **Suplemento de magnesio** — 200-400mg antes de dormir puede mejorar la calidad del sueño.

## Conclusión

Si entrenas duro pero duermes mal, estás dejando ganancias sobre la mesa. Prioriza el sueño como priorizas tu entrenamiento.`,
  },
  {
    id: 'deload-weeks',
    title: 'Semanas de descarga: cuándo y por qué',
    category: 'Recovery',
    summary: 'Periodos estratégicos de descanso que previenen el agotamiento y preparan tu próxima fase de progreso.',
    readTimeMinutes: 3,
    content: `Una semana de descarga es una reducción planificada en la intensidad o volumen de entrenamiento. Puede parecer contraproducente, pero es una de las cosas más inteligentes que puedes hacer para el progreso a largo plazo.

## ¿Por qué descargar?

El entrenamiento crea fatiga acumulada — tanto muscular como neural. A lo largo de semanas de entrenamiento intenso, esta fatiga se acumula más rápido de lo que tu cuerpo puede recuperarse. La descarga le permite a tu cuerpo "ponerse al día" con la recuperación.

## Señales de que necesitas una descarga

- Pesos estancados o en retroceso por 2+ semanas
- Dolor articular o muscular persistente
- Mala calidad de sueño a pesar de buenos hábitos
- Baja motivación para entrenar
- Frecuencia cardíaca en reposo elevada

## Cómo descargar

**Opción A: Reducir volumen** — Mantén el mismo peso, pero haz el 50% de tus series normales.

**Opción B: Reducir intensidad** — Usa 50-60% de tu peso de trabajo normal, mismas series y reps.

**Opción C: Recuperación activa** — Reemplaza el levantamiento con cardio ligero, movilidad y estiramientos.

## Cuándo descargar

Una guía común es cada **4-6 semanas** de entrenamiento intenso. Atletas más avanzados que trabajan con intensidades altas pueden necesitar una cada 3-4 semanas. Principiantes pueden ir 6-8 semanas.

## Conclusión clave

Las descargas no son señal de debilidad — son señal de programación inteligente. A menudo lograrás nuevos récords en la semana después de una descarga.`,
  },
  {
    id: 'calories-vs-macros',
    title: 'Calorías vs macros: qué importa más',
    category: 'Nutrition',
    summary: 'Entendiendo la jerarquía de prioridades nutricionales para la composición corporal.',
    readTimeMinutes: 5,
    content: `El debate entre "solo cuenta calorías" y "cuenta tus macros" confunde a mucha gente. Aquí está la jerarquía de lo que realmente importa.

## La pirámide de prioridades nutricionales

1. **Calorías** — Balance energético total (lo más importante)
2. **Macronutrientes** — Distribución de proteína, carbos, grasas
3. **Micronutrientes** — Vitaminas, minerales
4. **Timing de comidas** — Cuándo comes
5. **Suplementos** — Lo menos importante

## Calorías: la base

Si ganas, pierdes o mantienes peso depende del balance energético:

- **Superávit** (más calorías de entrada que de salida) → ganancia de peso
- **Déficit** (menos calorías de entrada que de salida) → pérdida de peso
- **Mantenimiento** → peso estable

Ninguna distribución de macros anula un superávit o déficit calórico.

## Por qué los macros sí importan

Mientras las calorías determinan el cambio de *peso*, los macros determinan *qué tipo* de peso cambia:

**Proteína** (1.6-2.2g por kg de peso corporal) — Preserva músculo en déficit, construye músculo en superávit. El macro más importante para la composición corporal.

**Grasas** (0.8-1.2g por kg) — Esenciales para hormonas (testosterona, estrógeno), función cerebral y absorción de vitaminas. No bajes demasiado.

**Carbos** (rellenar calorías restantes) — Combustible primario para el ejercicio de alta intensidad. Más carbos = mejor rendimiento en el entreno.

## Enfoque práctico

1. Calcula tu objetivo calórico (TDEE ± 300-500 para superávit/déficit)
2. Fija proteína a 2g por kg de peso corporal
3. Fija grasas a 1g por kg de peso corporal
4. Rellena el resto con carbos

## Conclusión

Las calorías son el rey para el manejo de peso. Pero si quieres verte y rendir al máximo, necesitas prestar atención a los macros también — especialmente la proteína.`,
  },
  {
    id: 'protein-intake',
    title: 'Ingesta de proteína: ¿cuánta necesitas realmente?',
    category: 'Nutrition',
    summary: 'Recomendaciones de proteína basadas en evidencia para el crecimiento muscular y la recuperación.',
    readTimeMinutes: 4,
    content: `La proteína es el macronutriente más discutido en el fitness. Pero, ¿cuánta necesitas realmente? Vamos a la ciencia.

## El consenso de la investigación

Múltiples meta-análisis (Morton et al., 2018; Stokes et al., 2018) convergen en un rango claro:

**1.6 a 2.2 gramos por kilogramo de peso corporal al día**

Para una persona de 80 kg, eso es 128-176g de proteína diaria.

## ¿Más proteína = más músculo?

No a partir de cierto punto. La investigación muestra rendimientos decrecientes por encima de 1.6g/kg, con virtualmente ningún beneficio adicional más allá de 2.2g/kg para la mayoría.

## Cuándo apuntar más alto (2.0-2.2g/kg)

- Durante un déficit calórico (para preservar masa muscular)
- Durante volúmenes de entrenamiento muy altos
- Si eres un atleta natural intentando maximizar el crecimiento muscular
- Atletas mayores (40+), que tienen mayores necesidades de proteína por la resistencia anabólica

## Cuándo 1.6g/kg es suficiente

- Durante un superávit calórico (el exceso de energía ya apoya el crecimiento)
- Durante fases de mantenimiento
- Si cantidades más altas causan molestias digestivas

## Distribución de proteína

Distribuir la proteína en **3-5 comidas** de 25-40g cada una optimiza la síntesis de proteína muscular a lo largo del día. La "ventana anabólica" post-entreno es real pero más amplia de lo que la gente cree — apunta a consumir proteína dentro de 2-3 horas del entrenamiento.

## Mejores fuentes de proteína

- **Carnes magras**: pechuga de pollo, pavo, res magra
- **Pescado**: salmón, atún, bacalao
- **Lácteos**: yogur griego, requesón, proteína de suero
- **Huevos**: huevos enteros y claras
- **Vegetales**: tofu, tempeh, lentejas, garbanzos

## Conclusión clave

Apunta a 1.6-2.2g/kg diarios, distribuidos en varias comidas. No te estreses por alcanzar el número exacto cada día — la consistencia a lo largo de las semanas importa más que la perfección diaria.`,
  },
  {
    id: 'motivation-discipline',
    title: 'Motivación vs disciplina: qué funciona de verdad',
    category: 'Mindset',
    summary: 'Por qué depender solo de la motivación lleva a la inconsistencia y cómo construir hábitos duraderos.',
    readTimeMinutes: 4,
    content: `Todos empiezan un camino fitness motivados. Pero la motivación es una emoción — fluctúa. La disciplina es una habilidad — se acumula.

## La trampa de la motivación

La motivación se siente genial. Ves un video de transformación, te inscribes al gimnasio y aplastas tu primera semana. Luego la vida pasa — un mal día de trabajo, mala noche, una mañana lluviosa. La motivación desaparece.

Esto es normal. La motivación no está diseñada para ser constante. Es una chispa, no un combustible.

## Disciplina: el verdadero motor

Disciplina significa presentarte cuando no tienes ganas. No es glamuroso, pero es lo que separa a quienes obtienen resultados de quienes no.

**Cambios clave de mentalidad:**

1. **Hábitos basados en identidad** — En vez de "quiero entrenar", piensa "soy alguien que entrena". Tus acciones siguen tu identidad.

2. **La regla de los 2 minutos** — En días que no quieres entrenar, comprométete a solo 2 minutos. La mayoría de las veces, seguirás. Lo más difícil es empezar.

3. **Elimina decisiones** — Prepara tu ropa de gym la noche anterior. Agenda tus sesiones. Cuantas menos decisiones tomes, menos fuerza de voluntad gastas.

4. **Registra rachas** — La consistencia visual (como un calendario con marcas) crea un costo psicológico a romper la cadena.

## Marco práctico

- **Semana 1-2**: Enfócate solo en presentarte. No te preocupes por el rendimiento.
- **Semana 3-4**: Añade estructura (ejercicios específicos, series, reps).
- **Semana 5+**: Optimiza (sobrecarga progresiva, registro de nutrición).

## Conclusión

La motivación te pone en marcha. La disciplina te mantiene en el camino. Construye sistemas que hagan la disciplina fácil y la motivación innecesaria.`,
  },
  {
    id: 'mind-muscle-connection',
    title: 'La conexión mente-músculo explicada',
    category: 'Mindset',
    summary: 'Cómo enfocar tu atención durante el ejercicio puede mejorar la activación y el crecimiento muscular.',
    readTimeMinutes: 3,
    content: `La conexión mente-músculo es el enfoque consciente y deliberado en el músculo que estás trabajando durante un ejercicio. No es pseudo-ciencia — está respaldada por investigación.

## Qué dice la investigación

Un estudio de 2016 (Schoenfeld & Contreras) mostró que los sujetos que se enfocaban en contraer un músculo específico durante curls de bíceps experimentaron una activación muscular significativamente mayor comparado con quienes simplemente movían el peso.

Un estudio de seguimiento encontró que un enfoque interno de atención (pensar en el músculo) llevó a mayor hipertrofia en 8 semanas comparado con un enfoque externo (pensar en mover el peso).

## Cómo desarrollarla

**1. Ralentiza tus repeticiones** — Usa una fase excéntrica (bajada) de 2-3 segundos. La velocidad mata la conexión.

**2. Usa menos peso** — Si no sientes el músculo objetivo, el peso es demasiado. Bájalo 20-30% y enfócate en la calidad.

**3. Toca el músculo** — Toca físicamente el músculo que estás trabajando entre series. Este feedback propioceptivo ayuda a tu cerebro a "encontrarlo".

**4. Visualiza antes de la serie** — Cierra los ojos 3 segundos e imagina el músculo contrayéndose antes de empezar.

**5. Pausa en la contracción máxima** — Mantén la parte superior de cada rep 1-2 segundos. Siente el apretón.

## Cuándo importa más

La conexión mente-músculo es más importante para:
- Ejercicios de aislamiento (curls, elevaciones laterales, aperturas)
- Partes del cuerpo rezagadas que quieres hacer crecer
- Series de calentamiento (preparar el músculo objetivo)

Para levantamientos compuestos pesados (sentadillas, peso muerto), un enfoque externo ("empuja el suelo") puede ser más efectivo para el rendimiento.

## Conclusión clave

Tus músculos no saben cuánto peso hay en la barra — solo conocen tensión. Una conexión mente-músculo fuerte maximiza la tensión y, en última instancia, el crecimiento.`,
  },
];

export const featuredArticleIds = [
  'progressive-overload',
  'sleep-muscle-growth',
  'calories-vs-macros',
  'protein-intake',
];

export const categoryCaptions: Record<string, string> = {
  Training: 'Aprende a entrenar más inteligente, no solo más duro.',
  Recovery: 'El descanso es donde ocurre el verdadero crecimiento.',
  Nutrition: 'Alimenta tu cuerpo para rendir y obtener resultados.',
  Mindset: 'La ventaja mental que separa lo bueno de lo extraordinario.',
};

export const categoryDisplayNames: Record<string, string> = {
  Training: 'Entrenamiento',
  Recovery: 'Recuperación',
  Nutrition: 'Nutrición',
  Mindset: 'Mentalidad',
};
