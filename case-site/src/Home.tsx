const Arrow = () => <span aria-hidden="true">↗</span>;

function ProductScreen() {
  return (
    <div className="product-screen" aria-label="Макет интерфейса KinoHub">
      <div className="screen-topline">
        <div className="screen-logo"><span>▶</span> KINOHUB</div>
        <div className="screen-nav"><b>Главная</b><span>Фильмы</span><span>Сериалы</span><span>Поиск</span></div>
        <div className="screen-clock">21:47</div>
      </div>
      <div className="screen-copy">
        <span className="eyebrow">Ну что смотрим?</span>
        <h2>Кино наконец-то<br/>просто включается.</h2>
        <p>Выбираю фильм, KinoHub находит раздачу и запускает её на проекторе.</p>
        <button type="button">▶ Смотреть сейчас</button>
      </div>
      <div className="screen-rail" aria-hidden="true">
        <div className="poster p1"><span>ДЮНА</span></div><div className="poster p2"><span>РАЗДЕЛЕНИЕ</span></div><div className="poster p3"><span>ФУРИОСА</span></div><div className="poster p4"><span>СЁГУН</span></div><div className="poster p5"><span>ПРИБЫТИЕ</span></div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <nav className="site-nav">
        <a className="brand" href="#top">KinoHub <span>case</span></a>
        <div className="nav-links"><a href="#system">Сценарий</a><a href="#ranking">Раздачи</a><a href="#role">Моя роль</a></div>
        <a className="nav-github" href="https://github.com/pashoken/Kinohub" target="_blank" rel="noreferrer">GitHub <Arrow /></a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/>
        <div className="hero-copy">
          <p className="kicker"><span>Личный проект</span><span>2026</span><span>v0.4.0</span></p>
          <h1>Я просто хотел<br/>посмотреть <em>фильм.</em></h1>
          <p className="lead">Два дня перебирал сервисы и приложения. Ничего нормального не нашёл — поэтому решил написать своё.</p>
          <div className="hero-actions"><a className="button primary" href="#system">Читать кейс <span>↓</span></a><a className="button secondary" href="https://github.com/pashoken/Kinohub/releases/tag/v0.4.0" target="_blank" rel="noreferrer">Открыть релиз <Arrow /></a></div>
        </div>
        <div className="hero-product"><div className="glow"/><ProductScreen/><p className="device-note">TV-first интерфейс · Android 6.0+</p></div>
      </section>

      <section className="flow-section" id="system">
        <div className="section-heading"><div className="section-index">01 — Сценарий</div><h2>Мой алгоритм действий</h2><p>Я хотел, чтобы просмотр фильма выглядел именно так — без дополнительных шагов между выбором и запуском.</p></div>
        <div className="flow"><div className="flow-card active"><i>1</i><b>Выбрать фильм</b><span>Каталог и поиск</span></div><div className="flow-arrow">→</div><div className="flow-card"><i>2</i><b>Нажать «Смотреть»</b><span>Подбор вариантов</span></div><div className="flow-arrow">→</div><div className="flow-card"><i>3</i><b>Запустить</b><span>Внешний плеер</span></div></div>
        <div className="system-line"><div><small>Каталог</small><strong>Seerr</strong></div><span>+</span><div><small>Поиск</small><strong>Jackett</strong></div><span>+</span><div><small>Поток</small><strong>TorrServer</strong></div><span>+</span><div><small>Экран</small><strong>KinoHub TV</strong></div></div>
      </section>

      <section className="ranking-section" id="ranking">
        <div className="ranking-copy">
          <div className="section-index">02 — Выбор раздачи</div>
          <h2>Много раздач — это хаос</h2>
          <p>Они отличаются качеством, кодеком, дорожками, размером и количеством сидов. По одному названию не всегда понятно, что нормально запустится на телевизоре.</p>
          <p>KinoHub приводит список в порядок: разбирает названия, ставит баллы и показывает причины оценки.</p>
          <a href="https://github.com/pashoken/Kinohub/blob/main/docs/torrent-ranking.md" target="_blank" rel="noreferrer">Как устроено ранжирование <Arrow /></a>
        </div>
        <div className="ranking-panel">
          <div className="panel-head"><span>Найденные раздачи</span><b>Подходящие сверху</b></div>
          <article className="release best"><div className="release-rank">01</div><div><strong>Dune.Part.Two.2024.1080p.WEB-DL.H264...</strong><div className="chips"><span>1080p</span><span>H.264</span><span>SDR</span><span>ENG</span></div><small>+45 качество · +35 кодек · +15 SDR · +18 сиды</small></div><div className="score">113<small>баллов</small></div></article>
          <article className="release"><div className="release-rank">02</div><div><strong>Dune.Part.Two.2024.720p.WEBRip.x264...</strong><div className="chips"><span>720p</span><span>H.264</span><span>RU</span></div><small>+10 качество · +35 кодек · +14 сиды</small></div><div className="score">59<small>баллов</small></div></article>
          <article className="release danger"><div className="release-rank">18</div><div><strong>Dune.Part.Two.2160p.HDR.DV.Remux...</strong><div className="chips"><span>4K</span><span>HDR</span><span>Remux</span></div><small>Может не запуститься на устройстве</small></div><div className="score">—<small>несовместимо</small></div></article>
        </div>
      </section>

      <section className="tv-section">
        <div className="section-heading"><div className="section-index">03 — Интерфейс для ТВ</div><h2>Android TV ≠ монитор</h2><p>Интерфейс недостаточно просто показать на телевизоре. Им нужно управлять с пульта — значит, нужны навигация, заметный фокус и понятные ошибки.</p></div>
        <div className="tv-grid">
          <article><div className="focus-demo"><span>Смотреть сейчас</span></div><h3>Заметный фокус</h3><p>Всегда видно, какой элемент выбран сейчас.</p></article>
          <article><div className="remote-demo"><span>↑</span><div><span>←</span><b>●</b><span>→</span></div><span>↓</span></div><h3>Только пульт</h3><p>Весь основной сценарий проходит стрелками, Enter и Back.</p></article>
          <article><div className="state-demo"><i>Нет связи</i><b>Попробовать снова</b></div><h3>Понятные ошибки</h3><p>Если один из сервисов недоступен, интерфейс говорит, что именно произошло.</p></article>
        </div>
      </section>

      <section className="role-section" id="role">
        <div className="role-intro"><div className="section-index">04 — Моя роль</div><h2>Код я писал вместе с Codex</h2></div>
        <div className="role-copy"><p>Я формулировал требования, разбивал проект на сценарии, выбирал решения и проверял их на реальном устройстве. Codex помогал исследовать технические варианты и писал большую часть кода.</p><p>По сути, я отвечал за то, каким должен быть продукт и работает ли он так, как задумывался. Если нет — переделывали.</p><div className="role-tags"><span>Product thinking</span><span>Business analysis</span><span>UX / TV</span><span>AI-assisted delivery</span><span>QA</span></div></div>
      </section>

      <section className="evidence-section">
        <div className="section-heading"><div className="section-index">05 — Главное</div><h2>Что отличает KinoHub</h2><p>Четыре вещи, ради которых я в итоге и оставил его себе.</p></div>
        <div className="metrics">
          <div><strong>15<sup>КБ</sup></strong><span>вес приложения для ТВ</span></div><div><strong>0</strong><span>предварительных загрузок</span></div><div><strong>0</strong><span>ограничений платформы</span></div><div><strong className="service-metric">5<sup>сервисов</sup><i>=</i>1<sup>UI</sup></strong><span>всё в одном интерфейсе</span></div>
        </div>
        <div className="evidence-list">
          <article><span>01</span><div><h3>Лёгкое приложение для ТВ</h3><p>По сути, это веб-обвязка весом 15 КБ. Она быстро устанавливается и не нагружает устройство.</p></div></article>
          <article><span>02</span><div><h3>Просмотр без загрузки</h3><p>Фильмы не нужно хранить на диске: выбранная раздача сразу передаётся в TorrServer.</p></div></article>
          <article><span>03</span><div><h3>Без чужих ограничений</h3><p>Нет центрального каталога, который решает, какой контент мне доступен, а какой — нет.</p></div></article>
          <article><span>04</span><div><h3>Пять сервисов в одном UI</h3><p>KinoHub объединяет каталог, поиск раздач и запуск фильма в одном интерфейсе.</p></div></article>
        </div>
        <p className="tech-line">Android TV · self-hosted · open source</p>
      </section>

      <section className="result-section">
        <div><div className="section-index">06 — Результат</div><h2>Теперь я открываю фильм и нажимаю «Смотреть»</h2></div>
        <div><p>KinoHub работает у меня дома и требует первоначальной настройки сервера. Это пока не приложение, которое можно установить родителям одной кнопкой.</p><p>Но свою задачу он решает: я выбираю фильм на проекторе и нажимаю «Смотреть» без лишних проблем и заморочек.</p><p>Проект выложил в открытый доступ. Надеюсь, кому-нибудь из вас он тоже поможет нормально посмотреть кино :)</p><div className="result-actions"><a className="button primary" href="https://github.com/pashoken/Kinohub" target="_blank" rel="noreferrer">Посмотреть код <Arrow /></a><a className="button secondary" href="https://github.com/pashoken/Kinohub/releases/tag/v0.4.0" target="_blank" rel="noreferrer">Скачать APK <Arrow /></a></div></div>
      </section>

      <footer><span>Павел Перевалов · 2026</span><span>Сделано вместе с Codex и некоторым количеством нервов</span><a href="#top">Наверх ↑</a></footer>
    </main>
  );
}
