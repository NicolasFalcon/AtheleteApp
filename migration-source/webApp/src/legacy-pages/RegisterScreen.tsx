import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import logoAthelete from '@/assets/logo-athelete.png';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es obligatorio';
    if (!email.trim()) e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Correo inválido';
    if (!password) e.password = 'La contraseña es obligatoria';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signUp(name, email, password);
      setEmailSent(true);
    } catch (err: any) {
      setErrors({ form: err.message || 'Error al crear la cuenta' });
    } finally {
      setSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7 text-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Revisa tu correo</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enviamos un enlace de verificación a{' '}
              <span className="text-foreground font-medium">{email}</span>.
              <br />
              Verifica tu correo para continuar.
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-10">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={logoAthelete.src}
            alt="Athelete"
            className="w-20 h-20 dark:invert"
          />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Crear cuenta
            </h1>
            <p className="text-sm text-muted-foreground">
              Comienza tu camino fitness con Athelete
            </p>
          </div>
        </div>

        {/* Error banner */}
        {errors.form && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errors.form}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nombre
              </label>
              <Input
                placeholder="Tu nombre"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-12 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground/50"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

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
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contraseña
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
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
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
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
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
                Creando cuenta…
              </span>
            ) : (
              'Crear cuenta'
            )}
          </Button>
        </form>

        {/* Secondary link */}
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-foreground font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
