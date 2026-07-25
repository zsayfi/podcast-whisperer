import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/app-shell";
import { listPodcastsWithEpisodes, type PodcastCategory } from "@/lib/data";

export const Route = createFileRoute("/library/categories")({
  head: () => ({
    meta: [
      { title: "Categories — Lume" },
      { name: "description", content: "Browse podcast episodes grouped by category." },
      { property: "og:title", content: "Categories — Lume" },
      { property: "og:description", content: "Browse podcast episodes grouped by category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});

const CATEGORIES: PodcastCategory[] = [
  "HEALTH",
  "TECH",
  "FOOD",
  "HISTORY",
  "FEMINISM",
  "RELATIONSHIPS",
];

function CategoriesPage() {
  const { data: podcasts = [] } = useQuery({
    queryKey: ["podcasts-with-episodes"],
    queryFn: listPodcastsWithEpisodes,
  });

  const grouped = useMemo(() => {
    return CATEGORIES.map((category) => {
      const episodes = podcasts
        .filter((p) => p.category === category)
        .flatMap((p) => p.episodes.map((e) => ({ podcast: p, episode: e })));
      return { category, episodes };
    });
  }, [podcasts]);

  return (
    <AppShell>
      <Link
        to="/library"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary/70 hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Library
      </Link>
      <PageHeader title="Categories" subtitle="Episodes grouped by topic" />

      <div className="space-y-8">
        {grouped.map(({ category, episodes }) => (
          <section key={category} aria-labelledby={`cat-${category}`}>
            <h2
              id={`cat-${category}`}
              className="mb-3 font-serif text-xl font-bold text-primary"
            >
              {category.charAt(0) + category.slice(1).toLowerCase()}
            </h2>
            {episodes.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-sm">
                No episodes yet in this category.
              </p>
            ) : (
              <ul className="space-y-3">
                {episodes.map(({ podcast, episode }) => (
                  <li key={episode.id}>
                    <Link
                      to="/episode/$episodeId"
                      params={{ episodeId: episode.id }}
                      className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm transition-colors hover:bg-muted/50"
                    >
                      <img
                        src={podcast.cover}
                        alt={podcast.title}
                        loading="lazy"
                        width={64}
                        height={64}
                        className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium uppercase tracking-wide text-gold">
                          {podcast.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 font-serif text-sm font-semibold text-primary">
                          {episode.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Ep {episode.epNumber} · {episode.duration}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
