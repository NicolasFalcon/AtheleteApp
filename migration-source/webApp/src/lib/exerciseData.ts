// Exercise Library Data - Separate from main mockData to keep files focused

export interface LibraryExercise {
  id: string;
  name: string;
  equipment: 'bodyweight' | 'dumbbells' | 'barbell' | 'machines' | 'bands' | 'kettlebells';
  bodyPart: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'fullbody';
  level: 'beginner' | 'intermediate' | 'advanced';
  thumbnailUrl: string;
  videoUrl?: string | null;
  videoDurationSeconds?: number | null;
  orientation?: 'portrait' | 'landscape' | null;
  howToPerform: string[];
  coachingCues: string[];
  commonMistakes: string[];
  musclesWorked: {
    primary: string[];
    secondary: string[];
  };
  recommendations: {
    strength: { sets: string; reps: string };
    hypertrophy: { sets: string; reps: string };
    endurance: { sets: string; reps: string };
  };
  usedInRoutines: string[];
}

export const exerciseLibrary: LibraryExercise[] = [
  {
    id: 'ex1',
    name: 'Pull-ups',
    equipment: 'bodyweight',
    bodyPart: 'back',
    level: 'intermediate',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=200&q=80',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    videoDurationSeconds: 15,
    orientation: 'landscape',
    howToPerform: [
      'Grip the bar with hands slightly wider than shoulder-width, palms facing away.',
      'Hang with arms fully extended, shoulders engaged.',
      'Pull your body up by driving elbows down toward your hips.',
      'Continue until your chin clears the bar.',
      'Lower yourself with control to the starting position.',
      'Repeat for the desired number of reps.'
    ],
    coachingCues: [
      'Keep your core tight throughout the movement.',
      'Avoid swinging or using momentum.',
      'Focus on squeezing your shoulder blades together at the top.',
      'Breathe out as you pull up, breathe in as you lower.',
      'Keep your chest up and proud.'
    ],
    commonMistakes: [
      'Using momentum or kipping to get up.',
      'Not going through full range of motion.',
      'Flaring elbows out too wide.',
      'Letting shoulders shrug up near the ears.'
    ],
    musclesWorked: {
      primary: ['Latissimus dorsi', 'Biceps'],
      secondary: ['Rhomboids', 'Rear deltoids', 'Core']
    },
    recommendations: {
      strength: { sets: '4-5', reps: '3-5' },
      hypertrophy: { sets: '3-4', reps: '8-12' },
      endurance: { sets: '2-3', reps: '15-20' }
    },
    usedInRoutines: ['Full Body Power', 'Upper Body Strength']
  },
  {
    id: 'ex2',
    name: 'Barbell Squat',
    equipment: 'barbell',
    bodyPart: 'legs',
    level: 'intermediate',
    thumbnailUrl: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=200&q=80',
    howToPerform: [
      'Position the barbell on your upper back, gripping it wider than shoulder-width.',
      'Unrack the bar and step back with feet shoulder-width apart.',
      'Brace your core and keep your chest up.',
      'Lower your body by bending at the hips and knees simultaneously.',
      'Descend until thighs are parallel to the floor or below.',
      'Drive through your heels to stand back up.'
    ],
    coachingCues: [
      'Keep your weight on your heels and midfoot.',
      'Push your knees out in line with your toes.',
      'Maintain a neutral spine throughout.',
      'Take a deep breath before each rep.',
      'Drive your hips forward at the top.'
    ],
    commonMistakes: [
      'Knees caving inward during the lift.',
      'Rounding the lower back.',
      'Rising on toes or shifting weight forward.',
      'Not reaching proper depth.'
    ],
    musclesWorked: {
      primary: ['Quadriceps', 'Glutes'],
      secondary: ['Hamstrings', 'Core', 'Lower back']
    },
    recommendations: {
      strength: { sets: '5', reps: '3-5' },
      hypertrophy: { sets: '4', reps: '8-12' },
      endurance: { sets: '3', reps: '15-20' }
    },
    usedInRoutines: ['Leg Day Extreme', 'Full Body Power']
  },
  {
    id: 'ex3',
    name: 'Dumbbell Bench Press',
    equipment: 'dumbbells',
    bodyPart: 'chest',
    level: 'beginner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&q=80',
    howToPerform: [
      'Sit on a flat bench with dumbbells on your thighs.',
      'Lie back and bring dumbbells to shoulder level.',
      'Press the dumbbells up until arms are extended.',
      'Lower the weights with control to chest level.',
      'Keep your feet flat on the floor.',
      'Repeat for the desired number of reps.'
    ],
    coachingCues: [
      'Keep your shoulder blades pinched together.',
      'Maintain a slight arch in your lower back.',
      'Lower the weights to nipple line.',
      'Press in a slight arc, not straight up.',
      'Keep wrists straight and neutral.'
    ],
    commonMistakes: [
      'Flaring elbows out at 90 degrees.',
      'Bouncing weights off the chest.',
      'Lifting hips off the bench.',
      'Using momentum instead of control.'
    ],
    musclesWorked: {
      primary: ['Pectoralis major', 'Triceps'],
      secondary: ['Anterior deltoids', 'Serratus anterior']
    },
    recommendations: {
      strength: { sets: '4-5', reps: '4-6' },
      hypertrophy: { sets: '3-4', reps: '8-12' },
      endurance: { sets: '2-3', reps: '15-20' }
    },
    usedInRoutines: ['Upper Body Strength', 'Full Body Power']
  },
  {
    id: 'ex4',
    name: 'Romanian Deadlift',
    equipment: 'barbell',
    bodyPart: 'legs',
    level: 'intermediate',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80',
    howToPerform: [
      'Stand with feet hip-width apart, holding a barbell at thigh level.',
      'Push your hips back while keeping a slight bend in your knees.',
      'Lower the bar along your legs, keeping it close to your body.',
      'Descend until you feel a stretch in your hamstrings.',
      'Drive your hips forward to return to standing.',
      'Squeeze your glutes at the top.'
    ],
    coachingCues: [
      'Keep the bar close to your body throughout.',
      'Maintain a flat back with no rounding.',
      'Push your hips back, not down.',
      'Feel the stretch in your hamstrings.',
      'Keep your head neutral.'
    ],
    commonMistakes: [
      'Rounding the lower back.',
      'Bending knees too much (turning it into a squat).',
      'Letting the bar drift away from legs.',
      'Not pushing hips back far enough.'
    ],
    musclesWorked: {
      primary: ['Hamstrings', 'Glutes'],
      secondary: ['Lower back', 'Core', 'Forearms']
    },
    recommendations: {
      strength: { sets: '4', reps: '5-6' },
      hypertrophy: { sets: '3-4', reps: '8-12' },
      endurance: { sets: '2-3', reps: '15-18' }
    },
    usedInRoutines: ['Leg Day Extreme', 'Full Body Power']
  },
  {
    id: 'ex5',
    name: 'Overhead Press',
    equipment: 'barbell',
    bodyPart: 'shoulders',
    level: 'intermediate',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=200&q=80',
    howToPerform: [
      'Stand with feet shoulder-width apart, bar at shoulder level.',
      'Grip the bar slightly wider than shoulder-width.',
      'Brace your core and squeeze your glutes.',
      'Press the bar overhead until arms are fully extended.',
      'Move your head slightly back as the bar passes your face.',
      'Lower with control back to the starting position.'
    ],
    coachingCues: [
      'Keep your core tight with no excessive arching.',
      'Press the bar in a straight line.',
      'Lock out fully at the top.',
      'Keep your wrists straight.',
      'Breathe out as you press up.'
    ],
    commonMistakes: [
      'Excessive lower back arching.',
      'Pressing the bar forward instead of straight up.',
      'Not locking out at the top.',
      'Using leg drive (turning it into a push press).'
    ],
    musclesWorked: {
      primary: ['Anterior deltoids', 'Triceps'],
      secondary: ['Upper chest', 'Core', 'Trapezius']
    },
    recommendations: {
      strength: { sets: '5', reps: '3-5' },
      hypertrophy: { sets: '4', reps: '8-10' },
      endurance: { sets: '3', reps: '12-15' }
    },
    usedInRoutines: ['Upper Body Strength', 'Full Body Power']
  },
  {
    id: 'ex6',
    name: 'Plank',
    equipment: 'bodyweight',
    bodyPart: 'core',
    level: 'beginner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&q=80',
    howToPerform: [
      'Start in a push-up position with forearms on the ground.',
      'Keep elbows directly under shoulders.',
      'Engage your core and squeeze your glutes.',
      'Form a straight line from head to heels.',
      'Hold the position for the desired time.',
      'Breathe steadily throughout.'
    ],
    coachingCues: [
      'Do not let your hips sag or pike up.',
      'Keep your neck neutral and look at the floor.',
      'Squeeze your glutes for extra stability.',
      'Breathe normally and do not hold your breath.',
      'Imagine pulling your elbows toward your toes.'
    ],
    commonMistakes: [
      'Hips sagging toward the floor.',
      'Hips piking up too high.',
      'Looking up and straining the neck.',
      'Holding breath instead of breathing.'
    ],
    musclesWorked: {
      primary: ['Rectus abdominis', 'Transverse abdominis'],
      secondary: ['Obliques', 'Lower back', 'Shoulders']
    },
    recommendations: {
      strength: { sets: '3-4', reps: '30-60 sec' },
      hypertrophy: { sets: '3', reps: '45-90 sec' },
      endurance: { sets: '2-3', reps: '60-120 sec' }
    },
    usedInRoutines: ['Core & Mobility', 'HIIT Cardio Blast']
  },
  {
    id: 'ex7',
    name: 'Lat Pulldown',
    equipment: 'machines',
    bodyPart: 'back',
    level: 'beginner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=200&q=80',
    howToPerform: [
      'Sit at the lat pulldown machine with thighs secured.',
      'Grip the bar wider than shoulder-width, palms facing away.',
      'Lean back slightly with chest up.',
      'Pull the bar down to your upper chest.',
      'Squeeze your shoulder blades together at the bottom.',
      'Control the bar back up to full arm extension.'
    ],
    coachingCues: [
      'Drive your elbows down and back.',
      'Keep your chest up and proud.',
      'Do not lean back excessively.',
      'Focus on the lat stretch at the top.',
      'Control the negative portion.'
    ],
    commonMistakes: [
      'Pulling behind the neck.',
      'Using too much momentum.',
      'Not going through full range of motion.',
      'Gripping too narrow.'
    ],
    musclesWorked: {
      primary: ['Latissimus dorsi'],
      secondary: ['Biceps', 'Rear deltoids', 'Rhomboids']
    },
    recommendations: {
      strength: { sets: '4', reps: '6-8' },
      hypertrophy: { sets: '3-4', reps: '10-12' },
      endurance: { sets: '3', reps: '15-20' }
    },
    usedInRoutines: ['Upper Body Strength']
  },
  {
    id: 'ex8',
    name: 'Dumbbell Biceps Curl',
    equipment: 'dumbbells',
    bodyPart: 'arms',
    level: 'beginner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=200&q=80',
    howToPerform: [
      'Stand with dumbbells at your sides, palms facing forward.',
      'Keep your elbows close to your body.',
      'Curl the weights up toward your shoulders.',
      'Squeeze your biceps at the top of the movement.',
      'Lower the weights with control.',
      'Avoid swinging your body.'
    ],
    coachingCues: [
      'Keep your upper arms stationary.',
      'Do not swing or use momentum.',
      'Supinate (rotate) your wrists as you curl.',
      'Squeeze at the top for peak contraction.',
      'Control the eccentric phase.'
    ],
    commonMistakes: [
      'Swinging the body for momentum.',
      'Moving elbows forward during the curl.',
      'Not using full range of motion.',
      'Going too heavy and losing form.'
    ],
    musclesWorked: {
      primary: ['Biceps brachii'],
      secondary: ['Brachialis', 'Forearms']
    },
    recommendations: {
      strength: { sets: '4', reps: '6-8' },
      hypertrophy: { sets: '3-4', reps: '10-12' },
      endurance: { sets: '2-3', reps: '15-20' }
    },
    usedInRoutines: ['Upper Body Strength']
  },
  {
    id: 'ex9',
    name: 'Burpees',
    equipment: 'bodyweight',
    bodyPart: 'fullbody',
    level: 'advanced',
    thumbnailUrl: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=200&q=80',
    howToPerform: [
      'Start standing with feet shoulder-width apart.',
      'Drop into a squat and place hands on the floor.',
      'Jump or step your feet back into a plank position.',
      'Perform a push-up (optional for added difficulty).',
      'Jump or step feet back to squat position.',
      'Explode up into a jump with arms overhead.'
    ],
    coachingCues: [
      'Keep your core engaged throughout.',
      'Land softly when jumping.',
      'Maintain good push-up form if including it.',
      'Move at a pace you can sustain.',
      'Breathe rhythmically.'
    ],
    commonMistakes: [
      'Not reaching full hip extension on the jump.',
      'Sagging hips in the plank position.',
      'Not engaging core during transitions.',
      'Moving too fast and losing form.'
    ],
    musclesWorked: {
      primary: ['Quadriceps', 'Chest', 'Core'],
      secondary: ['Shoulders', 'Triceps', 'Glutes', 'Hamstrings']
    },
    recommendations: {
      strength: { sets: '4', reps: '5-8' },
      hypertrophy: { sets: '3', reps: '10-15' },
      endurance: { sets: '3', reps: '20-30' }
    },
    usedInRoutines: ['HIIT Cardio Blast']
  },
  {
    id: 'ex10',
    name: 'Kettlebell Swing',
    equipment: 'kettlebells',
    bodyPart: 'fullbody',
    level: 'intermediate',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=200&q=80',
    howToPerform: [
      'Stand with feet slightly wider than shoulder-width.',
      'Hold the kettlebell with both hands, arms relaxed.',
      'Hinge at the hips, pushing them back.',
      'Swing the kettlebell back between your legs.',
      'Drive your hips forward explosively to swing the bell up.',
      'Let the bell swing to chest or eye level, then repeat.'
    ],
    coachingCues: [
      'Power comes from the hips, not the arms.',
      'Keep your back flat throughout.',
      'Squeeze your glutes at the top.',
      'Keep the bell close to your body on the backswing.',
      'Maintain a neutral spine.'
    ],
    commonMistakes: [
      'Squatting instead of hinging.',
      'Using arms to lift the kettlebell.',
      'Rounding the lower back.',
      'Not engaging glutes at the top.'
    ],
    musclesWorked: {
      primary: ['Glutes', 'Hamstrings'],
      secondary: ['Core', 'Lower back', 'Shoulders', 'Forearms']
    },
    recommendations: {
      strength: { sets: '5', reps: '8-10' },
      hypertrophy: { sets: '4', reps: '12-15' },
      endurance: { sets: '3', reps: '20-25' }
    },
    usedInRoutines: ['HIIT Cardio Blast', 'Full Body Power']
  },
  {
    id: 'ex11',
    name: 'Leg Press',
    equipment: 'machines',
    bodyPart: 'legs',
    level: 'beginner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80',
    howToPerform: [
      'Sit in the leg press machine with back flat against the pad.',
      'Place feet shoulder-width apart on the platform.',
      'Release the safety handles.',
      'Lower the platform by bending your knees toward your chest.',
      'Stop when knees are at 90 degrees or slightly below.',
      'Press through your heels to extend legs back up.'
    ],
    coachingCues: [
      'Keep your lower back pressed against the pad.',
      'Do not lock out your knees at the top.',
      'Control the weight on the way down.',
      'Push through the whole foot, emphasis on heels.',
      'Breathe out as you press.'
    ],
    commonMistakes: [
      'Lifting hips off the seat.',
      'Letting knees cave inward.',
      'Locking knees at the top.',
      'Going too heavy and losing form.'
    ],
    musclesWorked: {
      primary: ['Quadriceps'],
      secondary: ['Glutes', 'Hamstrings', 'Calves']
    },
    recommendations: {
      strength: { sets: '4', reps: '6-8' },
      hypertrophy: { sets: '4', reps: '10-12' },
      endurance: { sets: '3', reps: '15-20' }
    },
    usedInRoutines: ['Leg Day Extreme']
  },
  {
    id: 'ex12',
    name: 'Resistance Band Pull-Apart',
    equipment: 'bands',
    bodyPart: 'shoulders',
    level: 'beginner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&q=80',
    howToPerform: [
      'Hold a resistance band with both hands at shoulder height.',
      'Start with arms extended in front of you.',
      'Pull the band apart by squeezing your shoulder blades.',
      'Bring your hands out to your sides.',
      'Hold briefly at the end position.',
      'Return to start with control.'
    ],
    coachingCues: [
      'Keep your arms straight throughout.',
      'Focus on squeezing shoulder blades together.',
      'Do not shrug your shoulders up.',
      'Control the movement in both directions.',
      'Keep core engaged for stability.'
    ],
    commonMistakes: [
      'Bending the elbows.',
      'Shrugging shoulders up.',
      'Moving too fast without control.',
      'Not fully extending at the end range.'
    ],
    musclesWorked: {
      primary: ['Rear deltoids', 'Rhomboids'],
      secondary: ['Trapezius', 'Rotator cuff']
    },
    recommendations: {
      strength: { sets: '3', reps: '10-12' },
      hypertrophy: { sets: '3-4', reps: '15-20' },
      endurance: { sets: '2-3', reps: '20-30' }
    },
    usedInRoutines: ['Core & Mobility', 'Upper Body Strength']
  },
  {
    id: 'ex13',
    name: 'Tricep Dips',
    equipment: 'bodyweight',
    bodyPart: 'arms',
    level: 'intermediate',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=200&q=80',
    howToPerform: [
      'Place hands on parallel bars or a bench behind you.',
      'Support your weight with arms fully extended.',
      'Keep your chest up and shoulders back.',
      'Lower your body by bending elbows to 90 degrees.',
      'Press back up to the starting position.',
      'Keep your body close to the support.'
    ],
    coachingCues: [
      'Keep elbows pointing backward, not flared.',
      'Do not go too deep if you have shoulder issues.',
      'Keep your chest up throughout.',
      'Control the descent.',
      'Lock out at the top.'
    ],
    commonMistakes: [
      'Flaring elbows out to the sides.',
      'Going too deep and stressing shoulders.',
      'Rounding the shoulders forward.',
      'Using momentum instead of control.'
    ],
    musclesWorked: {
      primary: ['Triceps'],
      secondary: ['Chest', 'Anterior deltoids']
    },
    recommendations: {
      strength: { sets: '4', reps: '6-8' },
      hypertrophy: { sets: '3-4', reps: '10-12' },
      endurance: { sets: '2-3', reps: '15-20' }
    },
    usedInRoutines: ['Upper Body Strength']
  },
  {
    id: 'ex14',
    name: 'Mountain Climbers',
    equipment: 'bodyweight',
    bodyPart: 'core',
    level: 'beginner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=200&q=80',
    howToPerform: [
      'Start in a high plank position with hands under shoulders.',
      'Keep your body in a straight line.',
      'Drive one knee toward your chest.',
      'Quickly switch legs, extending the first leg back.',
      'Continue alternating legs at a steady pace.',
      'Keep your hips level throughout.'
    ],
    coachingCues: [
      'Keep your hips down and do not pike up.',
      'Move at a pace you can maintain with good form.',
      'Land softly with each step.',
      'Keep your core engaged.',
      'Breathe rhythmically.'
    ],
    commonMistakes: [
      'Letting hips rise too high.',
      'Bouncing hips up and down.',
      'Not bringing knees far enough forward.',
      'Holding breath.'
    ],
    musclesWorked: {
      primary: ['Core', 'Hip flexors'],
      secondary: ['Shoulders', 'Quadriceps', 'Glutes']
    },
    recommendations: {
      strength: { sets: '3', reps: '20 sec' },
      hypertrophy: { sets: '4', reps: '30 sec' },
      endurance: { sets: '3', reps: '45-60 sec' }
    },
    usedInRoutines: ['HIIT Cardio Blast', 'Core & Mobility']
  },
  {
    id: 'ex15',
    name: 'Dumbbell Lateral Raise',
    equipment: 'dumbbells',
    bodyPart: 'shoulders',
    level: 'beginner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=200&q=80',
    howToPerform: [
      'Stand with dumbbells at your sides, palms facing in.',
      'Keep a slight bend in your elbows.',
      'Raise arms out to the sides until shoulder height.',
      'Lead with your elbows, not your hands.',
      'Hold briefly at the top.',
      'Lower with control back to your sides.'
    ],
    coachingCues: [
      'Do not shrug and keep shoulders down.',
      'Lead with your elbows.',
      'Control the weight on the way down.',
      'Stop at shoulder height and no higher.',
      'Keep core tight for stability.'
    ],
    commonMistakes: [
      'Using momentum to swing weights up.',
      'Shrugging shoulders.',
      'Raising arms above shoulder height.',
      'Going too heavy and losing form.'
    ],
    musclesWorked: {
      primary: ['Lateral deltoids'],
      secondary: ['Anterior deltoids', 'Trapezius']
    },
    recommendations: {
      strength: { sets: '4', reps: '8-10' },
      hypertrophy: { sets: '3-4', reps: '12-15' },
      endurance: { sets: '2-3', reps: '18-20' }
    },
    usedInRoutines: ['Upper Body Strength', 'Full Body Power']
  }
];

// Equipment labels for UI display
export const equipmentLabels: Record<string, string> = {
  bodyweight: 'Bodyweight',
  dumbbells: 'Dumbbells',
  barbell: 'Barbell',
  machines: 'Machines',
  bands: 'Bands',
  kettlebells: 'Kettlebells'
};

// Body part labels
export const bodyPartLabels: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  fullbody: 'Full Body'
};

// Level labels
export const levelLabels: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced'
};

// Find exercise by name (for linking workout exercises to library)
export function findExerciseByName(name: string): LibraryExercise | undefined {
  const normalizedName = name.toLowerCase();
  return exerciseLibrary.find(ex => 
    ex.name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(ex.name.toLowerCase())
  );
}
