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
  'meta.todayKg': { es: 'Hoy: {n} kg estimado', en: 'Today: {n} kg estimated' },
  'meta.todayReps': { es: 'Hoy: {n} reps', en: 'Today: {n} reps' },
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
  'gen.errorBodyGeneric': {
    es: 'Algo salió mal al armar tu plan. Inténtalo de nuevo; tus respuestas quedan guardadas.',
    en: 'Something went wrong while building your plan. Try again; your answers are saved.',
  },
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
  'replacePlan.title': { es: 'Ya tienes activo {name}. ¿Reemplazarlo?', en: '{name} is already active. Replace it?' },
  'replacePlan.titleNoName': { es: 'Ya tienes un plan activo. ¿Reemplazarlo?', en: 'You already have an active plan. Replace it?' },
  'replacePlan.body': {
    es: 'Al activar este, el plan actual se reemplaza y deja de estar activo. Tu historial no cambia.',
    en: 'When you activate this one, the current plan is replaced and stops being active. Your history stays the same.',
  },
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

  // ── Tu semana · vista de plan (31.4 – 31.6, 31.13) ──
  'screen.title': { es: 'Tu semana', en: 'Your week' },
  'view.week': { es: 'Semana', en: 'Week' },
  'view.month': { es: 'Mes', en: 'Month' },
  'view.plan': { es: 'Plan', en: 'Plan' },
  'menu.manage': { es: 'Gestionar el plan', en: 'Manage the plan' },
  'menu.soon': { es: 'Gestionar el plan llega pronto', en: 'Managing the plan is coming soon' },
  'phase.big': { es: 'Semana {n}', en: 'Week {n}' },
  'phase.of': { es: 'de {n}', en: 'of {n}' },
  'phase.sub': { es: 'Bloque {b} · {phase} · {range}', en: 'Block {b} · {phase} · {range}' },
  'phase.paused': { es: 'En pausa hasta el {date}', en: 'Paused until {date}' },
  'phase.starts': { es: 'Empieza el {date}', en: 'Starts {date}' },
  'phase.backToCurrent': { es: 'Volver a esta semana', en: 'Back to this week' },
  'week.prev': { es: 'Semana anterior', en: 'Previous week' },
  'week.next': { es: 'Semana siguiente', en: 'Next week' },
  'pause.title': { es: 'Plan en pausa hasta el {date}', en: 'Plan paused until {date}' },
  'pause.body.one': {
    es: 'Los días de la pausa quedan libres y las sesiones que faltan se corren una semana. El plan termina el {end}.',
    en: 'The days of the pause stay free and the sessions left move back one week. The plan ends {end}.',
  },
  'pause.body.two': {
    es: 'Los días de la pausa quedan libres y las sesiones que faltan se corren dos semanas. El plan termina el {end}.',
    en: 'The days of the pause stay free and the sessions left move back two weeks. The plan ends {end}.',
  },
  'pause.resume': { es: 'Retomar', en: 'Resume' },
  'pause.error': {
    es: 'No pudimos retomar tu plan. Inténtalo de nuevo.',
    en: "We couldn't resume your plan. Try again.",
  },
  'pause.resumed': { es: 'Plan retomado', en: 'Plan resumed' },
  'calib.title': { es: 'Semana de calibración', en: 'Calibration week' },
  'calib.body': {
    es: 'Aún no tienes pesos registrados. Esta semana elige pesos con los que te queden 2 repeticiones en reserva; con eso ajustamos el resto del plan.',
    en: "You don't have weights logged yet. This week pick weights that leave you 2 reps in reserve; we use that to adjust the rest of the plan.",
  },
  'deload.title': { es: 'Semana de descarga', en: 'Deload week' },
  'deload.body': {
    es: 'Menos series y más repeticiones en reserva para recuperar y llegar fuerte al bloque {n}. Los pesos bajan un 10 %.',
    en: 'Fewer sets and more reps in reserve to recover and arrive strong at block {n}. Weights drop 10 %.',
  },
  'deload.bodyLast': {
    es: 'Última semana: las primeras sesiones son de descarga y las últimas, test de tus ejercicios ancla.',
    en: 'Last week: the first sessions are deloads and the last ones test your anchor lifts.',
  },
  'day.rest': { es: 'Descanso en tu plan', en: 'Rest in your plan' },
  'day.inPause': { es: 'en pausa', en: 'paused' },
  'state.done': { es: 'Hecha', en: 'Done' },
  'state.missed': { es: 'Perdida', en: 'Missed' },
  'state.today': { es: 'Hoy', en: 'Today' },
  'state.pending': { es: 'Pendiente', en: 'Pending' },
  'state.substituted': { es: 'Sustituida', en: 'Substituted' },
  'state.skipped': { es: 'Omitida', en: 'Skipped' },
  'state.added': { es: 'Añadida', en: 'Added' },
  'state.movedOut': { es: 'Movida', en: 'Moved' },
  'state.movedTo': { es: 'Movida a {day}', en: 'Moved to {day}' },
  'state.moved': { es: 'Movida desde el {date}', en: 'Moved from {date}' },
  'row.by': { es: 'Por {name}', en: 'By {name}' },
  'hero.today': { es: 'Hoy · {day}', en: 'Today · {day}' },
  'hero.next': { es: 'Próxima · {day}', en: 'Next · {day}' },
  'hero.afterResume': { es: 'Al retomar · {day}', en: 'On resume · {day}' },
  'hero.meta': { es: '{min} min · {n} ejercicios', en: '{min} min · {n} exercises' },
  'hero.metaMin': { es: '{min} min', en: '{min} min' },
  'hero.calibration': { es: ' · calibración', en: ' · calibration' },
  'list.title': { es: 'Sesiones', en: 'Sessions' },
  'list.count': { es: '{done} de {n} hechas', en: '{done} of {n} done' },
  'list.empty': { es: 'Sin sesiones esta semana', en: 'No sessions this week' },
  'review.title': { es: 'Revisión semanal', en: 'Weekly review' },
  'review.sub': { es: 'Cada domingo a las 19:00', en: 'Every Sunday at 7:00 pm' },
  'month.sub': { es: 'Semanas {a} a {b}', en: 'Weeks {a} to {b}' },
  'month.subOne': { es: 'Semana {a}', en: 'Week {a}' },
  'month.weekLabel': { es: 'S{n}', en: 'W{n}' },
  'month.deload': { es: 'DESC', en: 'DEL' },
  'month.pause': { es: 'PAUSA', en: 'PAUSE' },
  'month.prev': { es: 'Mes anterior', en: 'Previous month' },
  'month.next': { es: 'Mes siguiente', en: 'Next month' },
  'legend.title': { es: 'Leyenda', en: 'Legend' },
  'legend.done': { es: 'Hecha', en: 'Done' },
  'legend.missed': { es: 'Perdida', en: 'Missed' },
  'legend.pending': { es: 'Pendiente', en: 'Pending' },
  'legend.substituted': { es: 'Sustituida', en: 'Substituted' },
  'legend.pause': { es: 'Pausa', en: 'Pause' },
  'legend.deloadWeek': { es: 'Semana de descarga', en: 'Deload week' },
  'plan.progress': { es: 'Avance', en: 'Progress' },
  'plan.adherence': { es: 'Adherencia', en: 'Adherence' },
  'plan.sessions': { es: 'Sesiones', en: 'Sessions' },
  'plan.legend.done': { es: 'Hecha', en: 'Done' },
  'plan.legend.current': { es: 'Actual', en: 'Current' },
  'plan.legend.upcoming': { es: 'Por venir', en: 'Upcoming' },
  'plan.legend.deload': { es: 'Descarga', en: 'Deload' },
  'plan.legend.test': { es: 'Test', en: 'Test' },
  'plan.week': { es: 'S{n}', en: 'W{n}' },
  'plan.weekA11y': { es: 'Semana {n}', en: 'Week {n}' },
  'plan.manage': { es: 'Gestionar plan', en: 'Manage plan' },
  'goal.eyebrow': { es: 'Tu meta', en: 'Your target' },
  'goal.titleKg': { es: '{name} a {n} kg', en: '{name} to {n} kg' },
  'goal.titleReps': { es: '{name} a {n} reps', en: '{name} to {n} reps' },
  'goal.ofKg': { es: 'de {n} kg · 1RM estimado', en: 'of {n} kg · estimated 1RM' },
  'goal.ofReps': { es: 'de {n} reps · máximo', en: 'of {n} reps · max' },
  'goal.remainingKg': { es: 'Faltan {n} kg.', en: '{n} kg to go.' },
  'goal.remainingReps': { es: 'Faltan {n} reps.', en: '{n} reps to go.' },
  'goal.reach': {
    es: ' Al ritmo del plan llegas en la semana {w}, antes del test.',
    en: ' At the plan’s pace you get there in week {w}, before the test.',
  },
  'goal.reachLast': {
    es: ' Al ritmo del plan llegas en la semana {w}.',
    en: ' At the plan’s pace you get there in week {w}.',
  },
  'goal.reached': { es: 'Meta alcanzada.', en: 'Target reached.' },
  'goal.noData': {
    es: 'Tu 1RM estimado aparece después de la semana de calibración.',
    en: 'Your estimated 1RM shows up after the calibration week.',
  },
  'anchors.title': { es: 'Ejercicios ancla', en: 'Anchor lifts' },
  'anchors.sub': { es: '1RM estimado', en: 'Estimated 1RM' },
  'anchor.delta': { es: '+{n} kg desde la semana 1', en: '+{n} kg since week 1' },
  'anchor.deltaDown': { es: '{n} kg desde la semana 1', en: '{n} kg since week 1' },
  'anchor.empty': { es: 'Sin registros todavía', en: 'No records yet' },
  'anchor.projection': { es: 'Proyección {n} kg', en: 'Projection {n} kg' },
  'anchor.weekFirst': { es: 'Semana 1', en: 'Week 1' },
  'anchor.weekLast': { es: 'Semana {n}', en: 'Week {n}' },
  'load.title': { es: 'Cargando tu plan…', en: 'Loading your plan…' },
  'err.title': { es: 'No pudimos cargar tu plan', en: "We couldn't load your plan" },
  'err.body': {
    es: 'Revisa tu conexión e inténtalo de nuevo. Tu plan y tus registros están guardados.',
    en: 'Check your connection and try again. Your plan and your records are saved.',
  },
  'err.retry': { es: 'Reintentar', en: 'Retry' },
  'empty.eyebrow': { es: 'Plan de 1 a 3 meses', en: '1 to 3 month plan' },
  'empty.title': { es: 'Aún no tienes un plan', en: "You don't have a plan yet" },
  'empty.body': {
    es: 'Athelete Intelligence arma 4, 8 o 12 semanas según tu objetivo, con todas las sesiones detalladas y los pesos que se ajustan después de cada entreno.',
    en: 'Athelete Intelligence builds 4, 8 or 12 weeks around your goal, with every session detailed and weights that adjust after each workout.',
  },
  'empty.create': { es: 'Crear plan', en: 'Create plan' },
  'empty.weekOnly': { es: 'Planificar solo esta semana', en: 'Plan only this week' },

  // ── Inicio y Entrenos con plan (31.4) ──
  'home.weekLine': {
    es: 'Semana {n} de {weeks} · {done} de {total} sesiones',
    en: 'Week {n} of {weeks} · {done} of {total} sessions',
  },
  'home.weekLineOne': {
    es: 'Semana {n} de {weeks} · {done} de 1 sesión',
    en: 'Week {n} of {weeks} · {done} of 1 session',
  },
  'home.weekLineStart': { es: 'Empieza el {date}', en: 'Starts {date}' },
  'home.pausedLine': { es: 'Plan en pausa hasta el {date}', en: 'Plan paused until {date}' },
  'home.ring.train': { es: 'Entreno · {type}', en: 'Workout · {type}' },
  'home.ring.rest': { es: 'Descanso', en: 'Rest' },
  'home.ring.paused': { es: 'En pausa', en: 'Paused' },
  'home.hero.today': { es: 'Hoy · Semana {n} de {weeks}', en: 'Today · Week {n} of {weeks}' },
  'home.hero.tomorrow': { es: 'Mañana · Semana {n} de {weeks}', en: 'Tomorrow · Week {n} of {weeks}' },
  'home.hero.day': { es: '{day} · Semana {n} de {weeks}', en: '{day} · Week {n} of {weeks}' },
  'home.hero.paused': { es: 'Plan en pausa · hasta el {date}', en: 'Plan paused · until {date}' },
  'home.hero.start': { es: 'Empezar', en: 'Start' },
  'home.hero.view': { es: 'Ver sesión', en: 'View session' },
  'home.hero.resume': { es: 'Retomar plan', en: 'Resume plan' },

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
  // ── Sesión del plan (31.7) ──
  'session.eyebrow': { es: 'Semana {n} · {date}', en: 'Week {n} · {date}' },
  'session.eyebrowNoWeek': { es: '{date}', en: '{date}' },
  'session.metaOne': { es: '{min} min · 1 ejercicio', en: '{min} min · 1 exercise' },
  'session.meta': { es: '{min} min · {n} ejercicios', en: '{min} min · {n} exercises' },
  'session.start': { es: 'Empezar', en: 'Start' },
  'session.starting': { es: 'Empezando', en: 'Starting' },
  'session.warmup': { es: 'Calentamiento', en: 'Warm-up' },
  'session.exercises': { es: 'Ejercicios', en: 'Exercises' },
  'session.banner.calibration.title': { es: 'Semana de calibración', en: 'Calibration week' },
  'session.banner.calibration.body': {
    es: 'Elige un peso con 2 repeticiones en reserva. Con él calculamos tus cargas.',
    en: 'Pick a weight with 2 reps in reserve. We build your loads from it.',
  },
  'session.banner.deload.title': { es: 'Semana de descarga', en: 'Deload week' },
  'session.banner.deload.body': {
    es: '−1 serie, RIR 3 y pesos −10 %',
    en: '−1 set, RIR 3 and weights −10 %',
  },
  'session.rir': { es: 'RIR {n}', en: 'RIR {n}' },
  'session.last': { es: 'Última vez: {reps} reps con {kg} kg', en: 'Last time: {reps} reps with {kg} kg' },
  'session.lastNoKg': { es: 'Última vez: {reps} reps', en: 'Last time: {reps} reps' },
  'session.lastNone': { es: 'Sin registros todavía', en: 'No records yet' },
  'session.weight.body': { es: 'Peso corporal', en: 'Bodyweight' },
  'session.weight.calibrate': { es: 'Calibrar · elige tu peso', en: 'Calibrate · pick your weight' },
  'session.rirNote': {
    es: 'RIR = repeticiones en reserva al terminar la serie. Si completas el rango alto con el RIR indicado, la próxima vez sube el peso.',
    en: 'RIR = reps in reserve at the end of the set. If you complete the top of the range at the given RIR, the weight goes up next time.',
  },
  'session.error.load': { es: 'No pudimos cargar la sesión', en: "We couldn't load the session" },
  'session.error.start': {
    es: 'No se pudo empezar la sesión. Intenta de nuevo.',
    en: "Couldn't start the session. Try again.",
  },
  'session.done': { es: 'Esta sesión ya no se puede empezar', en: 'This session can no longer be started' },
  // En curso (31.7).
  'runner.recommended': { es: 'Peso recomendado', en: 'Recommended weight' },
  'runner.calibrate': { es: 'Calibrar', en: 'Calibrate' },
  'runner.calibrateHint': {
    es: 'Elige un peso con 2 repeticiones en reserva',
    en: 'Pick a weight with 2 reps in reserve',
  },
  'runner.bodyweight': { es: 'Peso corporal', en: 'Bodyweight' },
  'runner.target': { es: '{reps} reps · RIR {rir}', en: '{reps} reps · RIR {rir}' },
  'runner.targetNoRir': { es: '{reps} reps', en: '{reps} reps' },
  // Resumen · Próxima vez (31.7).
  'outcome.title': { es: 'Próxima vez', en: 'Next time' },
  'outcome.up': { es: '{kg} kg · Próxima vez', en: '{kg} kg · Next time' },
  'outcome.same': { es: 'Se mantiene', en: 'Stays the same' },
  'outcome.down': { es: '{kg} kg', en: '{kg} kg' },
  'outcome.repsUp': { es: '{n} reps · Próxima vez', en: '{n} reps · Next time' },
  'outcome.variant': { es: 'Próxima vez: {name}', en: 'Next time: {name}' },
  // ── Ajustes de tu plan (31.8) ──
  'adj.eyebrow.variant_stall': { es: 'Propuesta · estancamiento', en: 'Proposal · plateau' },
  'adj.eyebrow.deload_early': { es: 'Propuesta · recuperación baja', en: 'Proposal · low recovery' },
  'adj.eyebrow.missed_session': { es: 'Sesión perdida', en: 'Missed session' },
  'adj.eyebrow.repeat_week': { es: 'Propuesta · semana incompleta', en: 'Proposal · incomplete week' },
  'adj.eyebrow.discomfort': { es: 'Aviso de molestia · ya aplicado', en: 'Discomfort notice · already applied' },
  'adj.title.variant_stall': { es: 'Cambiar de variante', en: 'Switch variation' },
  'adj.title.deload_early': { es: 'Adelantar la descarga', en: 'Bring the deload forward' },
  'adj.title.missed_session': { es: 'Tienes una sesión sin hacer', en: 'You have a session you missed' },
  'adj.title.repeat_week': { es: 'Repetir la semana', en: 'Repeat the week' },
  'adj.title.discomfort': { es: 'Ajustamos tus ejercicios', en: 'We adjusted your exercises' },
  'adj.body.variant_stall': {
    es: 'Un ejercicio ancla lleva 3 sesiones sin subir. Proponemos una variante o un cambio de rango.',
    en: 'An anchor lift has not gone up in 3 sessions. We suggest a variation or a new range.',
  },
  'adj.body.deload_early': {
    es: 'Tu recuperación viene baja. Proponemos que esta semana, o la siguiente, sea de descarga.',
    en: 'Your recovery is low. We suggest making this week, or the next, a deload.',
  },
  'adj.body.missed_session': {
    es: 'Puedes moverla a hoy o dejarla fuera del plan.',
    en: 'You can move it to today or leave it out of the plan.',
  },
  'adj.body.repeat_week': {
    es: 'Perdiste 2 o más sesiones. Repetir la semana corre el resto del plan una semana.',
    en: 'You missed 2 or more sessions. Repeating the week moves the rest of the plan back a week.',
  },
  'adj.body.discomfort': {
    es: 'Cambiamos por variantes los ejercicios que cargan esa zona en los próximos 7 días.',
    en: 'We swapped the exercises that load that area for variations over the next 7 days.',
  },
  'adj.before': { es: 'Antes', en: 'Before' },
  'adj.after': { es: 'Después', en: 'After' },
  'adj.action.approve': { es: 'Aprobar', en: 'Approve' },
  'adj.action.reject': { es: 'Rechazar', en: 'Reject' },
  'adj.action.move_today': { es: 'Mover a hoy', en: 'Move to today' },
  'adj.action.skip': { es: 'Omitir', en: 'Skip' },
  'adj.action.ack': { es: 'Entendido', en: 'Got it' },
  'adj.action.revert': { es: 'Revertir', en: 'Revert' },
  'adj.done.variant_stall': { es: 'Aprobado · cambia desde la semana {n}', en: 'Approved · changes from week {n}' },
  'adj.done.variant_stall.noWeek': { es: 'Aprobado · el cambio se aplica', en: 'Approved · the change applies' },
  'adj.done.deload_early': { es: 'Aprobado · semana {n} pasa a descarga', en: 'Approved · week {n} becomes a deload' },
  'adj.done.deload_early.noWeek': { es: 'Aprobado · pasa a descarga', en: 'Approved · becomes a deload' },
  'adj.done.repeat_week': { es: 'Aprobado · repites la semana {n}', en: 'Approved · you repeat week {n}' },
  'adj.done.repeat_week.noWeek': { es: 'Aprobado · repites la semana', en: 'Approved · you repeat the week' },
  'adj.done.reject': { es: 'Rechazado · el plan sigue igual', en: 'Rejected · the plan stays the same' },
  'adj.done.move_today': { es: 'Movida a hoy, {day}', en: 'Moved to today, {day}' },
  'adj.done.skip': { es: 'Omitida · el plan sigue igual', en: 'Skipped · the plan stays the same' },
  'adj.done.ack': { es: 'Entendido · ajuste mantenido', en: 'Got it · adjustment kept' },
  'adj.done.revert': { es: 'Revertido · vuelven los pesos del plan', en: "Reverted · the plan's weights are back" },
  'adj.error': { es: 'No se pudo responder. Intenta de nuevo.', en: "Couldn't send your answer. Try again." },
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

const MONTH_NAMES: Record<EllieLanguage, string[]> = {
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

// "Noviembre 2026" / "November 2026" of a "YYYY-MM" month.
export function monthTitle(language: EllieLanguage, month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[language][m - 1]} ${y}`;
}

// "Lunes 9" / "Monday 9": the name capitalised and the day's number.
export function dayName(language: EllieLanguage, date: string): string {
  const name = weekdayOf(language, date);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${parts(date).d}`;
}

// "2 – 8 nov" / "Nov 2 – 8", and across months "29 sep – 5 oct" / "Sep 29 – Oct 5".
export function weekRangeText(language: EllieLanguage, weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d + 6, 12)).toISOString().slice(0, 10);
  const a = parts(weekStart);
  const b = parts(end);
  if (a.m !== b.m) {
    return `${shortDate(language, weekStart)} – ${shortDate(language, end)}`;
  }
  return language === 'es' ? `${a.d} – ${b.d} ${MONTHS.es[b.m - 1]}` : `${MONTHS.en[b.m - 1]} ${a.d} – ${b.d}`;
}
