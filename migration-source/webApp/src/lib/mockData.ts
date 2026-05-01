import { User, Workout, HabitChallenge, NutritionEntry, ActivityLog, WorkoutSession, Coach, ChatMessage, CoachPlan, Specialist, SpecialistChatMessage, NutritionPlan, DailyNutritionLog } from './types';

export const mockUser: User = {
  id: '1',
  name: 'Carlos',
  email: 'carlos@email.com',
  birthDate: '1995-03-15',
  weight: 75,
  height: 178,
  goal: 'gain_muscle',
  trainingDaysPerWeek: 5,
  dailyCalorieGoal: 2400,
  dailyProteinGoal: 150,
  dailyCarbsGoal: 300,
  dailyFatGoal: 80,
  dailyWaterGoal: 14,
};

export const mockWorkouts: Workout[] = [
  {
    id: '1',
    title: 'Full Body Power',
    type: 'fullbody',
    duration: 45,
    difficulty: 'intermediate',
    calories: 450,
    targetMuscles: ['chest', 'back', 'legs', 'shoulders'],
    isPremium: false,
    exercises: [
      { id: 'e1', name: 'Sentadillas', sets: 4, reps: 12, restTime: 60 },
      { id: 'e2', name: 'Press de banca', sets: 4, reps: 10, restTime: 90 },
      { id: 'e3', name: 'Remo con barra', sets: 3, reps: 12, restTime: 60 },
      { id: 'e4', name: 'Press militar', sets: 3, reps: 10, restTime: 60 },
      { id: 'e5', name: 'Peso muerto rumano', sets: 3, reps: 12, restTime: 90 },
    ],
  },
  {
    id: '2',
    title: 'HIIT Cardio Blast',
    type: 'hiit',
    duration: 25,
    difficulty: 'advanced',
    calories: 350,
    targetMuscles: ['core', 'legs'],
    isPremium: true,
    exercises: [
      { id: 'e6', name: 'Burpees', sets: 4, duration: 30, restTime: 15 },
      { id: 'e7', name: 'Mountain climbers', sets: 4, duration: 30, restTime: 15 },
      { id: 'e8', name: 'Jump squats', sets: 4, duration: 30, restTime: 15 },
      { id: 'e9', name: 'High knees', sets: 4, duration: 30, restTime: 15 },
    ],
  },
  {
    id: '3',
    title: 'Upper Body Strength',
    type: 'strength',
    duration: 50,
    difficulty: 'intermediate',
    calories: 380,
    targetMuscles: ['chest', 'back', 'arms', 'shoulders'],
    isPremium: false,
    exercises: [
      { id: 'e10', name: 'Pull-ups', sets: 4, reps: 8, restTime: 90 },
      { id: 'e11', name: 'Bench press', sets: 4, reps: 8, restTime: 90 },
      { id: 'e12', name: 'Dumbbell rows', sets: 3, reps: 12, restTime: 60 },
      { id: 'e13', name: 'Tricep dips', sets: 3, reps: 12, restTime: 60 },
    ],
  },
  {
    id: '4',
    title: 'Core & Mobility',
    type: 'mobility',
    duration: 30,
    difficulty: 'beginner',
    calories: 180,
    targetMuscles: ['core', 'hips', 'back'],
    isPremium: false,
    exercises: [
      { id: 'e14', name: 'Plancha', duration: 60, restTime: 30 },
      { id: 'e15', name: 'Dead bug', sets: 3, reps: 10, restTime: 30 },
      { id: 'e16', name: 'Hip circles', sets: 2, reps: 15, restTime: 20 },
    ],
  },
  {
    id: '5',
    title: 'Leg Day Extreme',
    type: 'strength',
    duration: 55,
    difficulty: 'advanced',
    calories: 520,
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    isPremium: true,
    exercises: [
      { id: 'e17', name: 'Back squats', sets: 5, reps: 5, restTime: 120 },
      { id: 'e18', name: 'Romanian deadlift', sets: 4, reps: 8, restTime: 90 },
      { id: 'e19', name: 'Walking lunges', sets: 3, reps: 12, restTime: 60 },
      { id: 'e20', name: 'Calf raises', sets: 4, reps: 15, restTime: 45 },
    ],
  },
];

export const mockChallenge: HabitChallenge | null = {
  id: 'ch1',
  userId: '1',
  status: 'active',
  startDate: '2026-01-28',
  habits: [
    { id: 'h1', challengeId: 'ch1', category: 'training', name: '30 min entreno' },
    { id: 'h2', challengeId: 'ch1', category: 'health', name: '2L de agua' },
    { id: 'h3', challengeId: 'ch1', category: 'mind', name: '10 min lectura' },
  ],
};

export const mockHabitLogs: Record<string, boolean[]> = {
  '2026-01-28': [true, true, true],
  '2026-01-29': [true, true, true],
  '2026-01-30': [true, false, true],
  '2026-01-31': [true, true, true],
  '2026-02-01': [true, true, false],
  '2026-02-02': [true, true, true],
  '2026-02-03': [false, true, true],
};

export const mockNutritionToday = {
  calories: 1250,
  protein: 80,
  carbs: 160,
  fat: 40,
};

// Nutrition plan (ELLIE-managed targets)
export const mockNutritionPlan: NutritionPlan | null = {
  id: 'np1',
  userId: '1',
  targetCalories: 2300,
  targetProtein: 140,
  targetCarbs: 280,
  targetFats: 70,
  notes: 'Focus on lean protein sources, avoid processed sugar.',
};

// Daily nutrition log for today (set calories/protein to 0 or null to test State C)
const todayDate = new Date().toISOString().split('T')[0];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export const mockDailyNutritionLogs: DailyNutritionLog[] = [
  { id: 'dnl1', userId: '1', date: todayDate, calories: 1250, protein: 80, carbs: 160, fats: 40, adherence: undefined },
  { id: 'dnl2', userId: '1', date: daysAgo(1), calories: 2100, protein: 130, carbs: 250, fats: 65, adherence: 91 },
  { id: 'dnl3', userId: '1', date: daysAgo(2), calories: 1850, protein: 110, carbs: 220, fats: 55, adherence: 80 },
  { id: 'dnl4', userId: '1', date: daysAgo(3), calories: 2250, protein: 140, carbs: 270, fats: 68, adherence: 98 },
  { id: 'dnl5', userId: '1', date: daysAgo(4), calories: 1600, protein: 95, carbs: 190, fats: 48, adherence: 70 },
  { id: 'dnl6', userId: '1', date: daysAgo(5), calories: 2350, protein: 145, carbs: 285, fats: 72, adherence: 100 },
  { id: 'dnl7', userId: '1', date: daysAgo(6), calories: 1950, protein: 120, carbs: 235, fats: 60, adherence: 85 },
];

export const mockWeeklyProgress = {
  workouts: { completed: 3, goal: 5 },
  nutrition: { percentage: 24 },
  water: { completed: 9, goal: 14 },
  streak: 4,
  bestDay: { day: 'Mié', percentage: 80 },
  vsLastWeek: 12,
};

export const mockActivityLogs: ActivityLog[] = [
  {
    id: 'a1',
    userId: '1',
    type: 'workout',
    title: 'Entreno completado',
    description: '45 min · 550 kcal',
    date: '2026-02-04T08:30:00',
  },
  {
    id: 'a2',
    userId: '1',
    type: 'challenge',
    title: 'Reto diario',
    description: 'Día 7/33 completado',
    date: '2026-02-03T22:00:00',
  },
  {
    id: 'a3',
    userId: '1',
    type: 'nutrition',
    title: 'Comida registrada',
    description: '650 kcal',
    date: '2026-02-03T13:00:00',
  },
  {
    id: 'a4',
    userId: '1',
    type: 'workout',
    title: 'Entreno completado',
    description: '30 min · 320 kcal',
    date: '2026-02-02T09:00:00',
  },
];

export const mockWorkoutSessions: WorkoutSession[] = [
  { id: 's1', workoutId: '1', userId: '1', date: daysAgo(0), completed: true, duration: 45, caloriesBurned: 450 },
  { id: 's2', workoutId: '3', userId: '1', date: daysAgo(1), completed: true, duration: 50, caloriesBurned: 380 },
  { id: 's3', workoutId: '4', userId: '1', date: daysAgo(2), completed: true, duration: 30, caloriesBurned: 180 },
  { id: 's4', workoutId: '2', userId: '1', date: daysAgo(3), completed: true, duration: 25, caloriesBurned: 320 },
  { id: 's5', workoutId: '1', userId: '1', date: daysAgo(4), completed: true, duration: 55, caloriesBurned: 500 },
  { id: 's6', workoutId: '5', userId: '1', date: daysAgo(6), completed: true, duration: 40, caloriesBurned: 350 },
];

export const habitOptions = {
  training: [
    '30 min caminata',
    '20 min entreno',
    '50 flexiones',
    '10 min movilidad',
  ],
  health: [
    '2L de agua',
    'Dormir 7 horas',
    'Menos azúcar',
    'Tomar vitaminas',
  ],
  mind: [
    '10 min lectura',
    '5 min journaling',
    '10 min meditación',
  ],
};

// Coach data
export const mockCoaches: Coach[] = [
  {
    id: 'c1',
    name: 'Laura Martínez',
    avatar: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200&h=200&fit=crop&crop=face',
    specialty: 'Strength & Fat Loss',
    rating: 4.9,
    reviewCount: 127,
    yearsExperience: 8,
    tags: ['Online', 'Hybrid'],
    bio: 'Certified personal trainer specializing in body recomposition. I help busy professionals transform their bodies with sustainable habits.',
    whatYouGet: [
      'Custom workout plan tailored to your goals',
      'Personalized nutrition guidance',
      'Supplement recommendations',
      'Weekly video check-ins',
    ],
    sampleWorkoutPlan: [
      { day: 'Monday', workout: 'Upper Body Push', focus: 'Chest, Shoulders, Triceps' },
      { day: 'Tuesday', workout: 'Lower Body', focus: 'Quads, Hamstrings, Glutes' },
      { day: 'Wednesday', workout: 'Rest / Light Cardio', focus: '20 min walk' },
      { day: 'Thursday', workout: 'Upper Body Pull', focus: 'Back, Biceps, Rear Delts' },
      { day: 'Friday', workout: 'Full Body HIIT', focus: 'Conditioning' },
    ],
    sampleMealPlan: {
      breakfast: 'Oatmeal with protein powder, berries & almond butter',
      lunch: 'Grilled chicken salad with quinoa and avocado',
      dinner: 'Salmon with roasted vegetables and sweet potato',
      snacks: 'Greek yogurt, mixed nuts, protein shake',
    },
  },
  {
    id: 'c2',
    name: 'Miguel Torres',
    avatar: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200&h=200&fit=crop&crop=face',
    specialty: 'Muscle Building',
    rating: 4.8,
    reviewCount: 89,
    yearsExperience: 6,
    tags: ['Online'],
    bio: 'Former competitive bodybuilder now dedicated to helping others build lean muscle mass naturally.',
    whatYouGet: [
      'Progressive overload training programs',
      'Bulk/cut meal plans',
      'Form check video reviews',
      'Bi-weekly progress assessments',
    ],
    sampleWorkoutPlan: [
      { day: 'Monday', workout: 'Chest & Triceps', focus: 'Hypertrophy' },
      { day: 'Tuesday', workout: 'Back & Biceps', focus: 'Strength' },
      { day: 'Wednesday', workout: 'Legs', focus: 'Power & Size' },
      { day: 'Thursday', workout: 'Shoulders & Arms', focus: 'Volume' },
      { day: 'Friday', workout: 'Full Body', focus: 'Functional' },
    ],
    sampleMealPlan: {
      breakfast: 'Egg whites with whole eggs, toast & banana',
      lunch: 'Rice, chicken breast, and steamed broccoli',
      dinner: 'Lean beef stir-fry with vegetables and noodles',
      snacks: 'Cottage cheese, rice cakes, protein bars',
    },
  },
  {
    id: 'c3',
    name: 'Ana García',
    avatar: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop&crop=face',
    specialty: 'Performance & Endurance',
    rating: 4.7,
    reviewCount: 64,
    yearsExperience: 10,
    tags: ['Hybrid', 'In-person'],
    bio: 'Triathlon coach and sports nutritionist. I prepare athletes for competitions and peak performance.',
    whatYouGet: [
      'Periodized training plans',
      'Race day nutrition strategies',
      'Recovery protocols',
      'Monthly in-person sessions (local)',
    ],
    sampleWorkoutPlan: [
      { day: 'Monday', workout: 'Swim intervals', focus: '1500m technique' },
      { day: 'Tuesday', workout: 'Bike tempo', focus: '45 min steady' },
      { day: 'Wednesday', workout: 'Run easy', focus: '30 min Zone 2' },
      { day: 'Thursday', workout: 'Brick workout', focus: 'Bike + Run' },
      { day: 'Friday', workout: 'Strength', focus: 'Core & stability' },
    ],
    sampleMealPlan: {
      breakfast: 'Smoothie bowl with granola and fresh fruit',
      lunch: 'Whole grain pasta with lean meat sauce',
      dinner: 'Grilled fish with brown rice and greens',
      snacks: 'Energy gels, electrolyte drinks, trail mix',
    },
  },
  {
    id: 'c4',
    name: 'David Ruiz',
    avatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop&crop=face',
    specialty: 'Functional Fitness',
    rating: 4.6,
    reviewCount: 52,
    yearsExperience: 5,
    tags: ['Online', 'Hybrid'],
    bio: 'CrossFit L2 trainer focused on making you move better in everyday life and sport.',
    whatYouGet: [
      'Mobility-focused warm-ups',
      'Scalable WODs for any level',
      'Nutrition for performance',
      'Weekly accountability calls',
    ],
    sampleWorkoutPlan: [
      { day: 'Monday', workout: 'EMOM strength', focus: 'Olympic lifts' },
      { day: 'Tuesday', workout: 'MetCon', focus: '20 min AMRAP' },
      { day: 'Wednesday', workout: 'Skills', focus: 'Gymnastics' },
      { day: 'Thursday', workout: 'Hero WOD', focus: 'Endurance' },
      { day: 'Friday', workout: 'Partner workout', focus: 'Team challenge' },
    ],
    sampleMealPlan: {
      breakfast: 'Eggs, bacon, and avocado toast',
      lunch: 'Bowl with rice, ground turkey, and veggies',
      dinner: 'Steak with roasted potatoes and salad',
      snacks: 'RX bars, fruit, hard boiled eggs',
    },
  },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'm1',
    senderId: 'coach',
    type: 'text',
    content: '¡Hola Carlos! Bienvenido al equipo. Estoy emocionada de empezar a trabajar contigo. 💪',
    timestamp: '2026-02-04T09:00:00',
  },
  {
    id: 'm2',
    senderId: 'coach',
    type: 'text',
    content: 'He revisado tus objetivos y he preparado tu primer plan. ¿Estás listo para empezar?',
    timestamp: '2026-02-04T09:01:00',
  },
  {
    id: 'm3',
    senderId: 'user',
    type: 'text',
    content: '¡Sí, estoy muy motivado! ¿Qué entreno tengo hoy?',
    timestamp: '2026-02-04T09:05:00',
  },
  {
    id: 'm4',
    senderId: 'coach',
    type: 'workout',
    content: 'Aquí tienes el entreno de hoy:',
    timestamp: '2026-02-04T09:06:00',
    workoutData: {
      name: 'Upper Body Push',
      duration: 45,
    },
  },
  {
    id: 'm5',
    senderId: 'coach',
    type: 'text',
    content: 'Y no olvides tu nutrición. Te recomiendo esto para el almuerzo:',
    timestamp: '2026-02-04T09:07:00',
  },
  {
    id: 'm6',
    senderId: 'coach',
    type: 'meal',
    content: 'Sugerencia de comida:',
    timestamp: '2026-02-04T09:08:00',
    mealData: {
      name: 'Chicken & Quinoa Bowl',
      macros: '45g protein · 55g carbs · 15g fat',
    },
  },
  {
    id: 'm7',
    senderId: 'coach',
    type: 'nutrition_plan',
    content: 'He preparado tu plan de nutrición personalizado. Revísalo y acéptalo para activarlo:',
    timestamp: '2026-02-04T09:09:00',
    nutritionPlanData: {
      targetCalories: 2300,
      targetProtein: 140,
      targetCarbs: 280,
      targetFats: 70,
      notes: 'Enfócate en proteínas magras, evita azúcar procesada.',
    },
    nutritionPlanAccepted: false,
  },
  {
    id: 'm8',
    senderId: 'user',
    type: 'text',
    content: 'Perfecto, ¡voy a empezar ahora mismo!',
    timestamp: '2026-02-04T09:10:00',
  },
];

export const mockCoachPlan: CoachPlan = {
  workouts: [
    { id: 'w1', name: 'Push Day - Upper Body', daysPerWeek: 2, isActive: true },
    { id: 'w2', name: 'Pull Day - Back Focus', daysPerWeek: 2, isActive: true },
    { id: 'w3', name: 'Leg Day - Strength', daysPerWeek: 1, isActive: true },
  ],
  nutrition: {
    dailyCalories: 2400,
    protein: 180,
    carbs: 250,
    fats: 70,
  },
  supplements: [
    { id: 's1', name: 'Creatine Monohydrate', dose: '5g', timing: 'Post-workout' },
    { id: 's2', name: 'Whey Protein', dose: '30g', timing: 'Post-workout' },
    { id: 's3', name: 'Omega-3 Fish Oil', dose: '2g', timing: 'With breakfast' },
    { id: 's4', name: 'Vitamin D3', dose: '2000 IU', timing: 'Morning' },
  ],
};

// Specialist data
export const mockSpecialists: Specialist[] = [
  {
    id: 'sp1',
    name: 'Dr. Laura Martínez',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face',
    role: 'Physiotherapist',
    specialties: ['Low back pain', 'Shoulder injuries'],
    rating: 4.9,
    reviewCount: 203,
    yearsExperience: 12,
    tags: ['Online', 'Hybrid'],
    location: 'Santiago · Remote',
    bio: 'Specialized in sports physiotherapy with over a decade of experience helping athletes recover and prevent injuries.',
    helpsWith: [
      'Low back pain and sciatica',
      'Shoulder impingement and rotator cuff issues',
      'Knee pain from running or squats',
      'Post-injury return to training',
    ],
    sessionFormat: {
      duration: '30–45 minutes',
      mode: 'Online video call or in-person',
      description: 'Each session starts with a functional assessment, followed by targeted exercises and a take-home plan to support your recovery between sessions.',
    },
    areasOfFocus: ['Spine', 'Shoulder', 'Knee', 'Sports injuries'],
  },
  {
    id: 'sp2',
    name: 'Dr. Tomás Reyes',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face',
    role: 'Kinesiologist',
    specialties: ['Movement assessment', 'Injury prevention'],
    rating: 4.8,
    reviewCount: 145,
    yearsExperience: 9,
    tags: ['Online'],
    location: 'Buenos Aires · Remote',
    bio: 'I help athletes move better, lift heavier, and stay injury-free through biomechanical assessment and corrective exercise programming.',
    helpsWith: [
      'Hip mobility restrictions',
      'Postural imbalances',
      'Overuse injuries from training',
      'Functional movement screening',
    ],
    sessionFormat: {
      duration: '40 minutes',
      mode: 'Remote via video call',
      description: 'We start with a movement screen, identify compensation patterns, and build a corrective program tailored to your training goals.',
    },
    areasOfFocus: ['Hip', 'Ankle', 'Posture', 'Movement patterns'],
  },
  {
    id: 'sp3',
    name: 'Dr. Camila Vega',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=200&h=200&fit=crop&crop=face',
    role: 'Chiropractor',
    specialties: ['Spinal adjustments', 'Neck pain'],
    rating: 4.7,
    reviewCount: 98,
    yearsExperience: 7,
    tags: ['In-person', 'Hybrid'],
    location: 'Madrid · In-person',
    bio: 'Sports chiropractor focused on spinal health and nervous system optimization for peak athletic performance.',
    helpsWith: [
      'Chronic neck pain and tension',
      'Thoracic mobility for overhead athletes',
      'Disc-related issues',
      'Headaches and migraine management',
    ],
    sessionFormat: {
      duration: '30 minutes',
      mode: 'In-person (Madrid) or hybrid follow-ups',
      description: 'Initial assessment includes postural analysis and spinal screening. Follow-up sessions combine adjustments with rehabilitative exercises.',
    },
    areasOfFocus: ['Spine', 'Neck', 'Thoracic', 'Nervous system'],
  },
  {
    id: 'sp4',
    name: 'Dr. Andrés Molina',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face',
    role: 'Physiotherapist',
    specialties: ['Knee rehab', 'ACL recovery'],
    rating: 4.9,
    reviewCount: 176,
    yearsExperience: 15,
    tags: ['Online', 'In-person'],
    location: 'Lima · Remote',
    bio: 'Former team physio for professional football. I specialize in lower limb rehabilitation and return-to-sport protocols.',
    helpsWith: [
      'ACL and meniscus rehab',
      'Ankle sprains and instability',
      'Patellofemoral pain syndrome',
      'Return-to-sport testing',
    ],
    sessionFormat: {
      duration: '45 minutes',
      mode: 'Online or in-person (Lima)',
      description: 'Structured rehab programs with clear milestones, regular testing, and progressive loading to get you back to training safely.',
    },
    areasOfFocus: ['Knee', 'Ankle', 'Lower limb', 'Return to sport'],
  },
];

export const mockSpecialistChatMessages: SpecialistChatMessage[] = [
  {
    id: 'sm1',
    senderId: 'user',
    type: 'text',
    content: 'I feel sharp pain in my lower back after squats.',
    timestamp: '2026-02-04T10:00:00',
  },
  {
    id: 'sm2',
    senderId: 'specialist',
    type: 'text',
    content: "Let's reduce loading for now and work on hip mobility. Can you describe when the pain appears? During descent or ascent?",
    timestamp: '2026-02-04T10:02:00',
  },
  {
    id: 'sm3',
    senderId: 'user',
    type: 'text',
    content: 'Mostly during the ascent, especially when I get past parallel.',
    timestamp: '2026-02-04T10:05:00',
  },
  {
    id: 'sm4',
    senderId: 'specialist',
    type: 'questions',
    content: 'Before our next session, please answer these:',
    timestamp: '2026-02-04T10:06:00',
    questionsData: [
      'Rate your pain from 1 to 10 today',
      'Does the pain radiate down your leg?',
      'Any numbness or tingling?',
      'How many hours do you sit per day?',
    ],
  },
  {
    id: 'sm5',
    senderId: 'specialist',
    type: 'warmup',
    content: 'Try this warm-up before your next training session:',
    timestamp: '2026-02-04T10:08:00',
    warmupData: {
      name: 'Low Back Prep Routine',
      movements: [
        'Cat-Cow x 10 reps',
        '90/90 Hip Switch x 8 each side',
        'Dead Bug x 10 reps',
        'Goblet Squat Hold x 30s',
      ],
    },
  },
];
