export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          description: string
          icon: string
          id: string
          title: string
        }
        Insert: {
          description: string
          icon: string
          id: string
          title: string
        }
        Update: {
          description?: string
          icon?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      challenge_participations: {
        Row: {
          created_at: string
          habits: Json
          id: string
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          habits?: Json
          id?: string
          start_date?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          habits?: Json
          id?: string
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_hydration_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          updated_at: string
          user_id: string
          water_ml: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id: string
          water_ml?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
          water_ml?: number
        }
        Relationships: []
      }
      daily_nutrition_logs: {
        Row: {
          adherence: number | null
          calories: number | null
          carbs: number | null
          created_at: string
          date: string
          fats: number | null
          id: string
          protein: number | null
          user_id: string
        }
        Insert: {
          adherence?: number | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          date?: string
          fats?: number | null
          id?: string
          protein?: number | null
          user_id: string
        }
        Update: {
          adherence?: number | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          date?: string
          fats?: number | null
          id?: string
          protein?: number | null
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category: string | null
          common_mistakes: string[] | null
          created_at: string
          created_by: string | null
          difficulty: string | null
          equipment: string | null
          how_to_steps: string[] | null
          id: string
          muscle_group: string
          name: string
          primary_muscles: string[] | null
          recommended_sets_reps: Json | null
          secondary_muscles: string[] | null
          slug: string
          technique_cues: string[] | null
          thumbnail_url: string | null
          video_orientation: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          common_mistakes?: string[] | null
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          equipment?: string | null
          how_to_steps?: string[] | null
          id?: string
          muscle_group?: string
          name: string
          primary_muscles?: string[] | null
          recommended_sets_reps?: Json | null
          secondary_muscles?: string[] | null
          slug: string
          technique_cues?: string[] | null
          thumbnail_url?: string | null
          video_orientation?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          common_mistakes?: string[] | null
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          equipment?: string | null
          how_to_steps?: string[] | null
          id?: string
          muscle_group?: string
          name?: string
          primary_muscles?: string[] | null
          recommended_sets_reps?: Json | null
          secondary_muscles?: string[] | null
          slug?: string
          technique_cues?: string[] | null
          thumbnail_url?: string | null
          video_orientation?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed: boolean | null
          created_at: string
          date: string
          habit_index: number
          id: string
          participation_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          date: string
          habit_index: number
          id?: string
          participation_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          date?: string
          habit_index?: number
          id?: string
          participation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "challenge_participations"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          created_at: string
          created_by_ai: boolean | null
          id: string
          is_active: boolean | null
          notes: string | null
          source: string | null
          target_calories: number
          target_carbs: number | null
          target_fats: number | null
          target_protein: number
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by_ai?: boolean | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source?: string | null
          target_calories?: number
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number
          user_id: string
        }
        Update: {
          created_at?: string
          created_by_ai?: boolean | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source?: string | null
          target_calories?: number
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number
          user_id?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          pr_type: string
          recorded_at: string
          unit: string | null
          user_id: string
          value_distance_m: number | null
          value_duration_sec: number | null
          value_reps: number | null
          value_weight: number | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          pr_type: string
          recorded_at?: string
          unit?: string | null
          user_id: string
          value_distance_m?: number | null
          value_duration_sec?: number | null
          value_reps?: number | null
          value_weight?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          pr_type?: string
          recorded_at?: string
          unit?: string | null
          user_id?: string
          value_distance_m?: number | null
          value_duration_sec?: number | null
          value_reps?: number | null
          value_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          available_equipment: string[] | null
          birth_date: string | null
          created_at: string
          daily_calorie_goal: number | null
          daily_carbs_goal: number | null
          daily_fat_goal: number | null
          daily_protein_goal: number | null
          daily_water_goal: number | null
          diet_preferences: string[] | null
          exercise_avoidances: string[] | null
          exercise_preferences: string[] | null
          food_avoidances: string[] | null
          goal: string | null
          height: number | null
          id: string
          injury_notes: string | null
          name: string
          onboarding_completed: boolean
          points: number
          restrictions_notes: string | null
          training_days_per_week: number | null
          training_environment: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          available_equipment?: string[] | null
          birth_date?: string | null
          created_at?: string
          daily_calorie_goal?: number | null
          daily_carbs_goal?: number | null
          daily_fat_goal?: number | null
          daily_protein_goal?: number | null
          daily_water_goal?: number | null
          diet_preferences?: string[] | null
          exercise_avoidances?: string[] | null
          exercise_preferences?: string[] | null
          food_avoidances?: string[] | null
          goal?: string | null
          height?: number | null
          id: string
          injury_notes?: string | null
          name?: string
          onboarding_completed?: boolean
          points?: number
          restrictions_notes?: string | null
          training_days_per_week?: number | null
          training_environment?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          available_equipment?: string[] | null
          birth_date?: string | null
          created_at?: string
          daily_calorie_goal?: number | null
          daily_carbs_goal?: number | null
          daily_fat_goal?: number | null
          daily_protein_goal?: number | null
          daily_water_goal?: number | null
          diet_preferences?: string[] | null
          exercise_avoidances?: string[] | null
          exercise_preferences?: string[] | null
          food_avoidances?: string[] | null
          goal?: string | null
          height?: number | null
          id?: string
          injury_notes?: string | null
          name?: string
          onboarding_completed?: boolean
          points?: number
          restrictions_notes?: string | null
          training_days_per_week?: number | null
          training_environment?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          category_id: string
          completed_at: string
          correct_count: number
          created_at: string
          id: string
          points_earned: number
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          category_id: string
          completed_at?: string
          correct_count?: number
          created_at?: string
          id?: string
          points_earned?: number
          score?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          category_id?: string
          completed_at?: string
          correct_count?: number
          created_at?: string
          id?: string
          points_earned?: number
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "quiz_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          category_id: string
          correct_answer: number
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          is_active: boolean | null
          options: Json
          points_reward: number | null
          question: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          correct_answer: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json
          points_reward?: number | null
          question: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          correct_answer?: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json
          points_reward?: number | null
          question?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "quiz_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      template_exercises: {
        Row: {
          duration: number | null
          exercise_id: string | null
          id: string
          name: string
          notes: string | null
          reps: number | null
          rest_time: number | null
          sets: number | null
          sort_order: number | null
          template_id: string
        }
        Insert: {
          duration?: number | null
          exercise_id?: string | null
          id?: string
          name: string
          notes?: string | null
          reps?: number | null
          rest_time?: number | null
          sets?: number | null
          sort_order?: number | null
          template_id: string
        }
        Update: {
          duration?: number | null
          exercise_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          reps?: number | null
          rest_time?: number | null
          sets?: number | null
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          calories_burned: number | null
          completed: boolean | null
          completed_exercises: Json
          created_at: string
          date: string
          duration: number | null
          ended_at: string | null
          id: string
          started_at: string | null
          status: string
          total_exercises: number
          user_id: string
          workout_id: string | null
          workout_title: string
        }
        Insert: {
          calories_burned?: number | null
          completed?: boolean | null
          completed_exercises?: Json
          created_at?: string
          date?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          total_exercises?: number
          user_id: string
          workout_id?: string | null
          workout_title?: string
        }
        Update: {
          calories_burned?: number | null
          completed?: boolean | null
          completed_exercises?: Json
          created_at?: string
          date?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          total_exercises?: number
          user_id?: string
          workout_id?: string | null
          workout_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          calories: number
          created_at: string
          created_by: string | null
          created_by_ai: boolean | null
          description: string | null
          difficulty: string
          duration: number
          id: string
          image_url: string | null
          is_premium: boolean | null
          is_public: boolean | null
          source: string | null
          tags: string[] | null
          target_muscles: string[] | null
          title: string
          type: string
        }
        Insert: {
          calories?: number
          created_at?: string
          created_by?: string | null
          created_by_ai?: boolean | null
          description?: string | null
          difficulty?: string
          duration?: number
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          is_public?: boolean | null
          source?: string | null
          tags?: string[] | null
          target_muscles?: string[] | null
          title: string
          type?: string
        }
        Update: {
          calories?: number
          created_at?: string
          created_by?: string | null
          created_by_ai?: boolean | null
          description?: string | null
          difficulty?: string
          duration?: number
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          is_public?: boolean | null
          source?: string | null
          tags?: string[] | null
          target_muscles?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
