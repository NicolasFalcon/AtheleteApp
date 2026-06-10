import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Linking } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import {
  registerWithEmail,
  sendPasswordReset,
  signInWithEmail,
  signOut as signOutService,
  updatePassword,
} from '@app/services/supabase/auth';
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from '@app/services/supabase/client';
import {
  fetchProfile,
  updateOnboardingProfile,
} from '@app/services/supabase/profile';
import {parsePasswordRecoveryUrl} from '@app/lib/auth/passwordRecoveryUrl';
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
  recoverPasswordSessionFromUrl: (url: string) => Promise<boolean>;
  updateRecoveredPassword: (password: string) => Promise<void>;
  finishPasswordRecovery: () => Promise<void>;
  isPasswordRecoveryActive: boolean;
  passwordRecoveryError: string;
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
  const [isPasswordRecoveryActive, setIsPasswordRecoveryActive] = useState(false);
  const [passwordRecoveryError, setPasswordRecoveryError] = useState('');
  const handledRecoveryUrls = useRef(new Set<string>());
  const passwordRecoveryInFlight = useRef(false);
  const passwordRecoveryActive = useRef(false);

  const activatePasswordRecovery = useCallback(
    (nextSession: Session | null, errorMessage = '') => {
      if (nextSession) {
        setSession(nextSession);
      }

      setProfile(null);
      setOnboardingDraft({});
      setFlow('auth');
      passwordRecoveryActive.current = true;
      setIsPasswordRecoveryActive(true);
      setPasswordRecoveryError(errorMessage);
      setIsHydrating(false);
    },
    [],
  );

  const clearAuthState = useCallback(() => {
    setSession(null);
    setProfile(null);
    setOnboardingDraft({});
    setFlow('auth');
    passwordRecoveryActive.current = false;
    setIsPasswordRecoveryActive(false);
    setPasswordRecoveryError('');
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

  const recoverPasswordSessionFromUrl = useCallback(
    async (url: string) => {
      const client = getSupabaseClient();

      if (!client || handledRecoveryUrls.current.has(url)) {
        return false;
      }

      const recoveryUrl = parsePasswordRecoveryUrl(url);

      if (!recoveryUrl.isRecoveryUrl) {
        return false;
      }

      handledRecoveryUrls.current.add(url);
      passwordRecoveryInFlight.current = true;
      setIsHydrating(true);

      try {
        if (recoveryUrl.credentials?.type === 'tokens') {
          const {data, error} = await client.auth.setSession({
            access_token: recoveryUrl.credentials.accessToken,
            refresh_token: recoveryUrl.credentials.refreshToken,
          });

          if (error) {
            throw error;
          }

          activatePasswordRecovery(data.session, '');
          return true;
        }

        if (recoveryUrl.credentials?.type === 'code') {
          const {data, error} = await client.auth.exchangeCodeForSession(
            recoveryUrl.credentials.code,
          );

          if (error) {
            throw error;
          }

          activatePasswordRecovery(data.session, '');
          return true;
        }

        activatePasswordRecovery(
          null,
          'El enlace de recuperación no incluye una sesión válida. Solicita un nuevo enlace.',
        );
        return true;
      } catch {
        activatePasswordRecovery(
          null,
          'El enlace de recuperación expiró o ya fue usado. Solicita un nuevo enlace.',
        );
        return true;
      } finally {
        passwordRecoveryInFlight.current = false;
        setIsHydrating(false);
      }
    },
    [activatePasswordRecovery],
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

        if (
          passwordRecoveryInFlight.current ||
          passwordRecoveryActive.current
        ) {
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
        if (!cancelled && !passwordRecoveryInFlight.current) {
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

      if (passwordRecoveryActive.current && nextSession) {
        setSession(nextSession);
        return;
      }

      if (
        (event === 'PASSWORD_RECOVERY' || passwordRecoveryInFlight.current) &&
        nextSession
      ) {
        activatePasswordRecovery(nextSession, '');
        return;
      }

      syncSessionState(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [
    activatePasswordRecovery,
    clearAuthState,
    hydrateProfile,
    syncSessionState,
  ]);

  useEffect(() => {
    let cancelled = false;

    Linking.getInitialURL()
      .then(url => {
        if (!cancelled && url) {
          recoverPasswordSessionFromUrl(url).catch(() => undefined);
        }
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', event => {
      recoverPasswordSessionFromUrl(event.url).catch(() => undefined);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [recoverPasswordSessionFromUrl]);

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

  const updateRecoveredPassword = useCallback(
    async (password: string) => {
      if (!session || !isPasswordRecoveryActive) {
        throw new Error(
          'No hay una sesión de recuperación activa. Solicita un nuevo enlace.',
        );
      }

      const {error} = await updatePassword(password);

      if (error) {
        throw error;
      }
    },
    [isPasswordRecoveryActive, session],
  );

  const finishPasswordRecovery = useCallback(async () => {
    const {error} = await signOutService();

    if (error) {
      throw error;
    }

    clearAuthState();
  }, [clearAuthState]);

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
    passwordRecoveryActive.current = false;
    setIsPasswordRecoveryActive(false);
    setPasswordRecoveryError('');
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
      recoverPasswordSessionFromUrl,
      updateRecoveredPassword,
      finishPasswordRecovery,
      isPasswordRecoveryActive,
      passwordRecoveryError,
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
      recoverPasswordSessionFromUrl,
      requestPasswordReset,
      resetOnboardingDraft,
      session,
      signIn,
      signOut,
      signUp,
      finishPasswordRecovery,
      isPasswordRecoveryActive,
      passwordRecoveryError,
      updateRecoveredPassword,
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
