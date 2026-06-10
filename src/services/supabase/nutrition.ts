import type {DailyNutritionLog, NutritionPlan} from '@app/shared';
import {getLocalDateKey} from '@app/lib/date';
import {getSupabaseClient} from '@app/services/supabase/client';
import {awardGamificationEvent} from '@app/services/supabase/gamification';
import type {Database} from '@app/types/supabase';

type NutritionPlanRow = Database['public']['Tables']['nutrition_plans']['Row'];
type DailyNutritionLogRow =
  Database['public']['Tables']['daily_nutrition_logs']['Row'];

export type NutritionPlanDetails = NutritionPlan & {
  source?: string | null;
  createdByAi?: boolean;
  createdAt?: string;
};

export type NutritionPlanScreenData = {
  plan: NutritionPlanDetails | null;
  todayLog: DailyNutritionLog | null;
};

export type NutritionLogInput = {
  calories: number;
  protein: number;
  carbs?: number;
  fats?: number;
  adherence?: number;
};

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

function mapNutritionPlan(row: NutritionPlanRow): NutritionPlanDetails {
  return {
    id: row.id,
    userId: row.user_id,
    targetCalories: row.target_calories,
    targetProtein: row.target_protein,
    targetCarbs: row.target_carbs ?? undefined,
    targetFats: row.target_fats ?? undefined,
    notes: row.notes ?? undefined,
    source: row.source ?? undefined,
    createdByAi: row.created_by_ai ?? undefined,
    createdAt: row.created_at,
  };
}

function mapDailyNutritionLog(row: DailyNutritionLogRow): DailyNutritionLog {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    calories: row.calories || 0,
    protein: row.protein || 0,
    carbs: row.carbs ?? undefined,
    fats: row.fats ?? undefined,
    adherence: row.adherence ?? undefined,
  };
}

export async function fetchNutritionPlanScreenData(
  userId: string,
): Promise<NutritionPlanScreenData> {
  const client = getClient();
  const today = getLocalDateKey();

  const [planResult, todayLogResult] = await Promise.all([
    client
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', {ascending: false})
      .limit(1),
    client
      .from('daily_nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1),
  ]);

  if (planResult.error) {
    throw planResult.error;
  }

  if (todayLogResult.error) {
    throw todayLogResult.error;
  }

  return {
    plan: planResult.data?.[0]
      ? mapNutritionPlan(planResult.data[0] as NutritionPlanRow)
      : null,
    todayLog: todayLogResult.data?.[0]
      ? mapDailyNutritionLog(todayLogResult.data[0] as DailyNutritionLogRow)
      : null,
  };
}

export async function deactivateNutritionPlan(userId: string): Promise<void> {
  const client = getClient();
  const {error} = await ((client
    .from('nutrition_plans') as any)
    .update({is_active: false} as any)
    .eq('user_id', userId)
    .eq('is_active', true));

  if (error) {
    throw error;
  }
}

export async function upsertTodayNutritionLog(
  userId: string,
  input: NutritionLogInput,
): Promise<DailyNutritionLog> {
  const client = getClient();
  const today = getLocalDateKey();

  const payload: Database['public']['Tables']['daily_nutrition_logs']['Update'] =
    {
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs ?? null,
      fats: input.fats ?? null,
      adherence: input.adherence ?? null,
    };

  const {data: existing, error: fetchError} = await client
    .from('daily_nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const existingLog = (existing as DailyNutritionLogRow | null) || null;

  if (existingLog) {
    const {data, error} = await (client
      .from('daily_nutrition_logs') as any)
      .update(payload)
      .eq('id', existingLog.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'No pudimos actualizar tu nutrición.');
    }

    const log = mapDailyNutritionLog(data as DailyNutritionLogRow);
    await awardGamificationEvent({
      userId,
      eventKey: `nutrition_logged:${today}`,
      eventType: 'nutrition_logged',
      points: 10,
      metadata: {
        date: today,
        calories: log.calories,
        protein: log.protein,
        updatedExisting: true,
      },
    });

    return log;
  }

  const insertPayload: Database['public']['Tables']['daily_nutrition_logs']['Insert'] =
    {
      user_id: userId,
      date: today,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs ?? null,
      fats: input.fats ?? null,
      adherence: input.adherence ?? null,
    };

  const {data, error} = await (client
    .from('daily_nutrition_logs') as any)
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'No pudimos registrar tu nutrición.');
  }

  const log = mapDailyNutritionLog(data as DailyNutritionLogRow);
  await awardGamificationEvent({
    userId,
    eventKey: `nutrition_logged:${today}`,
    eventType: 'nutrition_logged',
    points: 10,
    metadata: {
      date: today,
      calories: log.calories,
      protein: log.protein,
      updatedExisting: false,
    },
  });

  return log;
}
