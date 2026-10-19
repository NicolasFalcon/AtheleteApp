import { RoutineError } from '@app/services/routines/routinesService';

// Texts (v2, es / en) for the errors of the routine RPCs
// (docs/backend/ROUTINES_SHAPES.md · Errores).

export type RoutineLanguage = 'es' | 'en';

type Copy = { title: string; message: string };

const FIELD_TEXT: Record<RoutineLanguage, Record<string, string>> = {
  es: {
    title: 'Ponle un nombre de 1 a 80 caracteres.',
    type: 'Elige un tipo de rutina.',
    difficulty: 'Elige un nivel.',
    exercises: 'Una rutina lleva de 1 a 40 ejercicios.',
    'exercises[]': 'Revisa las series, repeticiones y descansos de los ejercicios.',
    chat_message_id: 'No encontramos el plan de ELLIE que querías guardar.',
    scope: 'No pudimos cargar esta lista.',
    cursor: 'No pudimos cargar más rutinas.',
  },
  en: {
    title: 'Give it a name of 1 to 80 characters.',
    type: 'Choose a routine type.',
    difficulty: 'Choose a level.',
    exercises: 'A routine has 1 to 40 exercises.',
    'exercises[]': 'Check the sets, reps and rest of the exercises.',
    chat_message_id: "We couldn't find the ELLIE plan you wanted to save.",
    scope: "We couldn't load this list.",
    cursor: "We couldn't load more routines.",
  },
};

const TEXT: Record<RoutineLanguage, Record<string, Copy>> = {
  es: {
    invalid_input: { title: 'Revisa la rutina', message: 'Hay un dato que no es válido.' },
    exercise_not_found: {
      title: 'Ejercicio no disponible',
      message: 'Algún ejercicio ya no está en el catálogo. Quítalo o cámbialo e inténtalo otra vez.',
    },
    routine_not_found: {
      title: 'Rutina no encontrada',
      message: 'Puede que se haya eliminado o que ya no sea tuya.',
    },
    chat_message_not_found: {
      title: 'No pudimos guardar el plan',
      message: 'Este plan de ELLIE ya no está disponible para guardarlo.',
    },
    unauthorized: { title: 'Tu sesión terminó', message: 'Vuelve a iniciar sesión.' },
    offline: { title: 'Sin conexión', message: 'Revisa tu conexión e inténtalo otra vez.' },
    unknown: { title: 'Algo salió mal', message: 'Inténtalo otra vez.' },
  },
  en: {
    invalid_input: { title: 'Check the routine', message: 'Something is not valid.' },
    exercise_not_found: {
      title: 'Exercise not available',
      message: 'An exercise is no longer in the catalogue. Remove or replace it and try again.',
    },
    routine_not_found: {
      title: 'Routine not found',
      message: 'It may have been deleted or it is no longer yours.',
    },
    chat_message_not_found: {
      title: "We couldn't save the plan",
      message: 'This ELLIE plan is no longer available to save.',
    },
    unauthorized: { title: 'Your session ended', message: 'Sign in again.' },
    offline: { title: 'No connection', message: 'Check your connection and try again.' },
    unknown: { title: 'Something went wrong', message: 'Try again.' },
  },
};

export function routineErrorCopy(error: unknown, language: RoutineLanguage = 'es'): Copy {
  const texts = TEXT[language];
  if (!(error instanceof RoutineError)) {
    return texts.unknown;
  }
  const base = texts[error.code] ?? texts.unknown;
  if (error.code === 'invalid_input' && error.field) {
    const field = FIELD_TEXT[language][error.field] ?? FIELD_TEXT[language][error.field.replace(/\[\d+\].*$/, '[]')];
    return field ? { title: base.title, message: field } : base;
  }
  return base;
}

// "Tu rutina se archivó…" when delete_user_routine answers archived: true.
export function deletedRoutineText(archived: boolean, language: RoutineLanguage = 'es'): string {
  if (language === 'en') {
    return archived
      ? 'It is shared in a post, so it was archived instead of deleted. It is no longer in your routines.'
      : 'Routine deleted.';
  }
  return archived
    ? 'Está compartida en una publicación, así que se archivó en vez de borrarse. Ya no aparece en tus rutinas.'
    : 'Rutina eliminada.';
}
