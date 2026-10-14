import {
  mapCatalogExercise,
  parseExerciseMediaUrls,
} from '../src/services/supabase/exerciseCatalog';
import { mapTemplateExerciseRowToExercise } from '../src/shared/data/workouts';

describe('normalized exercise catalog', () => {
  it('maps localized relations and signed R2 media into the domain model', () => {
    const exercise = mapCatalogExercise(
      {
        id: 'exercise-1',
        slug: 'press-test',
        difficulty: 'intermediate',
        tracking_metrics: ['reps', 'weight'],
        is_unilateral: true,
        pr_eligible: true,
        exercise_translations: [
          {
            locale: 'en',
            name: 'Test Press',
            short_description: 'Short EN',
            long_description: 'Long EN',
            instructions: ['Press'],
            common_mistakes: ['Rush'],
            benefits: ['Strength'],
            tags: ['press'],
          },
          {
            locale: 'es',
            name: 'Press de prueba',
            short_description: 'Corta ES',
            long_description: 'Larga ES',
            instructions: ['Empuja'],
            common_mistakes: ['Apurarse'],
            benefits: ['Fuerza'],
            tags: ['empuje'],
          },
        ],
        exercise_muscles: [
          {
            role: 'primary',
            sort_order: 0,
            muscles: {
              slug: 'chest',
              name_en: 'Chest',
              name_es: 'Pecho',
            },
          },
        ],
        exercise_equipment: [
          {
            equipment: {
              slug: 'dumbbell',
              name_en: 'Dumbbell',
              name_es: 'Mancuerna',
            },
          },
        ],
        exercise_movement_patterns: [
          {
            movement_patterns: {
              slug: 'push',
              name_en: 'Push',
              name_es: 'Empuje',
            },
          },
        ],
        exercise_media: [
          {
            kind: 'poster',
            object_key: 'posters/test.jpg',
            orientation: null,
            is_primary: true,
            sort_order: 0,
          },
          {
            kind: 'video',
            object_key: 'videos/test.mp4',
            orientation: 'portrait',
            is_primary: true,
            sort_order: 0,
          },
        ],
      },
      {
        'posters/test.jpg': 'https://signed/poster',
        'videos/test.mp4': 'https://signed/video',
      },
      'es',
    );

    expect(exercise).toMatchObject({
      name: 'Press de prueba',
      equipment: 'dumbbells',
      bodyPart: 'chest',
      thumbnailUrl: 'https://signed/poster',
      videoUrl: 'https://signed/video',
      movementPatterns: ['Empuje'],
      trackingMetrics: ['reps', 'weight'],
      isUnilateral: true,
      prEligible: true,
    });
    expect(exercise.musclesWorked.primary).toEqual(['Pecho']);
  });

  it('accepts the Edge Function URL response shapes', () => {
    expect(
      parseExerciseMediaUrls({
        urls: [
          { key: 'a', url: 'https://signed/a' },
          { object_key: 'b', signed_url: 'https://signed/b' },
        ],
      }),
    ).toEqual({ a: 'https://signed/a', b: 'https://signed/b' });
    expect(
      parseExerciseMediaUrls({
        urls: {
          'posters/a.png': {
            url: 'https://signed/poster-a',
            expires_at: '2026-10-13T22:00:00Z',
          },
        },
      }),
    ).toEqual({ 'posters/a.png': 'https://signed/poster-a' });
  });

  it('uses the catalog translation for a template exercise name', () => {
    expect(
      mapTemplateExerciseRowToExercise({
        id: 'row-1',
        exercise_id: 'exercise-1',
        name: 'Legacy name',
        exercises: {
          exercise_translations: [
            { locale: 'en', name: 'English name' },
            { locale: 'es', name: 'Nombre español' },
          ],
        },
      }).name,
    ).toBe('Nombre español');
  });
});
