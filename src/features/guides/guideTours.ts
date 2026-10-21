// Guías (handoff v2.15 §25.4, Athelete App.dc.html · TOURS): one tour per
// screen, at most 4 steps, shown the first time the screen is opened. A step
// points at an anchor (GuideAnchor id) or at nothing (the card sits at
// 330 pt). "tap" steps advance when the person taps the highlighted element.

export type GuideLanguage = 'es' | 'en';
type Text = Record<GuideLanguage, string>;

export type GuideStep = {
  anchor?: string;
  tap?: boolean;
  title: Text;
  body: Text;
};

export type GuideTour =
  | 'home'
  | 'week'
  | 'core33'
  | 'scan'
  | 'calories'
  | 'progress'
  | 'route';

export const GUIDE_TOURS: Record<GuideTour, GuideStep[]> = {
  home: [
    {
      anchor: 'home.priority',
      title: { es: 'Tu prioridad de hoy', en: 'Your priority today' },
      body: {
        es: 'Lo más importante del día ocupa la portada. Desliza a los lados para ver el resto.',
        en: 'The most important thing today takes the cover. Swipe sideways to see the rest.',
      },
    },
    {
      anchor: 'home.rings',
      title: { es: 'Tu día en tres anillos', en: 'Your day in three rings' },
      body: {
        es: 'Entreno, nutrición e hidratación se llenan a medida que avanzas.',
        en: 'Training, nutrition and hydration fill up as you go.',
      },
    },
    {
      anchor: 'home.water',
      tap: true,
      title: { es: 'Suma agua con un toque', en: 'Add water with one tap' },
      body: {
        es: 'Tócalo ahora: cada vaso cuenta para tu anillo azul.',
        en: 'Tap it now: every glass counts towards your blue ring.',
      },
    },
    {
      anchor: 'home.week',
      tap: true,
      title: { es: 'Tu semana de un vistazo', en: 'Your week at a glance' },
      body: {
        es: 'Toca para ver tus siete días y planificarlos con ELLIE o a tu manera.',
        en: 'Tap to see your seven days and plan them with ELLIE or your own way.',
      },
    },
  ],
  week: [
    {
      anchor: 'week.days',
      title: { es: 'Tus siete días', en: 'Your seven days' },
      body: {
        es: 'Toca un día para ir a su tarjeta. Usa Mover para cambiar una sesión de día.',
        en: 'Tap a day to go to its card. Use Move to put a session on another day.',
      },
    },
    {
      anchor: 'week.change',
      title: { es: 'Edítalo a mano', en: 'Edit it yourself' },
      body: {
        es: 'Elige la rutina de cada día, ajusta la duración o márcalo como descanso.',
        en: 'Pick the routine for each day, adjust the time or make it a rest day.',
      },
    },
    {
      anchor: 'week.ellie',
      title: { es: 'O deja que ELLIE lo cambie', en: 'Or let ELLIE change it' },
      body: {
        es: 'Te propone otra sesión solo para ese día, sin tocar el resto.',
        en: 'She suggests another session for that day only, without touching the rest.',
      },
    },
    {
      anchor: 'week.plan',
      title: { es: 'Dos caminos para planificar', en: 'Two ways to plan' },
      body: {
        es: 'Con ELLIE en tres preguntas, o en blanco eligiendo tú cada día.',
        en: 'With ELLIE in three questions, or from scratch choosing each day yourself.',
      },
    },
  ],
  // No highlighted element in Core 33 (25.4).
  core33: [
    {
      title: { es: 'Tres hábitos al día', en: 'Three habits a day' },
      body: {
        es: 'Cada día de Core 33 tiene tres objetivos. Márcalos cuando los cumplas.',
        en: 'Every Core 33 day has three goals. Tick them off when you meet them.',
      },
    },
    {
      title: { es: '33 cápsulas, 33 días', en: '33 capsules, 33 days' },
      body: {
        es: 'Cada día cerrado se llena en Ember en tu retícula. Hoy respira hasta que lo cierres.',
        en: 'Every closed day fills in Ember on your grid. Today breathes until you close it.',
      },
    },
    {
      title: { es: 'Cierra el día', en: 'Close the day' },
      body: {
        es: 'Al completar los tres objetivos, el día se cierra y suma a tu reto.',
        en: 'When you complete the three goals, the day closes and counts towards your challenge.',
      },
    },
  ],
  scan: [
    {
      anchor: 'scan.frame',
      title: { es: 'ELLIE reconoce máquinas', en: 'ELLIE recognises machines' },
      body: {
        es: 'Encuadra la máquina completa dentro del marco.',
        en: 'Fit the whole machine inside the frame.',
      },
    },
    {
      anchor: 'scan.gallery',
      title: { es: '¿Ya tienes una foto?', en: 'Already have a photo?' },
      body: { es: 'Súbela desde tu galería.', en: 'Upload it from your gallery.' },
    },
    {
      anchor: 'scan.shutter',
      tap: true,
      title: { es: 'Dispara', en: 'Shoot' },
      body: {
        es: 'ELLIE te dice qué máquina es, cómo se configura y qué ejercicios puedes hacer.',
        en: 'ELLIE tells you which machine it is, how to set it up and which exercises you can do.',
      },
    },
  ],
  calories: [
    {
      anchor: 'calories.gallery',
      title: { es: 'Desde la galería', en: 'From your gallery' },
      body: {
        es: 'Puedes usar una foto que ya tengas del plato.',
        en: 'You can use a photo of the plate you already have.',
      },
    },
    {
      anchor: 'calories.noPhoto',
      title: { es: 'Sin foto', en: 'No photo' },
      body: {
        es: 'Si no puedes hacer foto, registra solo las kcal.',
        en: "If you can't take a photo, log just the kcal.",
      },
    },
    {
      anchor: 'calories.shutter',
      tap: true,
      title: { es: 'Foto al plato', en: 'Photo of the plate' },
      body: {
        es: 'ELLIE estima calorías y macros. Después puedes corregir las porciones.',
        en: 'ELLIE estimates calories and macros. Then you can correct the portions.',
      },
    },
  ],
  // The prototype's step "Plan de la semana" is left out: Progreso has no
  // such entry in the app yet (25.10.11).
  progress: [
    {
      anchor: 'progress.curve',
      title: { es: 'Tu evolución', en: 'Your progress' },
      body: {
        es: 'La curva muestra tu volumen de entreno a lo largo del tiempo.',
        en: 'The curve shows your training volume over time.',
      },
    },
    {
      anchor: 'progress.capsules',
      title: { es: 'Tu semana en cápsulas', en: 'Your week in capsules' },
      body: {
        es: 'Cada cápsula es un día: se llena con los minutos que entrenaste.',
        en: 'Each capsule is a day: it fills with the minutes you trained.',
      },
    },
    {
      anchor: 'progress.challenges',
      tap: true,
      title: { es: 'Tus retos', en: 'Your challenges' },
      body: {
        es: 'Toca para ver Core 33 y los retos con amigos.',
        en: 'Tap to see Core 33 and your challenges with friends.',
      },
    },
  ],
  route: [
    {
      anchor: 'route.sport',
      title: { es: 'Elige deporte', en: 'Choose a sport' },
      body: {
        es: 'Running o ciclismo: cambian las métricas que verás en vivo.',
        en: 'Running or cycling: they change the metrics you see live.',
      },
    },
    {
      anchor: 'route.privacy',
      title: { es: 'Tu privacidad', en: 'Your privacy' },
      body: {
        es: 'Decide quién ve tu ruta. El inicio y el final se ocultan fuera de ATHELETE.',
        en: 'Decide who sees your route. The start and finish are hidden outside ATHELETE.',
      },
    },
    {
      anchor: 'route.start',
      tap: true,
      title: { es: 'Comenzar', en: 'Start' },
      body: {
        es: 'Toca para empezar a registrar con GPS.',
        en: 'Tap to start recording with GPS.',
      },
    },
  ],
};

export const GUIDE_COPY: Record<
  GuideLanguage,
  { counter: (n: number, total: number) => string; skip: string; next: string; done: string; tap: string }
> = {
  es: {
    counter: (n, total) => `GUÍA · ${n} DE ${total}`,
    skip: 'Saltar',
    next: 'Siguiente',
    done: 'Entendido',
    tap: 'Toca lo iluminado',
  },
  en: {
    counter: (n, total) => `GUIDE · ${n} OF ${total}`,
    skip: 'Skip',
    next: 'Next',
    done: 'Got it',
    tap: 'Tap the highlighted area',
  },
};
