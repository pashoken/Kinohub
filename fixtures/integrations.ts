export const seerrMovieFixture = {
  id: 550,
  title: 'Бойцовский клуб',
  originalTitle: 'Fight Club',
  releaseDate: '1999-10-15',
  overview: 'История бессонницы и подпольного клуба.',
  voteAverage: 8.4,
  runtime: 139,
  genres: [{ name: 'Драма' }],
  posterPath: '/poster.jpg',
  backdropPath: '/backdrop.jpg',
  mediaInfo: { status: 4 }
};

export const seerrSeriesFixture = {
  id: 1399, name: 'Игра престолов', originalName: 'Game of Thrones', firstAirDate: '2011-04-17',
  overview: 'Борьба великих домов.', voteAverage: 8.5, episodeRunTime: [57], numberOfSeasons: 8,
  genres: [{ name: 'Драма' }], posterPath: '/show.jpg', backdropPath: '/show-bg.jpg', mediaInfo: { status: 4 },
  seasons: [{ seasonNumber: 1, name: 'Сезон 1', episodeCount: 10, airDate: '2011-04-17', posterPath: '/season.jpg' }]
};

export const torznabFixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:torznab="http://torznab.com/schemas/2015/feed"><channel><item>
  <title>Фильм.2025.1080p.WEB-DL.x264</title>
  <guid>opaque-download-token</guid><link>opaque-download-token</link>
  <size>4294967296</size><pubDate>Tue, 19 Aug 2026 10:00:00 GMT</pubDate><category>2000</category>
  <torznab:attr name="seeders" value="42"/><torznab:attr name="peers" value="50"/>
  <torznab:attr name="indexer" value="Домашний индексатор"/>
</item></channel></rss>`;
