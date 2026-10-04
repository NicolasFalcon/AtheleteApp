import { StackActions } from '@react-navigation/native';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { navigationRef } from '@app/navigation/navigationRef';
import type { QuizResultRouteParams } from '@app/types/quiz';

// Development only: each Quiz screen and state with sample data: nothing is
// read or written. Used by the dev menu ("Ver pantallas de Quiz") and
// athelete://dev/quiz?screen=<key>.
const CATEGORY = {
  categoryId: 'dev-nutricion',
  categoryName: 'Nutrición',
  categoryIcon: 'apple',
};

const MISSED = [
  '¿Cuánta proteína diaria ayuda a ganar músculo?',
  '¿Qué descanso entre series favorece la fuerza máxima?',
  '¿Qué significa un RPE de 8?',
];

function result(
  patch: Partial<QuizResultRouteParams>,
): QuizResultRouteParams {
  return {
    ...CATEGORY,
    attemptId: 'dev-attempt',
    answers: [],
    correctCount: 7,
    totalQuestions: 10,
    pointsEarned: 100,
    score: 70,
    isPerfect: false,
    bestStreak: 4,
    missed: MISSED.slice(0, 2),
    devPreviousBest: { score: 80, correctCount: 8, totalQuestions: 10 },
    ...patch,
  };
}

const SCREENS = [
  { key: 'home', label: 'Portada · datos reales (QUIZ_01)', route: 'QuizLanding', params: undefined },
  { key: 'data', label: 'Portada · con rondas de ejemplo', route: 'QuizLanding', params: { devState: 'data' } },
  { key: 'new', label: 'Portada · sin empezar', route: 'QuizLanding', params: { devState: 'new' } },
  { key: 'homePerfect', label: 'Portada · todo al 100 % (Quiz Master)', route: 'QuizLanding', params: { devState: 'perfect' } },
  { key: 'empty', label: 'Portada · sin categorías', route: 'QuizLanding', params: { devState: 'empty' } },
  { key: 'loading', label: 'Portada · cargando', route: 'QuizLanding', params: { devState: 'loading' } },
  { key: 'error', label: 'Portada · error con reintento', route: 'QuizLanding', params: { devState: 'error' } },
  { key: 'start', label: 'Inicio de desafío con récord (QUIZ_02)', route: 'QuizChallenge', params: { ...CATEGORY, devState: 'record' } },
  { key: 'startNew', label: 'Inicio de desafío · sin récord', route: 'QuizChallenge', params: { ...CATEGORY, devState: 'new' } },
  { key: 'question', label: 'Ronda · sin responder (QUIZ_03)', route: 'QuizQuestion', params: { ...CATEGORY, devState: 'new' } },
  { key: 'correct', label: 'Ronda · correcta (QUIZ_04)', route: 'QuizQuestion', params: { ...CATEGORY, devState: 'correct' } },
  { key: 'incorrect', label: 'Ronda · incorrecta (QUIZ_05)', route: 'QuizQuestion', params: { ...CATEGORY, devState: 'incorrect' } },
  { key: 'streak', label: 'Ronda · racha ×3 (QUIZ_06)', route: 'QuizQuestion', params: { ...CATEGORY, devState: 'streak' } },
  { key: 'roundLoading', label: 'Ronda · cargando', route: 'QuizQuestion', params: { ...CATEGORY, devState: 'loading' } },
  { key: 'roundError', label: 'Ronda · error con reintento', route: 'QuizQuestion', params: { ...CATEGORY, devState: 'error' } },
  { key: 'roundEmpty', label: 'Ronda · sin preguntas', route: 'QuizQuestion', params: { ...CATEGORY, devState: 'empty' } },
  { key: 'resultLow', label: 'Resultado · bajo (QUIZ_07)', route: 'QuizResult', params: result({ correctCount: 3, score: 30, pointsEarned: 30, bestStreak: 2, missed: MISSED, devState: 'low' }) },
  { key: 'resultMid', label: 'Resultado · medio (QUIZ_08)', route: 'QuizResult', params: result({ devState: 'mid' }) },
  { key: 'resultPerfect', label: 'Resultado · perfecto con récord (QUIZ_09)', route: 'QuizResult', params: result({ correctCount: 10, score: 100, pointsEarned: 255, bestStreak: 10, isPerfect: true, missed: [], devState: 'perfect' }) },
  { key: 'resultRecord', label: 'Resultado · nuevo récord', route: 'QuizResult', params: result({ correctCount: 9, score: 90, pointsEarned: 190, bestStreak: 7, missed: MISSED.slice(0, 1), devState: 'record' }) },
  { key: 'resultSaving', label: 'Resultado · guardando', route: 'QuizResult', params: result({ devState: 'saving' }) },
  { key: 'resultError', label: 'Resultado · error con reintento', route: 'QuizResult', params: result({ devState: 'error' }) },
  { key: 'resultFirstQuiz', label: 'Resultado · celebración Primer Quiz', route: 'QuizResult', params: result({ devPreviousBest: null, devState: 'firstQuiz' }) },
  { key: 'resultMaster', label: 'Resultado · celebración Quiz Master', route: 'QuizResult', params: result({ correctCount: 10, score: 100, pointsEarned: 255, bestStreak: 10, isPerfect: true, missed: [], devState: 'master' }) },
] as const;

export const QUIZ_DEV_SCREENS = SCREENS;
export type QuizDevScreen = (typeof SCREENS)[number]['key'];

export function isQuizDevScreen(value: string | null): value is QuizDevScreen {
  return SCREENS.some(screen => screen.key === value);
}

export async function openQuizDevScreen(key: QuizDevScreen): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  const target = SCREENS.find(screen => screen.key === key);
  if (!target) {
    return false;
  }
  // Pushed so each state opens fresh.
  navigationRef.dispatch(
    StackActions.push(target.route as never, target.params as never),
  );
  return true;
}

let cursor = -1;

export async function openNextQuizDevScreen(): Promise<string | null> {
  cursor = (cursor + 1) % SCREENS.length;
  const target = SCREENS[cursor];
  return (await openQuizDevScreen(target.key)) ? target.label : null;
}
