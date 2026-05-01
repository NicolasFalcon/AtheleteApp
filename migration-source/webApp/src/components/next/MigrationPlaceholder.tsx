import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isDevRuntime } from "@/lib/runtimeEnv";

interface MigrationPlaceholderProps {
  title: string;
  description: string;
  source: string;
  nextStep?: string;
  primaryHref?: string;
  primaryLabel?: string;
}

export function MigrationPlaceholder({
  title,
  description,
  source,
  nextStep,
  primaryHref,
  primaryLabel,
}: MigrationPlaceholderProps) {
  return (
    <div className="px-4 page-safe-top page-safe-bottom">
      <div className="card-elevated p-5">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contenido no disponible
          </p>
          <h1 className="page-title">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        {isDevRuntime() ? (
          <div className="mt-5 space-y-3 rounded-2xl bg-secondary/60 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Referencia técnica
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{source}</p>
            </div>

            {nextStep ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nota
                </p>
                <p className="mt-1 text-sm text-foreground">{nextStep}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {primaryHref && primaryLabel ? (
          <Button asChild className="mt-5 w-full rounded-full">
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
