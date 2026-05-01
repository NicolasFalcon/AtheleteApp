"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, Sparkles, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/entrenos", label: "Entrenos", icon: Dumbbell },
  { href: "/ellie", label: "ELLIE", icon: Sparkles },
  { href: "/progreso", label: "Progreso", icon: TrendingUp },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          const isEllie = href === "/ellie";

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 transition-colors duration-150",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground active:text-foreground",
              )}
            >
              {isEllie ? (
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150",
                    isActive
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                </div>
              ) : (
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-150",
                    isActive && "scale-105",
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              )}
              <span
                className={cn(
                  "text-[10px] leading-none",
                  isActive ? "font-semibold" : "font-medium",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
