import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  registerWithEmail,
  sendPasswordReset,
  signInWithEmail,
  signOut as signOutService,
} from '@app/services/supabase/auth';
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from '@app/services/supabase/client';
import {
  fetchProfile,
  updateOnboardingProfile,
} from '@app/services/supabase/profile';
import type {
  AppFlow,
  OnboardingData,
  ProfileRecord,
} from '@app/types/auth';

type AuthContextValue = {
  flow: AppFlow;
  session: Session | null;
  profile: ProfileRecord | null;
  onboardingDraft: Partial<OnboardingData>;
  isHydrating: boolean;
  isSupabaseConfigured: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updateOnboardingDraft: (patch: Partial<OnboardingData>) => void;
  resetOnboardingDraft: () => void;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getFlow(session: Session | null, profile: ProfileRecord | null): AppFlow {
  if (!session) {
    return 'auth';
  }

  if (profile?.onboardingCompleted) {
    return 'app';
  }

  return 'onboarding';
}

function buildDraft(profile: ProfileRecord | null): Partial<OnboardingData> {
  if (!profile) {
    return {};
  }

  return {
    goal: profile.goal ?? undefined,
    birthDate: profile.birthDate ?? undefined,
    weight: profile.weight ?? undefined,
    height: profile.height ?? undefined,
    trainingDaysPerWeek: profile.trainingDaysPerWeek ?? undefined,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [onboardingDraft, setOnboardingDraft] = useState<Partial<OnboardingData>>(
    {},
  );
  const [flow, setFlow] = useState<AppFlow>('auth');
  const [isHydrating, setIsHydrating] = useState(true);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setProfile(null);
    setOnboardingDraft({});
    setFlow('auth');
  }, []);

  const hydrateProfile = useCallback(
    async (nextSession: Session) => {
      const nextProfile = await fetchProfile(
        nextSession.user.id,
        nextSession.user.email ?? '',
        (nextSession.user.user_metadata?.name as string | undefined) ?? '',
      );

      setSession(nextSession);
      setProfile(nextProfile);
      setOnboardingDraft(buildDraft(nextProfile));
      setFlow(getFlow(nextSession, nextProfile));
    },
    [],
  );

  const syncSessionState = useCallback(
    (nextSession: Session | null) => {
      if (!nextSession) {
        clearAuthState();
        setIsHydrating(false);
        return;
      }

      setSession(nextSession);
      setIsHydrating(true);

      setTimeout(() => {
        hydrateProfile(nextSession)
          .catch(() => {
            clearAuthState();
          })
          .finally(() => {
            setIsHydrating(false);
          });
      }, 0);
    },
    [clearAuthState, hydrateProfile],
  );

  useEffect(() => {
    const client = getSupabaseClient();

    if (!client) {
      setIsHydrating(false);
      setFlow('auth');
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await client.auth.getSession();

        if (cancelled) {
          return;
        }

        if (initialSession) {
          await hydrateProfile(initialSession);
        } else {
          clearAuthState();
        }
      } catch {
        if (!cancelled) {
          clearAuthState();
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) {
        return;
      }

      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'TOKEN_REFRESHED' && nextSession) {
        setSession(nextSession);
        return;
      }

      syncSessionState(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [clearAuthState, hydrateProfile, syncSessionState]);

  const refreshProfile = useCallback(async () => {
    if (!session) {
      return;
    }

    const nextProfile = await fetchProfile(
      session.user.id,
      session.user.email ?? '',
      (session.user.user_metadata?.name as string | undefined) ?? '',
    );

    setProfile(nextProfile);
    setOnboardingDraft(buildDraft(nextProfile));
    setFlow(getFlow(session, nextProfile));
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await signInWithEmail(email, password);

    if (error) {
      throw error;
    }
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { error } = await registerWithEmail(name, email, password);

      if (error) {
        throw error;
      }
    },
    [],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await sendPasswordReset(email);

    if (error) {
      throw error;
    }
  }, []);

  const updateOnboardingDraft = useCallback(
    (patch: Partial<OnboardingData>) => {
      setOnboardingDraft(current => ({
        ...current,
        ...patch,
      }));
    },
    [],
  );

  const resetOnboardingDraft = useCallback(() => {
    setOnboardingDraft(buildDraft(profile));
  }, [profile]);

  const completeOnboarding = useCallback(
    async (data: OnboardingData) => {
      if (!session) {
        throw new Error('No hay una sesión activa.');
      }

      await updateOnboardingProfile(session.user.id, data);
      await refreshProfile();
    },
    [refreshProfile, session],
  );

  const signOut = useCallback(async () => {
    const { error } = await signOutService();

    if (error) {
      throw error;
    }

    setSession(null);
    setProfile(null);
    setOnboardingDraft({});
    setFlow('auth');
  }, []);

  const value = useMemo(
    () => ({
      flow,
      session,
      profile,
      onboardingDraft,
      isHydrating,
      isSupabaseConfigured,
      refreshProfile,
      signIn,
      signUp,
      requestPasswordReset,
      updateOnboardingDraft,
      resetOnboardingDraft,
      completeOnboarding,
      signOut,
    }),
    [
      completeOnboarding,
      flow,
      isHydrating,
      onboardingDraft,
      profile,
      refreshProfile,
      requestPasswordReset,
      resetOnboardingDraft,
      session,
      signIn,
      signOut,
      signUp,
      updateOnboardingDraft,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider.');
  }

  return context;
}
