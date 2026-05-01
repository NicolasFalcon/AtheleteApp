import Image from "next/image";
import { cn } from "@/lib/utils";
import logoAthelete from "@/assets/logo-athelete.png";

export function BrandMark({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <Image
        src={logoAthelete}
        alt="Athelete"
        priority
        className={cn("h-20 w-20 rounded-full object-cover dark:invert", imageClassName)}
      />
    </div>
  );
}

