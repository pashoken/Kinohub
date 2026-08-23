import { randomUUID } from 'node:crypto';
import { IntegrationError } from './integrations/errors.js';
import type { TorrentFile, TorrServerAdapter, TorrServerTorrent } from './integrations/torrserver.js';
import type { ReleaseCache } from './release-ranking.js';

export type PlaybackErrorCode = 'CHOICE_UNKNOWN' | 'CHOICE_USED' | 'NO_PLAYABLE_FILES' | 'TORRSERVER_TIMEOUT' | 'UNSAFE_STREAM_URL';
export class PlaybackError extends Error { constructor(public readonly code: PlaybackErrorCode, message: string) { super(message); this.name = 'PlaybackError'; } }
export type PlayableFile = { id: number; path: string; length: number; streamUrl: string; playlistUrl: string };
export type PlaybackSession = { sessionId: string; status: 'ready' | 'choose_file'; files: PlayableFile[]; expiresAt: string };

export function playableFiles(files: TorrentFile[]): TorrentFile[] {
  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
  return files.filter((file) => /\.(?:mkv|mp4|webm|avi|mov)$/i.test(file.path) && !/(?:^|[\s._-])sample(?:[\s._-]|$)/i.test(file.path)).sort((a, b) => collator.compare(a.path, b.path));
}
export function sanitizeMetadata(value: string): string { return Array.from(value, (character) => { const code = character.charCodeAt(0); return code < 32 || code === 127 ? ' ' : character; }).join('').replace(/\s+/g, ' ').trim().slice(0, 160); }

export class PlaybackCoordinator {
  private readonly used = new Map<string, number>(); private readonly sessions = new Map<string, { session: PlaybackSession; expiresAt: number }>();
  constructor(private readonly releases: ReleaseCache, private readonly adapter: TorrServerAdapter, private readonly baseUrl: URL, private readonly ttlMs = 15 * 60_000, private readonly now = () => Date.now()) {
    if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) throw new PlaybackError('UNSAFE_STREAM_URL', 'Недопустимый адрес TorrServer');
  }
  async handoff(choiceId: string): Promise<PlaybackSession> {
    this.pruneExpired();
    if (this.used.has(choiceId)) throw new PlaybackError('CHOICE_USED', 'Выбор уже использован');
    const raw = this.releases.resolve(choiceId); if (!raw) throw new PlaybackError('CHOICE_UNKNOWN', 'Выбор истёк или неизвестен');
    this.used.set(choiceId, this.now() + this.ttlMs);
    try {
      const added = await this.adapter.add(raw.linkToken, sanitizeMetadata(raw.title)); const torrent = added.files?.length ? added : await this.adapter.inspect(added.hash);
      const files = playableFiles(torrent.files); if (!files.length) throw new PlaybackError('NO_PLAYABLE_FILES', 'В торренте нет видеофайлов');
      const sessionId = randomUUID(); const expiresAtMs = this.now() + this.ttlMs;
      const playlistUrl = this.safePlaylistUrl(torrent.hash).toString();
      const publicFiles = files.map((file) => ({ ...file, streamUrl: this.safeStreamUrl(torrent.hash, file.id, file.path).toString(), playlistUrl }));
      const session: PlaybackSession = { sessionId, status: publicFiles.length === 1 ? 'ready' : 'choose_file', files: publicFiles, expiresAt: new Date(expiresAtMs).toISOString() };
      this.sessions.set(sessionId, { session, expiresAt: expiresAtMs }); return session;
    } catch (error) {
      if (error instanceof PlaybackError) throw error;
      this.used.delete(choiceId);
      if (error instanceof IntegrationError && error.code === 'UPSTREAM_TIMEOUT') throw new PlaybackError('TORRSERVER_TIMEOUT', 'TorrServer не ответил вовремя');
      throw error;
    }
  }
  getSession(id: string): PlaybackSession | null { this.pruneExpired(); const entry = this.sessions.get(id); return entry?.session ?? null; }
  private pruneExpired(): void {
    const now = this.now();
    for (const [id, expiresAt] of this.used) if (expiresAt <= now) this.used.delete(id);
    for (const [id, entry] of this.sessions) if (entry.expiresAt <= now) this.sessions.delete(id);
  }
  private safeStreamUrl(hash: string, fileId: number, path: string): URL {
    const candidate = this.adapter.streamUrl(hash, fileId, path); if (!['http:', 'https:'].includes(candidate.protocol) || candidate.origin !== this.baseUrl.origin) throw new PlaybackError('UNSAFE_STREAM_URL', 'TorrServer вернул небезопасную ссылку'); return candidate;
  }
  private safePlaylistUrl(hash: string): URL {
    const candidate = this.adapter.playlistUrl(hash); if (!['http:', 'https:'].includes(candidate.protocol) || candidate.origin !== this.baseUrl.origin) throw new PlaybackError('UNSAFE_STREAM_URL', 'TorrServer вернул небезопасный плейлист'); return candidate;
  }
}

export function mockTorrServer(baseUrl: URL): TorrServerAdapter {
  const torrent: TorrServerTorrent = { hash: 'mock-hash-550', title: 'Космический рубеж', files: [
    { id: 3, path: 'Фильм часть 10.mkv', length: 2_000_000_000 }, { id: 2, path: 'Фильм часть 2.mkv', length: 2_100_000_000 },
    { id: 1, path: 'sample.mkv', length: 20_000_000 }, { id: 4, path: 'readme.txt', length: 1_000 }
  ] };
  return { async health() { return true; }, async add() { return { ...torrent, files: [] }; }, async inspect() { return torrent; }, async list() { return [torrent]; }, streamUrl(hash, fileId, path) { const filename = path.split(/[\\/]/).pop() || 'video'; const url = new URL(`/stream/${encodeURIComponent(filename)}`, baseUrl); url.searchParams.set('link', hash); url.searchParams.set('index', String(fileId)); url.search += '&play'; return url; }, playlistUrl(hash) { const url = new URL('/playlist', baseUrl); url.searchParams.set('hash', hash); return url; } };
}
