WITH routine_translations AS (
  SELECT *
  FROM (
    VALUES
      (
        'Total Body Dumbbell',
        'Cuerpo completo con mancuernas',
        'Rutina de cuerpo completo con mancuernas para ganar fuerza, coordinación y resistencia muscular.',
        ARRAY['mancuernas', 'cuerpo completo', 'fuerza']::text[]
      ),
      (
        'Cuerpo completo con mancuernas',
        'Cuerpo completo con mancuernas',
        'Rutina de cuerpo completo con mancuernas para ganar fuerza, coordinación y resistencia muscular.',
        ARRAY['mancuernas', 'cuerpo completo', 'fuerza']::text[]
      ),
      (
        'Athletic Conditioning',
        'Acondicionamiento atlético',
        'Sesión dinámica para mejorar capacidad cardiovascular, potencia y acondicionamiento general.',
        ARRAY['acondicionamiento', 'resistencia', 'atlético']::text[]
      ),
      (
        'Acondicionamiento atlético',
        'Acondicionamiento atlético',
        'Sesión dinámica para mejorar capacidad cardiovascular, potencia y acondicionamiento general.',
        ARRAY['acondicionamiento', 'resistencia', 'atlético']::text[]
      ),
      (
        'Arms Blaster',
        'Brazos explosivos',
        'Rutina enfocada en bíceps y tríceps con volumen alto, congestión y trabajo accesorio intenso.',
        ARRAY['brazos', 'bíceps', 'tríceps']::text[]
      ),
      (
        'Brazos explosivos',
        'Brazos explosivos',
        'Rutina enfocada en bíceps y tríceps con volumen alto, congestión y trabajo accesorio intenso.',
        ARRAY['brazos', 'bíceps', 'tríceps']::text[]
      ),
      (
        'Back Strength Basics',
        'Fundamentos de fuerza para espalda',
        'Base sólida para desarrollar fuerza de espalda con técnica estable y ejercicios esenciales.',
        ARRAY['espalda', 'fuerza', 'técnica']::text[]
      ),
      (
        'Fundamentos de fuerza para espalda',
        'Fundamentos de fuerza para espalda',
        'Base sólida para desarrollar fuerza de espalda con técnica estable y ejercicios esenciales.',
        ARRAY['espalda', 'fuerza', 'técnica']::text[]
      ),
      (
        'Glute Activation',
        'Activación de glúteos',
        'Sesión corta para activar glúteos, mejorar la conexión muscular y preparar el tren inferior.',
        ARRAY['glúteos', 'activación', 'tren inferior']::text[]
      ),
      (
        'Activación de glúteos',
        'Activación de glúteos',
        'Sesión corta para activar glúteos, mejorar la conexión muscular y preparar el tren inferior.',
        ARRAY['glúteos', 'activación', 'tren inferior']::text[]
      ),
      (
        'Abs & Core Control',
        'Control de abdomen y core',
        'Trabajo de abdomen y core para reforzar estabilidad, control postural y tensión central.',
        ARRAY['abdomen', 'core', 'estabilidad']::text[]
      ),
      (
        'Control de abdomen y core',
        'Control de abdomen y core',
        'Trabajo de abdomen y core para reforzar estabilidad, control postural y tensión central.',
        ARRAY['abdomen', 'core', 'estabilidad']::text[]
      )
  ) AS translations(match_title, translated_title, translated_description, translated_tags)
)
UPDATE public.workout_templates AS workout
SET
  title = routine_translations.translated_title,
  description = routine_translations.translated_description,
  tags = routine_translations.translated_tags
FROM routine_translations
WHERE workout.is_public = true
  AND workout.title = routine_translations.match_title;
