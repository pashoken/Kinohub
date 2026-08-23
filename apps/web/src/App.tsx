/* eslint-disable react-refresh/only-export-components */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Catalog, Movie, Series } from "@kinohub/contracts";
import "./styles.css";
import { focusAndReveal, useDialogFocus, usePageFocus, useSpatialNavigation } from "./navigation.js";

type LoadState = "loading" | "ready" | "empty" | "unavailable";
const statusCopy: Record<Movie["mediaStatus"], string> = {
  unknown: "Не добавлен",
  pending: "В очереди",
  processing: "Загружается",
  available: "Доступен",
  failed: "Ошибка загрузки",
};
const watchlistStorageKey = "kinohub-watchlist-v1";
const seriesWatchlistStorageKey = "kinohub-series-watchlist-v1";
const watchedEpisodesStorageKey = "kinohub-watched-episodes-v1";
const seriesPacksStorageKey = "kinohub-series-packs-v1";
const tasteProfileStorageKey = "kinohub-taste-profile-v1";
type TasteScore = number;
type MediaItem = Movie | Series;
type TasteProfile = Record<string, { value: TasteScore; item: MediaItem }>;

function mediaKey(item: MediaItem): string { return `${"numberOfSeasons" in item ? "series" : "movie"}:${item.id}`; }
function readTasteProfile(): TasteProfile {
  try {
    const stored = JSON.parse(localStorage.getItem(tasteProfileStorageKey) ?? "{}") as TasteProfile;
    return Object.fromEntries(Object.entries(stored).map(([key, entry]) => [key, { ...entry, value: entry.value === -1 ? 3 : entry.value === 1 ? 8 : Math.max(1, Math.min(10, entry.value)) }]));
  }
  catch { return {}; }
}

function watchedEpisodeKey(seriesId: string, season: number, episode: number) { return `${seriesId}:S${season}:E${episode}`; }
function readWatchedEpisodes(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(watchedEpisodesStorageKey) ?? "[]") as string[]); }
  catch { return new Set(); }
}
function saveWatchedEpisodes(value: Set<string>) { localStorage.setItem(watchedEpisodesStorageKey, JSON.stringify([...value])); }

type SavedSeriesPack = { releaseName: string; files: PlaybackFile[]; releaseInfo?: TorrentChoice | undefined; series?: Series };
function readSeriesPacks(): Record<string, SavedSeriesPack> {
  try { return JSON.parse(localStorage.getItem(seriesPacksStorageKey) ?? "{}") as Record<string, SavedSeriesPack>; }
  catch { return {}; }
}
function saveSeriesPack(seriesId: string, pack: SavedSeriesPack) {
  const packs = readSeriesPacks(); packs[seriesId] = pack; localStorage.setItem(seriesPacksStorageKey, JSON.stringify(packs));
}
function removeSeriesPack(seriesId: string) {
  const packs = readSeriesPacks(); delete packs[seriesId]; localStorage.setItem(seriesPacksStorageKey, JSON.stringify(packs));
}
export function readContinueWatching(): Series[] {
  const watched = readWatchedEpisodes();
  return Object.entries(readSeriesPacks()).flatMap(([seriesId, pack]) => {
    if (!pack.series) return [];
    const watchedCount = [...watched].filter((key) => key.startsWith(`${seriesId}:`)).length;
    const totalEpisodes = pack.series.seasons.filter((season) => season.seasonNumber > 0).reduce((sum, season) => sum + season.episodeCount, 0);
    return watchedCount > 0 && watchedCount < totalEpisodes ? [pack.series] : [];
  });
}

function readWatchlist(): Movie[] {
  try {
    const value = localStorage.getItem(watchlistStorageKey);
    return value ? (JSON.parse(value) as Movie[]) : [];
  } catch {
    return [];
  }
}
function readSeriesWatchlist(): Series[] {
  try { const value = localStorage.getItem(seriesWatchlistStorageKey); return value ? JSON.parse(value) as Series[] : []; }
  catch { return []; }
}

export function MoviePoster({ movie }: { movie: Movie }) {
  const [failed, setFailed] = useState(false);
  if (!movie.posterUrl || failed)
    return (
      <div
        className="poster poster-fallback"
        role="img"
        aria-label={`Нет постера: ${movie.title}`}
      >
        {movie.title.slice(0, 1)}
      </div>
    );
  return (
    <img
      className="poster"
      src={movie.posterUrl}
      alt={`Постер: ${movie.title}`}
      loading="lazy"
      sizes="(max-width: 1280px) 190px, 220px"
      onError={() => setFailed(true)}
    />
  );
}

export function MovieCard({ movie, pageAutoFocus = false }: { movie: Movie; pageAutoFocus?: boolean }) {
  return (
    <a
      className="card focusable"
      href={detailHref("movies", movie.id)}
      data-focusable="true"
      {...(pageAutoFocus
        ? { "data-page-autofocus": true, "data-page-autofocus-block": "nearest" }
        : {})}
    >
      <MoviePoster movie={movie} />
      <strong>{movie.title}</strong>
      <span>{movie.year}</span>
      <Ratings movie={movie} />
    </a>
  );
}

function Ratings({ movie }: { movie: Pick<Movie, "title" | "year" | "rating"> }) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [kinopoisk, setKinopoisk] = useState<number | null>();
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    const host = hostRef.current;
    if (!host) return;
    let active = true;
    let controller: AbortController | undefined;
    const load = () => {
      controller = new AbortController();
      const params = new URLSearchParams({ title: movie.title, year: String(movie.year) });
      void fetch(`/api/ratings/kinopoisk?${params}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : { rating: null })
        .then((payload: { rating?: number | null }) => { if (active) setKinopoisk(payload.rating ?? null); })
        .catch(() => { if (active) setKinopoisk(null); });
    };
    if (!("IntersectionObserver" in window)) load();
    else {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      }, { rootMargin: "160px" });
      observer.observe(host);
      return () => { active = false; observer.disconnect(); controller?.abort(); };
    }
    return () => { active = false; controller?.abort(); };
  }, [movie.title, movie.year]);
  return (
    <span className="ratings" ref={hostRef} aria-label="Оценки фильма">
      <span className="tmdb-rating"><b>TMDB</b> {movie.rating.toFixed(1)}</span>
      {typeof kinopoisk === "number" ? (
        <span className="kp-rating"><span className="kp-icon" aria-label="Кинопоиск">K</span>{kinopoisk.toFixed(1)}</span>
      ) : null}
    </span>
  );
}

function SeriesCard({ series, pageAutoFocus = false }: { series: Series; pageAutoFocus?: boolean }) {
  return (
    <a className="card focusable" href={detailHref("series", series.id)} data-focusable="true" {...(pageAutoFocus ? { "data-page-autofocus": true } : {})}>
      {series.posterUrl ? <img className="poster" src={series.posterUrl} alt={`Постер: ${series.title}`} loading="lazy" /> : <div className="poster poster-fallback" role="img" aria-label={`Нет постера: ${series.title}`}>{series.title[0]}</div>}
      <strong>{series.title}</strong><span>{series.year} · сериал</span><Ratings movie={series} />
    </a>
  );
}

export function detailHref(kind: "movies" | "series", id: string, source = `${window.location.pathname}${window.location.search}`): string {
  const from = source.startsWith("/") && !source.startsWith("//") ? source : "/";
  return `/${kind}/${encodeURIComponent(id)}?from=${encodeURIComponent(from)}`;
}

let openModalLayers = 0;
function ModalLayer({ children, side = false }: { children: ReactNode; side?: boolean }) {
  useEffect(() => {
    openModalLayers += 1;
    const main = document.querySelector<HTMLElement>("main");
    main?.setAttribute("inert", "");
    document.body.classList.add("modal-open");
    return () => {
      openModalLayers = Math.max(0, openModalLayers - 1);
      if (openModalLayers === 0) {
        main?.removeAttribute("inert");
        document.body.classList.remove("modal-open");
      }
    };
  }, []);
  return createPortal(
    <div className={`modal-layer ${side ? "modal-layer-side" : ""}`} data-modal-layer>
      {children}
    </div>,
    document.body,
  );
}

function TasteAction({ item, value = 0, onRate }: { item: MediaItem; value?: TasteScore | 0; onRate?: ((item: MediaItem, value: TasteScore | null) => void) | undefined }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(open, dialogRef);
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => focusAndReveal(dialogRef.current?.querySelector<HTMLElement>(`[data-score="${value || 8}"]`) ?? null));
  }, [open, value]);
  return <>
    <button className={`secondary focusable taste-action ${value ? "is-active" : ""}`} aria-haspopup="dialog" onClick={() => setOpen(true)}><span aria-hidden="true">★</span> {value ? `Моя оценка: ${value}/10` : "Оценить"}</button>
    {open ? <ModalLayer><section ref={dialogRef} className="rating-dialog" role="dialog" aria-modal="true" aria-labelledby="rating-title">
      <div className="drawer-head"><div><p className="eyebrow">ВАША ОЦЕНКА</p><h2 id="rating-title">{item.title}</h2></div><button className="secondary focusable" data-dialog-close onClick={() => setOpen(false)}>Закрыть</button></div>
      <div className="rating-grid" aria-label="Оценка от 1 до 10">{Array.from({ length: 10 }, (_, index) => index + 1).map((score) => <button key={score} data-score={score} className={`focusable rating-score ${value === score ? "is-selected" : ""}`} aria-pressed={value === score} onClick={() => { onRate?.(item, score); setOpen(false); }}>{score}</button>)}</div>
      <p className="rating-scale"><span>Совсем не понравилось</span><span>Любимое</span></p>
      {value ? <button className="secondary focusable reset-rating" onClick={() => { onRate?.(item, null); setOpen(false); }}>Сбросить оценку</button> : null}
    </section></ModalLayer> : null}
  </>;
}

export function SeasonPicker({ seasons, value, onChange }: { seasons: Series["seasons"]; value: number; onChange: (season: number) => void }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(open, dialogRef);
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => focusAndReveal(dialogRef.current?.querySelector<HTMLElement>(`[data-season="${value}"]`) ?? null));
  }, [open, value]);
  return <>
    <button className="secondary focusable season-picker-trigger" aria-haspopup="dialog" onClick={() => setOpen(true)}>Сезон {value} <span aria-hidden="true">▾</span></button>
    {open ? <ModalLayer><section ref={dialogRef} className="season-dialog" role="dialog" aria-modal="true" aria-labelledby="season-dialog-title">
      <div className="drawer-head"><div><p className="eyebrow">ВЫБОР СЕЗОНА</p><h2 id="season-dialog-title">Какой сезон открыть?</h2></div><button className="secondary focusable" data-dialog-close onClick={() => setOpen(false)}>Закрыть</button></div>
      <div className="season-grid">{seasons.map((item) => {
        const select = () => { onChange(item.seasonNumber); setOpen(false); };
        return <button key={item.seasonNumber} data-season={item.seasonNumber} className={`focusable season-option ${value === item.seasonNumber ? "is-selected" : ""}`} aria-pressed={value === item.seasonNumber} onClick={select} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); select(); } }}>Сезон {item.seasonNumber}<small>{item.episodeCount} серий</small></button>;
      })}</div>
    </section></ModalLayer> : null}
  </>;
}

export function buildRecommendations(candidates: MediaItem[], profile: TasteProfile, limit = 16): MediaItem[] {
  const unique = [...new Map(candidates.map((item) => [mediaKey(item), item])).values()];
  const preferences = Object.values(profile);
  const liked = preferences.filter((entry) => entry.value >= 6).map((entry) => entry.item);
  if (!liked.length) return [];
  const genreWeights = new Map<string, number>();
  for (const { item, value: preference } of preferences) {
    const signal = (preference - 5.5) / 1.5;
    for (const genre of item.genres) genreWeights.set(genre.toLocaleLowerCase("ru"), (genreWeights.get(genre.toLocaleLowerCase("ru")) ?? 0) + signal);
  }
  const averageLikedRating = liked.reduce((sum, item) => sum + item.rating, 0) / liked.length;
  const ranked = unique
    .filter((item) => profile[mediaKey(item)] === undefined && hasReadableLocalizedTitle(item.title))
    .map((item) => {
      const genreSignals = item.genres.map((genre) => genreWeights.get(genre.toLocaleLowerCase("ru")) ?? 0);
      const positiveGenreSignal = genreSignals.filter((signal) => signal > 0).reduce((sum, signal) => sum + signal, 0);
      const negativeGenreSignal = genreSignals.filter((signal) => signal < 0).reduce((sum, signal) => sum + signal, 0);
      const score = positiveGenreSignal * 2 + negativeGenreSignal * 2 + Math.max(0, 2 - Math.abs(item.rating - averageLikedRating)) + item.rating / 25;
      return { item, score, positiveGenreSignal, negativeGenreSignal };
    })
    .sort((left, right) => right.score - left.score || right.item.rating - left.item.rating);
  const precise = ranked.filter(({ score, positiveGenreSignal }) => score > 0 && positiveGenreSignal > 0);
  const fallback = ranked.filter(({ item, positiveGenreSignal, negativeGenreSignal }) => positiveGenreSignal === 0 && negativeGenreSignal >= 0 && item.rating > 0);
  return [...precise, ...fallback].slice(0, limit).map(({ item }) => item);
}

export function hasReadableLocalizedTitle(title: string): boolean {
  const letters = [...title].filter((character) => /\p{L}/u.test(character));
  if (!letters.length) return false;
  const readable = letters.filter((character) => /[A-Za-zА-Яа-яЁё]/u.test(character));
  return readable.length / letters.length >= 0.7;
}

function ContextBack() {
  const rawFrom = new URLSearchParams(window.location.search).get("from");
  const fallback = rawFrom?.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/";
  return <a className="back focusable" href={fallback} onClick={(event) => { if (!rawFrom || window.history.length <= 1) return; event.preventDefault(); window.history.back(); }}>← Назад</a>;
}

function ShowMoreCard({ railId, title }: { railId: string; title: string }) {
  return (
    <a className="show-more-card focusable" href={`/rails/${railId}`} data-focusable="true">
      <span aria-hidden="true">→</span>
      <strong>Показать ещё</strong>
      <small>{title}</small>
    </a>
  );
}

export function CatalogSkeleton() {
  return (
    <section aria-label="Загрузка каталога">
      <div className="skeleton hero-skeleton" />
      <div className="skeleton rail-skeleton" />
    </section>
  );
}

export function Search({ initialResults }: { initialResults?: Movie[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>(initialResults ?? []);
  const [seriesResults, setSeriesResults] = useState<Series[]>([]);
  const [searched, setSearched] = useState(initialResults !== undefined);
  const [pending, setPending] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  const immediateSearchRef = useRef(false);
  const [submitTick, setSubmitTick] = useState(0);

  useEffect(() => {
    if (initialResults !== undefined) return;
    const normalized = query.trim().slice(0, 120);
    if (!normalized) {
      sequenceRef.current += 1;
      requestRef.current?.abort();
      setResults([]);
      setSeriesResults([]);
      setSearched(false);
      setPending(false);
      return;
    }
    setPending(true);
    const delay = immediateSearchRef.current ? 0 : 350;
    immediateSearchRef.current = false;
    const timer = window.setTimeout(() => {
      requestRef.current?.abort();
      const sequence = ++sequenceRef.current;
      const controller = new AbortController();
      requestRef.current = controller;
      fetch(`/api/search?q=${encodeURIComponent(normalized)}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("search");
          return response.json() as Promise<{ movies: Movie[]; series?: Series[] }>;
        })
        .then((payload) => {
          if (sequence !== sequenceRef.current) return;
          setResults(payload.movies);
          setSeriesResults(payload.series ?? []);
          setSearched(true);
          setPending(false);
        })
        .catch((error: unknown) => {
          if (
            sequence === sequenceRef.current &&
            !(error instanceof DOMException && error.name === "AbortError")
          ) {
            setResults([]);
            setSeriesResults([]);
            setSearched(true);
            setPending(false);
          }
        });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [query, initialResults, submitTick]);

  return (
    <section className="search-panel" aria-labelledby="search-title">
      <p className="eyebrow">ПОИСК</p>
      <h1 id="search-title">Найдите фильм или сериал</h1>
      <form className="search-field" onSubmit={(event) => { event.preventDefault(); immediateSearchRef.current = true; setSubmitTick((value) => value + 1); }}>
      <label>
        <span className="sr-only">Название фильма</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например, Космический рубеж"
          autoFocus
          enterKeyHint="search"
          data-page-autofocus
        />
      </label>
      <button className="primary focusable" type="submit">Найти</button>
      </form>
      {pending ? <p role="status">Ищем…</p> : null}
      {searched && !pending && results.length === 0 && seriesResults.length === 0 ? (
        <div className="empty">
          <h2>Ничего не найдено</h2>
          <p>Проверьте название или попробуйте другой запрос.</p>
        </div>
      ) : null}
      {results.length > 0 ? (
        <><h2>Фильмы</h2><div className="result-grid">
          {results.map((movie) => (
            <MovieCard movie={movie} key={movie.id} />
          ))}
        </div></>
      ) : null}
      {seriesResults.length > 0 ? <><h2>Сериалы</h2><div className="result-grid">{seriesResults.map((series) => <SeriesCard series={series} key={series.id} />)}</div></> : null}
    </section>
  );
}

type TorrentChoice = {
  id: string;
  releaseName: string;
  source: string;
  flags: string[];
  size: number | null;
  seeders: number | null;
  score: number;
  rationale: string[];
  compatibility: "compatible" | "warning" | "incompatible";
};
export function TorrentChoiceDrawer({
  movieId,
  seriesId,
  season,
  episode,
  initialChoices,
  onClose,
  onSelect,
}: {
  movieId?: string;
  seriesId?: string;
  season?: number;
  episode?: number;
  initialChoices?: TorrentChoice[];
  onClose: () => void;
  onSelect?: (id: string, choice: TorrentChoice) => void;
}) {
  const [choices, setChoices] = useState<TorrentChoice[] | undefined>(
    initialChoices,
  );
  const [error, setError] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(true, dialogRef);
  useEffect(() => {
    if (initialChoices) return;
    const controller = new AbortController();
    fetch("/api/torrents/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(movieId ? { movieId } : { seriesId, season, episode }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("search");
        return response.json() as Promise<{ choices: TorrentChoice[] }>;
      })
      .then((payload) => setChoices(payload.choices))
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError"))
          setError(true);
      });
    return () => controller.abort();
  }, [movieId, seriesId, season, episode, initialChoices]);
  useEffect(() => {
    if (choices || error) return;
    setSearchSeconds(0);
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setSearchSeconds(Math.floor((Date.now() - startedAt) / 1_000)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [choices, error, movieId, seriesId, season, episode]);
  useEffect(() => {
    const firstChoice = dialogRef.current?.querySelector<HTMLElement>(
      ".choice-list .focusable:not(:disabled)",
    );
    if (choices?.length && firstChoice)
      queueMicrotask(() => focusAndReveal(firstChoice, "center", "nearest"));
  }, [choices]);
  return (
    <ModalLayer side>
    <aside
      ref={dialogRef}
      className="choice-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choice-title"
    >
      <div className="drawer-head">
        <div>
          <p className="eyebrow">СМОТРЕТЬ СЕЙЧАС</p>
          <h2 id="choice-title">Выберите версию</h2>
        </div>
        <button
          className="secondary focusable"
          data-dialog-close
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>
      {!choices && !error ? (
        <div className="torrent-search-status" role="status">
          <span className="search-spinner" aria-hidden="true" />
          <div>
            <strong>Получаем ответы от трекеров · {searchSeconds} сек.</strong>
            <p>Некоторые трекеры проходят дополнительную проверку защиты, поэтому первый поиск иногда занимает до минуты.</p>
          </div>
        </div>
      ) : null}
      {error ? (
        <div role="alert">
          <p>Поиск не ответил. Проверьте Jackett.</p>
          <button className="secondary">Повторить</button>
        </div>
      ) : null}
      {choices?.length === 0 ? <p>Подходящих версий не найдено.</p> : null}
      <div className="choice-list">
        {choices?.map((choice) => (
          <button
            className={`choice choice-${choice.compatibility} focusable`}
            key={choice.id}
            disabled={choice.compatibility === "incompatible"}
            onClick={() => onSelect?.(choice.id, choice)}
          >
            <span className="choice-main">
              <strong>{choice.releaseName}</strong>
              <small>
                {choice.source} · {choice.flags.join(" · ")}
              </small>
            </span>
            <span className="choice-stats">
              {choice.size
                ? `${(choice.size / 1024 ** 3).toFixed(1)} ГБ`
                : "Размер неизвестен"}{" "}
              · {choice.seeders ?? 0} сидов · {choice.score} баллов
            </span>
            <span className="choice-reason">
              {choice.rationale.join(" · ")}
            </span>
          </button>
        ))}
      </div>
    </aside>
    </ModalLayer>
  );
}

type PlaybackFile = {
  id: number;
  path: string;
  length: number;
  streamUrl: string;
  playlistUrl?: string;
};
type PlaybackResult = {
  status: "ready" | "choose_file";
  files: PlaybackFile[];
};

export function androidPlayerIntent(target: string, mimeType: string): string {
  const url = new URL(target);
  if (url.protocol !== "http:" && url.protocol !== "https:") return target;
  const scheme = url.protocol.slice(0, -1);
  const destination = `${url.host}${url.pathname}${url.search}${url.hash}`;
  return `intent://${destination}#Intent;scheme=${scheme};type=${mimeType};category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(target)};end`;
}

export function externalPlayerUrl(
  target: string,
  mimeType: string,
  userAgent = navigator.userAgent,
): string {
  if (/KinoHubTV\//i.test(userAgent)) {
    const params = new URLSearchParams({ url: target, mime: mimeType });
    return `kinohub-player://play?${params}`;
  }
  const android = /Android/i.test(userAgent);
  const embeddedWebView =
    /\bwv\b|; wv\)|Version\/4\.0.*Chrome/i.test(userAgent);
  return android && !embeddedWebView
    ? androidPlayerIntent(target, mimeType)
    : target;
}

export function PlaybackPanel({
  choiceId,
  seriesContext,
  onResolved,
  releaseInfo,
  initialResult,
  initialFilePath,
  initialError,
  onClose,
}: {
  choiceId?: string;
  seriesContext?: { seriesId: string; season: number };
  onResolved?: (result: PlaybackResult) => void;
  releaseInfo?: TorrentChoice | undefined;
  initialResult?: PlaybackResult;
  initialFilePath?: string;
  initialError?: string;
  onClose: () => void;
}) {
  const [result, setResult] = useState<PlaybackResult | undefined>(
    initialResult,
  );
  const [error, setError] = useState(initialError);
  const [selected, setSelected] = useState<PlaybackFile | undefined>(
    initialResult?.status === "ready"
      ? initialResult.files[0]
      : initialResult?.status === "choose_file"
        ? initialResult.files.find((file) => file.path === initialFilePath)
        : undefined,
  );
  const [watched, setWatched] = useState(readWatchedEpisodes);
  const autoStartedRef = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(true, dialogRef);
  const launch = useCallback(async () => {
    if (!choiceId) return;
    setError(undefined);
    setResult(undefined);
    try {
      const response = await fetch("/api/playback/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choiceId }),
      });
      const payload = (await response.json()) as PlaybackResult & {
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message ?? "Не удалось запустить просмотр");
      setResult(payload);
      onResolved?.(payload);
      if (payload.status === "ready") setSelected(payload.files[0]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось запустить просмотр",
      );
    }
  }, [choiceId, onResolved]);
  useEffect(() => {
    if (!initialResult && !initialError && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void launch();
    }
  }, [initialError, initialResult, launch]);
  const active = selected;
  const episodeFiles = useMemo(() => {
    if (!result || result.status !== "choose_file" || !seriesContext) return result?.files ?? [];
    const matchingSeason = result.files.filter((file) => episodeFileInfo(file.path)?.season === seriesContext.season);
    return matchingSeason.length ? matchingSeason : result.files;
  }, [result, seriesContext]);
  const markActiveWatched = () => {
    if (!active || !seriesContext) return;
    const info = episodeFileInfo(active.path);
    if (!info) return;
    setWatched((current) => { const next = new Set(current).add(watchedEpisodeKey(seriesContext.seriesId, info.season, info.episode)); saveWatchedEpisodes(next); return next; });
  };
  useEffect(() => {
    if (active || !seriesContext || !episodeFiles.length) return;
    queueMicrotask(() => focusAndReveal(dialogRef.current?.querySelector<HTMLElement>('[data-episode-watched="false"]') ?? dialogRef.current?.querySelector<HTMLElement>(".file-list .focusable") ?? null));
  }, [active, episodeFiles, seriesContext]);
  useEffect(() => {
    if (!active) return;
    queueMicrotask(() =>
      focusAndReveal(
        dialogRef.current?.querySelector<HTMLElement>("[data-player-autofocus]") ?? null,
      ),
    );
  }, [active]);
  return (
    <ModalLayer>
    <section
      ref={dialogRef}
      className="player-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-title"
    >
      <div className="drawer-head">
        <div>
          <p className="eyebrow">TORRSERVER</p>
          <h2 id="player-title">Подготовка просмотра</h2>
        </div>
        <button
          className="secondary focusable"
          data-dialog-close
          onClick={onClose}
        >
          Отмена
        </button>
      </div>
      {!result && !error ? (
        <p role="status">Добавляем торрент и проверяем файлы…</p>
      ) : null}
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button className="primary focusable" onClick={() => void launch()}>
            Повторить
          </button>
          <details>
            <summary>Диагностика</summary>
            <p>
              Проверьте адрес TorrServer и доступность сервиса в локальной сети.
            </p>
          </details>
        </div>
      ) : null}
      {result?.status === "choose_file" && !active ? (
        <div className="file-list">
          <p>В торренте несколько видео. Выберите файл:</p>
          {episodeFiles.map((file) => {
            const info = episodeFileInfo(file.path);
            const isWatched = Boolean(info && seriesContext && watched.has(watchedEpisodeKey(seriesContext.seriesId, info.season, info.episode)));
            return (
            <button
              className="choice focusable"
              key={file.id}
              data-episode-watched={String(isWatched)}
              onClick={() => setSelected(file)}
            >
              <span>{info ? `${info.episode} серия` : file.path}{isWatched ? " · ✓ Просмотрено" : ""}</span>
              {info ? <small>{file.path}</small> : null}
              <span className="file-meta">{fileMediaSummary(file.path, releaseInfo)}</span>
              <span>{(file.length / 1024 ** 3).toFixed(1)} ГБ</span>
            </button>
          );})}
        </div>
      ) : null}
      {active ? (
        <div className="player-ready">
          <h3>Готово к просмотру</h3>
          <p>{active.path}</p>
          <div className="file-badges" aria-label="Информация о файле">{fileMediaHints(active.path, releaseInfo).map((hint) => <span key={hint}>{hint}</span>)}</div>
          <a
            className="primary link-button focusable"
            href={externalPlayerUrl(active.streamUrl, "video/*")}
            data-player-autofocus
            onClick={markActiveWatched}
          >
            Выбрать плеер
          </a>
          {seriesContext ? <button className="secondary focusable" onClick={() => setSelected(undefined)}>← К списку серий</button> : null}
          {active.playlistUrl ? (
            <a
              className="secondary link-button focusable"
              href={externalPlayerUrl(active.playlistUrl, "application/x-mpegURL")}
            >
              Открыть M3U в VLC / Kodi
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
    </ModalLayer>
  );
}

function fileMediaHints(path: string, release?: TorrentChoice): string[] {
  const fromName = [path.match(/\b(?:2160p|1080p|720p|4K)\b/i)?.[0], path.match(/\b(?:HEVC|H\.265|x265|AVC|H\.264|x264)\b/i)?.[0]].filter((value): value is string => Boolean(value));
  const usefulFlags = release?.flags.filter((flag) => /^(?:2160p|1080p|720p|H264|H265|RU|EN|ENG AUDIO|RU SUB|EN SUB|SDR|HDR|DV)$/i.test(flag)) ?? [];
  return [...new Set([...fromName, ...usefulFlags])];
}
function fileMediaSummary(path: string, release?: TorrentChoice): string {
  return fileMediaHints(path, release).join(" · ") || "Параметры дорожек не указаны в названии раздачи";
}

export function episodeFileMatches(path: string, season: number, episode: number): boolean {
  const s = String(season).padStart(2, "0");
  const e = String(episode).padStart(2, "0");
  return new RegExp(`(?:s${s}[ ._-]*e${e}|${season}x${e}|season[ ._-]*${season}[ ._-]*episode[ ._-]*${episode})`, "i").test(path);
}

export function episodeFileInfo(path: string): { season: number; episode: number } | null {
  const match = path.match(/s(\d{1,2})[ ._-]*e(\d{1,3})|(?:^|\D)(\d{1,2})x(\d{1,3})(?:\D|$)|season[ ._-]*(\d{1,2})[ ._-]*episode[ ._-]*(\d{1,3})/i);
  if (!match) return null;
  return { season: Number(match[1] ?? match[3] ?? match[5]), episode: Number(match[2] ?? match[4] ?? match[6]) };
}

export function MovieDetails({
  movie,
  watchlisted = false,
  onToggleWatchlist,
  taste = 0,
  onRate,
}: {
  movie: Movie;
  watchlisted?: boolean;
  onToggleWatchlist?: (movie: Movie) => void;
  taste?: TasteScore | 0;
  onRate?: (item: MediaItem, value: TasteScore | null) => void;
}) {
  const [showChoices, setShowChoices] = useState(false);
  const [choiceId, setChoiceId] = useState<string>();
  const [selectedRelease, setSelectedRelease] = useState<TorrentChoice>();
  const backdropStyle = movie.backdropUrl
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(8,11,18,.98) 10%, rgba(8,11,18,.45)), url(${movie.backdropUrl})`,
      }
    : undefined;
  return (
    <article
      className={`details ${movie.backdropUrl ? "" : "missing-backdrop"}`}
      style={backdropStyle}
    >
      <ContextBack />
      <div className="detail-content">
        <p className="eyebrow detail-status">{statusCopy[movie.mediaStatus]}</p>
        <h1>{movie.title}</h1>
        <div className="detail-facts">
          <span className="meta">{movie.year}{movie.runtimeMinutes ? ` · ${movie.runtimeMinutes} мин` : ""}</span>
          <Ratings movie={movie} />
          <span className="genres">{movie.genres.join(" · ") || "Жанр не указан"}</span>
        </div>
        <p className="overview">
          {movie.overview || "Описание пока недоступно."}
        </p>
        <div className="actions">
          <button
            className="primary focusable movie-action"
            data-page-autofocus
            onClick={() => setShowChoices(true)}
          >
            <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            Смотреть сейчас
          </button>
          <button
            className={`focusable movie-action watchlist-action ${watchlisted ? "is-watchlisted" : ""}`}
            aria-pressed={watchlisted}
            onClick={() => onToggleWatchlist?.(movie)}
          >
            <svg className="action-icon bookmark-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3.75h12v17l-6-4-6 4z" />
            </svg>
            {watchlisted ? "В списке" : "Буду смотреть"}
          </button>
          <TasteAction item={movie} value={taste} onRate={onRate} />
        </div>
      </div>
      {showChoices ? (
        <TorrentChoiceDrawer
          movieId={movie.id}
          onClose={() => setShowChoices(false)}
          onSelect={(id, choice) => {
            setShowChoices(false);
            setSelectedRelease(choice);
            setChoiceId(id);
          }}
        />
      ) : null}
      {choiceId ? (
        <PlaybackPanel
          choiceId={choiceId}
          releaseInfo={selectedRelease}
          onClose={() => setChoiceId(undefined)}
        />
      ) : null}
      <Recommendations movieId={movie.id} />
    </article>
  );
}

function SeriesDetails({ series, watchlisted = false, onToggleWatchlist, taste = 0, onRate }: { series: Series; watchlisted?: boolean; onToggleWatchlist?: (series: Series) => void; taste?: TasteScore | 0; onRate?: (item: MediaItem, value: TasteScore | null) => void }) {
  const seasons = series.seasons.filter((item) => item.seasonNumber > 0 && item.episodeCount > 0);
  const [season, setSeason] = useState(seasons[0]?.seasonNumber ?? 1);
  const [showChoices, setShowChoices] = useState(false);
  const [choiceId, setChoiceId] = useState<string>();
  const [releaseName, setReleaseName] = useState("");
  const [selectedRelease, setSelectedRelease] = useState<TorrentChoice>();
  const [savedPack, setSavedPack] = useState<SavedSeriesPack | undefined>(() => readSeriesPacks()[series.id]);
  const [useSavedPack, setUseSavedPack] = useState(false);
  const [continueFilePath, setContinueFilePath] = useState<string>();
  const [watchProgressRevision, setWatchProgressRevision] = useState(0);
  const nextEpisode = useMemo(() => {
    void watchProgressRevision;
    if (!savedPack) return undefined;
    const watched = readWatchedEpisodes();
    if (![...watched].some((key) => key.startsWith(`${series.id}:`))) return undefined;
    return savedPack.files
      .map((file) => ({ file, info: episodeFileInfo(file.path) }))
      .filter((item): item is { file: PlaybackFile; info: { season: number; episode: number } } => Boolean(item.info))
      .sort((left, right) => left.info.season - right.info.season || left.info.episode - right.info.episode)
      .find((item) => !watched.has(watchedEpisodeKey(series.id, item.info.season, item.info.episode)));
  }, [savedPack, series.id, watchProgressRevision]);
  useEffect(() => {
    if (!savedPack || savedPack.series) return;
    const enriched = { ...savedPack, series }; saveSeriesPack(series.id, enriched); setSavedPack(enriched);
  }, [savedPack, series]);
  return (
    <article className={`details series-details ${series.backdropUrl ? "" : "missing-backdrop"}`} style={series.backdropUrl ? { backgroundImage: `linear-gradient(90deg, rgba(8,11,18,.98) 10%, rgba(8,11,18,.45)), url(${series.backdropUrl})` } : undefined}>
      <ContextBack />
      <div className="detail-content">
        <p className="eyebrow detail-status">СЕРИАЛ · {series.numberOfSeasons} сез.</p>
        <h1>{series.title}</h1>
        <div className="detail-facts"><span className="meta">{series.year}{series.episodeRuntimeMinutes ? ` · ~${series.episodeRuntimeMinutes} мин` : ""}</span><Ratings movie={series} /><span className="genres">{series.genres.join(" · ")}</span></div>
        <p className="overview">{series.overview || "Описание пока недоступно."}</p>
        <div className="episode-picker" aria-label="Выбор серии">
          {nextEpisode ? <button className="primary focusable movie-action continue-action" data-page-autofocus onClick={() => { setSeason(nextEpisode.info.season); setContinueFilePath(nextEpisode.file.path); setUseSavedPack(true); }}><svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>Продолжить просмотр · {nextEpisode.info.season} сезон, {nextEpisode.info.episode} серия</button> : null}
          {!nextEpisode ? <SeasonPicker seasons={seasons} value={season} onChange={setSeason} /> : null}
          {!nextEpisode ? <button className="primary focusable movie-action" data-page-autofocus onClick={() => { setContinueFilePath(undefined); if (savedPack) setUseSavedPack(true); else setShowChoices(true); }}><svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>{savedPack ? `Открыть серии ${season} сезона` : `Выбрать раздачу ${season} сезона`}</button> : null}
          <button className={`focusable movie-action watchlist-action ${watchlisted ? "is-watchlisted" : ""}`} aria-pressed={watchlisted} onClick={() => onToggleWatchlist?.(series)}><svg className="action-icon bookmark-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.75h12v17l-6-4-6 4z" /></svg>{watchlisted ? "В списке" : "Буду смотреть"}</button>
          <TasteAction item={series} value={taste} onRate={onRate} />
          {nextEpisode ? <SeasonPicker seasons={seasons} value={season} onChange={setSeason} /> : null}
          {nextEpisode ? <button className="secondary focusable movie-action" onClick={() => { setContinueFilePath(undefined); setUseSavedPack(true); }}><svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>{`Открыть серии ${season} сезона`}</button> : null}
          {savedPack ? <button className="secondary focusable" onClick={() => { removeSeriesPack(series.id); setSavedPack(undefined); setShowChoices(true); }}>Выбрать другую раздачу</button> : null}
        </div>
        {savedPack ? <p className="saved-pack">Закреплена раздача: {savedPack.releaseName}</p> : null}
      </div>
      {showChoices ? <TorrentChoiceDrawer seriesId={series.id} season={season} onClose={() => setShowChoices(false)} onSelect={(id, choice) => { setShowChoices(false); setReleaseName(choice.releaseName); setSelectedRelease(choice); setChoiceId(id); }} /> : null}
      {choiceId ? <PlaybackPanel choiceId={choiceId} releaseInfo={selectedRelease} seriesContext={{ seriesId: series.id, season }} onResolved={(result) => { const pack = { releaseName, files: result.files, releaseInfo: selectedRelease, series }; saveSeriesPack(series.id, pack); setSavedPack(pack); }} onClose={() => setChoiceId(undefined)} /> : null}
      {useSavedPack && savedPack ? <PlaybackPanel initialResult={{ status: "choose_file", files: savedPack.files }} {...(continueFilePath ? { initialFilePath: continueFilePath } : {})} releaseInfo={savedPack.releaseInfo} seriesContext={{ seriesId: series.id, season }} onClose={() => { setUseSavedPack(false); setContinueFilePath(undefined); setWatchProgressRevision((value) => value + 1); }} /> : null}
    </article>
  );
}

function SeriesCatalog() {
  const [series, setSeries] = useState<Series[]>();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { const controller = new AbortController(); fetch("/api/series?page=1", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error("series"); return response.json() as Promise<{ series: Series[]; hasMore: boolean }>; }).then((payload) => { setSeries(payload.series); setHasMore(payload.hasMore); }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true); }); return () => controller.abort(); }, []);
  const loadMore = async () => {
    if (pending || !hasMore) return;
    setPending(true);
    try {
      const next = page + 1;
      const response = await fetch(`/api/series?page=${next}`);
      if (!response.ok) throw new Error("series");
      const payload = await response.json() as { series: Series[]; hasMore: boolean };
      setSeries((current) => [...(current ?? []), ...payload.series.filter((candidate) => !current?.some((item) => item.id === candidate.id))]);
      setPage(next);
      setHasMore(payload.hasMore);
    } catch { setFailed(true); }
    finally { setPending(false); }
  };
  return <section className="rail-page series-page"><a className="back focusable" href="/">← На главную</a><p className="eyebrow">СЕРИАЛЫ</p><h1>Что посмотреть вечером</h1>{!series && !failed ? <p role="status">Загружаем сериалы…</p> : null}{failed ? <p role="alert">Не удалось загрузить сериалы.</p> : null}{series?.length === 0 ? <p>Seerr пока не вернул сериалы.</p> : null}<div className="movie-grid">{series?.map((item, index) => <SeriesCard series={item} key={item.id} pageAutoFocus={index === 0} />)}</div>{hasMore && series?.length ? <button className="primary focusable load-more" onClick={() => void loadMore()} disabled={pending}>{pending ? "Загружаем…" : "Показать ещё сериалы"}</button> : null}</section>;
}

export function WatchlistPage({ movies, series = [] }: { movies: Movie[]; series?: Series[] }) {
  return (
    <section className="watchlist-page" aria-labelledby="watchlist-title">
      <p className="eyebrow">МОЯ КОЛЛЕКЦИЯ</p>
      <h1 id="watchlist-title">Буду смотреть</h1>
      {movies.length || series.length ? (
        <div className="movie-grid">
          {movies.map((movie, index) => (
            <MovieCard movie={movie} key={movie.id} pageAutoFocus={index === 0} />
          ))}
          {series.map((item, index) => <SeriesCard series={item} key={`series-${item.id}`} pageAutoFocus={!movies.length && index === 0} />)}
        </div>
      ) : (
        <div className="empty watchlist-empty">
          <h2>Здесь пока пусто</h2>
          <p>Добавляйте фильмы и сериалы кнопкой «Буду смотреть».</p>
          <a className="primary link-button focusable" href="/" data-page-autofocus>Перейти к каталогу</a>
        </div>
      )}
    </section>
  );
}

function Recommendations({ movieId }: { movieId: string }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/movies/${encodeURIComponent(movieId)}/recommendations`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ movies: Movie[] }> : { movies: [] })
      .then((payload) => setMovies(payload.movies))
      .catch(() => undefined);
    return () => controller.abort();
  }, [movieId]);
  if (!movies.length) return null;
  return (
    <section className="recommendations" aria-labelledby="recommendations-title">
      <h2 id="recommendations-title">Похожее на этот фильм</h2>
      <div className="rail">
        {movies.map((movie) => <MovieCard movie={movie} key={movie.id} />)}
      </div>
    </section>
  );
}

export function Home({ catalog, series = [], tasteProfile = {} }: { catalog: Catalog; series?: Series[]; tasteProfile?: TasteProfile }) {
  const continueWatching = readContinueWatching();
  const recommendations = buildRecommendations([...catalog.rails.flatMap((rail) => rail.movies), ...series], tasteProfile);
  return (
    <>
      <section className="hero" aria-labelledby="welcome-title">
        <p className="eyebrow">СМОТРИТЕ БЕЗ СУЕТЫ</p>
        <h1 id="welcome-title">Кино для большого экрана</h1>
        <p>Выберите фильм, сохраните копию или начните просмотр.</p>
      </section>
      {catalog.rails.map((rail, railIndex) => (
        <Fragment key={rail.id}>
        <section
          className="catalog-section"
          aria-labelledby={`rail-${rail.id}`}
        >
          <h2 id={`rail-${rail.id}`}>{rail.title}</h2>
          <div className="rail">
            {rail.id === "popular" ? interleavePopular(rail.movies, series.slice(0, 8)).map((item, itemIndex) => "numberOfSeasons" in item
              ? <SeriesCard series={item} key={`series-${item.id}`} pageAutoFocus={railIndex === 0 && itemIndex === 0} />
              : <MovieCard movie={item} key={`movie-${item.id}`} pageAutoFocus={railIndex === 0 && itemIndex === 0} />)
              : rail.movies.map((movie, movieIndex) => <MovieCard movie={movie} key={movie.id} pageAutoFocus={railIndex === 0 && movieIndex === 0} />)}
            <ShowMoreCard railId={rail.id} title={rail.title} />
          </div>
        </section>
        {rail.id === "popular" && continueWatching.length ? <ContinueWatchingRail series={continueWatching} /> : null}
        {rail.id === "popular" && !continueWatching.length && series.length ? <SeriesRail series={series} /> : null}
        {rail.id === "popular" && recommendations.length ? <RecommendationRail items={recommendations} /> : null}
        {rail.id === "popular" && continueWatching.length && series.length ? <SeriesRail series={series} /> : null}
        </Fragment>
      ))}
    </>
  );
}

function RecommendationRail({ items }: { items: MediaItem[] }) {
  return <section className="catalog-section recommendation-rail" aria-labelledby="rail-recommended"><h2 id="rail-recommended">Рекомендуем</h2><p className="rail-hint">На основе ваших оценок от 1 до 10</p><div className="rail">{items.map((item) => "numberOfSeasons" in item ? <SeriesCard series={item} key={`series-${item.id}`} /> : <MovieCard movie={item} key={`movie-${item.id}`} />)}</div></section>;
}

function ContinueWatchingRail({ series }: { series: Series[] }) {
  return <section className="catalog-section continue-watching" aria-labelledby="rail-continue-watching"><h2 id="rail-continue-watching">Продолжить просмотр</h2><div className="rail">{series.map((item) => <SeriesCard series={item} key={item.id} />)}</div></section>;
}

function SeriesRail({ series }: { series: Series[] }) {
  return <section className="catalog-section" aria-labelledby="rail-popular-series"><h2 id="rail-popular-series">Популярные сериалы</h2><div className="rail">{series.map((item) => <SeriesCard series={item} key={item.id} />)}<a className="show-more-card focusable" href="/series"><span aria-hidden="true">→</span><strong>Показать ещё</strong><small>Все сериалы</small></a></div></section>;
}

function interleavePopular(movies: Movie[], series: Series[]): Array<Movie | Series> {
  const result: Array<Movie | Series> = [];
  const length = Math.max(movies.length, series.length);
  for (let index = 0; index < length; index += 1) { if (movies[index]) result.push(movies[index]!); if (series[index]) result.push(series[index]!); }
  return result;
}

function RailPage({ rail }: { rail: Catalog["rails"][number] }) {
  const [movies, setMovies] = useState(rail.movies);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pending, setPending] = useState(false);
  const loadMore = async () => {
    if (pending || !hasMore) return;
    setPending(true);
    try {
      const next = page + 1;
      const response = await fetch(`/api/rails/${encodeURIComponent(rail.id)}?page=${next}`);
      if (!response.ok) throw new Error("rail");
      const payload = await response.json() as { movies: Movie[]; hasMore: boolean };
      setMovies((current) => [...current, ...payload.movies.filter((movie) => !current.some((item) => item.id === movie.id))]);
      setPage(next);
      setHasMore(payload.hasMore);
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="rail-page" aria-labelledby="rail-page-title">
      <a className="back focusable" href="/">← На главную</a>
      <p className="eyebrow">КОЛЛЕКЦИЯ</p>
      <h1 id="rail-page-title">{rail.title}</h1>
      <div className="movie-grid">{movies.map((movie, index) => <MovieCard movie={movie} key={movie.id} pageAutoFocus={index === 0} />)}</div>
      {hasMore ? <button className="primary focusable load-more" onClick={() => void loadMore()} disabled={pending}>{pending ? "Загружаем…" : "Показать ещё фильмы"}</button> : null}
    </section>
  );
}

type DiagnosticService = {
  name: string;
  configured: boolean;
  endpoint: string;
  message: string;
};

export function SetupDiagnostics() {
  const androidTvApp = /KinoHubTV\//i.test(navigator.userAgent);
  const [payload, setPayload] = useState<{
    mode: string;
    services: DiagnosticService[];
    message: string;
  }>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health/integrations", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("health");
        return response.json();
      })
      .then(setPayload)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setFailed(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <section className="setup-panel" aria-labelledby="setup-title">
      <p className="eyebrow">ДИАГНОСТИКА</p>
      <h1 id="setup-title">Подключения KinoHub</h1>
      <p>Адреса показаны без ключей и учётных данных.</p>
      {androidTvApp ? (
        <a className="primary link-button focusable" href="kinohub-settings://open">
          Изменить адрес сервера в приложении
        </a>
      ) : null}
      {!payload && !failed ? (
        <p role="status">Проверяем локальные сервисы…</p>
      ) : null}
      {failed ? (
        <div role="alert">
          <h2>Сервер диагностики недоступен</h2>
          <p>
            Проверьте контейнер KinoHub командой <code>docker compose ps</code>.
          </p>
        </div>
      ) : null}
      {payload ? (
        <>
          <div className={`mode-banner mode-${payload.mode}`}>
            <strong>Режим: {payload.mode}</strong>
            <span>{payload.message}</span>
          </div>
          <div className="diagnostic-grid">
            {payload.services.map((service) => (
              <article className="diagnostic-card" key={service.name}>
                <span
                  className={service.configured ? "status-ok" : "status-warn"}
                >
                  {service.configured ? "Готово" : "Не настроено"}
                </span>
                <h2>{service.name}</h2>
                <code>{service.endpoint}</code>
                <p>{service.message}</p>
                {!service.configured ? (
                  <p className="remediation">
                    Добавьте URL и ключ в локальный <code>.env</code>, затем
                    перезапустите только KinoHub.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export function App({
  initialCatalog,
  initialPath,
  forcedState,
}: {
  initialCatalog?: Catalog;
  initialPath?: string;
  forcedState?: LoadState;
}) {
  useSpatialNavigation();
  const [catalog, setCatalog] = useState<Catalog | undefined>(initialCatalog);
  const [state, setState] = useState<LoadState>(
    forcedState ?? (initialCatalog ? "ready" : "loading"),
  );
  const path = initialPath ?? window.location.pathname;
  const [routeMovie, setRouteMovie] = useState<Movie>();
  const [routeSeries, setRouteSeries] = useState<Series>();
  const [homeSeries, setHomeSeries] = useState<Series[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>(readWatchlist);
  const [seriesWatchlist, setSeriesWatchlist] = useState<Series[]>(readSeriesWatchlist);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile>(readTasteProfile);
  const rateMedia = useCallback((item: MediaItem, value: TasteScore | null) => {
    setTasteProfile((current) => {
      const key = mediaKey(item);
      const next = { ...current };
      if (value === null) delete next[key]; else next[key] = { value, item };
      localStorage.setItem(tasteProfileStorageKey, JSON.stringify(next));
      return next;
    });
  }, []);
  const toggleWatchlist = useCallback((selected: Movie) => {
    setWatchlist((current) => {
      const next = current.some((item) => item.id === selected.id)
        ? current.filter((item) => item.id !== selected.id)
        : [selected, ...current];
      localStorage.setItem(watchlistStorageKey, JSON.stringify(next));
      return next;
    });
  }, []);
  const toggleSeriesWatchlist = useCallback((selected: Series) => {
    setSeriesWatchlist((current) => { const next = current.some((item) => item.id === selected.id) ? current.filter((item) => item.id !== selected.id) : [selected, ...current]; localStorage.setItem(seriesWatchlistStorageKey, JSON.stringify(next)); return next; });
  }, []);
  useEffect(() => {
    if (initialCatalog || forcedState) return;
    const controller = new AbortController();
    fetch("/api/catalog", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("catalog");
        return response.json() as Promise<Catalog>;
      })
      .then((value) => {
        setCatalog(value);
        setState(value.rails.length ? "ready" : "empty");
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setState("unavailable");
      });
    return () => controller.abort();
  }, [initialCatalog, forcedState]);
  useEffect(() => {
    if (state !== "ready" || initialCatalog) return;
    const controller = new AbortController();
    fetch("/api/series", { signal: controller.signal }).then((response) => response.ok ? response.json() as Promise<{ series: Series[] }> : { series: [] }).then((payload) => setHomeSeries(payload.series)).catch(() => undefined);
    return () => controller.abort();
  }, [state, initialCatalog]);
  const movie = useMemo(() => {
    const id = path.match(/^\/movies\/([^/]+)/)?.[1];
    return id
      ? catalog?.rails
          .flatMap((rail) => rail.movies)
          .find((item) => item.id === id)
      : undefined;
  }, [catalog, path]);
  const activeMovie = movie ?? routeMovie;
  useEffect(() => {
    const id = path.match(/^\/movies\/([^/]+)/)?.[1];
    if (!id || movie) return;
    const controller = new AbortController();
    fetch(`/api/movies/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<Movie> : Promise.reject(new Error("movie")))
      .then(setRouteMovie)
      .catch(() => undefined);
    return () => controller.abort();
  }, [movie, path]);
  useEffect(() => {
    const id = path.match(/^\/series\/([^/]+)/)?.[1];
    if (!id) return;
    const controller = new AbortController();
    fetch(`/api/series/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<Series> : Promise.reject(new Error("series")))
      .then(setRouteSeries).catch(() => undefined);
    return () => controller.abort();
  }, [path]);
  const railId = path.match(/^\/rails\/([^/]+)$/)?.[1];
  const activeRail = railId ? catalog?.rails.find((rail) => rail.id === railId) : undefined;
  usePageFocus(`${path}:${state}:${activeMovie?.id ?? ""}:${routeSeries?.id ?? ""}:${activeRail?.id ?? ""}`, state === "ready");
  return (
    <main>
      <header>
        <a className="brand" href="/" tabIndex={-1} aria-label="KinoHub, главная">
          KinoHub
        </a>
        <nav aria-label="Основная навигация">
          <a className="focusable" href="/">
            Главная
          </a>
          <a className="focusable" href="/watchlist">
            Буду смотреть
          </a>
          <a className="focusable" href="/search">
            Поиск
          </a>
          <a className="focusable" href="/setup">
            Настройка
          </a>
        </nav>
      </header>
      {state === "loading" ? <CatalogSkeleton /> : null}
      {state === "unavailable" ? (
        <section className="error-state" role="alert">
          <h1>Каталог временно недоступен</h1>
          <p>Проверьте подключение к Seerr и попробуйте снова.</p>
          <button className="primary" onClick={() => window.location.reload()}>
            Повторить
          </button>
        </section>
      ) : null}
      {state === "empty" ? (
        <section className="empty">
          <h1>Каталог пока пуст</h1>
          <p>Добавьте источники в Seerr или вернитесь позже.</p>
        </section>
      ) : null}
      {state === "ready" && path === "/search" ? <Search /> : null}
      {state === "ready" && path === "/setup" ? <SetupDiagnostics /> : null}
      {state === "ready" && path === "/watchlist" ? <WatchlistPage movies={watchlist} series={seriesWatchlist} /> : null}
      {state === "ready" && path === "/series" ? <SeriesCatalog /> : null}
      {state === "ready" && path.startsWith("/series/") && routeSeries ? <SeriesDetails series={routeSeries} watchlisted={seriesWatchlist.some((item) => item.id === routeSeries.id)} onToggleWatchlist={toggleSeriesWatchlist} taste={tasteProfile[mediaKey(routeSeries)]?.value ?? 0} onRate={rateMedia} /> : null}
      {state === "ready" && path.startsWith("/series/") && !routeSeries ? <section className="empty"><h1>Загружаем сериал…</h1></section> : null}
      {state === "ready" && path.startsWith("/movies/") && activeMovie ? (
        <MovieDetails
          movie={activeMovie}
          watchlisted={watchlist.some((item) => item.id === activeMovie.id)}
          onToggleWatchlist={toggleWatchlist}
          taste={tasteProfile[mediaKey(activeMovie)]?.value ?? 0}
          onRate={rateMedia}
        />
      ) : null}
      {state === "ready" && path.startsWith("/movies/") && !activeMovie ? (
        <section className="empty">
          <h1>Фильм не найден</h1>
          <a href="/">Вернуться на главную</a>
        </section>
      ) : null}
      {state === "ready" && path === "/" && catalog ? (
        <Home catalog={catalog} series={homeSeries} tasteProfile={tasteProfile} />
      ) : null}
      {state === "ready" && activeRail ? <RailPage rail={activeRail} /> : null}
    </main>
  );
}
