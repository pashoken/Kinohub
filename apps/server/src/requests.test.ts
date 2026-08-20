import { describe, expect, it, vi } from 'vitest';
import { IntegrationError } from './integrations/errors.js';
import { RequestCoordinator, type RequestAdapter } from './requests.js';

const adapterFor = (implementation: RequestAdapter['requestMovie']): RequestAdapter => ({ requestMovie: implementation });

describe('request workflow', () => {
  it('sends intended movie and configured non-4K server/profile exactly once', async () => {
    const call = vi.fn(async () => ({ status: 'queued' }));
    const coordinator = new RequestCoordinator(adapterFor(call), 7, 11);
    const [first, duplicate] = await Promise.all([coordinator.request('550'), coordinator.request('550')]);
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith({ movieId: '550', mediaType: 'movie', serverId: 7, profileId: 11 });
    expect(first).toEqual(duplicate);
  });

  it.each([
    ['existing', 'existing'], ['pending', 'pending'], ['processing', 'processing'], ['available', 'available'], ['failed', 'failed']
  ] as const)('maps %s upstream state', async (upstream, expected) => {
    const coordinator = new RequestCoordinator(adapterFor(async () => ({ status: upstream })), 1, 2);
    await expect(coordinator.request('550')).resolves.toMatchObject({ state: expected });
  });

  it('maps timeout and rejected permission responses', async () => {
    const timeout = new RequestCoordinator(adapterFor(async () => { throw new IntegrationError('UPSTREAM_TIMEOUT', 'timeout'); }), 1, 2);
    const denied = new RequestCoordinator(adapterFor(async () => { throw new IntegrationError('UPSTREAM_HTTP_ERROR', 'HTTP 403'); }), 1, 2);
    await expect(timeout.request('550')).resolves.toMatchObject({ state: 'timeout' });
    await expect(denied.request('550')).resolves.toMatchObject({ state: 'permission_denied' });
  });

  it('maps malformed upstream state to failed without claiming policy confirmation', async () => {
    const coordinator = new RequestCoordinator(adapterFor(async () => ({ status: 'unexpected' })), 1, 2);
    await expect(coordinator.request('550')).resolves.toEqual({ movieId: '550', state: 'failed', policyConfirmed: false });
  });
});
