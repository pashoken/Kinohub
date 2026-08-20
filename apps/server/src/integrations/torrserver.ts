import { requestJson, type HttpPolicy } from './http.js';

export type TorrentFile = { id: number; path: string; length: number };
export type TorrServerTorrent = { hash: string; title: string; files: TorrentFile[] };

export interface TorrServerAdapter {
  health(): Promise<boolean>;
  add(link: string, title: string, poster?: string): Promise<TorrServerTorrent>;
  inspect(hash: string): Promise<TorrServerTorrent>;
  list(): Promise<TorrServerTorrent[]>;
  streamUrl(hash: string, fileId: number, path: string): URL;
  playlistUrl(hash: string): URL;
}

export class TorrServerClient implements TorrServerAdapter {
  constructor(private readonly baseUrl: URL, private readonly policy: HttpPolicy = {}, private readonly publicBaseUrl = baseUrl) {}

  async health(): Promise<boolean> {
    await requestJson(new URL('/echo', this.baseUrl), { method: 'GET' }, this.policy);
    return true;
  }

  async add(link: string, title: string, poster?: string): Promise<TorrServerTorrent> {
    return normalizeTorrent(await requestJson(new URL('/torrents', this.baseUrl), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'add', link, title, ...(poster ? { poster } : {}) })
    }, this.policy));
  }

  async inspect(hash: string): Promise<TorrServerTorrent> {
    return normalizeTorrent(await requestJson(new URL('/torrents', this.baseUrl), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'get', hash })
    }, this.policy));
  }

  async list(): Promise<TorrServerTorrent[]> {
    const values = await requestJson<unknown[]>(new URL('/torrents', this.baseUrl), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'list' })
    }, this.policy);
    return values.map(normalizeTorrent);
  }

  streamUrl(hash: string, fileId: number, path: string): URL {
    const filename = path.split(/[\\/]/).pop() || 'video';
    const url = new URL(`/stream/${encodeURIComponent(filename)}`, this.publicBaseUrl);
    url.searchParams.set('link', hash);
    url.searchParams.set('index', String(fileId));
    url.search += '&play';
    return url;
  }

  playlistUrl(hash: string): URL {
    const url = new URL('/playlist', this.publicBaseUrl);
    url.searchParams.set('hash', hash);
    return url;
  }
}

function normalizeTorrent(value: unknown): TorrServerTorrent {
  const raw = value as { hash?: unknown; title?: unknown; name?: unknown; files?: unknown; file_stats?: unknown };
  const sourceFiles = Array.isArray(raw.files) ? raw.files : Array.isArray(raw.file_stats) ? raw.file_stats : [];
  const files = sourceFiles.flatMap((file) => {
    const item = file as { id?: unknown; path?: unknown; length?: unknown };
    const id = Number(item.id); const length = Number(item.length);
    return Number.isInteger(id) && typeof item.path === 'string' && Number.isFinite(length) ? [{ id, path: item.path, length }] : [];
  });
  return { hash: String(raw.hash ?? ''), title: String(raw.title ?? raw.name ?? ''), files };
}
