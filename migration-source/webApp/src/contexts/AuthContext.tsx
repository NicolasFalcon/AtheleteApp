import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface OnboardingData {
  goal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';
  birthDate: string;
  weight: number;
  height: number;
  trainingDaysPerWeek: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  onboardingData: OnboardingData | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, email: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setUser({
        id: userId,
        name: (profile as any).name || '',
        email,
      });
      setOnboardingCompleted(!!(profile as any).onboarding_completed);
      if ((profile as any).onboarding_completed) {
        setOnboardingData({
          goal: (profile as any).goal as OnboardingData['goal'],
          birthDate: (profile as any).birth_date || '',
          weight: Number((profile as any).weight) || 0,
          height: Number((profile as any).height) || 0,
          trainingDaysPerWeek: (profile as any).training_days_per_week || 3,
        });
      }
    } else {
      setUser({ id: userId, name: '', email });
      setOnboardingCompleted(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore token refresh events — profile data hasn't changed,
        // and re-fetching here causes a DOM reconciliation crash.
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        if (session?.user) {
          // Use setTimeout to avoid Supabase client deadlock
          setTimeout(() => {
            fetchProfile(session.user.id, session.user.email || '');
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setOnboardingCompleted(false);
          setOnboardingData(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '');
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOnboardingCompleted(false);
    setOnboardingData(null);
  };

  const completeOnboarding = async (data: OnboardingData) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        goal: data.goal,
        birth_date: data.birthDate,
        weight: data.weight,
        height: data.height,
        training_days_per_week: data.trainingDaysPerWeek,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', user.id);

    if (error) throw new Error(error.message);
    setOnboardingData(data);
    setOnboardingCompleted(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        onboardingCompleted,
        isLoading,
        signIn,
        signUp,
        signOut,
        completeOnboarding,
        onboardingData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
