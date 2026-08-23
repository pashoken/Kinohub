import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import Fastify from "fastify";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { catalogSchema, healthSchema, type Movie, type Series } from "@kinohub/contracts";
import { fixtureCatalog } from "../../../fixtures/catalog.js";
import type { AppConfig } from "./config.js";
import { integrationDiagnostics } from "./integrations/health.js";
import { JackettClient } from "./integrations/jackett.js";
import { SeerrClient } from "./integrations/seerr.js";
import { KinopoiskClient, PoiskKinoClient } from "./integrations/kinopoisk.js";
import { TorrServerClient } from "./integrations/torrserver.js";
import {
  mockRequestAdapter,
  RequestCoordinator,
  requestMovieSchema,
} from "./requests.js";
import { releaseFixtures } from "../../../fixtures/releases.js";
import {
  rankRelease,
  rankSeriesRelease,
  ReleaseCache,
  toPublicChoice,
} from "./release-ranking.js";
import {
  mockTorrServer,
  PlaybackCoordinator,
  PlaybackError,
} from "./playback.js";

export function buildApp(config: AppConfig) {
  const app = Fastify({ logger: false, bodyLimit: 1_048_576 });
  const seerr = config.APP_MODE === "live" && config.SEERR_URL && config.SEERR_API_KEY
    ? new SeerrClient(new URL(config.SEERR_URL), config.SEERR_API_KEY)
    : undefined;
  const kinopoisk = config.KINOPOISK_API_KEY ? new KinopoiskClient(config.KINOPOISK_API_KEY) : undefined;
  const poiskKino = config.POISKKINO_API_KEY ? new PoiskKinoClient(config.POISKKINO_API_KEY) : undefined;
  const jackett = config.APP_MODE === "live" && config.JACKETT_URL && config.JACKETT_API_KEY
    ? new JackettClient(new URL(config.JACKETT_URL), config.JACKETT_API_KEY, { timeoutMs: 30_000, retries: 0 }, new URL(config.PUBLIC_JACKETT_URL ?? config.JACKETT_URL))
    : undefined;
  const requestAdapter = seerr
    ? { async requestMovie(input: { movieId: string; mediaType: "movie"; serverId: number; profileId: number }) {
        await seerr.request({ mediaId: input.movieId, serverId: input.serverId, profileId: input.profileId });
        return { status: "queued" };
      } }
    : mockRequestAdapter();
  const requests = new RequestCoordinator(requestAdapter, config.SEERR_SERVER_ID, config.SEERR_PROFILE_ID);
  const releases = new ReleaseCache();
  const torrServerInternal = new URL(config.TORRSERVER_URL ?? "http://torrserver:8090");
  const torrServerPublic = new URL(config.PUBLIC_TORRSERVER_URL ?? torrServerInternal);
  const torrServer = config.APP_MODE === "live" && config.TORRSERVER_URL
    ? new TorrServerClient(torrServerInternal, {}, torrServerPublic)
    : mockTorrServer(torrServerPublic);
  const playback = new PlaybackCoordinator(
    releases,
    torrServer,
    torrServerPublic,
  );
  void app.register(cors, { origin: config.PUBLIC_APP_ORIGIN });
  const proxyMovieImages = (movie: Movie): Movie => ({
    ...movie,
    posterUrl: proxyImageUrl(movie.posterUrl, config.PUBLIC_APP_ORIGIN),
    backdropUrl: proxyImageUrl(movie.backdropUrl, config.PUBLIC_APP_ORIGIN),
  });
  const proxySeriesImages = (series: Series): Series => ({
    ...series,
    posterUrl: proxyImageUrl(series.posterUrl, config.PUBLIC_APP_ORIGIN),
    backdropUrl: proxyImageUrl(series.backdropUrl, config.PUBLIC_APP_ORIGIN),
    seasons: series.seasons.map((season) => ({ ...season, posterUrl: proxyImageUrl(season.posterUrl, config.PUBLIC_APP_ORIGIN) })),
  });

  app.get("/api/health", async () =>
    healthSchema.parse({ status: "ok", mode: config.APP_MODE }),
  );
  app.get("/msx/start.json", async (_request, reply) => reply
    .header("access-control-allow-origin", "*")
    .header("cache-control", "no-store")
    .send({
      name: "KinoHub",
      version: "1.0.0",
      parameter: `content:${config.PUBLIC_APP_ORIGIN}/msx/kinohub.json`,
      welcome: "content",
      launcher: { icon: "movie", color: "msx-orange" },
    }));
  app.get("/msx/kinohub.json", async (_request, reply) => reply
    .header("access-control-allow-origin", "*")
    .header("cache-control", "no-store")
    .send({
      type: "pages",
      headline: "KinoHub",
      template: {
        type: "default",
        layout: "0,0,4,3",
        color: "msx-glass",
        icon: "movie",
        action: `link:${config.PUBLIC_APP_ORIGIN}/`,
      },
      items: [{
        title: "Открыть KinoHub",
        titleFooter: "Домашний кинотеатр",
        focus: true,
        action: `link:${config.PUBLIC_APP_ORIGIN}/`,
      }],
    }));
  app.get("/api/catalog", async () => {
    if (!seerr) return catalogSchema.parse(fixtureCatalog);
    const pages = await Promise.all(liveRails.map((rail) => seerr.discover(1, rail.options)));
    return catalogSchema.parse({
      rails: pages.map((movies, index) => ({
        id: liveRails[index]!.id,
        title: liveRails[index]!.title,
        movies: movies.map(proxyMovieImages),
      })),
      generatedAt: new Date().toISOString(),
    });
  });
  app.get("/api/series", async (request, reply) => {
    if (!seerr) return { series: [] };
    const parsed = z.object({ page: z.coerce.number().int().min(1).max(100).default(1) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ code: "INVALID_PAGE", message: "Некорректная страница" });
    const series = (await seerr.discoverSeries(parsed.data.page)).map(proxySeriesImages);
    return { series, page: parsed.data.page, hasMore: series.length >= 15 };
  });
  app.get("/api/series/:id", async (request, reply) => {
    if (!seerr) return reply.code(404).send({ code: "SERIES_NOT_FOUND", message: "Сериал не найден" });
    const id = (request.params as { id: string }).id;
    try { return proxySeriesImages(await seerr.seriesDetail(id)); }
    catch { return reply.code(404).send({ code: "SERIES_NOT_FOUND", message: "Сериал не найден" }); }
  });
  app.get("/api/rails/:id", async (request, reply) => {
    if (!seerr) return reply.code(404).send({ code: "LIVE_ONLY", message: "Расширенные ленты доступны в live-режиме" });
    const id = (request.params as { id: string }).id;
    const rail = liveRails.find((item) => item.id === id);
    const parsed = z.object({ page: z.coerce.number().int().min(1).max(100).default(1) }).safeParse(request.query);
    if (!rail || !parsed.success) return reply.code(404).send({ code: "RAIL_NOT_FOUND", message: "Лента не найдена" });
    const movies = (await seerr.discover(parsed.data.page, rail.options)).map(proxyMovieImages);
    return { id: rail.id, title: rail.title, page: parsed.data.page, hasMore: movies.length >= 15, movies };
  });
  app.get("/api/movies/:id/recommendations", async (request) => {
    const id = (request.params as { id: string }).id;
    return { movies: seerr ? (await seerr.recommendations(id)).map(proxyMovieImages) : [] };
  });
  app.get("/api/search", async (request) => {
    const parsed = z
      .object({ q: z.string().max(120).optional() })
      .safeParse(request.query);
    const query = parsed.success
      ? (parsed.data.q ?? "").trim().toLocaleLowerCase("ru")
      : "";
    if (seerr && query) return {
      query,
      movies: (await seerr.search(query)).map(proxyMovieImages),
      series: (await seerr.searchSeries(query)).map(proxySeriesImages),
    };
    const movies = fixtureCatalog.rails.flatMap((rail) => rail.movies);
    return {
      query,
      movies: query
        ? movies.filter((movie) =>
            `${movie.title} ${movie.originalTitle ?? ""}`
              .toLocaleLowerCase("ru")
              .includes(query),
          )
        : [], series: [],
    };
  });
  app.get("/api/ratings/kinopoisk", async (request, reply) => {
    const parsed = z.object({
      title: z.string().trim().min(1).max(200),
      year: z.coerce.number().int().min(1888).max(2200),
    }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ code: "INVALID_MOVIE", message: "Некорректные данные фильма" });
    if (!kinopoisk && !poiskKino) return { rating: null, id: null };
    try {
      const result = kinopoisk
        ? await kinopoisk.rating(parsed.data.title, parsed.data.year)
        : await poiskKino!.rating(parsed.data.title, parsed.data.year);
      return { rating: result?.rating ?? null, id: result?.id ?? null };
    } catch {
      try {
        const result = poiskKino ? await poiskKino.rating(parsed.data.title, parsed.data.year) : null;
        return { rating: result?.rating ?? null, id: result?.id ?? null };
      } catch { return { rating: null, id: null }; }
    }
  });
  app.get("/api/health/integrations", async () => ({
    mode: config.APP_MODE,
    services: integrationDiagnostics(config).map((item) => {
      const variable = `${item.service.toUpperCase()}_URL`;
      const raw = config[variable as keyof AppConfig];
      let endpoint = `mock://${item.service}`;
      if (config.APP_MODE !== "mock") {
        try {
          endpoint = typeof raw === "string" ? new URL(raw).origin : "не указан";
        } catch {
          endpoint = "некорректный адрес";
        }
      }
      return {
        ...item,
        name: item.service,
        configured: item.status !== "missing",
        endpoint,
        message: item.remediation,
      };
    }),
    message:
      config.APP_MODE === "mock"
        ? "Интеграции работают в тестовом режиме"
        : "Проверьте подключения домашних сервисов",
  }));
  app.post("/api/requests", async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && origin !== config.PUBLIC_APP_ORIGIN)
      return reply.code(403).send({
        code: "ORIGIN_DENIED",
        message: "Источник запроса не разрешён",
      });
    const parsed = requestMovieSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        code: "INVALID_REQUEST",
        message: "Некорректный идентификатор фильма",
      });
    return requests.request(parsed.data.movieId);
  });
  app.post("/api/torrents/search", async (request, reply) => {
    const parsed = z
      .object({ movieId: z.string().min(1).max(80).optional(), seriesId: z.string().min(1).max(80).optional(), season: z.number().int().positive().optional(), episode: z.number().int().positive().optional() })
      .refine((value) => Boolean(value.movieId) !== Boolean(value.seriesId))
      .strict()
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({
        code: "INVALID_SEARCH",
        message: "Некорректный фильм для поиска",
      });
    const movie = parsed.data.movieId ? (seerr
      ? proxyMovieImages(await seerr.detail(parsed.data.movieId))
      : fixtureCatalog.rails.flatMap((rail) => rail.movies).find((item) => item.id === parsed.data.movieId)) : undefined;
    const series = parsed.data.seriesId && seerr ? proxySeriesImages(await seerr.seriesDetail(parsed.data.seriesId)) : undefined;
    const media = movie ?? series;
    if (!media)
      return reply
        .code(404)
        .send({ code: "MOVIE_NOT_FOUND", message: "Фильм не найден" });
    if (config.APP_MODE === "live" && !jackett)
      return reply.code(503).send({ code: "JACKETT_NOT_CONFIGURED", message: "Для поиска торрентов нужно подключить Jackett" });
    let sourceReleases = releaseFixtures;
    if (jackett && series) {
      const titles = [...new Set([series.title, series.originalTitle].filter((value): value is string => Boolean(value)))];
      const queries = titles.flatMap((title) => parsed.data.episode ? [
        { title, season: parsed.data.season ?? 1, episode: parsed.data.episode }, { title, season: parsed.data.season ?? 1 }, { title, television: true },
      ] : [{ title, season: parsed.data.season ?? 1 }, { title, television: true }]);
      const batches = await Promise.all(queries.map((query) => jackett.search(query).catch(() => [])));
      sourceReleases = [...new Map(batches.flat().map((release) => [`${release.indexer}:${release.title}:${release.linkToken}`, release])).values()];
    } else if (jackett) sourceReleases = await jackett.search({ title: movie!.title, year: movie!.year });
    const choices = sourceReleases
      .map((release) => series ? rankSeriesRelease(release, parsed.data.season ?? 1) : rankRelease(release))
      .sort(
        (a, b) =>
          b.score - a.score || a.raw.title.localeCompare(b.raw.title, "ru"),
      )
      .map((ranked) => toPublicChoice(ranked, releases.put(ranked.raw)));
    return {
      query: { title: media.title, year: media.year, ...(movie ? { movieId: movie.id } : { seriesId: series!.id, season: parsed.data.season, episode: parsed.data.episode }) },
      choices,
    };
  });
  app.post("/api/playback/handoff", async (request, reply) => {
    const parsed = z
      .object({ choiceId: z.uuid() })
      .strict()
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ code: "INVALID_CHOICE", message: "Некорректный выбор релиза" });
    try {
      return await playback.handoff(parsed.data.choiceId);
    } catch (error) {
      if (!(error instanceof PlaybackError)) throw error;
      const status =
        error.code === "TORRSERVER_TIMEOUT"
          ? 504
          : error.code === "NO_PLAYABLE_FILES"
            ? 422
            : 410;
      return reply
        .code(status)
        .send({ code: error.code, message: error.message });
    }
  });
  app.get("/api/playback/:sessionId", async (request, reply) => {
    const id = (request.params as { sessionId: string }).sessionId;
    const session = playback.getSession(id);
    return (
      session ??
      reply
        .code(410)
        .send({ code: "SESSION_EXPIRED", message: "Сеанс просмотра истёк" })
    );
  });
  app.get("/api/movies/:id", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const movie = seerr ? proxyMovieImages(await seerr.detail(id)) : fixtureCatalog.rails.flatMap((rail) => rail.movies).find((item) => item.id === id);
    return (
      movie ??
      reply
        .code(404)
        .send({ code: "MOVIE_NOT_FOUND", message: "Фильм не найден" })
    );
  });
  app.get("/api/images/tmdb/*", async (request, reply) => {
    const path = (request.params as { "*": string })["*"];
    if (!/^(?:w\d+|original)\/[A-Za-z0-9._/-]+$/.test(path))
      return reply.code(400).send({ code: "INVALID_IMAGE", message: "Некорректный путь изображения" });
    const response = await fetch(`https://image.tmdb.org/t/p/${path}`, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return reply.code(response.status).send({ code: "IMAGE_UNAVAILABLE", message: "Изображение недоступно" });
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) return reply.code(502).send({ code: "INVALID_IMAGE_RESPONSE", message: "Источник вернул не изображение" });
    return reply.type(contentType).header("cache-control", "public, max-age=86400").send(Buffer.from(await response.arrayBuffer()));
  });
  if (config.NODE_ENV === "production") {
    void app.register(staticPlugin, {
      root: join(process.cwd(), "apps", "web", "dist"),
      prefix: "/",
    });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api/"))
        return reply.code(404).send({ code: "NOT_FOUND", message: "Маршрут API не найден" });
      const staleAsset = request.url.match(/^\/assets\/index-[A-Za-z0-9_-]+\.(js|css)$/);
      if (staleAsset) {
        const assets = await readdir(join(process.cwd(), "apps", "web", "dist", "assets"));
        const current = assets.find((name) => name.startsWith("index-") && name.endsWith(`.${staleAsset[1]}`));
        if (current) return reply.redirect(`/assets/${current}`);
      }
      if (request.url.startsWith("/assets/") || /\.[a-z0-9]{2,8}(?:\?|$)/i.test(request.url))
        return reply.code(404).send("Файл не найден");
      return reply.sendFile("index.html");
    });
  }
  return app;
}

const liveRails = [
  { id: "popular", title: "Популярное сейчас", options: { sortBy: "popularity.desc" } },
  { id: "action", title: "Боевики", options: { genre: "28" } },
  { id: "comedy", title: "Комедии", options: { genre: "35" } },
  { id: "science-fiction", title: "Фантастика", options: { genre: "878" } },
  { id: "thriller", title: "Триллеры", options: { genre: "53" } },
  { id: "drama", title: "Драмы", options: { genre: "18" } },
  { id: "horror", title: "Ужасы", options: { genre: "27" } },
  { id: "animation", title: "Мультфильмы", options: { genre: "16" } },
  { id: "family", title: "Семейное кино", options: { genre: "10751" } },
  { id: "top-rated", title: "Высокий рейтинг", options: { sortBy: "vote_average.desc" } },
] as const;

function proxyImageUrl(value: string | null, appOrigin: string): string | null {
  if (!value) return null;
  const source = new URL(value);
  if (source.hostname !== "image.tmdb.org" || !source.pathname.startsWith("/t/p/")) return value;
  return new URL(`/api/images/tmdb/${source.pathname.slice("/t/p/".length)}`, appOrigin).toString();
}
