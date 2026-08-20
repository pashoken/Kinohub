import { describe, expect, it } from 'vitest';
import { releaseFixtures } from '../../../fixtures/releases.js';
import { parseTorznab } from './integrations/jackett.js';
import { parseReleaseTitle, rankRelease, ReleaseCache, toPublicChoice } from './release-ranking.js';

describe('release parser and deterministic scorer', () => {
  it('parses Cyrillic, alternate editions, language and source', () => { expect(parseReleaseTitle('Фильм.2025.1080p.WEB-DL.x264.RUS.ENG.Directors.Cut')).toMatchObject({ resolution: '1080p', codec: 'h264', source: 'WEB-DL', languages: ['RU', 'EN'] }); });
  it('recognizes original English audio and RU/EN subtitles independently', () => { const parsed = parseReleaseTitle('Movie 1080p x264 Dub + AVO + Sub Eng Rus + Original Eng'); expect(parsed).toMatchObject({ englishAudio: true, subtitles: ['RU', 'EN'] }); const choice = toPublicChoice(rankRelease({ ...releaseFixtures[0]!, title: 'Movie 1080p x264 Sub Eng Rus Original Eng' }), 'id'); expect(choice.flags).toEqual(expect.arrayContaining(['ENG AUDIO', 'RU SUB', 'EN SUB'])); expect(choice.rationale.join(' ')).toContain('английскую дорожку'); });

  it('does not award points for Russian subtitles', () => {
    const withoutSubtitles = rankRelease({ ...releaseFixtures[0]!, title: 'Movie 1080p x264' });
    const withRussianSubtitles = rankRelease({ ...releaseFixtures[0]!, title: 'Movie 1080p x264 Sub Rus' });

    expect(withRussianSubtitles.score).toBe(withoutSubtitles.score);
    expect(withRussianSubtitles.rationale.join(' ')).not.toContain('субтитры');
  });
  it.each(['Movie 2160p x264', 'Movie 1080p HDR x264', 'Movie 1080p DV x264', 'Movie 1080p REMUX x264', 'Movie 1080p CAM x264', 'Movie 1080p x264 10bit'])('hard rejects %s', (title) => { const ranked = rankRelease({ ...releaseFixtures[0]!, title }); expect(ranked.compatibility).toBe('incompatible'); expect(ranked.score).toBe(-1000); });
  it('prefers 1080p SDR H264, seeds and bounded size deterministically', () => { const rows = releaseFixtures.map(rankRelease).sort((a, b) => b.score - a.score || a.raw.title.localeCompare(b.raw.title, 'ru')); expect(rows[0]?.parsed).toMatchObject({ resolution: '1080p', codec: 'h264', dynamicRange: 'SDR' }); expect(rows[0]!.score).toBeGreaterThan(rows[3]!.score); });
  it('handles conflicting tokens and missing size/seeds', () => { expect(parseReleaseTitle('Movie 2160p 1080p HDR SDR x264 x265')).toMatchObject({ resolution: '2160p', codec: 'h264', dynamicRange: 'HDR' }); expect(rankRelease(releaseFixtures[3]!)).toMatchObject({ compatibility: 'warning' }); });
  it('orders ties by release name', () => { const a = rankRelease({ ...releaseFixtures[0]!, title: 'Б 1080p x264' }); const b = rankRelease({ ...releaseFixtures[0]!, title: 'А 1080p x264' }); expect([a, b].sort((x, y) => y.score - x.score || x.raw.title.localeCompare(y.raw.title, 'ru'))[0]?.raw.title).toMatch(/^А/); });
  it('keeps malformed XML as a stable parser failure', () => { expect(() => parseTorznab('<rss><item>')).toThrowError(expect.objectContaining({ code: 'UPSTREAM_INVALID_XML' })); });
});
describe('opaque bounded release cache', () => {
  it('expires, bounds count, and uses non-sequential opaque IDs', () => { let now = 1_000; const cache = new ReleaseCache(50, 2, () => now); const first = cache.put(releaseFixtures[0]!); const second = cache.put(releaseFixtures[1]!); const third = cache.put(releaseFixtures[2]!); expect(first).not.toMatch(/^\d+$/); expect(second).not.toBe(first); expect(cache.size).toBe(2); expect(cache.resolve(first)).toBeNull(); expect(cache.resolve(third)).not.toBeNull(); now = 2_000; expect(cache.resolve(third)).toBeNull(); expect(cache.size).toBe(0); });
  it('public choice never exposes link token', () => { const publicChoice = toPublicChoice(rankRelease(releaseFixtures[0]!), 'opaque-id'); expect(JSON.stringify(publicChoice)).not.toContain('server-link'); expect(publicChoice).toMatchObject({ id: 'opaque-id', compatibility: 'compatible' }); });
});
