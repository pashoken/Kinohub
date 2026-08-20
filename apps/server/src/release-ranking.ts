import { randomUUID } from 'node:crypto';
import type { TorznabRelease } from './integrations/jackett.js';

export type ParsedRelease = { resolution: '2160p' | '1080p' | '720p' | 'unknown'; codec: 'h264' | 'h265' | 'unknown'; dynamicRange: 'HDR' | 'DV' | 'SDR'; source: string; edition: string | null; audio: string[]; languages: string[]; englishAudio: boolean; subtitles: Array<'RU' | 'EN'>; remux: boolean; cam: boolean; tenBit: boolean };
export type Compatibility = 'compatible' | 'warning' | 'incompatible';
export type RankedRelease = { raw: TorznabRelease; parsed: ParsedRelease; score: number; compatibility: Compatibility; rationale: string[] };
export type PublicChoice = { id: string; releaseName: string; source: string; flags: string[]; size: number | null; seeders: number | null; score: number; rationale: string[]; compatibility: Compatibility };

export function parseReleaseTitle(title: string): ParsedRelease {
  const normalized = title.normalize('NFKC'); const has = (pattern: RegExp) => pattern.test(normalized);
  const resolution = has(/\b(?:2160p|4k|uhd)\b/i) ? '2160p' : has(/\b1080[pi]\b/i) ? '1080p' : has(/\b720p\b/i) ? '720p' : 'unknown';
  const codec = has(/\b(?:h\.?264|x264|avc)\b/i) ? 'h264' : has(/\b(?:h\.?265|x265|hevc)\b/i) ? 'h265' : 'unknown';
  const dynamicRange = has(/\b(?:dolby[ ._-]?vision|dovi|dv)\b/i) ? 'DV' : has(/\b(?:hdr10\+?|hdr)\b/i) ? 'HDR' : 'SDR';
  const source = has(/web[ ._-]?dl/i) ? 'WEB-DL' : has(/blu[ ._-]?ray|bdrip/i) ? 'Blu-ray' : has(/webrip/i) ? 'WEBRip' : has(/hdtv/i) ? 'HDTV' : has(/\b(?:cam|telesync|ts)\b/i) ? 'CAM/TS' : 'Неизвестно';
  const edition = normalized.match(/\b(director'?s[ ._-]?cut|extended|theatrical|imax)\b/i)?.[1]?.replace(/[._-]/g, ' ') ?? null;
  const audio = [has(/dts/i) ? 'DTS' : '', has(/(?:ddp|eac3)/i) ? 'E-AC-3' : '', has(/aac/i) ? 'AAC' : ''].filter(Boolean);
  const languages = [has(/\b(?:rus|russian|рус)\b/i) ? 'RU' : '', has(/\b(?:eng|english)\b/i) ? 'EN' : ''].filter(Boolean);
  const englishAudio = has(/\b(?:original|orig|audio)[ ._+:/-]*(?:eng|english)\b|\b(?:eng|english)[ ._+:/-]*(?:audio|dub)\b|\bdual[ ._-]*audio\b/i);
  const hasSubtitle = (language: 'rus' | 'eng') => has(new RegExp(`\\bsub(?:s|titles)?[ ._+:/-]{0,5}(?:rus|eng|english|russian)?[ ._+:/-]{0,5}(?:${language}|${language === 'rus' ? 'russian' : 'english'})\\b|\\b(?:${language}|${language === 'rus' ? 'russian' : 'english'})[ ._-]*sub(?:s|titles)?\\b`, 'i'));
  const subtitles = [hasSubtitle('rus') ? 'RU' : '', hasSubtitle('eng') ? 'EN' : ''].filter(Boolean) as Array<'RU' | 'EN'>;
  return { resolution, codec, dynamicRange, source, edition, audio, languages, englishAudio, subtitles, remux: has(/\bremux\b/i), cam: source === 'CAM/TS', tenBit: has(/\b10[ ._-]?bit\b/i) };
}

export function rankRelease(raw: TorznabRelease): RankedRelease {
  const parsed = parseReleaseTitle(raw.title); const rationale: string[] = []; let score = 0; const rejects: string[] = [];
  if (parsed.resolution === '2160p') rejects.push('4K не поддерживается политикой проектора');
  if (parsed.dynamicRange !== 'SDR') rejects.push(`${parsed.dynamicRange} не поддерживается`);
  if (parsed.remux) rejects.push('Remux слишком тяжёлый'); if (parsed.cam) rejects.push('CAM/TS запрещён'); if (parsed.tenBit) rejects.push('10-bit помечен несовместимым');
  if (rejects.length) return { raw, parsed, score: -1000, compatibility: 'incompatible', rationale: rejects };
  if (parsed.resolution === '1080p') { score += 45; rationale.push('+45 за 1080p'); } else if (parsed.resolution === '720p') { score += 10; rationale.push('+10 за 720p'); } else rationale.push('Разрешение не определено');
  if (parsed.codec === 'h264') { score += 35; rationale.push('+35 за H.264/x264'); } else if (parsed.codec === 'h265') { score -= 10; rationale.push('−10 за H.265'); } else rationale.push('Кодек не определён');
  score += 15; rationale.push('+15 за SDR'); const seedPoints = Math.min(20, Math.floor(Math.log2((raw.seeders ?? 0) + 1) * 4)); score += seedPoints; rationale.push(`+${seedPoints} за сиды`);
  if (parsed.englishAudio) { score += 20; rationale.push('+20 за оригинальную английскую дорожку'); }
  if (parsed.subtitles.includes('EN')) { score += 10; rationale.push('+10 за английские субтитры'); }
  if (raw.size && raw.size > 12 * 1024 ** 3) { score -= 15; rationale.push('−15 за размер больше 12 ГБ'); }
  return { raw, parsed, score, compatibility: parsed.resolution === '1080p' && parsed.codec === 'h264' ? 'compatible' : 'warning', rationale };
}

export function releaseSeasonCoverage(title: string): number[] {
  const normalized = title.normalize('NFKC');
  const range = normalized.match(/(?:\bS|сезон(?:ы|а)?[ .:_-]*)(\d{1,2})[ ._-]*(?:-|–|—|to)[ ._-]*(?:S)?(\d{1,2})/i);
  if (range) {
    const start = Number(range[1]); const end = Number(range[2]);
    if (start > 0 && end >= start && end - start < 30) return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }
  const seasons = [...normalized.matchAll(/(?:\bS|сезон[ .:_-]*)(\d{1,2})(?!\d)/gi)].map((match) => Number(match[1])).filter((value) => value > 0);
  return [...new Set(seasons)];
}

export function rankSeriesRelease(raw: TorznabRelease, requestedSeason: number): RankedRelease {
  const ranked = rankRelease(raw); const coverage = releaseSeasonCoverage(raw.title);
  if (!coverage.length) return { ...ranked, rationale: [...ranked.rationale, 'Сезоны в названии не определены'] };
  if (!coverage.includes(requestedSeason)) return { ...ranked, score: ranked.score - 300, rationale: [...ranked.rationale, `−300: раздача не содержит сезон ${requestedSeason}`] };
  const bonus = coverage.length > 1 ? 30 : 12;
  return { ...ranked, score: ranked.score + bonus, rationale: [...ranked.rationale, `+${bonus}: содержит сезон ${requestedSeason}${coverage.length > 1 ? ' и подходит для следующих сезонов' : ''}`] };
}

type CacheEntry = { raw: TorznabRelease; expiresAt: number };
export class ReleaseCache {
  private readonly entries = new Map<string, CacheEntry>();
  constructor(private readonly ttlMs = 120_000, private readonly maxEntries = 100, private readonly now = () => Date.now()) {}
  put(raw: TorznabRelease): string { this.prune(); while (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value as string); const id = randomUUID(); this.entries.set(id, { raw, expiresAt: this.now() + this.ttlMs }); return id; }
  resolve(id: string): TorznabRelease | null { this.prune(); return this.entries.get(id)?.raw ?? null; }
  get size(): number { this.prune(); return this.entries.size; }
  private prune() { const time = this.now(); for (const [id, entry] of this.entries) if (entry.expiresAt <= time) this.entries.delete(id); }
}

export function toPublicChoice(ranked: RankedRelease, id: string): PublicChoice {
  const flags = [ranked.parsed.resolution, ranked.parsed.codec.toUpperCase(), ranked.parsed.dynamicRange, ...ranked.parsed.languages, ranked.parsed.englishAudio ? 'ENG AUDIO' : '', ...ranked.parsed.subtitles.map((language) => `${language} SUB`)].filter((flag) => flag !== 'unknown' && flag !== '');
  return { id, releaseName: ranked.raw.title, source: ranked.parsed.source, flags, size: ranked.raw.size, seeders: ranked.raw.seeders, score: ranked.score, rationale: ranked.rationale, compatibility: ranked.compatibility };
}
