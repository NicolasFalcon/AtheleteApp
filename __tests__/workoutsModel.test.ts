import {
  activeFilterCount,
  countBy,
  countByCategory,
  routineTypeLabel,
  filterExercises,
  filterRoutines,
  levelBars,
  NO_EXERCISE_FILTERS,
  pathMeta,
  recommendRoutines,
  routineEmptyText,
  routineScopeTitle,
  routineScopeFrom,
  countByCollection,
  ROUTINE_CATEGORIES,
  isMyRoutine,
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
    recommendedSetsReps: { hypertrophy: '3x10' },
    usedInRoutines: [],
    category: 'strength',
    ...patch,
  };
}

describe('routines', () => {
  const list = [
    workout('a', {
      title: 'Total Body Dumbbell',
      type: 'fullbody',
      routineCategory: 'cuerpo_completo',
    }),
    workout('b', { title: 'Brazos a fondo', routineCategory: 'tren_superior' }),
    workout('c', { title: 'HIIT de 20', type: 'hiit', routineCategory: 'hiit' }),
    // The server could not classify it: only "Todas" shows it.
    workout('n', { title: 'Sin categoría', routineCategory: null }),
  ];

  it('filters by type, collection and search', () => {
    const base = { query: '', favoriteIds: [] as string[], userId: 'u1' };
    expect(
      filterRoutines(list, { ...base, scope: { collection: 'all' } }),
    ).toHaveLength(4);
    expect(
      filterRoutines(list, { ...base, scope: { category: 'tren_superior' } }).map(
        w => w.id,
      ),
    ).toEqual(['b']);
    // A routine without category belongs to no category list.
    ROUTINE_CATEGORIES.forEach(category =>
      expect(
        filterRoutines(list, { ...base, scope: { category } }).map(w => w.id),
      ).not.toContain('n'),
    );
    expect(
      filterRoutines(list, {
        ...base,
        favoriteIds: ['c'],
        scope: { collection: 'favorites' },
      }).map(w => w.id),
    ).toEqual(['c']);
    expect(
      filterRoutines(list, {
        ...base,
        query: 'total',
        scope: { collection: 'all' },
      }).map(w => w.id),
    ).toEqual(['a']);
  });

  it('treats the user and ELLIE routines as "Tus rutinas"', () => {
    const mine = [
      workout('m', { createdBy: 'u1', sourceType: 'user' }),
      workout('e', { createdBy: 'u1', sourceType: 'ellie', createdByAi: true }),
      workout('o', { createdBy: 'u2', sourceType: 'user' }),
      workout('f', { createdBy: 'u1', sourceType: 'featured_editorial' }),
    ];
    expect(
      filterRoutines(mine, {
        scope: { collection: 'mine' },
        query: '',
        favoriteIds: [],
        userId: 'u1',
      }).map(w => w.id),
    ).toEqual(['m', 'e']);
    expect(isMyRoutine(mine[0], null)).toBe(false);
    expect(
      countByCollection(mine, { favoriteIds: ['o'], userId: 'u1' }),
    ).toEqual({ favorites: 1, mine: 2, all: 4 });
  });

  it('counts per category and builds titles and meta', () => {
    expect(countByCategory(list)).toMatchObject({
      cuerpo_completo: 1,
      tren_superior: 1,
      hiit: 1,
      fuerza: 0,
    });
    // The routine without category is not in any category count.
    expect(
      Object.values(countByCategory(list)).reduce((a, b) => a + b, 0),
    ).toBe(3);
    expect(routineScopeTitle({ collection: 'all' })).toBe('Todas las rutinas');
    expect(routineScopeTitle({ category: 'hiit' })).toBe('HIIT');
    expect(routineScopeTitle({ category: 'tren_inferior' })).toBe(
      'Tren inferior',
    );
    expect(routineScopeTitle({ collection: 'mine' })).toBe('Tus rutinas');
    expect(routineEmptyText({ collection: 'favorites' })).toContain('corazón');
    expect(routineScopeFrom({ category: 'core' })).toEqual({ category: 'core' });
    // An unknown category falls back to the collection.
    expect(routineScopeFrom({ category: 'yoga' })).toEqual({
      collection: 'all',
    });
    expect(routineScopeFrom({ collection: 'favorites' })).toEqual({
      collection: 'favorites',
    });
    expect(routineScopeFrom()).toEqual({ collection: 'all' });
    expect(routineMeta(list[0])).toBe('Principiante · 35 min · 280 kcal');
  });

  it('recommends featured routines by goal', () => {
    const featured = [
      workout('s', { sourceType: 'featured_editorial', type: 'strength' }),
      workout('h', {
        sourceType: 'featured_editorial',
        type: 'hiit',
        routineCategory: 'hiit',
      }),
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

describe('routine type label', () => {
  it('uses the category and falls back to the raw type text', () => {
    expect(
      routineTypeLabel({ type: 'strength', routineCategory: 'tren_inferior' }),
    ).toBe('Tren inferior');
    expect(
      routineTypeLabel({ type: 'full_body' as Workout['type'], routineCategory: null }),
    ).toBe('Full body');
    expect(routineTypeLabel(null)).toBe('Rutina');
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
