import { z } from 'zod';
import { IntegrationError } from './integrations/errors.js';

export const requestMovieSchema = z.object({ movieId: z.string().min(1).max(80) }).strict();
export type RequestState = 'existing' | 'pending' | 'processing' | 'available' | 'failed' | 'timeout' | 'permission_denied' | 'queued';
export type RequestResult = { movieId: string; state: RequestState; policyConfirmed: boolean; jellyfinUrl?: string };
export type RequestAdapter = { requestMovie(input: { movieId: string; mediaType: 'movie'; serverId: number; profileId: number }): Promise<{ status: string; jellyfinItemId?: string }> };

export class RequestCoordinator {
  private readonly active = new Map<string, Promise<RequestResult>>();
  constructor(private readonly adapter: RequestAdapter, private readonly serverId: number, private readonly profileId: number) {}

  request(movieId: string): Promise<RequestResult> {
    const existing = this.active.get(movieId);
    if (existing) return existing;
    const operation = this.execute(movieId).finally(() => this.active.delete(movieId));
    this.active.set(movieId, operation);
    return operation;
  }

  private async execute(movieId: string): Promise<RequestResult> {
    try {
      const upstream = await this.adapter.requestMovie({ movieId, mediaType: 'movie', serverId: this.serverId, profileId: this.profileId });
      const map: Record<string, RequestState> = { existing: 'existing', pending: 'pending', processing: 'processing', available: 'available', failed: 'failed', queued: 'queued' };
      const state = map[upstream.status];
      if (!state) return { movieId, state: 'failed', policyConfirmed: false };
      return { movieId, state, policyConfirmed: state === 'queued' || state === 'pending' || state === 'processing' };
    } catch (error) {
      if (error instanceof IntegrationError && error.code === 'UPSTREAM_TIMEOUT') return { movieId, state: 'timeout', policyConfirmed: false };
      if (error instanceof IntegrationError && error.code === 'UPSTREAM_HTTP_ERROR' && error.message.includes('403')) return { movieId, state: 'permission_denied', policyConfirmed: false };
      return { movieId, state: 'failed', policyConfirmed: false };
    }
  }
}

export function mockRequestAdapter(): RequestAdapter {
  return { async requestMovie() { return { status: 'queued' }; } };
}
