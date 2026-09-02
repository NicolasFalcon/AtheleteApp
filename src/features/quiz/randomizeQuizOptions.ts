import type {QuizQuestion} from '@app/types/quiz';

export type AttemptQuizQuestion = QuizQuestion & {
  originalOptionIndexes: number[];
};

type RandomSource = () => number;

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

export function randomizeQuizOptions(
  questions: QuizQuestion[],
  random: RandomSource = Math.random,
): AttemptQuizQuestion[] {
  const balancedCorrectSlots = shuffle(
    questions.map((_, index) => index % 4),
    random,
  );

  return questions.map((question, questionIndex) => {
    const entries = question.options.map((option, originalIndex) => ({
      option,
      originalIndex,
    }));
    const correctEntry = entries.find(
      entry => entry.originalIndex === question.correctAnswer,
    );

    if (!correctEntry || entries.length < 2) {
      return {
        ...question,
        originalOptionIndexes: entries.map(entry => entry.originalIndex),
      };
    }

    const shuffledIncorrect = shuffle(
      entries.filter(entry => entry.originalIndex !== question.correctAnswer),
      random,
    );
    const correctSlot = balancedCorrectSlots[questionIndex] % entries.length;
    const randomizedEntries = [...shuffledIncorrect];
    randomizedEntries.splice(correctSlot, 0, correctEntry);

    return {
      ...question,
      options: randomizedEntries.map(entry => entry.option),
      correctAnswer: correctSlot,
      originalOptionIndexes: randomizedEntries.map(
        entry => entry.originalIndex,
      ),
    };
  });
}
