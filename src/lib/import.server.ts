// Server-only helpers for importing podcast episodes: URL resolution,
// RSS parsing, audio download, transcription, and analysis.

const AUDIO_EXT_RE = /\.(mp3|m4a|mp4|wav|ogg|oga|opus|aac|flac|webm)(\?|#|$)/i;
const AUDIO_MIME_RE = /^audio\/|^application\/(ogg|octet-stream)/i;
const MAX_AUDIO_BYTES = 24 * 1024 * 1024; // 24 MiB (Whisper limit is 25)

export type ResolvedEpisode = {
  audioUrl: string;
  title: string;
  podcastTitle: string;
  podcastHost: string;
  rssUrl?: string;
  websiteUrl?: string;
  durationLabel?: string;
  dateLabel?: string;
};

const USER_AGENT =
  "Mozilla/5.0 (compatible; LumeBot/1.0; +https://lume.app) TranscriberBot";

async function fetchWithUA(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "*/*",
      ...(init?.headers ?? {}),
    },
    redirect: "follow",
  });
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function tag(source: string, name: string): string | undefined {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = source.match(re);
  return m ? decodeEntities(m[1]).trim() : undefined;
}

function attr(source: string, tagName: string, attrName: string): string | undefined {
  const re = new RegExp(`<${tagName}\\b[^>]*\\b${attrName}\\s*=\\s*"([^"]+)"`, "i");
  const m = source.match(re);
  return m ? decodeEntities(m[1]) : undefined;
}

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function humanDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function parseIso(date?: string): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isSpotify(url: string) {
  try {
    return new URL(url).hostname.endsWith("spotify.com");
  } catch {
    return false;
  }
}

function looksLikeAudioUrl(url: string) {
  return AUDIO_EXT_RE.test(url);
}

async function parseRssForEpisode(
  rssText: string,
  rssUrl: string,
  matchUrl?: string,
): Promise<ResolvedEpisode | null> {
  const channelTitle = tag(rssText, "title") ?? "Podcast";
  const channelAuthor =
    tag(rssText, "itunes:author") ??
    tag(rssText, "author") ??
    tag(rssText, "managingEditor") ??
    "";
  const websiteUrl = tag(rssText, "link");

  const items = rssText.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  if (!items.length) return null;

  let picked: string | undefined;
  if (matchUrl) {
    picked = items.find((it) => {
      const link = tag(it, "link") ?? attr(it, "guid", "isPermaLink");
      const enc = attr(it, "enclosure", "url");
      return (link && link.includes(matchUrl)) || (enc && enc === matchUrl);
    });
  }
  if (!picked) picked = items[0];
  if (!picked) return null;

  const enclosureUrl = attr(picked, "enclosure", "url");
  if (!enclosureUrl) return null;

  const title = tag(picked, "title") ?? "Episode";
  const durationRaw = tag(picked, "itunes:duration");
  let durationLabel: string | undefined;
  if (durationRaw) {
    if (/^\d+$/.test(durationRaw)) {
      durationLabel = humanDuration(Number(durationRaw));
    } else {
      const parts = durationRaw.split(":").map(Number);
      const secs =
        parts.length === 3
          ? parts[0] * 3600 + parts[1] * 60 + parts[2]
          : parts.length === 2
            ? parts[0] * 60 + parts[1]
            : parts[0];
      durationLabel = humanDuration(secs);
    }
  }
  const dateLabel = parseIso(tag(picked, "pubDate"));

  return {
    audioUrl: enclosureUrl,
    title,
    podcastTitle: channelTitle,
    podcastHost: channelAuthor,
    rssUrl,
    websiteUrl,
    durationLabel,
    dateLabel,
  };
}

async function discoverFromHtml(url: string, html: string): Promise<string | null> {
  // Look for <link rel="alternate" type="application/rss+xml" href="...">
  const linkRe =
    /<link\b[^>]*rel=["']alternate["'][^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i;
  const linkRe2 =
    /<link\b[^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i;
  const m = html.match(linkRe) ?? html.match(linkRe2);
  if (m) return new URL(m[1], url).toString();
  return null;
}

export async function resolveEpisode(rawUrl: string): Promise<ResolvedEpisode> {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Please paste a full https:// link to an episode.");
  }

  if (isSpotify(url)) {
    throw new Error(
      "Spotify blocks third-party audio downloads, so Lume can't transcribe Spotify links. Please paste the podcast's RSS feed episode page, or a direct audio (.mp3/.m4a) link.",
    );
  }

  // 1. Try the URL directly.
  const head = await fetchWithUA(url, { method: "GET" });
  if (!head.ok) {
    throw new Error(`Could not fetch that link (HTTP ${head.status}).`);
  }
  const contentType = head.headers.get("content-type") ?? "";

  // Direct audio URL
  if (AUDIO_MIME_RE.test(contentType) || looksLikeAudioUrl(url)) {
    // Drain the body so the connection can close cleanly.
    try {
      await head.body?.cancel();
    } catch {}
    const hostname = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return "podcast";
      }
    })();
    return {
      audioUrl: url,
      title: decodeURIComponent(url.split("/").pop() ?? "Episode").replace(
        /\.[a-z0-9]+$/i,
        "",
      ),
      podcastTitle: hostname,
      podcastHost: hostname,
    };
  }

  const body = await head.text();

  // Direct RSS feed?
  if (
    contentType.includes("xml") ||
    /^<\?xml/.test(body.trimStart()) ||
    /<rss\b/i.test(body.slice(0, 2000))
  ) {
    const resolved = await parseRssForEpisode(body, url);
    if (resolved) return resolved;
    throw new Error("Found an RSS feed but no episodes with downloadable audio.");
  }

  // HTML page — try to discover an RSS feed link.
  if (contentType.includes("html") || /<html/i.test(body.slice(0, 2000))) {
    const feedUrl = await discoverFromHtml(url, body);
    if (feedUrl) {
      const feedRes = await fetchWithUA(feedUrl);
      if (feedRes.ok) {
        const feedText = await feedRes.text();
        const resolved = await parseRssForEpisode(feedText, feedUrl, url);
        if (resolved) return resolved;
      }
    }
    throw new Error(
      "Couldn't find a downloadable audio file for that page. Try pasting the podcast's RSS feed URL or a direct .mp3 link.",
    );
  }

  throw new Error(
    "Unrecognised link. Paste a direct audio URL (.mp3/.m4a), an RSS feed, or a podcast episode page.",
  );
}

export async function downloadAudio(url: string): Promise<Blob> {
  const res = await fetchWithUA(url);
  if (!res.ok) {
    throw new Error(`Failed to download audio (HTTP ${res.status}).`);
  }
  const lenHeader = res.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_AUDIO_BYTES) {
    throw new Error(
      `Audio file is too large (${Math.round(
        Number(lenHeader) / 1024 / 1024,
      )} MB). Whisper's limit is 25 MB — please try a shorter episode.`,
    );
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_AUDIO_BYTES) {
    throw new Error(
      `Audio file is too large (${Math.round(
        buf.byteLength / 1024 / 1024,
      )} MB). Whisper's limit is 25 MB — please try a shorter episode.`,
    );
  }
  const type = res.headers.get("content-type") ?? "audio/mpeg";
  return new Blob([buf], { type });
}

function extToFilename(url: string, mime: string): string {
  const m = url.match(AUDIO_EXT_RE);
  if (m) return `audio.${m[1].toLowerCase()}`;
  if (/mp4|m4a/.test(mime)) return "audio.m4a";
  if (/wav/.test(mime)) return "audio.wav";
  if (/ogg|opus/.test(mime)) return "audio.ogg";
  return "audio.mp3";
}

export async function transcribeAudio(
  audio: Blob,
  sourceUrl: string,
  lovableApiKey: string,
): Promise<string> {
  const form = new FormData();
  form.append("model", "openai/gpt-4o-mini-transcribe");
  form.append("file", audio, extToFilename(sourceUrl, audio.type));

  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}` },
      body: form,
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 402) {
      throw new Error("AI credits exhausted — add credits to keep transcribing.");
    }
    if (res.status === 429) {
      throw new Error("Rate limited by the AI gateway — try again in a minute.");
    }
    throw new Error(`Transcription failed [${res.status}]: ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as { text?: string };
  const text = (json.text ?? "").trim();
  if (!text) throw new Error("Transcription returned an empty result.");
  return text;
}

export type EpisodeAnalysis = {
  summary: string;
  questions: { q: string; a: string }[];
  books: { title: string; author: string }[];
  recipes: { title: string; note: string }[];
  misc: { title: string; note: string }[];
  suggestedCategory:
    | "HEALTH"
    | "TECH"
    | "FOOD"
    | "HISTORY"
    | "FEMINISM"
    | "RELATIONSHIPS";
};

const ANALYSIS_SYSTEM = `You analyze a podcast episode transcript. Return valid JSON only, matching this shape:
{
  "summary": "2-4 sentence overview of the episode",
  "questions": [{ "q": "listener question", "a": "concise 1-3 sentence answer grounded in the transcript" }],
  "books": [{ "title": "book title", "author": "author name (or empty string)" }],
  "recipes": [{ "title": "recipe or practice name", "note": "short description or key steps" }],
  "misc": [{ "title": "notable item", "note": "why it matters" }],
  "suggestedCategory": "HEALTH" | "TECH" | "FOOD" | "HISTORY" | "FEMINISM" | "RELATIONSHIPS"
}
Rules:
- Only include items actually discussed in the transcript. Empty arrays are fine.
- 4-8 suggested questions covering the key themes.
- Books: real books mentioned. Recipes: cooking recipes OR wellness/mindfulness practices.
- suggestedCategory: pick the best fit from the fixed list.
- Output raw JSON, no markdown fences, no commentary.`;

export async function analyzeTranscript(
  transcript: string,
  episodeTitle: string,
  lovableApiKey: string,
): Promise<EpisodeAnalysis> {
  // Truncate transcript defensively (~120k chars ≈ 30k tokens is still safe for Gemini Flash).
  const truncated =
    transcript.length > 120_000 ? transcript.slice(0, 120_000) : transcript;

  const body = {
    model: "google/gemini-3.6-flash",
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM },
      {
        role: "user",
        content: `Episode title: ${episodeTitle}\n\nTranscript:\n${truncated}\n\nReturn the JSON now.`,
      },
    ],
    response_format: { type: "json_object" },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Analysis failed [${res.status}]: ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = safeParseJson(content);
  return normalizeAnalysis(parsed);
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract a JSON block.
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return {};
  }
}

const CATEGORIES = [
  "HEALTH",
  "TECH",
  "FOOD",
  "HISTORY",
  "FEMINISM",
  "RELATIONSHIPS",
] as const;

function normalizeAnalysis(raw: unknown): EpisodeAnalysis {
  const r = (raw ?? {}) as Record<string, unknown>;
  const arr = <T>(v: unknown, mapper: (x: any) => T | null): T[] =>
    Array.isArray(v)
      ? (v.map(mapper).filter((x): x is T => x !== null) as T[])
      : [];
  const category = String(r.suggestedCategory ?? "HEALTH").toUpperCase() as any;
  return {
    summary: typeof r.summary === "string" ? stripHtml(r.summary) : "",
    questions: arr(r.questions, (x) =>
      x && typeof x.q === "string" && typeof x.a === "string"
        ? { q: x.q, a: x.a }
        : null,
    ),
    books: arr(r.books, (x) =>
      x && typeof x.title === "string"
        ? { title: x.title, author: typeof x.author === "string" ? x.author : "" }
        : null,
    ),
    recipes: arr(r.recipes, (x) =>
      x && typeof x.title === "string"
        ? { title: x.title, note: typeof x.note === "string" ? x.note : "" }
        : null,
    ),
    misc: arr(r.misc, (x) =>
      x && typeof x.title === "string"
        ? { title: x.title, note: typeof x.note === "string" ? x.note : "" }
        : null,
    ),
    suggestedCategory: CATEGORIES.includes(category) ? category : "HEALTH",
  };
}

export function slugify(input: string, fallback = "podcast"): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}
