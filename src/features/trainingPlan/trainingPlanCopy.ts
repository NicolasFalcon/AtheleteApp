import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import type { SessionType } from '@app/components/v2/SessionTypeChip';
import type {
  PlanPhase,
  PlanWeekKind,
  TrainingGoal,
} from '@app/services/supabase/trainingPlan';

// Plan de entrenamiento (handoff v2.21 §31): every string of part 1 (cards,
// Crear plan, the proposal, the preview and the activation) in Spanish and
// English. §31.14: English runs ~30 % longer, so no title is single-line and
// chips and buttons grow with their text.
const COPY = {
  // ── Tarjetas de entrada (31.4) ──
  'card.create.eyebrow': { es: 'Plan de 1 a 3 meses', en: '1 to 3 month plan' },
  'card.create.title': { es: 'Crear plan', en: 'Create plan' },
  'card.create.body': {
    es: 'Athelete Intelligence arma 4, 8 o 12 semanas para tu objetivo.',
    en: 'Athelete Intelligence builds 4, 8 or 12 weeks around your goal.',
  },
  'card.finished.eyebrow': { es: 'Plan terminado · {n} semanas', en: 'Plan finished · {n} weeks' },
  'card.finished.eyebrowNoWeeks': { es: 'Plan terminado', en: 'Plan finished' },
  'card.finished.body': {
    es: 'Tu reporte final queda guardado. Mientras no crees otro plan, planificas tu semana como siempre.',
    en: 'Your final report is saved. Until you create another plan, you plan your week as usual.',
  },
  'card.finished.report': { es: 'Ver reporte', en: 'View report' },
  'card.finished.reportSoon': { es: 'El reporte llega pronto', en: 'The report is coming soon' },
  'card.finished.create': { es: 'Crear plan', en: 'Create plan' },

  // ── Crear plan (31.1) ──
  'create.title': { es: 'Crear plan', en: 'Create plan' },
  'create.step': { es: 'Paso {n} de 4', en: 'Step {n} of 4' },
  'create.generating': { es: 'Generando', en: 'Generating' },
  'create.error': { es: 'Error', en: 'Error' },
  'create.back': { es: 'Atrás', en: 'Back' },
  'create.close': { es: 'Cerrar', en: 'Close' },
  'create.next': { es: 'Siguiente', en: 'Next' },
  'create.submit': { es: 'Crear plan', en: 'Create plan' },
  'create.skip': { es: 'Omitir y crear', en: 'Skip and create' },
  'create.retry': { es: 'Reintentar', en: 'Retry' },
  'create.minDays': { es: 'Elige al menos 2 días', en: 'Pick at least 2 days' },

  'goal.title': { es: 'Tu objetivo', en: 'Your goal' },
  'goal.body.profile': {
    es: 'Viene de tu perfil. Si lo cambias aquí, solo cambia para este plan.',
    en: 'It comes from your profile. If you change it here, it only changes for this plan.',
  },
  'goal.body.free': {
    es: 'Elige para qué entrenas en este plan. Tu perfil no cambia.',
    en: 'Choose what this plan trains for. Your profile stays the same.',
  },
  'goal.profile': { es: 'Tu perfil', en: 'Your profile' },
  'goal.gain_muscle': { es: 'Ganar músculo', en: 'Build muscle' },
  'goal.gain_muscle.sub': { es: 'Más volumen e hipertrofia', en: 'More volume and hypertrophy' },
  'goal.gain_strength': { es: 'Ganar fuerza', en: 'Get stronger' },
  'goal.gain_strength.sub': { es: 'Menos repeticiones, más peso', en: 'Fewer reps, more weight' },
  'goal.lose_weight': { es: 'Perder grasa', en: 'Lose fat' },
  'goal.lose_weight.sub': { es: 'Mantener fuerza con déficit', en: 'Keep your strength in a deficit' },
  'goal.performance': { es: 'Rendimiento general', en: 'Overall performance' },
  'goal.performance.sub': { es: 'Fuerza, resistencia y movilidad', en: 'Strength, endurance and mobility' },

  'duration.title': { es: '¿Cuánto dura?', en: 'How long?' },
  'duration.body': {
    es: 'Cada bloque son 4 semanas: 3 de carga y 1 de descarga. El último termina con un test de tus ejercicios ancla.',
    en: 'Each block is 4 weeks: 3 loading weeks and 1 deload. The last one ends with a test of your anchor lifts.',
  },
  'duration.4': { es: '1 mes', en: '1 month' },
  'duration.4.sub': { es: '4 semanas · 1 bloque', en: '4 weeks · 1 block' },
  'duration.8': { es: '2 meses', en: '2 months' },
  'duration.8.sub': { es: '8 semanas · 2 bloques', en: '8 weeks · 2 blocks' },
  'duration.12': { es: '3 meses', en: '3 months' },
  'duration.12.sub': { es: '12 semanas · 3 bloques', en: '12 weeks · 3 blocks' },
  'duration.recommended': { es: 'Recomendado', en: 'Recommended' },
  'duration.why.lose_weight': {
    es: 'Para perder grasa sin perder fuerza, 8 semanas es lo que mejor se sostiene. Después revisamos y ajustamos.',
    en: 'To lose fat without losing strength, 8 weeks is what holds up best. Then we review and adjust.',
  },
  'duration.why.gain_muscle': {
    es: 'Para ganar músculo, 12 semanas dan tiempo a 3 bloques de progresión y a un test final con tus ejercicios ancla.',
    en: 'To build muscle, 12 weeks leave room for 3 progression blocks and a final test of your anchor lifts.',
  },
  'duration.why.gain_strength': {
    es: 'Para ganar fuerza, 12 semanas dan tiempo a 3 bloques de progresión y a un test final con tus ejercicios ancla.',
    en: 'To get stronger, 12 weeks leave room for 3 progression blocks and a final test of your anchor lifts.',
  },
  'duration.why.performance': {
    es: 'Para rendimiento general, 12 semanas dan tiempo a 3 bloques de progresión y a un test final con tus ejercicios ancla.',
    en: 'For overall performance, 12 weeks leave room for 3 progression blocks and a final test of your anchor lifts.',
  },

  'days.title': { es: '¿Qué días entrenas?', en: 'Which days do you train?' },
  'days.body': {
    es: 'Elige de 2 a 6 días. Puedes cambiarlos más adelante sin perder lo que ya hiciste.',
    en: "Pick 2 to 6 days. You can change them later without losing what you've done.",
  },
  'days.length': { es: 'Duración de cada sesión', en: 'Length of each session' },
  'days.minutes': { es: '{n} min', en: '{n} min' },
  'days.total': { es: '{n} sesiones', en: '{n} sessions' },
  'days.totalLine': {
    es: '{days} días · {min} min · {weeks} semanas',
    en: '{days} days · {min} min · {weeks} weeks',
  },

  'meta.title': { es: 'Meta y estilo', en: 'Target and style' },
  'meta.optional': { es: 'Opcional', en: 'Optional' },
  'meta.body': {
    es: 'Con una meta concreta, el plan prioriza ese ejercicio. El estilo cambia la selección de ejercicios, no la progresión.',
    en: 'With a specific target, the plan prioritises that lift. The style changes the choice of exercises, not the progression.',
  },
  'meta.target': { es: 'Meta', en: 'Target' },
  'meta.none': { es: 'Sin meta', en: 'No target' },
  'meta.bench': { es: 'Press de banca', en: 'Bench press' },
  'meta.squat': { es: 'Sentadilla', en: 'Squat' },
  'meta.deadlift': { es: 'Peso muerto', en: 'Deadlift' },
  'meta.pullups': { es: 'Dominadas', en: 'Pull-ups' },
  'meta.kgTitle': { es: '{name} a', en: '{name} to' },
  'meta.repsTitle': { es: '{name} · repeticiones', en: '{name} · reps' },
  'meta.kgHint': { es: 'En kilos, de 2,5 en 2,5', en: 'In kilos, in 2.5 steps' },
  'meta.repsHint': { es: 'Repeticiones seguidas', en: 'Reps in a row' },
  'meta.less': { es: 'Menos', en: 'Less' },
  'meta.more': { es: 'Más', en: 'More' },
  'style.title': { es: 'Estilo', en: 'Style' },
  'style.none': { es: 'Sin estilo', en: 'No style' },
  'style.viejaescuela': { es: 'Vieja escuela', en: 'Old school' },
  'style.hipertrofia': { es: 'Hipertrofia', en: 'Hypertrophy' },
  'style.fuerza': { es: 'Fuerza', en: 'Strength' },
  'style.funcional': { es: 'Funcional', en: 'Functional' },
  'style.calistenia': { es: 'Calistenia', en: 'Calisthenics' },

  'gen.eyebrow': { es: 'Athelete Intelligence', en: 'Athelete Intelligence' },
  'gen.title': { es: 'Está armando tu plan', en: 'Is building your plan' },
  'gen.step1': { es: 'Leyendo tu historial y tus pesos', en: 'Reading your history and your weights' },
  'gen.step2': { es: 'Repartiendo {n} sesiones en {b} bloques', en: 'Spreading {n} sessions over {b} blocks' },
  'gen.step2.one': { es: 'Repartiendo {n} sesiones en 1 bloque', en: 'Spreading {n} sessions over 1 block' },
  'gen.step3': { es: 'Programando descargas y test final', en: 'Scheduling deloads and the final test' },
  'gen.step4': { es: 'Calculando tus pesos de partida', en: 'Working out your starting weights' },
  'gen.errorTitle': { es: 'No pudimos armar tu plan', en: "We couldn't build your plan" },
  'gen.errorBody': {
    es: 'Se cortó la conexión con Athelete Intelligence. Tus respuestas quedan guardadas.',
    en: 'The connection with Athelete Intelligence dropped. Your answers are saved.',
  },

  // The athlete's message to ELLIE with what was chosen (31.2).
  'request.base': {
    es: 'Crea mi plan: {goal}, {duration}, {days} días ({dayNames}) de {min} min.',
    en: 'Create my plan: {goal}, {duration}, {days} days ({dayNames}) of {min} min.',
  },
  'request.targetKg': { es: ' Meta: {name} a {n} kg.', en: ' Target: {name} to {n} kg.' },
  'request.targetReps': { es: ' Meta: {name} a {n} repeticiones.', en: ' Target: {name} to {n} reps.' },
  'request.style': { es: ' Estilo: {style}.', en: ' Style: {style}.' },
  'request.goal.gain_muscle': { es: 'ganar músculo', en: 'build muscle' },
  'request.goal.gain_strength': { es: 'ganar fuerza', en: 'get stronger' },
  'request.goal.lose_weight': { es: 'perder grasa', en: 'lose fat' },
  'request.goal.performance': { es: 'rendimiento general', en: 'overall performance' },

  // ── Propuesta en el chat (31.2) ──
  'proposal.badge': { es: 'Plan · {n} semanas', en: 'Plan · {n} weeks' },
  'proposal.badgeVersion': { es: ' · V{v}', en: ' · V{v}' },
  'proposal.meta': { es: '{days} días · {min} min · {goal}', en: '{days} days · {min} min · {goal}' },
  'proposal.block': { es: 'Bloque {n}', en: 'Block {n}' },
  'proposal.typicalWeek': { es: 'Semana tipo', en: 'Typical week' },
  'proposal.total': { es: '{n} sesiones', en: '{n} sessions' },
  'proposal.blocks.one': { es: '1 bloque', en: '1 block' },
  'proposal.blocks.other': { es: '{n} bloques', en: '{n} blocks' },
  'proposal.deloads.one': { es: '1 descarga', en: '1 deload' },
  'proposal.deloads.other': { es: '{n} descargas', en: '{n} deloads' },
  'proposal.test': { es: 'test final', en: 'final test' },
  'proposal.activate': { es: 'Activar', en: 'Activate' },
  'proposal.activating': { es: 'Activando…', en: 'Activating…' },
  'proposal.adjust': { es: 'Ajustar', en: 'Adjust' },
  'proposal.viewAll': { es: 'Ver todo el plan', en: 'See the whole plan' },
  'proposal.active': { es: 'Plan activo', en: 'Plan active' },
  'proposal.starts': { es: 'Empieza el {date}', en: 'Starts {date}' },
  'proposal.viewWeek': { es: 'Ver Tu semana', en: 'View Your week' },
  'proposal.replaced': { es: 'Versión {n} · reemplazada', en: 'Version {n} · replaced' },
  'proposal.discarded': { es: 'Propuesta descartada', en: 'Proposal discarded' },
  'proposal.unavailable': { es: 'No pudimos cargar esta propuesta.', en: "We couldn't load this proposal." },
  'proposal.reload': { es: 'Reintentar', en: 'Retry' },
  'proposal.defaultName': { es: 'Tu plan', en: 'Your plan' },
  'proposal.chip.1': { es: 'Más pierna', en: 'More legs' },
  'proposal.chip.2': { es: 'Solo 3 días', en: 'Only 3 days' },
  'proposal.chip.3': { es: 'Sesiones de 45 min', en: '45-minute sessions' },
  'proposal.chip.4': { es: 'Sin peso muerto', en: 'No deadlifts' },

  // ── Detalle antes de activar (31.3) ──
  'preview.header': { es: 'Tu plan', en: 'Your plan' },
  'preview.eyebrow': { es: 'Propuesta · antes de activar', en: 'Proposal · before activating' },
  'preview.meta': {
    es: '{weeks} semanas · {days} días · {min} min · {n} sesiones',
    en: '{weeks} weeks · {days} days · {min} min · {n} sessions',
  },
  'preview.range': { es: 'del {from} al {to}', en: '{from} to {to}' },
  'preview.replace.one': { es: 'Se reemplazará 1 sesión', en: '1 session will be replaced' },
  'preview.replace.other': { es: 'Se reemplazarán {n} sesiones', en: '{n} sessions will be replaced' },
  'preview.replace.body': {
    es: 'Ya tienes {names} planificadas entre el {from} y el {to}. Al activar el plan, esas semanas pasan a ser del plan. Tu historial no cambia.',
    en: 'You already have {names} planned between {from} and {to}. When you activate the plan, those weeks become part of the plan. Your history stays the same.',
  },
  'preview.replace.bodyOne': {
    es: 'Ya tienes {names} planificada el {from}. Al activar el plan, esa semana pasa a ser del plan. Tu historial no cambia.',
    en: 'You already have {names} planned on {from}. When you activate the plan, that week becomes part of the plan. Your history stays the same.',
  },
  'preview.block': { es: 'Bloque {n} · {phase}', en: 'Block {n} · {phase}' },
  'preview.blockWeeks': { es: 'Semanas {a}–{b}', en: 'Weeks {a}–{b}' },
  'preview.week': { es: 'Semana {n}', en: 'Week {n}' },
  'preview.sessionMeta': { es: '{type} · {min} min', en: '{type} · {min} min' },
  'preview.noSessions': { es: 'Sin sesiones esta semana', en: 'No sessions this week' },
  'preview.activate': { es: 'Activar plan', en: 'Activate plan' },
  'preview.adjust': { es: 'Ajustar', en: 'Adjust' },
  'preview.loading': { es: 'Cargando tu plan…', en: 'Loading your plan…' },
  'preview.error': { es: 'No pudimos cargar tu plan', en: "We couldn't load your plan" },
  'preview.retry': { es: 'Reintentar', en: 'Retry' },

  // ── Activación (31.2 · 31.3) ──
  'replaceWeek.title': { es: 'Reemplazar tu semana planificada', en: 'Replace your planned week' },
  'replaceWeek.body.one': {
    es: 'Tienes 1 sesión planificada el {from}. Al activar el plan se reemplaza por la del plan. Tu historial no cambia.',
    en: 'You have 1 session planned on {from}. When you activate the plan it is replaced by the plan’s. Your history stays the same.',
  },
  'replaceWeek.body.other': {
    es: 'Tienes {n} sesiones planificadas entre el {from} y el {to}. Al activar el plan se reemplazan por las del plan. Tu historial no cambia.',
    en: 'You have {n} sessions planned between {from} and {to}. When you activate the plan they are replaced by the plan’s. Your history stays the same.',
  },
  'replaceWeek.coach': {
    es: 'Tu coach {name} te asignó {sessions}. También se reemplaza.',
    en: 'Your coach {name} assigned you {sessions}. It is replaced too.',
  },
  'replaceWeek.coachMany': {
    es: 'Tu coach {name} te asignó {sessions}. También se reemplazan.',
    en: 'Your coach {name} assigned you {sessions}. They are replaced too.',
  },
  'replaceWeek.confirm': { es: 'Reemplazar y activar', en: 'Replace and activate' },
  'replacePlan.title': { es: 'Ya tienes un plan activo', en: 'You already have an active plan' },
  'replacePlan.body': {
    es: 'Si activas este, {name} se reemplaza y deja de estar activo. Tu historial no cambia.',
    en: 'If you activate this one, {name} is replaced and stops being active. Your history stays the same.',
  },
  'replacePlan.current': { es: 'tu plan actual', en: 'your current plan' },
  'replacePlan.confirm': { es: 'Reemplazar y activar', en: 'Replace and activate' },
  'activate.cancel': { es: 'Cancelar', en: 'Cancel' },
  'activate.error': {
    es: 'No se pudo activar el plan. Inténtalo de nuevo.',
    en: "Couldn't activate the plan. Try again.",
  },
  'activate.offline': {
    es: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
    en: 'No connection. Check your network and try again.',
  },
  'activate.notOpen': {
    es: 'Esta versión del plan ya no está disponible.',
    en: 'This version of the plan is no longer available.',
  },

  // ── Progreso · Plan de la semana (31.4) ──
  'progress.title': { es: 'Plan de la semana', en: "This week's plan" },
  'progress.view': { es: 'Ver plan', en: 'View plan' },
  'progress.unplanned.one': { es: '1 día sin planificar', en: '1 day not planned' },
  'progress.unplanned.other': { es: '{n} días sin planificar', en: '{n} days not planned' },
  'progress.sessions': { es: '{done} de {n} sesiones', en: '{done} of {n} sessions' },
  'progress.next': { es: ' · sigue {name}, {when}', en: ' · next {name}, {when}' },
  'progress.none': { es: 'Sin sesiones planificadas', en: 'No sessions planned' },
  'when.today': { es: 'hoy', en: 'today' },
  'when.tomorrow': { es: 'mañana', en: 'tomorrow' },

  // ── Tipos, semanas y fases ──
  'type.pesado': { es: 'Pesado', en: 'Heavy' },
  'type.volumen': { es: 'Volumen', en: 'Volume' },
  'type.tecnico': { es: 'Técnico', en: 'Technique' },
  'type.descarga': { es: 'Descarga', en: 'Deload' },
  'type.test': { es: 'Test', en: 'Test' },
  'week.calibracion': { es: 'Calibración', en: 'Calibration' },
  'week.descarga': { es: 'Descarga', en: 'Deload' },
  'week.descarga_test': { es: 'Descarga y test', en: 'Deload and test' },
  'phase.base': { es: 'Base', en: 'Base' },
  'phase.desarrollo': { es: 'Desarrollo', en: 'Build' },
  'phase.pico': { es: 'Pico', en: 'Peak' },
} as const satisfies Record<string, Record<EllieLanguage, string>>;

export type TrainingPlanCopyKey = keyof typeof COPY;
export type TrainingPlanVars = Record<string, string | number>;
export type TrainingPlanT = (key: TrainingPlanCopyKey, vars?: TrainingPlanVars) => string;

// "{n}" placeholders are replaced with `vars.n`.
export function trainingPlanText(
  language: EllieLanguage,
  key: TrainingPlanCopyKey,
  vars: TrainingPlanVars = {},
): string {
  return COPY[key][language].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function useTrainingPlanText(): { t: TrainingPlanT; language: EllieLanguage } {
  const language = useProfileLanguage();
  return {
    language,
    t: (key, vars) => trainingPlanText(language, key, vars),
  };
}

// ── Labels ──────────────────────────────────────────────────────────────────
export const goalLabelKey = (goal: TrainingGoal) => `goal.${goal}` as const;
export const goalSubKey = (goal: TrainingGoal) => `goal.${goal}.sub` as const;
export const sessionTypeKey = (type: SessionType) => `type.${type}` as const;
export const phaseKey = (phase: PlanPhase) => `phase.${phase}` as const;

// The tag of a week in the preview (carga has none).
export function weekKindKey(kind: PlanWeekKind): TrainingPlanCopyKey | null {
  return kind === 'carga' ? null : (`week.${kind}` as const);
}

// ── Dates (local YYYY-MM-DD, never turned into a UTC Date) ──────────────────
const MONTHS: Record<EllieLanguage, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const WEEKDAYS: Record<EllieLanguage, string[]> = {
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

// L–D / M–S, Monday first. Wednesday is "M" too in Spanish (as in Tu semana).
export const DAY_LETTERS: Record<EllieLanguage, string[]> = {
  es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

const parts = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
};

// 0 = Monday … 6 = Sunday.
function weekday(date: string): number {
  const { y, m, d } = parts(date);
  return (new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7;
}

// ISO weekday (1 = Monday … 7 = Sunday) as a name: "lunes" / "Monday".
export function isoWeekdayName(language: EllieLanguage, isoDay: number): string {
  return WEEKDAYS[language][(isoDay - 1 + 7) % 7];
}

// "9 nov" / "Nov 9".
export function shortDate(language: EllieLanguage, date: string): string {
  const { m, d } = parts(date);
  return language === 'es' ? `${d} ${MONTHS.es[m - 1]}` : `${MONTHS.en[m - 1]} ${d}`;
}

// "lunes 9 nov" / "Monday, Nov 9".
export function longDate(language: EllieLanguage, date: string): string {
  const name = WEEKDAYS[language][weekday(date)];
  return language === 'es' ? `${name} ${shortDate('es', date)}` : `${name}, ${shortDate('en', date)}`;
}

// "lunes" / "Monday" of a date.
export function weekdayOf(language: EllieLanguage, date: string): string {
  return WEEKDAYS[language][weekday(date)];
}

// "Brazos, Total Body y Piernas" / "Arms, Total Body and Legs".
export function joinNames(language: EllieLanguage, names: string[]): string {
  const items = names.filter(Boolean);
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  const and = language === 'es' ? ' y ' : ' and ';
  return `${items.slice(0, -1).join(', ')}${and}${items[items.length - 1]}`;
}
