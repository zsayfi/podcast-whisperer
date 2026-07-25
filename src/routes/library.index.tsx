import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, LayoutGrid, Radio, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/app-shell";
import { listPodcastsWithEpisodes } from "@/lib/data";
import { cn } from "@/lib/utils";

type LibraryMenuTo = "/library/shows" | "/library/categories";

export const Route = createFileRoute("/library/")({
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

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: LibraryMenuTo;
};

const menu: MenuItem[] = [
  { label: "Shows", icon: Radio, to: "/library/shows" },
  { label: "Categories", icon: LayoutGrid, to: "/library/categories" },
];

function LibraryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: podcasts = [] } = useQuery({
    queryKey: ["podcasts-with-episodes"],
    queryFn: listPodcastsWithEpisodes,
  });

  const recentlyUpdated = useMemo(
    () =>
      podcasts.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.host.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, podcasts],
  );

  return (
    <AppShell>
      <PageHeader title="Library" subtitle="Browse through podcasts" />

      <label className="mb-5 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 text-primary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search podcasts..."
          className="min-w-0 flex-1 bg-transparent text-sm text-primary placeholder:text-primary/60 focus:outline-none"
        />
      </label>

      <nav aria-label="Library sections" className="mb-8">
        <ul className="rounded-3xl bg-card p-2 shadow-sm">
          {menu.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === menu.length - 1;
            return (
              <li key={item.label}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50",
                    !isLast && "border-b border-border",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="flex-1 font-serif text-base font-semibold text-primary">
                    {item.label}
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="recently-uploaded-heading">
        <h2 id="recently-uploaded-heading" className="mb-4 font-serif text-2xl font-bold text-primary">
          Recently Uploaded
        </h2>
        {recentlyUpdated.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No podcasts match "{query}".
          </p>
        ) : (
          <ul className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recentlyUpdated.map((p) => {
              const firstEp = p.episodes[0];
              if (!firstEp) return null;
              return (
                <li key={p.id} className="w-36 flex-shrink-0 sm:w-44">
                  <Link
                    to="/episode/$episodeId"
                    params={{ episodeId: firstEp.id }}
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
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
