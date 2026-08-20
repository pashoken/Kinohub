import type { Catalog } from '@kinohub/contracts';

export const fixtureCatalog: Catalog = {
  generatedAt: '2026-08-19T00:00:00.000Z',
  rails: [
    {
      id: 'popular',
      title: 'Популярное сегодня',
      movies: [
        {
          id: 'movie-1',
          title: 'Космический рубеж',
          originalTitle: 'The Cosmic Frontier',
          year: 2025,
          overview: 'Экипаж исследует сигнал на краю известного космоса.',
          rating: 8.1,
          runtimeMinutes: 118,
          genres: ['Фантастика', 'Приключения'],
          posterUrl: 'https://images.example.test/posters/cosmic-342.jpg',
          backdropUrl: 'https://images.example.test/backdrops/cosmic-1280.jpg',
          mediaStatus: 'unknown'
        },
        {
          id: 'movie-2', title: 'Тихая орбита', year: 2024,
          overview: 'Инженер остаётся один на орбитальной станции.', rating: 7.6, runtimeMinutes: 104,
          genres: ['Драма'], posterUrl: null, backdropUrl: null, mediaStatus: 'pending'
        },
        {
          id: 'movie-3', title: 'Северный свет', year: 2023,
          overview: 'Детективная история среди зимних пейзажей.', rating: 7.9, runtimeMinutes: 112,
          genres: ['Детектив', 'Триллер'], posterUrl: 'https://images.example.test/posters/north-342.jpg',
          backdropUrl: 'https://images.example.test/backdrops/north-1280.jpg', mediaStatus: 'available'
        }
      ]
    },
    {
      id: 'new', title: 'Новинки',
      movies: [
        { id: 'movie-4', title: 'Последний маяк', year: 2026, overview: 'Смотритель маяка замечает странный корабль.', rating: 8.3, runtimeMinutes: 126, genres: ['Триллер'], posterUrl: null, backdropUrl: null, mediaStatus: 'unknown' },
        { id: 'movie-5', title: 'Время рек', year: 2025, overview: 'Семейная сага на берегах великой реки.', rating: 7.4, runtimeMinutes: 131, genres: ['Драма'], posterUrl: null, backdropUrl: null, mediaStatus: 'processing' }
      ]
    },
    {
      id: 'recommended', title: 'Вам может понравиться',
      movies: [
        { id: 'movie-6', title: 'Архив снов', year: 2024, overview: 'Исследователь учится сохранять чужие сны.', rating: 8.0, runtimeMinutes: 109, genres: ['Фантастика'], posterUrl: null, backdropUrl: null, mediaStatus: 'unknown' },
        { id: 'movie-7', title: 'Город без часов', year: 2022, overview: 'В городе внезапно останавливается время.', rating: 7.8, runtimeMinutes: 116, genres: ['Фэнтези'], posterUrl: null, backdropUrl: null, mediaStatus: 'failed' }
      ]
    }
  ]
};
