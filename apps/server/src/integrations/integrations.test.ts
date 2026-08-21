import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../config.js";
import {
  seerrMovieFixture,
  seerrSeriesFixture,
  torznabFixture,
} from "../../../../fixtures/integrations.js";
import { IntegrationError } from "./errors.js";
import { integrationDiagnostics, safeJellyfinLink } from "./health.js";
import { requestJson, requestText } from "./http.js";
import { JackettClient, parseTorznab } from "./jackett.js";
import { normalizeSeerrMovie, normalizeSeerrSeries, SeerrClient } from "./seerr.js";
import { TorrServerClient } from "./torrserver.js";
import { KinopoiskClient, PoiskKinoClient } from "./kinopoisk.js";

describe("Kinopoisk rating adapter", () => {
  it("matches an exact title and year and keeps the key in a header", async () => {
    const testKey = "00000000-0000-4000-8000-000000000001";
    const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("X-API-KEY")).toBe(testKey);
      return new Response(JSON.stringify({ films: [
        { filmId: 301, nameRu: "Матрица", nameEn: "The Matrix", year: "1999", rating: "8.5" },
        { filmId: 999, nameRu: "Матрица", year: "2021", rating: "5.7" },
      ] }));
    });
    const client = new KinopoiskClient(testKey, { fetchImpl: fetchImpl as typeof fetch });
    await expect(client.rating("Матрица", 1999)).resolves.toEqual({ id: 301, rating: 8.5 });
    await expect(client.rating("Матрица", 1999)).resolves.toEqual({ id: 301, rating: 8.5 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("PoiskKino fallback adapter", () => {
  it("uses X-API-KEY and reads the Kinopoisk rating from an exact title and year", async () => {
    const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("X-API-KEY")).toBe("fallback-test-token");
      return new Response(JSON.stringify({ docs: [{ id: 301, name: "Матрица", alternativeName: "The Matrix", year: 1999, rating: { kp: 8.5 } }] }));
    });
    const client = new PoiskKinoClient("fallback-test-token", { fetchImpl: fetchImpl as typeof fetch });
    await expect(client.rating("Матрица", 1999)).resolves.toEqual({ id: 301, rating: 8.5 });
    await expect(client.rating("Матрица", 1999)).resolves.toEqual({ id: 301, rating: 8.5 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("Seerr adapter fixtures", () => {
  it("normalizes discovery/detail media and status", () => {
    expect(normalizeSeerrMovie(seerrMovieFixture)).toMatchObject({
      id: "550",
      title: "Бойцовский клуб",
      mediaStatus: "available",
    });
  });

  it("normalizes TV seasons for episode selection", () => {
    expect(normalizeSeerrSeries(seerrSeriesFixture)).toMatchObject({ id: "1399", title: "Игра престолов", numberOfSeasons: 8, seasons: [{ seasonNumber: 1, episodeCount: 10 }] });
  });

  it("keeps X-Api-Key on the backend for discover, search, detail, request, and status", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(input), ...(init ? { init } : {}) });
        const body = String(input).includes("/request")
          ? { id: 1 }
          : String(input).includes("/discover") ||
              String(input).includes("/search")
            ? { results: [seerrMovieFixture] }
            : seerrMovieFixture;
        return new Response(JSON.stringify(body), { status: 200 });
      },
    );
    const client = new SeerrClient(
      new URL("http://seerr.test"),
      "server-only-key",
      { fetchImpl: fetchImpl as typeof fetch, retries: 0 },
    );
    await client.discover();
    await client.search("Бойцовский клуб");
    await client.detail("550");
    await client.request({ mediaId: "550", serverId: 1, profileId: 2 });
    await client.status("550");
    expect(calls).toHaveLength(5);
    expect(
      calls.every(
        (call) =>
          new Headers(call.init?.headers).get("X-Api-Key") ===
          "server-only-key",
      ),
    ).toBe(true);
    expect(calls.every((call) => !call.url.includes("server-only-key"))).toBe(
      true,
    );
  });
});

describe("Jackett Torznab", () => {
  it("constructs a documented query and parses all normalized fields", () => {
    const client = new JackettClient(
      new URL("http://jackett.test"),
      "private-key",
    );
    const url = client.buildSearchUrl({
      title: "Тестовый фильм",
      year: 2025,
      imdbId: "tt123",
    });
    expect(url.pathname).toContain("/torznab/api");
    expect(url.searchParams.get("t")).toBe("movie");
    expect(url.searchParams.get("imdbid")).toBe("tt123");
    expect(parseTorznab(torznabFixture)[0]).toMatchObject({
      title: "Фильм.2025.1080p.WEB-DL.x264",
      seeders: 42,
      peers: 50,
      indexer: "Домашний индексатор",
      size: 4294967296,
    });
  });

  it("constructs an episode TV search", () => {
    const url = new JackettClient(new URL("http://jackett.test"), "private-key").buildSearchUrl({ title: "Игра престолов", season: 2, episode: 3 });
    expect(url.searchParams.get("t")).toBe("search");
    expect(url.searchParams.get("season")).toBe("2");
    expect(url.searchParams.get("ep")).toBe("3");
    expect(url.searchParams.get("q")).toContain("S02E03");
  });

  it("maps malformed XML to UPSTREAM_INVALID_XML", () => {
    expect(() => parseTorznab("<rss><broken>")).toThrowError(
      expect.objectContaining({ code: "UPSTREAM_INVALID_XML" }),
    );
  });
});

describe("stable resilience errors", () => {
  it.each([
    [
      "HTTP",
      async () =>
        requestText(
          new URL("http://x.test"),
          {},
          {
            retries: 0,
            fetchImpl: vi.fn(
              async () => new Response("", { status: 503 }),
            ) as typeof fetch,
          },
        ),
      "UPSTREAM_HTTP_ERROR",
    ],
    [
      "oversized",
      async () =>
        requestText(
          new URL("http://x.test"),
          {},
          {
            retries: 0,
            maxBytes: 2,
            fetchImpl: vi.fn(async () => new Response("large")) as typeof fetch,
          },
        ),
      "UPSTREAM_BODY_TOO_LARGE",
    ],
    [
      "invalid JSON",
      async () =>
        requestJson(
          new URL("http://x.test"),
          {},
          {
            retries: 0,
            fetchImpl: vi.fn(async () => new Response("{bad")) as typeof fetch,
          },
        ),
      "UPSTREAM_INVALID_JSON",
    ],
  ])("%s maps to %s", async (_name, action, code) => {
    await expect(action()).rejects.toMatchObject({ code });
  });

  it("maps abort timeout to UPSTREAM_TIMEOUT", async () => {
    const fetchImpl = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    await expect(
      requestText(
        new URL("http://x.test"),
        {},
        { timeoutMs: 5, retries: 0, fetchImpl: fetchImpl as typeof fetch },
      ),
    ).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT" });
  });

  it("maps network failures to NETWORK_ERROR", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network");
    });
    await expect(
      requestText(
        new URL("http://x.test"),
        {},
        { retries: 0, fetchImpl: fetchImpl as typeof fetch },
      ),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

describe("TorrServer contract and safe diagnostics", () => {
  it("supports health, add, inspect/list, stream, and playlist fixture shapes", async () => {
    const torrent = {
      hash: "abc",
      title: "Фильм",
      files: [{ id: 1, path: "movie.mkv", length: 100 }],
    };
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const body = init?.body
          ? (JSON.parse(String(init.body)) as { action?: string })
          : {};
        return new Response(
          JSON.stringify(
            body.action === "list"
              ? [torrent]
              : body.action === "get" || body.action === "add"
                ? torrent
                : { echo: true },
          ),
        );
      },
    );
    const client = new TorrServerClient(new URL("http://torr.test"), {
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(await client.health()).toBe(true);
    expect(await client.add("opaque-server-link", "Фильм")).toEqual(torrent);
    expect(await client.inspect("abc")).toEqual(torrent);
    expect(await client.list()).toEqual([torrent]);
    const stream = client.streamUrl("abc", 1, "Папка/Фильм.mkv");
    expect(decodeURIComponent(stream.pathname)).toBe("/stream/Фильм.mkv");
    expect(stream.search).toContain("link=abc&index=1&play");
    const playlist = client.playlistUrl("abc");
    expect(playlist.pathname).toBe("/playlist");
    expect(playlist.searchParams.get("hash")).toBe("abc");
  });

  it("selects mock/unconfigured/live diagnostics explicitly and redacts values", () => {
    const mock = integrationDiagnostics(parseConfig({ APP_MODE: "mock" }), {});
    const missing = integrationDiagnostics(
      parseConfig({ APP_MODE: "unconfigured" }),
      {},
    );
    const live = integrationDiagnostics(parseConfig({ APP_MODE: "live" }), {
      SEERR_URL: "http://private.test",
    });
    expect(mock.every((item) => item.status === "mock")).toBe(true);
    expect(missing.every((item) => item.status === "missing")).toBe(true);
    expect(live.find((item) => item.service === "seerr")?.status).toBe("ready");
    expect(mock.map((item) => item.service)).toContain("radarr");
    expect(JSON.stringify(live)).not.toContain("private.test");
  });

  it("creates only credential-free Jellyfin links", () => {
    const link = safeJellyfinLink("http://jellyfin.lan:8096", "item-1");
    expect(link?.pathname).toBe("/web/index.html");
    expect(link?.hash).toContain("id=item-1");
    expect(
      safeJellyfinLink("http://user:pass@jellyfin.lan", "item-1"),
    ).toBeNull();
  });
});

it("keeps IntegrationError stable", () => {
  expect(
    new IntegrationError("INTEGRATION_UNCONFIGURED", "missing"),
  ).toMatchObject({ code: "INTEGRATION_UNCONFIGURED" });
});
