import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { podcasts } from "@/lib/mock-data";

export const Route = createFileRoute("/library/shows")({
  head: () => ({
    meta: [
      { title: "Shows — Lume" },
      { name: "description", content: "All podcast shows in your Lume library." },
      { property: "og:title", content: "Shows — Lume" },
      { property: "og:description", content: "All podcast shows in your Lume library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShowsPage,
});

function ShowsPage() {
  return (
    <AppShell>
      <Link
        to="/library"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary/70 hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Library
      </Link>
      <PageHeader title="Shows" subtitle="Every podcast in your library" />

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {podcasts.map((p) => (
          <li key={p.id}>
            <Link
              to="/saved/show/$podcastId"
              params={{ podcastId: p.id }}
              className="group block"
            >
              <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={p.cover}
                    alt={p.title}
                    loading="lazy"
                    width={400}
                    height={400}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate font-serif text-sm font-bold text-primary">{p.title}</p>
                  <p className="mt-0.5 truncate text-xs text-gold">{p.host}</p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
