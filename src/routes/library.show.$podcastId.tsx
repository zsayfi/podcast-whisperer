import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, Calendar, Play, Headphones } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { findPodcast, type Episode } from "@/lib/mock-data";

export const Route = createFileRoute("/library/show/$podcastId")({
  loader: ({ params }) => {
    const podcast = findPodcast(params.podcastId);
    if (!podcast) throw notFound();
    return { podcast };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Show not found \u2014 Lume" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { podcast } = loaderData;
    const title = `${podcast.title} \u2014 Lume`;
    const desc = `All episodes of ${podcast.title} with Lume.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ShowPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="py-16 text-center">
        <p className="font-serif text-2xl text-primary">Show not found</p>
        <Link to="/library/shows" className="mt-3 inline-block text-sm text-gold underline">
          Back to shows
        </Link>
      </div>
    </AppShell>
  ),
});

function ShowPage() {
  const { podcast } = Route.useLoaderData();

  return (
    <AppShell>
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/library/shows"
          className="grid h-10 w-10 place-items-center rounded-full bg-card text-primary shadow-sm"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-gold">
            Library
          </p>
          <p className="truncate text-sm font-semibold text-primary">Show</p>
        </div>
      </div>

      <section className="mb-6 flex items-center gap-4 rounded-3xl bg-card p-4 shadow-sm">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl shadow-sm">
          <img
            src={podcast.cover}
            alt={podcast.title}
            loading="lazy"
            width={400}
            height={400}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-bold leading-tight text-primary sm:text-3xl">
            {podcast.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{podcast.host}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gold">
            <Headphones className="h-3.5 w-3.5" />
            {podcast.episodeCount} episodes
          </p>
        </div>
      </section>

      <PageHeader title="List of the episodes" subtitle={`All available episodes of ${podcast.title}`} />

      <ul className="space-y-3">
        {podcast.episodes.map((episode: Episode) => (
          <li key={episode.id}>
            <Link
              to="/episode/$episodeId"
              params={{ episodeId: episode.id }}
              className="group flex gap-4 overflow-hidden rounded-3xl bg-card p-3 shadow-sm transition-colors hover:bg-primary/5"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
                <img
                  src={podcast.cover}
                  alt={podcast.title}
                  loading="lazy"
                  width={400}
                  height={400}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-gold text-gold-foreground shadow-sm">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
                  Ep. {episode.epNumber}
                </p>
                <h3 className="mt-0.5 line-clamp-2 font-serif text-base font-bold leading-snug text-primary sm:text-lg">
                  {episode.title}
                </h3>
                <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {episode.duration}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {episode.date}
                  </span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
