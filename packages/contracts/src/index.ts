import { z } from 'zod';

export const movieSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  originalTitle: z.string().optional(),
  year: z.number().int().min(1888).max(2200),
  overview: z.string(),
  rating: z.number().min(0).max(10),
  runtimeMinutes: z.number().int().positive().optional(),
  genres: z.array(z.string()),
  posterUrl: z.string().url().nullable(),
  backdropUrl: z.string().url().nullable(),
  mediaStatus: z.enum(['unknown', 'pending', 'processing', 'available', 'failed'])
});

export const catalogRailSchema = z.object({
  id: z.string(),
  title: z.string(),
  movies: z.array(movieSchema)
});

export const catalogSchema = z.object({ rails: z.array(catalogRailSchema), generatedAt: z.string() });
export const healthSchema = z.object({ status: z.literal('ok'), mode: z.enum(['mock', 'unconfigured', 'live']) });

export type Movie = z.infer<typeof movieSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
export type Health = z.infer<typeof healthSchema>;
