import { z } from 'zod';
import { movieSchema, type Movie } from '@kinohub/contracts';
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

export type SeerrRequestInput = { mediaId: string; serverId: number; profileId: number };

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

  async search(query: string): Promise<Movie[]> {
    const payload = await this.call<{ results: unknown[] }>(`/api/v1/search?query=${encodeURIComponent(query)}&page=1`);
    return normalizeMovieList(payload.results);
  }

  async detail(id: string): Promise<Movie> {
    return normalizeSeerrMovie(await this.call(`/api/v1/movie/${encodeURIComponent(id)}`));
  }

  async request(input: SeerrRequestInput): Promise<unknown> {
    return this.call('/api/v1/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mediaType: 'movie', mediaId: Number(input.mediaId), serverId: input.serverId, profileId: input.profileId })
    });
  }

  async status(id: string): Promise<unknown> {
    return this.call(`/api/v1/movie/${encodeURIComponent(id)}`);
  }
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
