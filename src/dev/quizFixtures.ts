import type { RoundAnswer } from '@app/features/quiz/quizModel';
import type { AttemptQuizQuestion } from '@app/features/quiz/randomizeQuizOptions';
import type { QuizAttemptSummary, QuizOverview } from '@app/types/quiz';

// Development only: sample data for the Quiz screens. Nothing is read or
// written; the figures match the references (QUIZ_01 … QUIZ_09).

export const QUIZ_FIXTURE_POINTS = 4860;

const CATEGORIES = [
  { id: 'dev-nutricion', name: 'Nutrición', slug: 'nutricion', icon: 'apple' },
  { id: 'dev-entrenamiento', name: 'Entrenamiento', slug: 'entrenamiento', icon: 'dumbbell' },
  { id: 'dev-recuperacion', name: 'Recuperación', slug: 'recuperacion', icon: 'moon' },
] as const;

function daysAgo(days: number, now: Date): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function attempt(
  index: number,
  categoryId: string,
  correct: number,
  points: number,
  completedAt: string,
): QuizAttemptSummary {
  return {
    id: `dev-attempt-${index}`,
    categoryId,
    score: correct * 10,
    correctCount: correct,
    totalQuestions: 10,
    pointsEarned: points,
    completedAt,
  };
}

export function quizOverviewFixture(
  kind: 'data' | 'new' | 'perfect',
  now: Date = new Date(),
): QuizOverview {
  const attempts: QuizAttemptSummary[] =
    kind === 'new'
      ? []
      : kind === 'perfect'
      ? CATEGORIES.map((category, index) =>
          attempt(index, category.id, 10, 255, daysAgo(index, now)),
        )
      : [
          attempt(1, 'dev-entrenamiento', 7, 90, daysAgo(3, now)),
          attempt(2, 'dev-nutricion', 8, 120, daysAgo(14, now)),
          attempt(3, 'dev-nutricion', 6, 70, daysAgo(20, now)),
        ];

  return {
    attempts,
    categories: CATEGORIES.map(category => {
      const own = attempts.filter(item => item.categoryId === category.id);
      const best = own.reduce<QuizAttemptSummary | null>(
        (current, item) => (!current || item.score > current.score ? item : current),
        null,
      );

      return {
        ...category,
        description: null,
        questionCount: 10,
        bestScore: best?.score,
        bestCorrect: best?.correctCount,
        bestTotal: best?.totalQuestions,
        attemptsCount: own.length,
      };
    }),
  };
}

// The prototype's nutrition questions (Quiz.dc.html), used to freeze a round
// at any moment. Options are already in the shown order.
export const QUIZ_FIXTURE_QUESTIONS: AttemptQuizQuestion[] = [
  ['¿Qué es la sobrecarga progresiva?', ['Subir poco a poco carga o volumen', 'Entrenar siempre al fallo', 'Cambiar de rutina cada semana', 'Entrenar dos veces al día'], 0, 'Progresas subiendo el estímulo poco a poco.'],
  ['¿Cuánta proteína diaria ayuda a ganar músculo?', ['0,5 g por kilo', '1,6–2,2 g por kilo', '4 g por kilo', 'No influye'], 1, 'Ese rango cubre a casi todos los que entrenan fuerza.'],
  ['¿Qué descanso entre series favorece la fuerza máxima?', ['15 segundos', '30 segundos', '2 a 5 minutos', '10 minutos'], 2, 'Descansar más te deja rendir en cada serie pesada.'],
  ['¿Cuántas horas de sueño ayudan a recuperar?', ['4 a 5', '7 a 9', '10 a 12', 'Da igual'], 1, '7–9 horas: mejor recuperación y más rendimiento.'],
  ['En la sentadilla, las rodillas deben…', ['Ir hacia dentro', 'Seguir la línea de los pies', 'Quedarse bloqueadas', 'No pasar nunca la punta'], 1, 'Alineadas con los pies reparten mejor la carga.'],
  ['¿Qué te da más energía en un entreno intenso?', ['Grasas', 'Proteínas', 'Carbohidratos', 'Fibra'], 2, 'El glucógeno, que viene de los carbohidratos.'],
  ['¿Qué significa un RPE de 8?', ['Hacer 8 repeticiones', 'Quedan unas 2 en reserva', 'Levantar 8 kg', 'El 80 % de tu máximo'], 1, 'Esfuerzo alto, con unas dos repeticiones de margen.'],
  ['¿Cuándo conviene el estiramiento estático largo?', ['Antes de levantar pesado', 'Después del entreno', 'Entre series de fuerza', 'Nunca'], 1, 'Antes puede restarte fuerza; después suma movilidad.'],
  ['¿Qué puede indicar una orina muy oscura?', ['Buena hidratación', 'Posible deshidratación', 'Exceso de proteína', 'Nada relevante'], 1, 'Suele ser señal de que necesitas beber más.'],
  ['¿Cuántas veces por semana trabajar cada músculo?', ['Una', 'Dos o más', 'Nunca repetir', 'Todos los días al fallo'], 1, 'Repartir el volumen en 2+ sesiones rinde más.'],
].map(([question, options, correct, explanation], index) => ({
  id: `dev-question-${index}`,
  categoryId: 'dev-nutricion',
  question: question as string,
  options: options as string[],
  correctAnswer: correct as number,
  explanation: explanation as string,
  difficulty: index < 3 ? 'easy' : index < 7 ? 'medium' : 'hard',
  pointsReward: 10,
  sortOrder: index,
  originalOptionIndexes: [0, 1, 2, 3],
}));

function answer(
  index: number,
  correct: boolean,
  multiplier: number,
): RoundAnswer {
  const question = QUIZ_FIXTURE_QUESTIONS[index];
  return {
    questionId: question.id,
    selectedAnswer: correct ? question.correctAnswer : (question.correctAnswer + 1) % 4,
    isCorrect: correct,
    pointsEarned: correct ? 10 * multiplier : 0,
    multiplier,
    questionText: question.question,
  };
}

// Round frozen at a sample moment (index of the question, chosen option and
// the answers given before it).
export function quizRoundFixture(
  kind: 'new' | 'correct' | 'incorrect' | 'streak',
) {
  switch (kind) {
    case 'correct':
      return {
        index: 2,
        selected: 2,
        answers: [answer(0, true, 1), answer(1, true, 1), answer(2, true, 2)],
        streak: 3,
        bestStreak: 3,
      };
    case 'incorrect':
      return {
        index: 3,
        selected: 0,
        answers: [answer(0, true, 1), answer(1, true, 1), answer(2, true, 2), answer(3, false, 1)],
        streak: 0,
        bestStreak: 3,
      };
    case 'streak':
      return {
        index: 5,
        selected: 2,
        answers: [0, 1, 2, 3, 4, 5].map(i => answer(i, true, i >= 4 ? 3 : i >= 2 ? 2 : 1)),
        streak: 6,
        bestStreak: 6,
      };
    default:
      return { index: 0, selected: null, answers: [], streak: 0, bestStreak: 0 };
  }
}
