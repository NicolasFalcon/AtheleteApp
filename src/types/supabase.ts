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
      app_moderators: {
        Row: {
          created_at: string
          created_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string | null
          description: string
          icon: string
          id: string
          title: string
        }
        Insert: {
          category?: string | null
          description: string
          icon: string
          id: string
          title: string
        }
        Update: {
          category?: string | null
          description?: string
          icon?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      catalog_translation_errors: {
        Row: {
          created_at: string
          error: string
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          created_at?: string
          error: string
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          created_at?: string
          error?: string
          id?: string
          target_id?: string | null
          target_type?: string
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
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
          target_id?: string
          target_type?: string
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
      equipment: {
        Row: {
          id: string
          name_en: string
          name_es: string | null
          slug: string
        }
        Insert: {
          id?: string
          name_en: string
          name_es?: string | null
          slug: string
        }
        Update: {
          id?: string
          name_en?: string
          name_es?: string | null
          slug?: string
        }
        Relationships: []
      }
      exercise_equipment: {
        Row: {
          equipment_id: string
          exercise_id: string
        }
        Insert: {
          equipment_id: string
          exercise_id: string
        }
        Update: {
          equipment_id?: string
          exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_equipment_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_media: {
        Row: {
          checksum: string | null
          created_at: string
          duration_seconds: number | null
          exercise_id: string
          file_size_bytes: number | null
          height: number | null
          id: string
          is_primary: boolean
          kind: string
          mime_type: string | null
          object_key: string
          orientation: string | null
          provider: string | null
          sort_order: number
          storage_provider: string | null
          width: number | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_id: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean
          kind: string
          mime_type?: string | null
          object_key: string
          orientation?: string | null
          provider?: string | null
          sort_order?: number
          storage_provider?: string | null
          width?: number | null
        }
        Update: {
          checksum?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean
          kind?: string
          mime_type?: string | null
          object_key?: string
          orientation?: string | null
          provider?: string | null
          sort_order?: number
          storage_provider?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_movement_patterns: {
        Row: {
          exercise_id: string
          movement_pattern_id: string
        }
        Insert: {
          exercise_id: string
          movement_pattern_id: string
        }
        Update: {
          exercise_id?: string
          movement_pattern_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_movement_patterns_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_movement_patterns_movement_pattern_id_fkey"
            columns: ["movement_pattern_id"]
            isOneToOne: false
            referencedRelation: "movement_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_muscles: {
        Row: {
          exercise_id: string
          muscle_id: string
          role: string
          sort_order: number
        }
        Insert: {
          exercise_id: string
          muscle_id: string
          role: string
          sort_order?: number
        }
        Update: {
          exercise_id?: string
          muscle_id?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscles_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_muscles_muscle_id_fkey"
            columns: ["muscle_id"]
            isOneToOne: false
            referencedRelation: "muscles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_translations: {
        Row: {
          aliases: string[]
          benefits: string[]
          common_mistakes: string[]
          exercise_id: string
          instructions: string[]
          locale: string
          long_description: string | null
          name: string
          short_description: string | null
          tags: string[]
          use_cases: string[]
        }
        Insert: {
          aliases?: string[]
          benefits?: string[]
          common_mistakes?: string[]
          exercise_id: string
          instructions?: string[]
          locale: string
          long_description?: string | null
          name: string
          short_description?: string | null
          tags?: string[]
          use_cases?: string[]
        }
        Update: {
          aliases?: string[]
          benefits?: string[]
          common_mistakes?: string[]
          exercise_id?: string
          instructions?: string[]
          locale?: string
          long_description?: string | null
          name?: string
          short_description?: string | null
          tags?: string[]
          use_cases?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "exercise_translations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          difficulty: string | null
          id: string
          is_unilateral: boolean
          pr_eligible: boolean
          slug: string
          status: string
          tracking_metrics: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          id?: string
          is_unilateral?: boolean
          pr_eligible?: boolean
          slug: string
          status?: string
          tracking_metrics?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          id?: string
          is_unilateral?: boolean
          pr_eligible?: boolean
          slug?: string
          status?: string
          tracking_metrics?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      friend_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          inviter_id: string
          revoked_at: string | null
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          inviter_id: string
          revoked_at?: string | null
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          inviter_id?: string
          revoked_at?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          invite_id: string | null
          request_id: string | null
          user_high: string
          user_low: string
        }
        Insert: {
          created_at?: string
          invite_id?: string | null
          request_id?: string | null
          user_high: string
          user_low: string
        }
        Update: {
          created_at?: string
          invite_id?: string | null
          request_id?: string | null
          user_high?: string
          user_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "friend_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "friend_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_config: {
        Row: {
          id: boolean
          mode: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          mode?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      gamification_event_aliases: {
        Row: {
          created_at: string
          is_active: boolean
          ref_pattern: string
          ref_transform: string
          source_event_type: string
          target_event_type: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          ref_pattern: string
          ref_transform?: string
          source_event_type: string
          target_event_type: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          ref_pattern?: string
          ref_transform?: string
          source_event_type?: string
          target_event_type?: string
        }
        Relationships: []
      }
      gamification_event_types: {
        Row: {
          allowed_badges: string[]
          created_at: string
          daily_limit: number | null
          event_type: string
          is_active: boolean
          once_per: string | null
          points: number
          points_source: string
          reference_kind: string | null
          requires_reference: boolean
          server_badges: string[]
          updated_at: string
        }
        Insert: {
          allowed_badges?: string[]
          created_at?: string
          daily_limit?: number | null
          event_type: string
          is_active?: boolean
          once_per?: string | null
          points?: number
          points_source?: string
          reference_kind?: string | null
          requires_reference?: boolean
          server_badges?: string[]
          updated_at?: string
        }
        Update: {
          allowed_badges?: string[]
          created_at?: string
          daily_limit?: number | null
          event_type?: string
          is_active?: boolean
          once_per?: string | null
          points?: number
          points_source?: string
          reference_kind?: string | null
          requires_reference?: boolean
          server_badges?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      gamification_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          points?: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          points?: number
          reference_id?: string | null
          user_id?: string
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
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          note: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id: string
          note?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string
          note?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      movement_patterns: {
        Row: {
          id: string
          name_en: string
          name_es: string | null
          slug: string
        }
        Insert: {
          id?: string
          name_en: string
          name_es?: string | null
          slug: string
        }
        Update: {
          id?: string
          name_en?: string
          name_es?: string | null
          slug?: string
        }
        Relationships: []
      }
      muscles: {
        Row: {
          id: string
          name_en: string
          name_es: string | null
          slug: string
        }
        Insert: {
          id?: string
          name_en: string
          name_es?: string | null
          slug: string
        }
        Update: {
          id?: string
          name_en?: string
          name_es?: string | null
          slug?: string
        }
        Relationships: []
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
          session_set_id: string | null
          source: string
          unit: string | null
          user_id: string
          value_distance_m: number | null
          value_duration_sec: number | null
          value_reps: number | null
          value_weight: number | null
          workout_session_id: string | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          pr_type: string
          recorded_at?: string
          session_set_id?: string | null
          source?: string
          unit?: string | null
          user_id: string
          value_distance_m?: number | null
          value_duration_sec?: number | null
          value_reps?: number | null
          value_weight?: number | null
          workout_session_id?: string | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          pr_type?: string
          recorded_at?: string
          session_set_id?: string | null
          source?: string
          unit?: string | null
          user_id?: string
          value_distance_m?: number | null
          value_duration_sec?: number | null
          value_reps?: number | null
          value_weight?: number | null
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_session_set_id_fkey"
            columns: ["session_set_id"]
            isOneToOne: false
            referencedRelation: "workout_session_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_routes: {
        Row: {
          created_at: string
          distance_m: number
          elevation_gain_m: number | null
          id: string
          kind: string
          name: string
          origin: string
          points: Json
          sport: string
          surface: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_m: number
          elevation_gain_m?: number | null
          id?: string
          kind: string
          name: string
          origin?: string
          points: Json
          sport: string
          surface?: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance_m?: number
          elevation_gain_m?: number | null
          id?: string
          kind?: string
          name?: string
          origin?: string
          points?: Json
          sport?: string
          surface?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          available_equipment: string[] | null
          avatar_key: string | null
          birth_date: string | null
          core33_completed_at: string | null
          core33_intro_seen_at: string | null
          core33_invite_dismiss_count: number
          core33_invite_dismissed_at: string | null
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
          gender: string | null
          goal: string | null
          height: number | null
          id: string
          injury_notes: string | null
          language: string
          name: string
          notification_prefs: Json
          onboarding_completed: boolean
          points: number
          preferred_session_minutes: number | null
          profile_photo_url: string | null
          restrictions_notes: string | null
          training_days_per_week: number | null
          training_environment: string | null
          training_level: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          available_equipment?: string[] | null
          avatar_key?: string | null
          birth_date?: string | null
          core33_completed_at?: string | null
          core33_intro_seen_at?: string | null
          core33_invite_dismiss_count?: number
          core33_invite_dismissed_at?: string | null
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
          gender?: string | null
          goal?: string | null
          height?: number | null
          id: string
          injury_notes?: string | null
          language?: string
          name?: string
          notification_prefs?: Json
          onboarding_completed?: boolean
          points?: number
          preferred_session_minutes?: number | null
          profile_photo_url?: string | null
          restrictions_notes?: string | null
          training_days_per_week?: number | null
          training_environment?: string | null
          training_level?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          available_equipment?: string[] | null
          avatar_key?: string | null
          birth_date?: string | null
          core33_completed_at?: string | null
          core33_intro_seen_at?: string | null
          core33_invite_dismiss_count?: number
          core33_invite_dismissed_at?: string | null
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
          gender?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          injury_notes?: string | null
          language?: string
          name?: string
          notification_prefs?: Json
          onboarding_completed?: boolean
          points?: number
          preferred_session_minutes?: number | null
          profile_photo_url?: string | null
          restrictions_notes?: string | null
          training_days_per_week?: number | null
          training_environment?: string | null
          training_level?: string | null
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
      route_activities: {
        Row: {
          avg_hr: number | null
          calories: number | null
          client_id: string
          counted_as_workout: boolean
          created_at: string
          distance_m: number
          elevation_gain_m: number
          ended_at: string
          hide_endpoints: boolean
          id: string
          moving_sec: number
          pauses: Json
          planned_route_id: string | null
          points_awarded: number
          preview_track: Json
          shared_track: Json
          splits: Json
          sport: string
          started_at: string
          title: string
          track: Json
          user_id: string
          visibility: string
        }
        Insert: {
          avg_hr?: number | null
          calories?: number | null
          client_id: string
          counted_as_workout?: boolean
          created_at?: string
          distance_m: number
          elevation_gain_m?: number
          ended_at: string
          hide_endpoints?: boolean
          id?: string
          moving_sec: number
          pauses?: Json
          planned_route_id?: string | null
          points_awarded?: number
          preview_track?: Json
          shared_track?: Json
          splits?: Json
          sport: string
          started_at: string
          title: string
          track: Json
          user_id: string
          visibility: string
        }
        Update: {
          avg_hr?: number | null
          calories?: number | null
          client_id?: string
          counted_as_workout?: boolean
          created_at?: string
          distance_m?: number
          elevation_gain_m?: number
          ended_at?: string
          hide_endpoints?: boolean
          id?: string
          moving_sec?: number
          pauses?: Json
          planned_route_id?: string | null
          points_awarded?: number
          preview_track?: Json
          shared_track?: Json
          splits?: Json
          sport?: string
          started_at?: string
          title?: string
          track?: Json
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_activities_planned_route_id_fkey"
            columns: ["planned_route_id"]
            isOneToOne: false
            referencedRelation: "planned_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_generation_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          response: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          response: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          response?: Json
        }
        Relationships: []
      }
      route_generation_usage: {
        Row: {
          count: number
          day: string
          user_id: string
        }
        Insert: {
          count?: number
          day: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      route_personal_bests: {
        Row: {
          achieved_at: string
          activity_id: string | null
          best_sec: number
          distance_key: string
          source: string
          sport: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at: string
          activity_id?: string | null
          best_sec: number
          distance_key: string
          source: string
          sport: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          activity_id?: string | null
          best_sec?: number
          distance_key?: string
          source?: string
          sport?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_personal_bests_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "route_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      route_provider_usage: {
        Row: {
          count: number
          day: string
          provider: string
        }
        Insert: {
          count?: number
          day: string
          provider: string
        }
        Update: {
          count?: number
          day?: string
          provider?: string
        }
        Relationships: []
      }
      social_activity: {
        Row: {
          category: string
          created_at: string
          id: string
          kind: string
          ref_key: string
          summary: Json
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          kind: string
          ref_key: string
          summary: Json
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          kind?: string
          ref_key?: string
          summary?: Json
          user_id?: string
        }
        Relationships: []
      }
      social_challenge_contributions: {
        Row: {
          amount: number
          challenge_id: string
          created_at: string
          id: string
          occurred_at: string
          source: string
          source_key: string
          user_id: string
        }
        Insert: {
          amount: number
          challenge_id: string
          created_at?: string
          id?: string
          occurred_at?: string
          source: string
          source_key: string
          user_id: string
        }
        Update: {
          amount?: number
          challenge_id?: string
          created_at?: string
          id?: string
          occurred_at?: string
          source?: string
          source_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_challenge_contributions_challenge_id_user_id_fkey"
            columns: ["challenge_id", "user_id"]
            isOneToOne: false
            referencedRelation: "social_challenge_participants"
            referencedColumns: ["challenge_id", "user_id"]
          },
        ]
      }
      social_challenge_participants: {
        Row: {
          celebrated_at: string | null
          challenge_id: string
          completed_at: string | null
          final_rank_among_friends: number | null
          invited_by: string | null
          joined_at: string | null
          progress: number
          role: string
          status: string
          user_id: string
        }
        Insert: {
          celebrated_at?: string | null
          challenge_id: string
          completed_at?: string | null
          final_rank_among_friends?: number | null
          invited_by?: string | null
          joined_at?: string | null
          progress?: number
          role: string
          status: string
          user_id: string
        }
        Update: {
          celebrated_at?: string | null
          challenge_id?: string
          completed_at?: string | null
          final_rank_among_friends?: number | null
          invited_by?: string | null
          joined_at?: string | null
          progress?: number
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "social_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      social_challenges: {
        Row: {
          allow_manual: boolean
          badge_id: string | null
          cover_path: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          duration_days: number
          ends_at: string | null
          exercise_id: string | null
          goal: number
          id: string
          invite_expires_at: string | null
          kind: string
          metric: string
          points: number
          slug: string | null
          sport: string | null
          starts_at: string | null
          status: string
          title: string
        }
        Insert: {
          allow_manual?: boolean
          badge_id?: string | null
          cover_path?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          duration_days: number
          ends_at?: string | null
          exercise_id?: string | null
          goal: number
          id?: string
          invite_expires_at?: string | null
          kind: string
          metric: string
          points?: number
          slug?: string | null
          sport?: string | null
          starts_at?: string | null
          status?: string
          title: string
        }
        Update: {
          allow_manual?: boolean
          badge_id?: string | null
          cover_path?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          duration_days?: number
          ends_at?: string | null
          exercise_id?: string | null
          goal?: number
          id?: string
          invite_expires_at?: string | null
          kind?: string
          metric?: string
          points?: number
          slug?: string | null
          sport?: string | null
          starts_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_challenges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_challenges_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      social_notifications: {
        Row: {
          actor_id: string | null
          challenge_id: string | null
          comment_id: string | null
          created_at: string
          dedupe_key: string
          id: string
          post_id: string | null
          read_at: string | null
          recipient_id: string
          request_id: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          challenge_id?: string | null
          comment_id?: string | null
          created_at?: string
          dedupe_key: string
          id?: string
          post_id?: string | null
          read_at?: string | null
          recipient_id: string
          request_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          challenge_id?: string | null
          comment_id?: string | null
          created_at?: string
          dedupe_key?: string
          id?: string
          post_id?: string | null
          read_at?: string | null
          recipient_id?: string
          request_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_notifications_challenge_fk"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "social_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "social_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "friend_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          hidden_at: string | null
          id: string
          post_id: string
          removed_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          hidden_at?: string | null
          id?: string
          post_id: string
          removed_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          hidden_at?: string | null
          id?: string
          post_id?: string
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          attachment: Json | null
          audience: string
          author_id: string
          badge_id: string | null
          body: string | null
          challenge_id: string | null
          comment_count: number
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          hidden_at: string | null
          id: string
          like_count: number
          personal_record_id: string | null
          photo_height: number | null
          photo_path: string | null
          photo_width: number | null
          removed_at: string | null
          route_activity_id: string | null
          routine_template_id: string | null
          source_key: string
          type: string
          workout_session_id: string | null
        }
        Insert: {
          attachment?: Json | null
          audience: string
          author_id: string
          badge_id?: string | null
          body?: string | null
          challenge_id?: string | null
          comment_count?: number
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          like_count?: number
          personal_record_id?: string | null
          photo_height?: number | null
          photo_path?: string | null
          photo_width?: number | null
          removed_at?: string | null
          route_activity_id?: string | null
          routine_template_id?: string | null
          source_key: string
          type: string
          workout_session_id?: string | null
        }
        Update: {
          attachment?: Json | null
          audience?: string
          author_id?: string
          badge_id?: string | null
          body?: string | null
          challenge_id?: string | null
          comment_count?: number
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          like_count?: number
          personal_record_id?: string | null
          photo_height?: number | null
          photo_path?: string | null
          photo_width?: number | null
          removed_at?: string | null
          route_activity_id?: string | null
          routine_template_id?: string | null
          source_key?: string
          type?: string
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_challenge_fk"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "social_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_personal_record_id_fkey"
            columns: ["personal_record_id"]
            isOneToOne: false
            referencedRelation: "personal_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_route_activity_id_fkey"
            columns: ["route_activity_id"]
            isOneToOne: false
            referencedRelation: "route_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_routine_template_id_fkey"
            columns: ["routine_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      social_settings: {
        Row: {
          allow_friend_requests: boolean
          audience: string
          created_at: string
          route_auto_pause: boolean
          route_default_visibility: string
          route_hide_endpoints_default: boolean
          share_achievements: boolean
          share_body_weight: boolean
          share_photos: boolean
          share_records: boolean
          share_routines: boolean
          share_workouts: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          allow_friend_requests?: boolean
          audience?: string
          created_at?: string
          route_auto_pause?: boolean
          route_default_visibility?: string
          route_hide_endpoints_default?: boolean
          share_achievements?: boolean
          share_body_weight?: boolean
          share_photos?: boolean
          share_records?: boolean
          share_routines?: boolean
          share_workouts?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          allow_friend_requests?: boolean
          audience?: string
          created_at?: string
          route_auto_pause?: boolean
          route_default_visibility?: string
          route_hide_endpoints_default?: boolean
          share_achievements?: boolean
          share_body_weight?: boolean
          share_photos?: boolean
          share_records?: boolean
          share_routines?: boolean
          share_workouts?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      template_exercises: {
        Row: {
          duration: number | null
          exercise_id: string | null
          id: string
          name: string
          notes: string | null
          planned_weight_kg: number | null
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
          planned_weight_kg?: number | null
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
          planned_weight_kg?: number | null
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
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_session_exercises: {
        Row: {
          completed_at: string | null
          created_at: string
          exercise_id: string | null
          id: string
          name: string
          planned_duration_sec: number | null
          planned_reps: number | null
          planned_rest_sec: number | null
          planned_sets: number | null
          planned_weight_kg: number | null
          position: number
          session_id: string
          status: string
          template_exercise_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          name: string
          planned_duration_sec?: number | null
          planned_reps?: number | null
          planned_rest_sec?: number | null
          planned_sets?: number | null
          planned_weight_kg?: number | null
          position: number
          session_id: string
          status?: string
          template_exercise_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          name?: string
          planned_duration_sec?: number | null
          planned_reps?: number | null
          planned_rest_sec?: number | null
          planned_sets?: number | null
          planned_weight_kg?: number | null
          position?: number
          session_id?: string
          status?: string
          template_exercise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_exercises_template_exercise_id_fkey"
            columns: ["template_exercise_id"]
            isOneToOne: false
            referencedRelation: "template_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_session_sets: {
        Row: {
          completed_at: string
          distance_m: number | null
          duration_sec: number | null
          exercise_id: string | null
          exercise_position: number
          id: string
          is_warmup: boolean
          load_note: string | null
          reps: number | null
          rest_actual_sec: number | null
          rest_taken_sec: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          completed_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          exercise_id?: string | null
          exercise_position: number
          id?: string
          is_warmup?: boolean
          load_note?: string | null
          reps?: number | null
          rest_actual_sec?: number | null
          rest_taken_sec?: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          completed_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          exercise_id?: string | null
          exercise_position?: number
          id?: string
          is_warmup?: boolean
          load_note?: string | null
          reps?: number | null
          rest_actual_sec?: number | null
          rest_taken_sec?: number | null
          session_id?: string
          set_index?: number
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_sets_exercise_fk"
            columns: ["session_id", "exercise_position"]
            isOneToOne: false
            referencedRelation: "workout_session_exercises"
            referencedColumns: ["session_id", "position"]
          },
          {
            foreignKeyName: "workout_session_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          calories_burned: number | null
          cancel_reason: string | null
          completed: boolean | null
          completed_exercises: Json
          created_at: string
          date: string
          duration: number | null
          ended_at: string | null
          id: string
          paused_at: string | null
          paused_total_sec: number
          route_activity_id: string | null
          source: string | null
          started_at: string | null
          status: string
          total_exercises: number
          user_id: string
          volume_kg: number | null
          workout_id: string | null
          workout_title: string
        }
        Insert: {
          calories_burned?: number | null
          cancel_reason?: string | null
          completed?: boolean | null
          completed_exercises?: Json
          created_at?: string
          date?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          paused_at?: string | null
          paused_total_sec?: number
          route_activity_id?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          total_exercises?: number
          user_id: string
          volume_kg?: number | null
          workout_id?: string | null
          workout_title?: string
        }
        Update: {
          calories_burned?: number | null
          cancel_reason?: string | null
          completed?: boolean | null
          completed_exercises?: Json
          created_at?: string
          date?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          paused_at?: string | null
          paused_total_sec?: number
          route_activity_id?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          total_exercises?: number
          user_id?: string
          volume_kg?: number | null
          workout_id?: string | null
          workout_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_route_activity_id_fkey"
            columns: ["route_activity_id"]
            isOneToOne: true
            referencedRelation: "route_activities"
            referencedColumns: ["id"]
          },
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
          copied_from_post_id: string | null
          copied_from_user_id: string | null
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
          routine_category: string | null
          source: string | null
          tags: string[] | null
          target_muscles: string[] | null
          title: string
          type: string
        }
        Insert: {
          calories?: number
          copied_from_post_id?: string | null
          copied_from_user_id?: string | null
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
          routine_category?: string | null
          source?: string | null
          tags?: string[] | null
          target_muscles?: string[] | null
          title: string
          type?: string
        }
        Update: {
          calories?: number
          copied_from_post_id?: string | null
          copied_from_user_id?: string | null
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
          routine_category?: string | null
          source?: string | null
          tags?: string[] | null
          target_muscles?: string[] | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_copied_from_post_id_fkey"
            columns: ["copied_from_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      moderation_queue: {
        Row: {
          author_id: string | null
          author_prior_removals: number | null
          author_username: string | null
          body: string | null
          first_reported_at: string | null
          hidden_at: string | null
          last_reported_at: string | null
          open_reports: number | null
          photo_path: string | null
          post_id: string | null
          post_type: string | null
          reasons: string[] | null
          removed_at: string | null
          target_id: string | null
          target_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_manual_contribution: {
        Args: { _amount: number; _challenge_id: string }
        Returns: Json
      }
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      award_gamification_event: {
        Args: {
          _badge_ids?: string[]
          _event_type: string
          _metadata?: Json
          _points?: number
          _reference_id?: string
        }
        Returns: Json
      }
      block_user: { Args: { _target: string }; Returns: Json }
      can_see_category: {
        Args: { _category: string; _owner: string }
        Returns: boolean
      }
      can_view_post: { Args: { _post_id: string }; Returns: boolean }
      can_view_profile_photo: { Args: { _name: string }; Returns: boolean }
      can_view_social_photo: { Args: { _name: string }; Returns: boolean }
      cancel_friend_challenge: {
        Args: { _challenge_id: string }
        Returns: Json
      }
      cancel_friend_request: { Args: { _request_id: string }; Returns: Json }
      challenge_cover_url: { Args: { _path: string }; Returns: string }
      create_friend_challenge: {
        Args: {
          _duration_days: number
          _goal: number
          _invitee_ids: string[]
          _metric: string
        }
        Returns: Json
      }
      create_friend_invite: { Args: never; Returns: Json }
      create_post: {
        Args: {
          _body?: string
          _photo_height?: number
          _photo_path?: string
          _photo_width?: number
          _source_id?: string
          _type: string
        }
        Returns: Json
      }
      delete_comment: { Args: { _comment_id: string }; Returns: Json }
      delete_planned_route: { Args: { _id: string }; Returns: Json }
      delete_route_activity: { Args: { _activity_id: string }; Returns: Json }
      detect_session_prs: { Args: { _session_id: string }; Returns: Json }
      ensure_social_settings: { Args: { _username: string }; Returns: Json }
      exercise_display_name: { Args: { _id: string }; Returns: string }
      expire_saved_sessions: { Args: never; Returns: number }
      find_user_by_username: { Args: { _username: string }; Returns: Json }
      gamification_badge_check: {
        Args: { _badge: string; _ref_date?: string; _user: string }
        Returns: boolean
      }
      get_badge_progress: { Args: never; Returns: Json }
      get_challenge_board: { Args: { _challenge_id: string }; Returns: Json }
      get_feed: { Args: { _before?: string; _limit?: number }; Returns: Json }
      get_friend_activity: { Args: { _limit?: number }; Returns: Json }
      get_my_challenges: { Args: never; Returns: Json }
      get_my_planned_routes: { Args: never; Returns: Json }
      get_outdoor_month: {
        Args: { _tz?: string; _user_id: string }
        Returns: Json
      }
      get_post: { Args: { _id: string }; Returns: Json }
      get_progress_summary: {
        Args: { _from: string; _tz?: string }
        Returns: Json
      }
      get_recent_activities: {
        Args: { _limit?: number; _user_id: string }
        Returns: Json
      }
      get_route_for_viewer: { Args: { _activity_id: string }; Returns: Json }
      get_route_personal_bests: { Args: never; Returns: Json }
      get_social_profile: { Args: { _user_id: string }; Returns: Json }
      get_social_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_key: string
          goal: string
          id: string
          name: string
          profile_photo_url: string
          username: string
          weight: number
        }[]
      }
      get_today_route_activity: { Args: { _tz?: string }; Returns: Json }
      is_blocked: { Args: { a: string; b: string }; Returns: boolean }
      is_challenge_participant: {
        Args: { _challenge: string; _user: string }
        Returns: boolean
      }
      is_moderator: { Args: never; Returns: boolean }
      join_official_challenge: {
        Args: { _challenge_id: string }
        Returns: Json
      }
      leave_challenge: { Args: { _challenge_id: string }; Returns: Json }
      mark_challenge_celebrated: {
        Args: { _challenge_id: string }
        Returns: Json
      }
      moderate_content: {
        Args: {
          _action: string
          _note?: string
          _target_id: string
          _target_type: string
        }
        Returns: Json
      }
      redeem_friend_invite: { Args: { _token: string }; Returns: Json }
      remove_friend: { Args: { _friend: string }; Returns: Json }
      rename_planned_route: {
        Args: { _id: string; _name: string }
        Returns: Json
      }
      respond_challenge_invite: {
        Args: { _accept: boolean; _challenge_id: string }
        Returns: Json
      }
      respond_friend_request: {
        Args: { _accept: boolean; _request_id: string }
        Returns: Json
      }
      route_activity_json: {
        Args: {
          _a: Database["public"]["Tables"]["route_activities"]["Row"]
          _full: boolean
        }
        Returns: Json
      }
      route_best_efforts: {
        Args: { _pauses: Json; _track: Json }
        Returns: Json
      }
      route_can_view: {
        Args: { _owner: string; _viewer: string; _vis: string }
        Returns: boolean
      }
      route_distance_m: { Args: { _key: string }; Returns: number }
      route_gen_reserve: {
        Args: {
          _calls: number
          _provider: string
          _provider_limit: number
          _user: string
          _user_limit: number
        }
        Returns: string
      }
      route_haversine_m: {
        Args: { a_lat: number; a_lon: number; b_lat: number; b_lon: number }
        Returns: number
      }
      route_latlon: { Args: { _pts: Json }; Returns: Json }
      route_pace_label: { Args: { _m: number; _sec: number }; Returns: string }
      route_pause_overlap_ms: {
        Args: { _a: number; _b: number; _pauses: Json }
        Returns: number
      }
      route_shared_track: {
        Args: { _hide: boolean; _track: Json }
        Returns: Json
      }
      route_simplify: { Args: { _max?: number; _pts: Json }; Returns: Json }
      route_track_stats: {
        Args: { _pauses: Json; _track: Json }
        Returns: Json
      }
      route_trim: { Args: { _m: number; _pts: Json }; Returns: Json }
      routine_category_from_type: { Args: { _type: string }; Returns: string }
      save_planned_route: { Args: { _payload: Json }; Returns: Json }
      save_route_activity: { Args: { _payload: Json }; Returns: Json }
      save_shared_routine: { Args: { _post_id: string }; Returns: Json }
      send_friend_request: { Args: { _target: string }; Returns: Json }
      set_moderator: {
        Args: { _role: string; _user_id: string }
        Returns: Json
      }
      set_route_personal_best: {
        Args: {
          _achieved_at?: string
          _distance_key: string
          _sport: string
          _time_sec: number
        }
        Returns: Json
      }
      set_username: { Args: { _username: string }; Returns: Json }
      social_add_activity: {
        Args: {
          _category: string
          _kind: string
          _ref: string
          _summary: Json
          _user: string
        }
        Returns: undefined
      }
      social_award_official: {
        Args: { _challenge: string; _user: string }
        Returns: undefined
      }
      social_can_see_identity: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
      social_challenge_extra: {
        Args: { _c: Database["public"]["Tables"]["social_challenges"]["Row"] }
        Returns: Json
      }
      social_challenges_maintenance: { Args: never; Returns: Json }
      social_make_friends: {
        Args: { _a: string; _b: string; _invite: string; _request: string }
        Returns: boolean
      }
      social_notify: {
        Args: {
          _actor: string
          _challenge?: string
          _comment?: string
          _dedupe: string
          _post?: string
          _recipient: string
          _request?: string
          _type: string
        }
        Returns: undefined
      }
      social_post_category: { Args: { _type: string }; Returns: string }
      social_post_json: {
        Args: { _p: Database["public"]["Tables"]["social_posts"]["Row"] }
        Returns: Json
      }
      social_purge_activity: { Args: never; Returns: number }
      social_recount_post: { Args: { _post: string }; Returns: undefined }
      social_relationship: {
        Args: { _target: string; _viewer: string }
        Returns: string
      }
      social_share_enabled: {
        Args: { _category: string; _owner: string }
        Returns: boolean
      }
      social_streak_days: { Args: { _user: string }; Returns: number }
      update_route_activity_privacy: {
        Args: {
          _activity_id: string
          _hide_endpoints: boolean
          _visibility: string
        }
        Returns: Json
      }
      verify_cleanup_token: { Args: { _token: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
