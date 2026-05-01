import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logoAthelete from "@/assets/logo-athelete.png";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Formato de correo inválido";
    if (!password) e.password = "La contraseña es obligatoria";
    else if (password.length < 6) e.password = "Mínimo 6 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || "Credenciales inválidas");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={logoAthelete.src}
            alt="Athelete"
            className="w-20 h-20 rounded-full object-cover"
          />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Bienvenido a Athelete
            </h1>
            <p className="text-sm text-muted-foreground">
              Inicia sesión para continuar tu entrenamiento
            </p>
          </div>
        </div>

        {/* Error banner */}
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
                Correo electrónico
              </label>
              <Input
                type="email"
                placeholder="tu@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-border bg-card text-foreground placeholder:text-muted-foreground/50"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-border bg-card pr-10 text-foreground placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Iniciando sesión…
              </span>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>

        {/* Secondary link */}
        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            to="/register"
            className="text-foreground font-medium hover:underline"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
