import {randomizeQuizOptions} from '@app/features/quiz/randomizeQuizOptions';
import type {QuizQuestion} from '@app/types/quiz';

function makeQuestion(index: number): QuizQuestion {
  return {
    id: `question-${index}`,
    categoryId: 'category-1',
    question: `Pregunta ${index}`,
    options: [`A-${index}`, `B-${index}`, `C-${index}`, `D-${index}`],
    correctAnswer: 1,
    explanation: null,
    difficulty: 'medium',
    pointsReward: 10,
    sortOrder: index,
  };
}

describe('randomizeQuizOptions', () => {
  test('mantiene el vínculo con la respuesta correcta original', () => {
    const questions = Array.from({length: 10}, (_, index) =>
      makeQuestion(index),
    );
    const randomized = randomizeQuizOptions(questions, () => 0.42);

    randomized.forEach((question, index) => {
      expect(question.options[question.correctAnswer]).toBe(`B-${index}`);
      expect(question.originalOptionIndexes[question.correctAnswer]).toBe(1);
      expect([...question.options].sort()).toEqual(
        [...questions[index].options].sort(),
      );
    });
  });

  test('balancea las posiciones correctas entre A, B, C y D', () => {
    const questions = Array.from({length: 10}, (_, index) =>
      makeQuestion(index),
    );
    const randomized = randomizeQuizOptions(questions, () => 0.73);
    const counts = [0, 0, 0, 0];

    randomized.forEach(question => {
      counts[question.correctAnswer] += 1;
    });

    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(counts.every(count => count >= 2)).toBe(true);
  });

  test('no muta preguntas ni opciones originales', () => {
    const questions = [makeQuestion(0)];
    const originalOptions = [...questions[0].options];

    randomizeQuizOptions(questions, () => 0.1);

    expect(questions[0].options).toEqual(originalOptions);
    expect(questions[0].correctAnswer).toBe(1);
  });
});
