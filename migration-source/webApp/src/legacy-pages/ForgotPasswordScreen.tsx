import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoAthelete from '@/assets/logo-athelete.png';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo válido');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar el correo de recuperación');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7 text-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Revisa tu bandeja de entrada</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enviamos un enlace de recuperación a{' '}
              <span className="text-foreground font-medium">{email}</span>
            </p>
          </div>
          <Link to="/login">
            <Button variant="outline" className="w-full h-12 rounded-xl mt-2">
              Volver a iniciar sesión
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>

        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={logoAthelete.src}
            alt="Athelete"
            className="w-16 h-16 dark:invert"
          />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Recuperar contraseña
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Correo electrónico
            </label>
            <Input
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-12 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando…
              </span>
            ) : (
              'Enviar enlace de recuperación'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
