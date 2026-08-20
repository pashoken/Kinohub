import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { z } from 'zod';
import { IntegrationError } from './errors.js';
import { requestText, type HttpPolicy } from './http.js';

export type TorznabRelease = {
  title: string;
  linkToken: string;
  size: number | null;
  seeders: number | null;
  peers: number | null;
  indexer: string;
  publishedAt: string | null;
  categories: string[];
  attributes: Record<string, string>;
};

const searchSchema = z.object({ title: z.string().min(1), year: z.number().int().optional(), imdbId: z.string().optional(), season: z.number().int().positive().optional(), episode: z.number().int().positive().optional(), television: z.boolean().optional() });

export class JackettClient {
  constructor(private readonly baseUrl: URL, private readonly apiKey: string, private readonly policy: HttpPolicy = {}, private readonly publicBaseUrl = baseUrl) {}

  buildSearchUrl(input: z.input<typeof searchSchema>): URL {
    const query = searchSchema.parse(input);
    const url = new URL('/api/v2.0/indexers/all/results/torznab/api', this.baseUrl);
    url.searchParams.set('apikey', this.apiKey);
    const television = query.television === true || query.season !== undefined;
    url.searchParams.set('t', television ? 'search' : 'movie');
    if (!television) url.searchParams.set('cat', '2000');
    url.searchParams.set('q', [query.title, television ? `S${String(query.season).padStart(2, '0')}${query.episode ? `E${String(query.episode).padStart(2, '0')}` : ''}` : query.year].filter(Boolean).join(' '));
    if (query.season) url.searchParams.set('season', String(query.season));
    if (query.episode) url.searchParams.set('ep', String(query.episode));
    if (query.imdbId) url.searchParams.set('imdbid', query.imdbId);
    return url;
  }

  async search(input: z.input<typeof searchSchema>): Promise<TorznabRelease[]> {
    return parseTorznab(await requestText(this.buildSearchUrl(input), { method: 'GET' }, this.policy)).map((release) => ({
      ...release,
      linkToken: this.publicDownloadUrl(release.linkToken)
    }));
  }

  private publicDownloadUrl(value: string): string {
    try {
      const url = new URL(value);
      if (url.origin !== this.baseUrl.origin) return value;
      return new URL(`${url.pathname}${url.search}`, this.publicBaseUrl).toString();
    } catch {
      return value;
    }
  }
}

type XmlNode = Record<string, unknown>;
const asArray = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];

export function parseTorznab(xml: string): TorznabRelease[] {
  if (XMLValidator.validate(xml) !== true) throw new IntegrationError('UPSTREAM_INVALID_XML', 'Jackett вернул некорректный XML');
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true });
    const root = parser.parse(xml) as XmlNode;
    const channel = ((root.rss as XmlNode | undefined)?.channel ?? {}) as XmlNode;
    return asArray(channel.item as XmlNode | XmlNode[] | undefined).map((item) => {
      const attrs = asArray(item.attr as XmlNode | XmlNode[] | undefined);
      const attributes = Object.fromEntries(attrs.map((attr) => [String(attr['@_name']), String(attr['@_value'])]));
      const categories = asArray(item.category as string | string[] | undefined).map(String);
      return {
        title: String(item.title ?? ''),
        linkToken: String(item.link ?? item.guid ?? ''),
        size: numberOrNull(item.size ?? attributes.size),
        seeders: numberOrNull(attributes.seeders),
        peers: numberOrNull(attributes.peers),
        indexer: String(attributes.indexer ?? item.author ?? 'Jackett'),
        publishedAt: item.pubDate ? String(item.pubDate) : null,
        categories,
        attributes
      };
    });
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError('UPSTREAM_INVALID_XML', 'Jackett вернул некорректный XML');
  }
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
