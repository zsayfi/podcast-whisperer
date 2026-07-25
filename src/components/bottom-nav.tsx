import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, Heart, User, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type NavTo = ComponentProps<typeof Link>["to"];

const items: { to: NavTo; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/saved", label: "Saved", icon: Heart },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="sticky bottom-0 z-40 w-full border-t border-primary/10 bg-mint"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4 gap-1 px-2 py-2">
        {items.map((item) => {
          const to = item.to as string;
          const active = item.exact ? pathname === to : pathname.startsWith(to);
          const Icon = item.icon;
          return (
            <li key={to} className="flex justify-center">
              <Link
                to={item.to}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition-colors",
                  active ? "bg-background shadow-sm" : "hover:bg-background/40",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active ? "text-gold" : "text-primary")}
                  strokeWidth={active ? 2.25 : 1.8}
                />
                <span className={cn(active ? "text-gold" : "text-primary")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
