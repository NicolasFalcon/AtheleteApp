import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  ChevronRight,
  Dumbbell,
  Flame,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { PointsHeader } from "@/components/profile/PointsHeader";
import { AchievementsSection } from "@/components/profile/AchievementsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/useTheme";

const goalLabels: Record<string, string> = {
  lose_weight: "Perder peso",
  gain_muscle: "Ganar músculo",
  maintain: "Mantenerme",
  improve_health: "Mejorar salud",
};

type NotificationSettings = {
  workouts: boolean;
  hydration: boolean;
  updates: boolean;
};

export function ProfileTab() {
  const { signOut } = useAuth();
  const {
    user,
    setUser,
    challenge,
    nutritionPlan,
    getCurrentStreak,
    getCompletedDays,
    getChallengeDay,
    hasPendingNutritionPlan,
    isLoading,
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    trainingDaysPerWeek: user.trainingDaysPerWeek,
    goal: user.goal,
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    workouts: true,
    hydration: true,
    updates: false,
  });

  useEffect(() => {
    if (isEditing) return;

    setFormData({
      trainingDaysPerWeek: user.trainingDaysPerWeek,
      goal: user.goal,
    });
  }, [isEditing, user.goal, user.trainingDaysPerWeek]);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthOffset = today.getMonth() - birth.getMonth();
    if (
      monthOffset < 0 ||
      (monthOffset === 0 && today.getDate() < birth.getDate())
    )
      age--;
    return age;
  };

  const handleSave = async () => {
    setUser((prev) => ({
      ...prev,
      goal: formData.goal as typeof prev.goal,
      trainingDaysPerWeek: formData.trainingDaysPerWeek,
    }));

    if (user.id) {
      await supabase
        .from("profiles")
        .update({
          goal: formData.goal,
          training_days_per_week: formData.trainingDaysPerWeek,
        })
        .eq("id", user.id);
    }

    setIsEditing(false);
  };

  const ageValue = user.birthDate ? `${calculateAge(user.birthDate)}` : "—";
  const weightValue = user.weight ? `${user.weight}` : "—";
  const heightValue = user.height ? `${user.height}` : "—";
  const currentGoalLabel = goalLabels[user.goal] || "—";
  const currentStreak = getCurrentStreak();
  const completedChallengeDays = getCompletedDays();
  const challengeSummary = challenge
    ? `Día ${getChallengeDay()} de 33`
    : "No activo";
  const nutritionSummary = nutritionPlan
    ? "Plan activo"
    : hasPendingNutritionPlan()
      ? "Pendiente"
      : "Sin plan";

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-5 px-4 page-safe-top">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-56 w-full rounded-[32px]" />
        <Skeleton className="h-52 w-full rounded-[28px]" />
        <Skeleton className="h-64 w-full rounded-[28px]" />
        <Skeleton className="h-72 w-full rounded-[28px]" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-[calc(var(--safe-area-bottom)+1.5rem)]">
      <div className="px-4 page-safe-top">
        <div className="space-y-1"></div>
      </div>

      <div className="mt-4 space-y-6 px-4">
        {/* 1. Top profile header */}
        <section className="text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[32px] bg-foreground text-3xl font-semibold text-background shadow-lg">
              {(user.name || "U").charAt(0)}
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {user.name || "Usuario"}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>

              <div className="mt-4 flex justify-center gap-2">
                <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground">
                  {currentGoalLabel}
                </span>
                <span className="rounded-full border border-border/60 bg-secondary/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {user.trainingDaysPerWeek} días/sem
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Compact stats row */}
        <section className="grid grid-cols-3 gap-3">
          <ProfileStat label="Edad" value={ageValue} unit="años" />
          <ProfileStat label="Peso" value={weightValue} unit="kg" />
          <ProfileStat label="Altura" value={heightValue} unit="cm" />
        </section>

        {/* 3. Points / progress highlight card */}
        <section>
          <PointsHeader />
        </section>

        {/* 4. Quick actions / profile shortcuts */}
        <section className="space-y-2">
          <QuickAction
            icon={Settings}
            title="Editar perfil"
            subtitle="Información personal"
            onClick={() => setIsEditing(true)}
          />
          <QuickAction
            icon={Target}
            title="Mis objetivos"
            subtitle="Meta y frecuencia"
            onClick={() => setIsEditing(true)}
          />
          <QuickAction
            icon={Trophy}
            title="Logros"
            subtitle="Badges desbloqueados"
            onClick={() => {
              /* Navigate to achievements */
            }}
          />
          <QuickAction
            icon={Bell}
            title="Notificaciones"
            subtitle="Recordatorios activos"
            onClick={() => {
              /* Navigate to notifications */
            }}
          />
          <QuickAction
            icon={Sun}
            title="Apariencia"
            subtitle="Tema de la app"
            onClick={() => {
              /* Scroll to appearance */
            }}
          />
        </section>

        {/* 5. Goals / current setup card */}
        <section>
          <div className="rounded-[28px] border border-border/60 bg-card/95 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Mi plan actual
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-4"
                onClick={() => setIsEditing(true)}
              >
                Editar
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <SetupItem
                icon={Target}
                label="Objetivo"
                value={currentGoalLabel}
              />
              <SetupItem
                icon={Dumbbell}
                label="Entrenamiento"
                value={`${user.trainingDaysPerWeek} días/sem`}
              />
              <SetupItem
                icon={Sparkles}
                label="Nutrición"
                value={nutritionSummary}
              />
              <SetupItem
                icon={Flame}
                label="Core 33"
                value={challengeSummary}
              />
            </div>
          </div>
        </section>

        {/* 6. Achievements preview */}
        <section>
          <div className="rounded-[28px] border border-border/60 bg-card/95 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Logros</h2>
              <Button variant="ghost" size="sm" className="rounded-full px-4">
                Ver todos
              </Button>
            </div>
            <AchievementsSection previewCount={4} />
          </div>
        </section>

        {/* 7. Settings / preferences section */}
        <section className="space-y-4">
          <div className="rounded-[28px] border border-border/60 bg-card/95 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Preferencias
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Sun className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Apariencia
                  </span>
                </div>
                <AppearanceSection />
              </div>

              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Notificaciones
                  </span>
                </div>

                <div className="space-y-3">
                  <SettingsRow
                    label="Recordatorios de entreno"
                    control={
                      <Switch
                        checked={notifications.workouts}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            workouts: checked,
                          }))
                        }
                      />
                    }
                  />
                  <SettingsRow
                    label="Recordatorios de agua"
                    control={
                      <Switch
                        checked={notifications.hydration}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            hydration: checked,
                          }))
                        }
                      />
                    }
                  />
                  <SettingsRow
                    label="Tips y novedades"
                    control={
                      <Switch
                        checked={notifications.updates}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            updates: checked,
                          }))
                        }
                      />
                    }
                  />
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Cerrar sesión
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-destructive hover:text-destructive"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const themeOptions = [
  { value: "light" as const, label: "Claro", icon: Sun },
  { value: "dark" as const, label: "Oscuro", icon: Moon },
  { value: "system" as const, label: "Sistema", icon: Monitor },
];

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex rounded-[20px] bg-secondary/85 p-1">
      {themeOptions.map((option) => {
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-medium transition-all",
              theme === option.value
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ProfileStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-[22px] border border-border/60 bg-background/80 px-3 py-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Settings;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[22px] border border-border/60 bg-card/95 p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all hover:bg-card"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function SetupItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-border/60 bg-background/80 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SettingsRow({
  label,
  control,
}: {
  label: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-border/60 bg-background/70 px-3.5 py-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {control}
    </div>
  );
}
