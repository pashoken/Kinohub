import { z } from 'zod';
import { requestJson, type HttpPolicy } from './http.js';

const searchResponseSchema = z.object({
  films: z.array(z.object({
    filmId: z.number(),
    nameRu: z.string().nullable().optional(),
    nameEn: z.string().nullable().optional(),
    year: z.string().nullable().optional(),
    rating: z.string().nullable().optional()
  })).default([])
});

const poiskKinoResponseSchema = z.object({
  docs: z.array(z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    alternativeName: z.string().nullable().optional(),
    enName: z.string().nullable().optional(),
    year: z.number().nullable().optional(),
    rating: z.object({ kp: z.number().nullable().optional() }).optional()
  })).default([])
});

export type KinopoiskRating = { id: number; rating: number };

export class KinopoiskClient {
  private readonly cache = new Map<string, { expiresAt: number; value: KinopoiskRating | null }>();

  constructor(
    private readonly apiKey: string,
    private readonly policy: HttpPolicy = {},
    private readonly baseUrl = new URL('https://kinopoiskapiunofficial.tech')
  ) {}

  async rating(title: string, year: number): Promise<KinopoiskRating | null> {
    const key = `${normalize(title)}:${year}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const url = new URL('/api/v2.1/films/search-by-keyword', this.baseUrl);
    url.searchParams.set('keyword', title);
    url.searchParams.set('page', '1');
    const payload = searchResponseSchema.parse(await requestJson<unknown>(url, {
      headers: { 'X-API-KEY': this.apiKey, Accept: 'application/json' }
    }, { timeoutMs: 7_000, retries: 0, ...this.policy }));
    const exact = payload.films.find((film) => {
      const filmYear = Number.parseInt(film.year ?? '', 10);
      const titleMatches = [film.nameRu, film.nameEn].some((name) => name && normalize(name) === normalize(title));
      return titleMatches && filmYear === year;
    });
    const numericRating = Number.parseFloat(exact?.rating ?? '');
    const value = exact && Number.isFinite(numericRating) && numericRating >= 0 && numericRating <= 10
      ? { id: exact.filmId, rating: numericRating }
      : null;
    this.cache.set(key, { value, expiresAt: Date.now() + (value ? 7 * 86_400_000 : 12 * 3_600_000) });
    return value;
  }
}

export class PoiskKinoClient {
  private readonly cache = new Map<string, { expiresAt: number; value: KinopoiskRating | null }>();
  constructor(private readonly apiKey: string, private readonly policy: HttpPolicy = {}, private readonly baseUrl = new URL('https://api.poiskkino.dev')) {}

  async rating(title: string, year: number): Promise<KinopoiskRating | null> {
    const key = `${normalize(title)}:${year}`; const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const url = new URL('/v1.4/movie/search', this.baseUrl);
    url.searchParams.set('query', title); url.searchParams.set('page', '1'); url.searchParams.set('limit', '10');
    const payload = poiskKinoResponseSchema.parse(await requestJson<unknown>(url, {
      headers: { 'X-API-KEY': this.apiKey, Accept: 'application/json' }
    }, { timeoutMs: 7_000, retries: 0, ...this.policy }));
    const exact = payload.docs.find((movie) => movie.year === year && [movie.name, movie.alternativeName, movie.enName].some((name) => name && normalize(name) === normalize(title)));
    const rating = exact?.rating?.kp;
    const value = exact && typeof rating === 'number' && rating >= 0 && rating <= 10 ? { id: exact.id, rating } : null;
    this.cache.set(key, { value, expiresAt: Date.now() + (value ? 7 * 86_400_000 : 12 * 3_600_000) });
    return value;
  }
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim();
}
