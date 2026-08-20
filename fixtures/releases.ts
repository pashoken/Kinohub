import type { TorznabRelease } from '../apps/server/src/integrations/jackett.js';
const gib = 1024 ** 3;
export const releaseFixtures: TorznabRelease[] = [
  { title: 'Космический.рубеж.2025.1080p.WEB-DL.x264.RUS.ENG', linkToken: 'server-link-a', size: 5 * gib, seeders: 84, peers: 100, indexer: 'Mock indexer', publishedAt: '2026-08-19', categories: ['2000'], attributes: {} },
  { title: 'Космический рубеж 2025 1080p WEBRip H265 10bit', linkToken: 'server-link-b', size: 3 * gib, seeders: 21, peers: 30, indexer: 'Mock indexer', publishedAt: null, categories: ['2000'], attributes: {} },
  { title: 'Cosmic.Frontier.2025.2160p.UHD.HDR.DV.REMUX', linkToken: 'server-link-c', size: 42 * gib, seeders: 55, peers: 60, indexer: 'Mock indexer', publishedAt: null, categories: ['2000'], attributes: {} },
  { title: 'Космический рубеж 2025 720p HDTV x264 Director Cut', linkToken: 'server-link-d', size: null, seeders: null, peers: null, indexer: 'Mock indexer', publishedAt: null, categories: ['2000'], attributes: {} }
];
