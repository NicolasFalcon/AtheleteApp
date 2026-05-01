import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoAthelete from '@/assets/logo-athelete.png';

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Recovery flow detection (kept for compatibility)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      // valid recovery session
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar la contraseña');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">¡Contraseña actualizada!</h1>
            <p className="text-sm text-muted-foreground">Redirigiendo al inicio de sesión…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={logoAthelete.src}
            alt="Athelete"
            className="w-16 h-16 dark:invert"
          />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Nueva contraseña
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa y confirma tu nueva contraseña
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nueva contraseña
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-border bg-card pr-10 text-foreground placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Confirmar contraseña
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="h-12 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Actualizando…
              </span>
            ) : (
              'Actualizar contraseña'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
