import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { podcasts } from "@/lib/mock-data";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library \u2014 Lume" },
      { name: "description", content: "Browse every podcast in your Lume library." },
      { property: "og:title", content: "Library \u2014 Lume" },
      { property: "og:description", content: "Browse every podcast in your Lume library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const [query, setQuery] = useState("");
  const filtered = podcasts.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.host.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader title="Library" subtitle="Browse through podcasts" />

      <label className="mb-6 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 text-primary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search podcasts..."
          className="min-w-0 flex-1 bg-transparent text-sm text-primary placeholder:text-primary/60 focus:outline-none"
        />
      </label>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {filtered.map((p) => (
          <li key={p.id}>
            <Link
              to="/episode/$episodeId"
              params={{ episodeId: p.episodes[0].id }}
              className="group block overflow-hidden rounded-3xl bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={p.cover}
                  alt={p.title}
                  loading="lazy"
                  width={800}
                  height={800}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="truncate font-serif text-base font-bold text-primary">{p.title}</p>
                <p className="mt-1 truncate text-xs text-gold">{p.host}</p>
                <p className="mt-1 text-xs text-card-foreground/70">{p.episodeCount} episodes</p>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="col-span-full py-10 text-center text-sm text-muted-foreground">
            No podcasts match "{query}".
          </li>
        )}
      </ul>
    </AppShell>
  );
}
