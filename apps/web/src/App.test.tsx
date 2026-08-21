// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureCatalog } from "../../../fixtures/catalog.js";
import {
  App,
  androidPlayerIntent,
  externalPlayerUrl,
  episodeFileMatches,
  episodeFileInfo,
  Home,
  MovieDetails,
  MoviePoster,
  PlaybackPanel,
  RequestAction,
  readContinueWatching,
  Search,
  TorrentChoiceDrawer,
} from "./App.js";

describe("series episode matching", () => {
  it.each(["Reacher.S01E03.mkv", "Reacher 1x03 1080p.mp4", "Season 1 Episode 3.mkv"])("recognizes %s", (path) => {
    expect(episodeFileMatches(path, 1, 3)).toBe(true);
  });
  it("does not select a different episode", () => expect(episodeFileMatches("Reacher.S01E04.mkv", 1, 3)).toBe(false));
  it("extracts season and episode from a torrent filename", () => expect(episodeFileInfo("Game.of.Thrones.S02E07.mkv")).toEqual({ season: 2, episode: 7 }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("catalog surfaces", () => {
  it("builds Продолжить просмотр from started but unfinished series", () => {
    const series = { id: "show-1", title: "Тестовый сериал", year: 2024, overview: "", rating: 8, genres: [], posterUrl: null, backdropUrl: null, mediaStatus: "unknown", numberOfSeasons: 1, seasons: [{ seasonNumber: 1, name: "Сезон 1", episodeCount: 3, posterUrl: null }] };
    localStorage.setItem("kinohub-series-packs-v1", JSON.stringify({ "show-1": { releaseName: "Show S01", files: [], series } }));
    localStorage.setItem("kinohub-watched-episodes-v1", JSON.stringify(["show-1:S1:E1"]));
    expect(readContinueWatching().map((item) => item.title)).toEqual(["Тестовый сериал"]);
  });
  it("autofocuses the first movie on the home page", async () => {
    render(<App initialCatalog={fixtureCatalog} initialPath="/" />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("link", { name: /Космический рубеж/ })));
  });
  it("renders three named rails and Russian shell copy", () => {
    render(<App initialCatalog={fixtureCatalog} initialPath="/" />);
    expect(
      screen.getByRole("heading", { name: "Кино для большого экрана" }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".catalog-section")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: /Космический рубеж/ }),
    ).toBeInTheDocument();
  });
  it("renders complete movie details", () => {
    const movie = fixtureCatalog.rails[0]!.movies[0]!;
    render(<MovieDetails movie={movie} />);
    expect(
      screen.getByRole("heading", { name: movie.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2025.*118 мин/)).toBeInTheDocument();
    expect(screen.getByLabelText("Оценки фильма")).toHaveTextContent("TMDB 8.1");
    expect(screen.getByText("Фантастика · Приключения")).toBeInTheDocument();
    expect(screen.getByText(movie.overview)).toBeInTheDocument();
    expect(screen.getByText("Не добавлен")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Смотреть сейчас" })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Скачать 1080p" })).toHaveClass("download-action");
    expect(screen.getByRole("button", { name: "Буду смотреть" })).toHaveClass("watchlist-action");
  });

  it("autofocuses Watch now on movie details", async () => {
    const movie = fixtureCatalog.rails[0]!.movies[0]!;
    render(<App initialCatalog={fixtureCatalog} initialPath={`/movies/${movie.id}`} />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Смотреть сейчас" })));
  });
  it("persists movies in Буду смотреть and renders the separate page", async () => {
    const movie = fixtureCatalog.rails[0]!.movies[0]!;
    render(<App initialCatalog={fixtureCatalog} initialPath={`/movies/${movie.id}`} />);
    fireEvent.click(screen.getByRole("button", { name: "Буду смотреть" }));
    expect(screen.getByRole("button", { name: "В списке" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem("kinohub-watchlist-v1")).toContain(movie.id);
    cleanup();
    render(<App initialCatalog={fixtureCatalog} initialPath="/watchlist" />);
    const savedMovie = screen.getByRole("link", { name: new RegExp(movie.title) });
    expect(savedMovie).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(savedMovie));
  });
  it("renders an honest empty Буду смотреть state", () => {
    render(<App initialCatalog={fixtureCatalog} initialPath="/watchlist" />);
    expect(screen.getByRole("heading", { name: "Здесь пока пусто" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти к каталогу" })).toBeInTheDocument();
  });
  it("renders missing poster and backdrop fallbacks", () => {
    const movie = fixtureCatalog.rails[1]!.movies[0]!;
    const { rerender } = render(<MoviePoster movie={movie} />);
    expect(
      screen.getByRole("img", { name: `Нет постера: ${movie.title}` }),
    ).toBeInTheDocument();
    rerender(<MovieDetails movie={movie} />);
    expect(document.querySelector(".missing-backdrop")).toBeInTheDocument();
  });
  it.each([
    ["loading", "Загрузка каталога"],
    ["empty", "Каталог пока пуст"],
    ["unavailable", "Каталог временно недоступен"],
  ] as const)("renders %s state", (state, text) => {
    render(<App forcedState={state} initialPath="/" />);
    if (state === "loading")
      expect(screen.getByRole("region", { name: text })).toBeInTheDocument();
    else expect(screen.getByText(text)).toBeInTheDocument();
  });
  it("renders three independently scrollable rails for browser overflow verification", () => {
    render(<Home catalog={fixtureCatalog} />);
    expect(document.querySelectorAll(".rail")).toHaveLength(3);
    expect(document.querySelectorAll('.rail[aria-hidden="true"]')).toHaveLength(
      0,
    );
  });
});

describe("debounced cancellable search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it("waits 350ms, handles Cyrillic, and aborts a stale request", async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string | URL | Request, init?: RequestInit) => {
        if (init?.signal) signals.push(init.signal);
        return Promise.resolve(
          new Response(
            JSON.stringify({ movies: fixtureCatalog.rails[0]!.movies }),
          ),
        );
      }),
    );
    render(<Search />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Космос" } });
    await act(() => vi.advanceTimersByTimeAsync(349));
    expect(fetch).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    fireEvent.change(input, { target: { value: "Космический" } });
    await act(() => vi.advanceTimersByTimeAsync(350));
    expect(signals[0]?.aborted).toBe(true);
    await act(() => Promise.resolve());
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining(encodeURIComponent("Космический")),
      expect.anything(),
    );
  });
  it("submits immediately from the Android Search/Go action", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ movies: [], series: [] })));
    vi.stubGlobal("fetch", fetchMock);
    render(<Search />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Матрица" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent("Матрица")), expect.anything());
  });
  it("shows an explicit no-results state", () => {
    render(<Search initialResults={[]} />);
    expect(
      screen.getByRole("heading", { name: "Ничего не найдено" }),
    ).toBeInTheDocument();
  });
  it("handles empty, long, Cyrillic, and special-character input safely", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request) => {
      void _input;
      return new Response(JSON.stringify({ movies: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Search />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(fetchMock).not.toHaveBeenCalled();
    const value = `Ёж & космос? ${"я".repeat(180)}`;
    fireEvent.change(input, { target: { value } });
    await act(() => vi.advanceTimersByTimeAsync(350));
    expect(
      decodeURIComponent(
        String(fetchMock.mock.calls[0]?.[0]).split("q=")[1] ?? "",
      ),
    ).toHaveLength(120);
  });
  it("ignores a slow stale response even when transport does not honor abort", async () => {
    let resolveOld!: (value: Response) => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ movies: [fixtureCatalog.rails[0]!.movies[1]!] }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<Search />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "старый" } });
    await act(() => vi.advanceTimersByTimeAsync(350));
    fireEvent.change(input, { target: { value: "новый" } });
    await act(() => vi.advanceTimersByTimeAsync(350));
    await act(() => Promise.resolve());
    resolveOld(
      new Response(
        JSON.stringify({ movies: [fixtureCatalog.rails[0]!.movies[0]!] }),
      ),
    );
    await act(() => Promise.resolve());
    expect(screen.getByText("Тихая орбита")).toBeInTheDocument();
    expect(screen.queryByText("Космический рубеж")).not.toBeInTheDocument();
  });
  it("shows retry guidance when unavailable", async () => {
    vi.useRealTimers();
    render(<App forcedState="unavailable" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Повторить" }),
      ).toBeInTheDocument(),
    );
  });
});

describe("request action", () => {
  it("shows honest quality policy and sends one request during rapid activation", async () => {
    let resolveRequest!: (value: { state: "queued" }) => void;
    const requester = vi.fn(
      () =>
        new Promise<{ state: "queued" }>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    render(<RequestAction movieId="550" requester={requester} />);
    fireEvent.click(screen.getByRole("button", { name: "Скачать 1080p" }));
    expect(
      screen.getByText("1080p SDR · H.264 предпочтительно"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/будет подтверждён Seerr\/Radarr/),
    ).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Подтвердить" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(requester).toHaveBeenCalledTimes(1);
    resolveRequest({ state: "queued" });
    expect(
      await screen.findByText("Фильм добавлен в очередь"),
    ).toBeInTheDocument();
  });
  it.each([
    ["existing", "Этот фильм уже добавлен"],
    ["pending", "Отправляем запрос…"],
    ["processing", "Фильм загружается"],
    ["available", "Фильм доступен в медиатеке"],
    ["failed", "Не удалось добавить фильм"],
    ["timeout", "Сервис не ответил вовремя"],
    ["permission_denied", "Недостаточно прав для запроса"],
  ] as const)("renders distinct %s state", (state, copy) => {
    render(<RequestAction movieId="550" initialState={state} />);
    expect(screen.getByText(copy)).toBeInTheDocument();
  });
  it("Jellyfin link contains no token or api key", () => {
    render(<RequestAction movieId="550" initialState="available" />);
    const href = screen
      .getByRole("link", { name: "Открыть в Jellyfin" })
      .getAttribute("href");
    expect(href).not.toMatch(/token|api[_-]?key/i);
  });
});

describe("torrent choice drawer", () => {
  const choices = [
    {
      id: "e2c6bb9f-b8dd-4e6d-a06b-9c84c604de45",
      releaseName: "Фильм 2025 1080p WEB-DL x264",
      source: "WEB-DL",
      flags: ["1080p", "H264", "SDR", "RU"],
      size: 5 * 1024 ** 3,
      seeders: 44,
      score: 112,
      rationale: ["+45 за 1080p", "+35 за H.264/x264"],
      compatibility: "compatible" as const,
    },
    {
      id: "6b2a9368-54a3-47cf-9d68-aabc3560af52",
      releaseName: "Movie 2160p HDR REMUX",
      source: "Blu-ray",
      flags: ["2160p", "H265", "HDR"],
      size: 40 * 1024 ** 3,
      seeders: 60,
      score: -1000,
      rationale: ["4K не поддерживается"],
      compatibility: "incompatible" as const,
    },
  ];
  it("shows opaque rich choices and disables incompatible rows", () => {
    render(
      <TorrentChoiceDrawer
        movieId="movie-1"
        initialChoices={choices}
        onClose={() => undefined}
      />,
    );
    expect(
      screen.getByText(/5.0 ГБ.*44 сидов.*112 баллов/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Movie 2160p/ })).toBeDisabled();
    expect(document.body.textContent).not.toMatch(
      /magnet:|server-link|api[_-]?key/i,
    );
  });
  it("renders empty and timeout/retry states", async () => {
    const { rerender } = render(
      <TorrentChoiceDrawer
        movieId="movie-1"
        initialChoices={[]}
        onClose={() => undefined}
      />,
    );
    expect(
      screen.getByText("Подходящих версий не найдено."),
    ).toBeInTheDocument();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    );
    rerender(
      <TorrentChoiceDrawer movieId="movie-2" onClose={() => undefined} />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Поиск не ответил",
    );
    vi.unstubAllGlobals();
  });
});

describe("playback panel", () => {
  const files = [
    {
      id: 2,
      path: "Фильм часть 2.mkv",
      length: 2 * 1024 ** 3,
      streamUrl: "http://torrserver:8090/stream?link=mock-hash&index=2",
      playlistUrl: "http://torrserver:8090/playlist?link=mock-hash",
    },
    {
      id: 10,
      path: "Фильм часть 10.mkv",
      length: 3 * 1024 ** 3,
      streamUrl: "http://torrserver:8090/stream?link=mock-hash&index=10",
      playlistUrl: "http://torrserver:8090/playlist?link=mock-hash",
    },
  ];
  it("builds an Android ACTION_VIEW intent with a safe browser fallback", () => {
    const target = "http://192.168.0.120:8091/stream?link=abc&index=1";
    const intent = androidPlayerIntent(target, "video/*");
    expect(intent).toContain("intent://192.168.0.120:8091/stream?link=abc&index=1#Intent;scheme=http;type=video/*");
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent(target)}`);
  });
  it("uses a plain TorrServer URL inside MSX Android WebView", () => {
    const target = "http://192.168.0.120:8091/stream?link=abc&index=1";
    const webViewAgent =
      "Mozilla/5.0 (Linux; Android 11; TV; wv) AppleWebKit/537.36 Version/4.0 Chrome/120 Safari/537.36";
    expect(externalPlayerUrl(target, "video/*", webViewAgent, "")).toBe(target);
    expect(externalPlayerUrl(target, "video/*", "Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile", "")).toMatch(/^intent:\/\//);
    expect(externalPlayerUrl(target, "video/*", "Mozilla/5.0 (Linux; Android 11)", "https://msx.benzac.de/"))
      .toBe(target);
  });
  it("builds a private playback URI only for the thin Android TV app", () => {
    const target = files[0]!.streamUrl;
    const uri = externalPlayerUrl(target, "video/*", "Android KinoHubTV/0.1", "");
    expect(uri).toMatch(/^kinohub-player:\/\/play\?/);
    expect(new URL(uri).searchParams.get("url")).toBe(target);
    expect(new URL(uri).searchParams.get("mime")).toBe("video/*");
  });
  it("offers deterministic multi-file selection then safe launch fallbacks", () => {
    render(
      <PlaybackPanel
        initialResult={{ status: "choose_file", files }}
        onClose={() => undefined}
      />,
    );
    expect(
      screen
        .getAllByRole("button", { name: /Фильм часть/ })
        .map((button) => button.textContent),
    ).toEqual([
      "Фильм часть 2.mkvПараметры дорожек не указаны в названии раздачи2.0 ГБ",
      "Фильм часть 10.mkvПараметры дорожек не указаны в названии раздачи3.0 ГБ",
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Фильм часть 2/ }));
    expect(screen.getByRole("link", { name: "Выбрать плеер" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^http:\/\/torrserver:8090\/stream/),
    );
    expect(screen.queryByRole("link", { name: "Открыть поток в новой вкладке" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Копировать ссылку" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть M3U в VLC / Kodi" })).toHaveAttribute("href", expect.stringContaining("/playlist"));
  });
  it("marks a launched series episode as watched", () => {
    const episodeFile = { ...files[0]!, path: "Reacher.S01E02.mkv" };
    render(<PlaybackPanel initialResult={{ status: "choose_file", files: [episodeFile, { ...files[1]!, path: "Reacher.S01E03.mkv" }] }} seriesContext={{ seriesId: "108978", season: 1 }} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /2 серия/ }));
    fireEvent.click(screen.getByRole("link", { name: "Выбрать плеер" }));
    expect(localStorage.getItem("kinohub-watched-episodes-v1")).toContain("108978:S1:E2");
  });
  it("renders single-file ready and timeout retry/diagnostics states", () => {
    const ready = render(
      <PlaybackPanel
        initialResult={{ status: "ready", files: [files[0]!] }}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText("Готово к просмотру")).toBeInTheDocument();
    ready.unmount();
    render(
      <PlaybackPanel
        initialError="TorrServer не ответил вовремя"
        onClose={() => undefined}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "TorrServer не ответил вовремя",
    );
    expect(
      screen.getByRole("button", { name: "Повторить" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Диагностика")).toBeInTheDocument();
  });
  it("autofocuses the external player action when playback is ready", async () => {
    render(<PlaybackPanel initialResult={{ status: "ready", files: [files[0]!] }} onClose={() => undefined} />);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("link", { name: "Выбрать плеер" })));
  });
});
