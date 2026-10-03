import {
  activeFilterCount,
  countBy,
  countByType,
  filterExercises,
  filterRoutines,
  levelBars,
  normalizeWorkoutType,
  typeLabel,
  NO_EXERCISE_FILTERS,
  pathMeta,
  recommendRoutines,
  routineEmptyText,
  routineListTitle,
  routineMeta,
  schemeChip,
  schemeLabel,
} from '../src/features/workouts/workoutsModel';
import type { LibraryExercise, Workout } from '../src/shared';

function workout(id: string, patch: Partial<Workout> = {}): Workout {
  return {
    id,
    title: `Rutina ${id}`,
    type: 'strength',
    duration: 35,
    difficulty: 'beginner',
    calories: 280,
    targetMuscles: [],
    exercises: [],
    isPremium: false,
    ...patch,
  };
}

function exercise(
  id: string,
  patch: Partial<LibraryExercise> = {},
): LibraryExercise {
  return {
    id,
    name: `Ejercicio ${id}`,
    slug: id,
    equipment: 'cable',
    bodyPart: 'chest',
    level: 'intermediate',
    thumbnailUrl: '',
    howToPerform: [],
    coachingCues: [],
    commonMistakes: [],
    musclesWorked: { primary: ['Pectoral'], secondary: [] },
    recommendations: {
      strength: { sets: '3', reps: '8' },
      hypertrophy: { sets: '3', reps: '10' },
      endurance: { sets: '2', reps: '15' },
    },
    usedInRoutines: [],
    category: 'strength',
    ...patch,
  };
}

describe('routines', () => {
  const list = [
    workout('a', { title: 'Total Body Dumbbell', type: 'fullbody' }),
    workout('b', { title: 'Brazos a fondo' }),
    workout('c', { title: 'HIIT de 20', type: 'hiit' }),
  ];

  it('filters by chip, favourites and search', () => {
    expect(
      filterRoutines(list, { chip: 'all', query: '', favoriteIds: [] }),
    ).toHaveLength(3);
    expect(
      filterRoutines(list, {
        chip: 'strength',
        query: '',
        favoriteIds: [],
      }).map(w => w.id),
    ).toEqual(['b']);
    expect(
      filterRoutines(list, {
        chip: 'favorites',
        query: '',
        favoriteIds: ['c'],
      }).map(w => w.id),
    ).toEqual(['c']);
    expect(
      filterRoutines(list, {
        chip: 'all',
        query: 'total',
        favoriteIds: [],
      }).map(w => w.id),
    ).toEqual(['a']);
  });

  it('counts per type and builds titles and meta', () => {
    expect(countByType(list)).toMatchObject({
      strength: 1,
      fullbody: 1,
      hiit: 1,
      cardio: 0,
    });
    expect(routineListTitle('all')).toBe('Todas las rutinas');
    expect(routineListTitle('hiit')).toBe('HIIT');
    expect(routineEmptyText('favorites')).toContain('favoritas');
    expect(routineMeta(list[0])).toBe('Principiante · 35 min · 280 kcal');
  });

  it('recommends featured routines by goal', () => {
    const featured = [
      workout('s', { sourceType: 'featured_editorial', type: 'strength' }),
      workout('h', { sourceType: 'featured_editorial', type: 'hiit' }),
    ];
    expect(
      recommendRoutines([...featured, workout('x')], 'performance')[0].id,
    ).toBe('h');
    expect(recommendRoutines([workout('x')], 'gain_muscle')[0].id).toBe('x');
  });
});

describe('exercises', () => {
  const list = [
    exercise('1'),
    exercise('2', { equipment: 'barbell', level: 'advanced' }),
    exercise('3', { bodyPart: 'legs', equipment: 'dumbbells' }),
  ];

  it('filters by zone, equipment, level, favourites and search', () => {
    const chestCable = filterExercises(
      list,
      { ...NO_EXERCISE_FILTERS, bodyPart: 'chest', equipment: ['cable'] },
      { query: '', favoriteIds: [] },
    );
    expect(chestCable.map(e => e.id)).toEqual(['1']);
    expect(
      filterExercises(
        list,
        { ...NO_EXERCISE_FILTERS, level: 'advanced' },
        { query: '', favoriteIds: [] },
      ).map(e => e.id),
    ).toEqual(['2']);
    expect(
      filterExercises(
        list,
        { ...NO_EXERCISE_FILTERS, favoritesOnly: true },
        { query: '', favoriteIds: ['3'] },
      ).map(e => e.id),
    ).toEqual(['3']);
    expect(
      filterExercises(list, NO_EXERCISE_FILTERS, {
        query: 'ejercicio 2',
        favoriteIds: [],
      }),
    ).toHaveLength(1);
  });

  it('counts per zone and equipment and active filters', () => {
    expect(countBy(list, 'bodyPart', ['chest', 'legs'] as const)).toEqual({
      chest: 2,
      legs: 1,
    });
    expect(countBy(list, 'equipment', ['cable', 'barbell'] as const)).toEqual({
      cable: 1,
      barbell: 1,
    });
    expect(
      activeFilterCount({
        bodyPart: 'chest',
        equipment: ['cable'],
        level: 'beginner',
        favoritesOnly: false,
      }),
    ).toBe(2);
    expect(levelBars('advanced')).toBe(3);
    expect(levelBars(undefined)).toBe(1);
  });
});

describe('workout type', () => {
  it('normalizes database values', () => {
    expect(normalizeWorkoutType('full_body')).toBe('fullbody');
    expect(normalizeWorkoutType('Fuerza')).toBe('strength');
    expect(normalizeWorkoutType('yoga')).toBeNull();
    expect(typeLabel('full_body')).toBe('Full body');
    expect(typeLabel('yoga_flow')).toBe('Yoga flow');
    expect(
      countByType([workout('z', { type: 'full_body' as Workout['type'] })])
        .fullbody,
    ).toBe(1);
  });
});

describe('routine path labels', () => {
  it('formats sets, reps, duration and rest', () => {
    expect(
      schemeLabel({ id: 'a', name: 'x', sets: 3, reps: 10, restTime: 45 }),
    ).toBe('3 × 10');
    expect(
      schemeLabel({ id: 'a', name: 'x', sets: 3, duration: 40, restTime: 0 }),
    ).toBe('3 × 40 s');
    expect(schemeLabel({ id: 'a', name: 'x', restTime: 0 })).toBe('Libre');
    expect(
      pathMeta({ id: 'a', name: 'x', sets: 3, reps: 12, restTime: 45 }),
    ).toBe('3 × 12 · 45 s descanso');
    expect(
      schemeChip({ id: 'a', name: 'x', sets: 3, reps: 10, restTime: 60 }),
    ).toBe('3 × 10 · 60 s');
  });
});
