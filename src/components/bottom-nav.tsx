import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { to: string; label: string; icon: typeof Home; exact?: boolean }[] = [
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
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex justify-center">
              <Link
                to={item.to}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-background text-gold shadow-sm"
                    : "text-primary/80 hover:text-primary",
                )}
              >
                <Icon className={cn("h-5 w-5", active ? "text-gold" : "text-primary")} strokeWidth={active ? 2.25 : 1.8} />
                <span className={cn(active ? "text-gold" : "text-primary")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
