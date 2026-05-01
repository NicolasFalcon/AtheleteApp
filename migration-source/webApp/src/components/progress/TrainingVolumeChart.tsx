import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '@/contexts/AppContext';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dumbbell } from 'lucide-react';
import { formatLocalDate, getWorkoutSessionDateKey } from '@/lib/date';

interface DayData {
  label: string;
  fullLabel: string;
  minutes: number;
  calories: number;
  sessions: number;
  date: string;
}

interface TrainingVolumeChartProps {
  timeRange?: 'week' | 'month';
}

function formatDuration(minutes: number): string {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${roundedMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

function formatSessionCount(count: number): string {
  return `${count} sesi${count === 1 ? 'ón' : 'ones'}`;
}

export function TrainingVolumeChart({ timeRange = 'week' }: TrainingVolumeChartProps) {
  const { workoutSessions } = useApp();
  const periodDays = timeRange === 'month' ? 30 : 7;

  const chartData = useMemo<DayData[]>(() => {
    const today = new Date();
    const aggregatedSessions = workoutSessions.reduce<Map<string, Omit<DayData, 'label' | 'fullLabel' | 'date'>>>(
      (acc, session) => {
        const isCompleted = session.completed || session.status === 'completed';
        if (!isCompleted) {
          return acc;
        }

        const dateKey = getWorkoutSessionDateKey(session);
        const previous = acc.get(dateKey) ?? { minutes: 0, calories: 0, sessions: 0 };
        acc.set(dateKey, {
          minutes: previous.minutes + Math.max(0, session.duration || 0),
          calories: previous.calories + Math.max(0, session.caloriesBurned || 0),
          sessions: previous.sessions + 1,
        });

        return acc;
      },
      new Map(),
    );

    return Array.from({ length: periodDays }, (_, index) => {
      const offset = periodDays - 1 - index;
      const date = subDays(today, offset);
      const dateStr = formatLocalDate(date);
      const totals = aggregatedSessions.get(dateStr);

      return {
        label: timeRange === 'week' ? format(date, 'EEE', { locale: es }).slice(0, 3) : format(date, 'd'),
        fullLabel: format(date, "EEEE d 'de' MMMM", { locale: es }),
        minutes: totals?.minutes ?? 0,
        calories: totals?.calories ?? 0,
        sessions: totals?.sessions ?? 0,
        date: dateStr,
      };
    });
  }, [periodDays, timeRange, workoutSessions]);

  const totalMinutes = chartData.reduce((s, d) => s + d.minutes, 0);
  const totalSessions = chartData.reduce((s, d) => s + d.sessions, 0);
  const activeDays = chartData.filter((d) => d.sessions > 0).length;
  const maxMinutes = Math.max(...chartData.map((d) => d.minutes), 30);
  const tickStep = timeRange === 'month' ? 5 : 1;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as DayData;
    return (
      <div className="rounded-2xl border border-border bg-popover px-3 py-2.5 text-xs shadow-lg">
        <p className="text-[10px] capitalize text-muted-foreground">
          {data.fullLabel}
        </p>
        <p className="mt-1 font-medium text-foreground">{formatDuration(data.minutes)}</p>
        <p className="text-muted-foreground">{formatSessionCount(data.sessions)}</p>
        {data.calories > 0 && (
          <p className="text-muted-foreground">{data.calories} kcal</p>
        )}
      </div>
    );
  };

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Carga de entrenamiento</h3>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {timeRange === 'month' ? '30 días' : '7 días'}
        </span>
      </div>

      <p className="mt-4 text-[30px] font-semibold tracking-tight text-foreground">
        {formatDuration(totalMinutes)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatSessionCount(totalSessions)} · {activeDays} día{activeDays === 1 ? '' : 's'} activo{activeDays === 1 ? '' : 's'}
      </p>

      <div className="mt-5 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap={timeRange === 'month' ? '14%' : '28%'}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fontSize: 10, fill: 'hsl(0 0% 50%)' }}
              tickFormatter={(value, index) => {
                if (timeRange === 'week') {
                  return value;
                }

                return index % tickStep === 0 || index === chartData.length - 1 ? value : '';
              }}
            />
            <YAxis
              hide
              allowDecimals={false}
              domain={[0, Math.max(30, Math.ceil(maxMinutes * 1.15))]}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey="minutes"
              fill="hsl(0 0% 35%)"
              radius={[6, 6, 0, 0]}
              background={{ fill: 'hsl(0 0% 94%)' }}
              maxBarSize={timeRange === 'month' ? 10 : 22}
              activeBar={{ fill: 'hsl(0 0% 20%)' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
