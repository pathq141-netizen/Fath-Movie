/**
 * MOVIENAS - Detail Page Logic
 * Fetches Full Details, Renders Metadata, Dubs, Seasons & Episodes
 */

let currentDetail = null;
let selectedSeasonIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let detailPath = urlParams.get('path') || urlParams.get('slug') || urlParams.get('detailPath');

  if (!detailPath) {
    // Check if path is embedded in pathname: /detail/slug
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[0] === 'detail') {
      detailPath = pathParts[1];
    }
  }

  if (!detailPath) {
    alert('Parameter film/series tidak ditemukan.');
    window.location.href = '/';
    return;
  }

  await loadDetailPage(detailPath);
  setupTrailerModal();
});

async function loadDetailPage(detailPath) {
  try {
    const res = await fetch(`/api/detail?path=${encodeURIComponent(detailPath)}`);
    const json = await res.json();

    if (!json.status || !json.data) {
      alert('Gagal memuat detail film: ' + (json.error || 'Data kosong'));
      return;
    }

    currentDetail = json.data;
    renderDetailUI(currentDetail);

  } catch (err) {
    console.error('Error fetching detail:', err);
  }
}

function renderDetailUI(item) {
  document.title = `${item.title} — FathMovie`;

  // 1. Backdrop
  const backdropElem = document.getElementById('detailBackdrop');
  const bgUrl = item.coverUrl || '';
  if (bgUrl && backdropElem) {
    backdropElem.style.backgroundImage = `url('${bgUrl}')`;
  }

  // 2. Poster
  const posterImg = document.getElementById('detailPosterImg');
  if (posterImg) {
    posterImg.src = item.coverUrl || '';
    posterImg.alt = item.title;
  }

  // 3. Metadata
  const isSeries = item.typeLabel === 'Series' || item.subjectType === 2;
  const typeBadge = document.getElementById('detailTypeBadge');
  if (typeBadge) {
    typeBadge.className = `badge ${isSeries ? 'badge-type-series' : 'badge-type-movie'}`;
    typeBadge.textContent = isSeries ? 'Series' : 'Movie';
  }

  const ratingElem = document.getElementById('detailRating');
  if (ratingElem) ratingElem.textContent = item.imdbRating || '8.0';

  const countElem = document.getElementById('detailRatingCount');
  if (countElem && item.imdbRatingCount) {
    countElem.textContent = `(${Number(item.imdbRatingCount).toLocaleString()} votes)`;
  }

  const yearElem = document.getElementById('detailYear');
  if (yearElem) yearElem.textContent = item.year || (item.releaseDate ? item.releaseDate.split('-')[0] : '2024');

  const durElem = document.getElementById('detailDuration');
  if (durElem) durElem.textContent = item.durationFormatted || (isSeries ? 'Series' : 'N/A');

  const countryElem = document.getElementById('detailCountry');
  if (countryElem) countryElem.textContent = item.countryName || '';

  // 4. Title & Genres
  const titleElem = document.getElementById('detailTitle');
  if (titleElem) titleElem.textContent = item.title;

  const genresElem = document.getElementById('detailGenres');
  if (genresElem && item.genre) {
    genresElem.innerHTML = item.genre
      .map((g) => `<span class="genre-chip">${g}</span>`)
      .join('');
  }

  // 5. Synopsis
  const synElem = document.getElementById('detailSynopsis');
  if (synElem) synElem.textContent = item.description || 'Sinopsis tidak tersedia.';

  // 6. Dubbing options
  const dubsBox = document.getElementById('detailDubsBox');
  const dubsList = document.getElementById('detailDubsList');
  if (item.dubs && item.dubs.length > 0) {
    dubsBox.style.display = 'block';
    dubsList.innerHTML = item.dubs
      .map((d) => {
        const isCurrent = d.detailPath === item.detailPath;
        return `
          <button class="dub-pill ${isCurrent ? 'active' : ''}" onclick="window.location.href='/detail.html?path=${encodeURIComponent(d.detailPath)}'">
            ${d.language} ${d.isOriginal ? '(Original)' : ''}
          </button>
        `;
      })
      .join('');
  }

  // 7. Subtitles summary
  const subBox = document.getElementById('detailSubtitlesBox');
  const subList = document.getElementById('detailSubtitlesList');
  if (item.subtitles && item.subtitles.length > 0) {
    subBox.style.display = 'block';
    subList.textContent = item.subtitles.slice(0, 8).join(', ');
  }

  // 8. Action Buttons
  const playBtn = document.getElementById('detailPlayNowBtn');
  if (playBtn) {
    playBtn.onclick = () => {
      let playUrl = `/player.html?path=${encodeURIComponent(item.detailPath)}&id=${encodeURIComponent(item.subjectId || '')}`;
      if (isSeries && item.resource?.seasons?.length) {
        const firstSeason = item.resource.seasons[0];
        const firstEp = firstSeason.allEpisodes?.[0] || 1;
        playUrl += `&se=${firstSeason.seasonNumber}&ep=${firstEp}`;
      } else {
        playUrl += `&se=0&ep=0`;
      }
      window.location.href = playUrl;
    };
  }

  const watchlistBtn = document.getElementById('detailWatchlistBtn');
  if (watchlistBtn) {
    const syncWatchlistBtn = () => {
      const active = StreamBoxApp.isWatchlisted(item.detailPath);
      watchlistBtn.innerHTML = active
        ? `<i class="fa-solid fa-check"></i> Disimpan di Watchlist`
        : `<i class="fa-solid fa-plus"></i> Tambah ke Watchlist`;
    };
    syncWatchlistBtn();
    watchlistBtn.onclick = () => {
      StreamBoxApp.toggleWatchlist(item);
      syncWatchlistBtn();
    };
  }

  // 9. Trailer Button
  const trailerBtn = document.getElementById('detailTrailerBtn');
  if (item.trailer?.proxyUrl || item.trailer?.url) {
    trailerBtn.style.display = 'inline-flex';
    trailerBtn.onclick = () => {
      openTrailerModal(item.trailer.proxyUrl || item.trailer.url, item.title);
    };
  }

  // 10. Seasons & Episodes (if Series)
  const seriesSec = document.getElementById('seriesEpisodesSection');
  if (isSeries && item.resource?.seasons && item.resource.seasons.length > 0) {
    seriesSec.style.display = 'block';
    renderSeasonTabs(item.resource.seasons);
  } else {
    seriesSec.style.display = 'none';
  }
}

function renderSeasonTabs(seasons) {
  const tabsContainer = document.getElementById('seasonTabs');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = seasons
    .map((s, idx) => `
      <button class="season-tab ${idx === selectedSeasonIndex ? 'active' : ''}" onclick="switchSeason(${idx})">
        Season ${s.seasonNumber || idx + 1}
      </button>
    `)
    .join('');

  renderEpisodeCards(seasons[selectedSeasonIndex]);
}

function switchSeason(index) {
  selectedSeasonIndex = index;
  const seasons = currentDetail.resource.seasons;
  const tabs = document.querySelectorAll('.season-tab');
  tabs.forEach((t, i) => t.classList.toggle('active', i === index));
  renderEpisodeCards(seasons[index]);
}

function renderEpisodeCards(seasonObj) {
  const grid = document.getElementById('episodesGrid');
  if (!grid || !seasonObj) return;

  const episodes = seasonObj.allEpisodes || [1];
  const seNum = seasonObj.seasonNumber || 1;
  const history = StreamBoxApp.getHistoryItem(currentDetail.detailPath);

  grid.innerHTML = episodes
    .map((ep) => {
      const isWatched = history && history.season === seNum && history.episode === ep;
      const playUrl = `/player.html?path=${encodeURIComponent(currentDetail.detailPath)}&id=${encodeURIComponent(currentDetail.subjectId || '')}&se=${seNum}&ep=${ep}`;

      return `
        <div class="episode-card" onclick="window.location.href='${playUrl}'">
          ${isWatched ? '<div class="episode-watched-tag"><i class="fa-solid fa-clock-rotate-left"></i></div>' : ''}
          <div class="episode-number">${ep}</div>
          <div class="episode-label">Episode ${ep}</div>
        </div>
      `;
    })
    .join('');
}

// Trailer Modal Handlers
function setupTrailerModal() {
  const modal = document.getElementById('trailerModal');
  const closeBtn = document.getElementById('trailerCloseBtn');
  const video = document.getElementById('trailerVideo');

  if (closeBtn && modal) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      if (video) {
        video.pause();
        video.src = '';
      }
    }
  });
}

function openTrailerModal(videoUrl, title) {
  const modal = document.getElementById('trailerModal');
  const video = document.getElementById('trailerVideo');
  const titleElem = document.getElementById('trailerModalTitle');

  if (modal && video) {
    titleElem.textContent = `Trailer: ${title}`;
    video.src = videoUrl;
    modal.style.display = 'flex';
    video.play().catch(() => {});
  }
}
