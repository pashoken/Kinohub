import { z } from 'zod';
import { movieSchema, seriesSchema, type Movie, type Series } from '@kinohub/contracts';
import { requestJson, type HttpPolicy } from './http.js';

const seerrMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  originalTitle: z.string().optional(),
  releaseDate: z.string().optional(),
  overview: z.string().default(''),
  voteAverage: z.number().default(0),
  runtime: z.number().optional(),
  genres: z.array(z.object({ name: z.string() })).default([]),
  posterPath: z.string().nullable().default(null),
  backdropPath: z.string().nullable().default(null),
  mediaInfo: z.object({ status: z.number().optional() }).optional()
});

const seerrSeriesSchema = z.object({
  id: z.number(),
  name: z.string(),
  originalName: z.string().optional(),
  firstAirDate: z.string().optional(),
  overview: z.string().default(''),
  voteAverage: z.number().default(0),
  episodeRunTime: z.array(z.number()).default([]),
  numberOfSeasons: z.number().int().default(0),
  genres: z.array(z.object({ name: z.string() })).default([]),
  seasons: z.array(z.object({
    seasonNumber: z.number().int(), name: z.string().default(''), episodeCount: z.number().int().default(0),
    airDate: z.string().nullable().optional(), posterPath: z.string().nullable().default(null)
  })).default([]),
  posterPath: z.string().nullable().default(null),
  backdropPath: z.string().nullable().default(null),
  mediaInfo: z.object({ status: z.number().optional() }).optional()
});

export class SeerrClient {
  constructor(private readonly baseUrl: URL, private readonly apiKey: string, private readonly policy: HttpPolicy = {}) {}

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('X-Api-Key', this.apiKey);
    headers.set('Accept', 'application/json');
    return requestJson<T>(new URL(path, this.baseUrl), { ...init, headers }, this.policy);
  }

  async discover(page = 1, options: { genre?: string; sortBy?: string } = {}): Promise<Movie[]> {
    const params = new URLSearchParams({ page: String(page) });
    if (options.genre) params.set('genre', options.genre);
    if (options.sortBy) params.set('sortBy', options.sortBy);
    const payload = await this.call<{ results: unknown[] }>(`/api/v1/discover/movies?${params}`);
    return normalizeMovieList(payload.results);
  }

  async recommendations(id: string, page = 1): Promise<Movie[]> {
    const payload = await this.call<{ results: unknown[] }>(`/api/v1/movie/${encodeURIComponent(id)}/recommendations?page=${page}`);
    return normalizeMovieList(payload.results);
  }

  async discoverSeries(page = 1): Promise<Series[]> {
    const params = new URLSearchParams({
      page: String(page),
      sortBy: 'popularity.desc',
      voteCountGte: '500'
    });
    const payload = await this.call<{ results: unknown[] }>(`/api/v1/discover/tv?${params}`);
    return normalizeSeriesList(payload.results);
  }

  async seriesDetail(id: string): Promise<Series> {
    return normalizeSeerrSeries(await this.call(`/api/v1/tv/${encodeURIComponent(id)}`));
  }

  async seriesRecommendations(id: string, page = 1): Promise<Series[]> {
    const payload = await this.call<{ results: unknown[] }>(`/api/v1/tv/${encodeURIComponent(id)}/recommendations?page=${page}`);
    return normalizeSeriesList(payload.results);
  }

  async searchSeries(query: string): Promise<Series[]> {
    const payload = await this.call<{ results: unknown[] }>(`/api/v1/search?query=${encodeURIComponent(query)}&page=1`);
    return normalizeSeriesList(payload.results);
  }

  async searchMedia(query: string): Promise<{ movies: Movie[]; series: Series[] }> {
    const payload = await this.call<{ results: unknown[] }>(`/api/v1/search?query=${encodeURIComponent(query)}&page=1`);
    return {
      movies: normalizeMovieList(payload.results),
      series: normalizeSeriesList(payload.results),
    };
  }

  async search(query: string): Promise<Movie[]> {
    const payload = await this.call<{ results: unknown[] }>(`/api/v1/search?query=${encodeURIComponent(query)}&page=1`);
    return normalizeMovieList(payload.results);
  }

  async detail(id: string): Promise<Movie> {
    return normalizeSeerrMovie(await this.call(`/api/v1/movie/${encodeURIComponent(id)}`));
  }

}

function normalizeSeriesList(values: unknown[]): Series[] {
  return values.flatMap((value) => { try { return [normalizeSeerrSeries(value)]; } catch { return []; } });
}

export function normalizeSeerrSeries(value: unknown): Series {
  const show = seerrSeriesSchema.parse(value);
  const statusMap: Record<number, Series['mediaStatus']> = { 2: 'pending', 3: 'processing', 4: 'available', 5: 'available' };
  return seriesSchema.parse({
    id: String(show.id), title: show.name, ...(show.originalName ? { originalTitle: show.originalName } : {}),
    year: Number(show.firstAirDate?.slice(0, 4) || 2000), overview: show.overview, rating: show.voteAverage,
    genres: show.genres.map((genre) => genre.name),
    posterUrl: show.posterPath ? `https://image.tmdb.org/t/p/w342${show.posterPath}` : null,
    backdropUrl: show.backdropPath ? `https://image.tmdb.org/t/p/w1280${show.backdropPath}` : null,
    mediaStatus: statusMap[show.mediaInfo?.status ?? 0] ?? 'unknown', numberOfSeasons: show.numberOfSeasons,
    ...(show.episodeRunTime[0] ? { episodeRuntimeMinutes: show.episodeRunTime[0] } : {}),
    seasons: show.seasons.map((season) => ({ ...season, posterUrl: season.posterPath ? `https://image.tmdb.org/t/p/w342${season.posterPath}` : null }))
  });
}

function normalizeMovieList(values: unknown[]): Movie[] {
  return values.flatMap((value) => {
    try {
      return [normalizeSeerrMovie(value)];
    } catch {
      return [];
    }
  });
}

export function normalizeSeerrMovie(value: unknown): Movie {
  const movie = seerrMovieSchema.parse(value);
  const statusMap: Record<number, Movie['mediaStatus']> = { 2: 'pending', 3: 'processing', 4: 'available', 5: 'available' };
  return movieSchema.parse({
    id: String(movie.id),
    title: movie.title,
    ...(movie.originalTitle ? { originalTitle: movie.originalTitle } : {}),
    year: Number(movie.releaseDate?.slice(0, 4) ?? 2000),
    overview: movie.overview,
    rating: movie.voteAverage,
    ...(movie.runtime ? { runtimeMinutes: movie.runtime } : {}),
    genres: movie.genres.map((genre) => genre.name),
    posterUrl: movie.posterPath ? `https://image.tmdb.org/t/p/w342${movie.posterPath}` : null,
    backdropUrl: movie.backdropPath ? `https://image.tmdb.org/t/p/w1280${movie.backdropPath}` : null,
    mediaStatus: statusMap[movie.mediaInfo?.status ?? 0] ?? 'unknown'
  });
}
