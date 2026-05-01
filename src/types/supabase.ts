export type Json =
  | string
  | number
  | boolean
  | null
  | {[key: string]: Json | undefined}
  | Json[];

export type Database = {
  public: {
    Tables: {
      challenge_participations: {
        Row: {
          created_at: string;
          habits: Json;
          id: string;
          start_date: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          habits?: Json;
          id?: string;
          start_date?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          habits?: Json;
          id?: string;
          start_date?: string;
          status?: string;
          user_id?: string;
        };
      };
      daily_hydration_logs: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          updated_at: string;
          user_id: string;
          water_ml: number;
        };
        Insert: {
          created_at?: string;
          date?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
          water_ml?: number;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
          water_ml?: number;
        };
      };
      daily_nutrition_logs: {
        Row: {
          adherence: number | null;
          calories: number | null;
          carbs: number | null;
          created_at: string;
          date: string;
          fats: number | null;
          id: string;
          protein: number | null;
          user_id: string;
        };
        Insert: {
          adherence?: number | null;
          calories?: number | null;
          carbs?: number | null;
          created_at?: string;
          date?: string;
          fats?: number | null;
          id?: string;
          protein?: number | null;
          user_id: string;
        };
        Update: {
          adherence?: number | null;
          calories?: number | null;
          carbs?: number | null;
          created_at?: string;
          date?: string;
          fats?: number | null;
          id?: string;
          protein?: number | null;
          user_id?: string;
        };
      };
      exercises: {
        Row: {
          category: string | null;
          common_mistakes: string[] | null;
          created_at: string;
          created_by: string | null;
          difficulty: string | null;
          equipment: string | null;
          how_to_steps: string[] | null;
          id: string;
          muscle_group: string;
          name: string;
          primary_muscles: string[] | null;
          recommended_sets_reps: Json | null;
          secondary_muscles: string[] | null;
          slug: string;
          technique_cues: string[] | null;
          thumbnail_url: string | null;
          video_orientation: string | null;
          video_url: string | null;
        };
        Insert: {
          category?: string | null;
          common_mistakes?: string[] | null;
          created_at?: string;
          created_by?: string | null;
          difficulty?: string | null;
          equipment?: string | null;
          how_to_steps?: string[] | null;
          id?: string;
          muscle_group?: string;
          name: string;
          primary_muscles?: string[] | null;
          recommended_sets_reps?: Json | null;
          secondary_muscles?: string[] | null;
          slug: string;
          technique_cues?: string[] | null;
          thumbnail_url?: string | null;
          video_orientation?: string | null;
          video_url?: string | null;
        };
        Update: {
          category?: string | null;
          common_mistakes?: string[] | null;
          created_at?: string;
          created_by?: string | null;
          difficulty?: string | null;
          equipment?: string | null;
          how_to_steps?: string[] | null;
          id?: string;
          muscle_group?: string;
          name?: string;
          primary_muscles?: string[] | null;
          recommended_sets_reps?: Json | null;
          secondary_muscles?: string[] | null;
          slug?: string;
          technique_cues?: string[] | null;
          thumbnail_url?: string | null;
          video_orientation?: string | null;
          video_url?: string | null;
        };
      };
      habit_logs: {
        Row: {
          completed: boolean | null;
          created_at: string;
          date: string;
          habit_index: number;
          id: string;
          participation_id: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean | null;
          created_at?: string;
          date: string;
          habit_index: number;
          id?: string;
          participation_id: string;
          user_id: string;
        };
        Update: {
          completed?: boolean | null;
          created_at?: string;
          date?: string;
          habit_index?: number;
          id?: string;
          participation_id?: string;
          user_id?: string;
        };
      };
      nutrition_plans: {
        Row: {
          created_at: string;
          created_by_ai: boolean | null;
          id: string;
          is_active: boolean | null;
          notes: string | null;
          source: string | null;
          target_calories: number;
          target_carbs: number | null;
          target_fats: number | null;
          target_protein: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_ai?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          notes?: string | null;
          source?: string | null;
          target_calories?: number;
          target_carbs?: number | null;
          target_fats?: number | null;
          target_protein?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by_ai?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          notes?: string | null;
          source?: string | null;
          target_calories?: number;
          target_carbs?: number | null;
          target_fats?: number | null;
          target_protein?: number;
          user_id?: string;
        };
      };
      profiles: {
        Row: {
          available_equipment: string[] | null;
          id: string;
          name: string;
          goal: string | null;
          birth_date: string | null;
          weight: number | null;
          height: number | null;
          training_days_per_week: number | null;
          onboarding_completed: boolean;
          daily_calorie_goal: number | null;
          daily_protein_goal: number | null;
          daily_carbs_goal: number | null;
          daily_fat_goal: number | null;
          daily_water_goal: number | null;
          training_environment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          available_equipment?: string[] | null;
          id: string;
          name?: string;
          goal?: string | null;
          birth_date?: string | null;
          weight?: number | null;
          height?: number | null;
          training_days_per_week?: number | null;
          onboarding_completed?: boolean;
          daily_calorie_goal?: number | null;
          daily_protein_goal?: number | null;
          daily_carbs_goal?: number | null;
          daily_fat_goal?: number | null;
          daily_water_goal?: number | null;
          training_environment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          available_equipment?: string[] | null;
          id?: string;
          name?: string;
          goal?: string | null;
          birth_date?: string | null;
          weight?: number | null;
          height?: number | null;
          training_days_per_week?: number | null;
          onboarding_completed?: boolean;
          daily_calorie_goal?: number | null;
          daily_protein_goal?: number | null;
          daily_carbs_goal?: number | null;
          daily_fat_goal?: number | null;
          daily_water_goal?: number | null;
          training_environment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      template_exercises: {
        Row: {
          duration: number | null;
          exercise_id: string | null;
          id: string;
          name: string;
          notes: string | null;
          reps: number | null;
          rest_time: number | null;
          sets: number | null;
          sort_order: number | null;
          template_id: string;
        };
        Insert: {
          duration?: number | null;
          exercise_id?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          reps?: number | null;
          rest_time?: number | null;
          sets?: number | null;
          sort_order?: number | null;
          template_id: string;
        };
        Update: {
          duration?: number | null;
          exercise_id?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          reps?: number | null;
          rest_time?: number | null;
          sets?: number | null;
          sort_order?: number | null;
          template_id?: string;
        };
      };
      workout_sessions: {
        Row: {
          calories_burned: number | null;
          completed: boolean | null;
          completed_exercises: Json;
          created_at: string;
          date: string;
          duration: number | null;
          ended_at: string | null;
          id: string;
          started_at: string | null;
          status: string;
          total_exercises: number;
          user_id: string;
          workout_id: string | null;
          workout_title: string;
        };
        Insert: {
          calories_burned?: number | null;
          completed?: boolean | null;
          completed_exercises?: Json;
          created_at?: string;
          date?: string;
          duration?: number | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string | null;
          status?: string;
          total_exercises?: number;
          user_id: string;
          workout_id?: string | null;
          workout_title?: string;
        };
        Update: {
          calories_burned?: number | null;
          completed?: boolean | null;
          completed_exercises?: Json;
          created_at?: string;
          date?: string;
          duration?: number | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string | null;
          status?: string;
          total_exercises?: number;
          user_id?: string;
          workout_id?: string | null;
          workout_title?: string;
        };
      };
      workout_templates: {
        Row: {
          calories: number;
          created_at: string;
          created_by: string | null;
          created_by_ai: boolean | null;
          description: string | null;
          difficulty: string;
          duration: number;
          id: string;
          image_url: string | null;
          is_premium: boolean | null;
          is_public: boolean | null;
          source: string | null;
          tags: string[] | null;
          target_muscles: string[] | null;
          title: string;
          type: string;
        };
        Insert: {
          calories?: number;
          created_at?: string;
          created_by?: string | null;
          created_by_ai?: boolean | null;
          description?: string | null;
          difficulty?: string;
          duration?: number;
          id?: string;
          image_url?: string | null;
          is_premium?: boolean | null;
          is_public?: boolean | null;
          source?: string | null;
          tags?: string[] | null;
          target_muscles?: string[] | null;
          title: string;
          type?: string;
        };
        Update: {
          calories?: number;
          created_at?: string;
          created_by?: string | null;
          created_by_ai?: boolean | null;
          description?: string | null;
          difficulty?: string;
          duration?: number;
          id?: string;
          image_url?: string | null;
          is_premium?: boolean | null;
          is_public?: boolean | null;
          source?: string | null;
          tags?: string[] | null;
          target_muscles?: string[] | null;
          title?: string;
          type?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
