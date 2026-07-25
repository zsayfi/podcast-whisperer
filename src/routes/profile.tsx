import { createFileRoute } from "@tanstack/react-router";
import { Bell, Headphones, Heart, LogOut, Settings } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile \u2014 Lume" },
      { name: "description", content: "Manage your Lume account, notifications, and listening preferences." },
      { property: "og:title", content: "Profile \u2014 Lume" },
      { property: "og:description", content: "Manage your Lume account, notifications, and listening preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const rows = [
  { icon: Headphones, label: "Listening history", hint: "128 episodes" },
  { icon: Heart, label: "Saved highlights", hint: "42 items" },
  { icon: Bell, label: "Notifications", hint: "On" },
  { icon: Settings, label: "Preferences", hint: "" },
  { icon: LogOut, label: "Sign out", hint: "" },
];

function ProfilePage() {
  return (
    <AppShell>
      <PageHeader title="Profile" subtitle="Your account and preferences" />

      <section className="mb-6 flex items-center gap-4 rounded-3xl bg-card p-5 shadow-sm">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary font-serif text-2xl text-primary-foreground">
          Z
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-xl font-bold text-primary">Zarrina</p>
          <p className="truncate text-sm text-card-foreground/80">zarrina@lume.app</p>
        </div>
      </section>

      <ul className="space-y-2">
        {rows.map(({ icon: Icon, label, hint }) => (
          <li key={label}>
            <button className="flex w-full items-center gap-4 rounded-2xl bg-card/70 px-4 py-4 text-left transition-colors hover:bg-card">
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <span className="flex-1 text-sm font-medium text-primary">{label}</span>
              {hint && <span className="text-xs text-gold">{hint}</span>}
            </button>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
