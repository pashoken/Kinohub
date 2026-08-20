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

function normalize(value: string): string {
  return value.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim();
}
