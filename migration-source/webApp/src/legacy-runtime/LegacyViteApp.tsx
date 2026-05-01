// Legacy Vite runtime kept temporarily during the Next.js migration.
// The primary app runtime now lives in the Next app router under `app/`.

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { WorkoutSessionProvider } from "@/contexts/WorkoutSessionContext";
import { GamificationProvider } from "@/contexts/GamificationContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "../legacy-pages/Index";
import Core33Challenge from "../legacy-pages/Core33Challenge";
import LoginScreen from "../legacy-pages/LoginScreen";
import RegisterScreen from "../legacy-pages/RegisterScreen";
import ForgotPasswordScreen from "../legacy-pages/ForgotPasswordScreen";
import ResetPasswordScreen from "../legacy-pages/ResetPasswordScreen";
import OnboardingScreen from "../legacy-pages/OnboardingScreen";
import NotFound from "../legacy-pages/NotFound";

const queryClient = new QueryClient();

function AuthenticatedRoutes() {
  const { isAuthenticated, onboardingCompleted, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AppProvider>
      <WorkoutSessionProvider>
        <GamificationProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/challenges/core-33" element={<Core33Challenge />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </GamificationProvider>
      </WorkoutSessionProvider>
    </AppProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, onboardingCompleted, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={onboardingCompleted ? "/" : "/onboarding"} replace /> : <LoginScreen />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to={onboardingCompleted ? "/" : "/onboarding"} replace /> : <RegisterScreen />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordScreen />}
      />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route
        path="/onboarding"
        element={
          !isAuthenticated ? <Navigate to="/login" replace /> :
          onboardingCompleted ? <Navigate to="/" replace /> :
          <OnboardingScreen />
        }
      />
      <Route path="/*" element={<AuthenticatedRoutes />} />
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
export default App;
