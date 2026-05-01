import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/next/BrandMark";

export function LoadingScreen({
  title = "Cargando Athelete",
  description = "Preparando la experiencia móvil...",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="app-screen page-safe-bottom page-safe-top flex items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <BrandMark />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
