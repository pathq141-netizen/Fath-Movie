/**
 * STREAMBOX - Homepage Logic
 * Fetches Trending, Populates Hero Banner, Carousels, and Continue Watching
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadHomepageContent();
  renderContinueWatching();
  renderWatchlistSection();

  window.addEventListener('history-updated', renderContinueWatching);
  window.addEventListener('watchlist-updated', renderWatchlistSection);
});

async function loadHomepageContent() {
  try {
    const res = await fetch('/api/trending?page=1&perPage=30');
    const json = await res.json();

    if (!json.status || !json.data || json.data.length === 0) {
      console.warn('Trending data empty or failed');
      return;
    }

    const items = json.data;

    // 1. Setup Hero Banner with #1 item
    setupHero(items[0]);

    // 2. Setup Carousels
    // Carousel A: Trending All
    setupCarousel('trendingTrack', items.slice(0, 15));

    // Carousel B: Movies Only
    const movies = items.filter((i) => i.typeLabel === 'Movie' || i.subjectType === 1);
    setupCarousel('moviesTrack', movies.length > 0 ? movies : items.slice(5, 20));

    // Carousel C: Series Only
    const series = items.filter((i) => i.typeLabel === 'Series' || i.subjectType === 2);
    setupCarousel('seriesTrack', series.length > 0 ? series : items.slice(10, 25));

  } catch (err) {
    console.error('Error loading homepage:', err);
  }
}

function setupHero(item) {
  const heroElem = document.getElementById('heroBanner');
  if (!heroElem || !item) return;

  const bgImg = item.stillsUrl || item.coverUrl;
  if (bgImg) {
    heroElem.style.backgroundImage = `url('${bgImg}')`;
  }

  const isSeries = item.typeLabel === 'Series' || item.subjectType === 2;
  const badgeType = document.getElementById('heroBadgeType');
  if (badgeType) {
    badgeType.className = `badge ${isSeries ? 'badge-type-series' : 'badge-type-movie'}`;
    badgeType.textContent = isSeries ? 'Series' : 'Movie';
  }

  const ratingVal = document.getElementById('heroRatingVal');
  if (ratingVal) {
    ratingVal.textContent = item.imdbRating || '8.5';
  }

  const yearVal = document.getElementById('heroYear');
  if (yearVal) {
    yearVal.textContent = item.year || '2024';
  }

  const durVal = document.getElementById('heroDuration');
  if (durVal) {
    durVal.textContent = item.durationFormatted || (isSeries ? 'Full Seasons' : '2 jam');
  }

  const titleElem = document.getElementById('heroTitle');
  if (titleElem) {
    titleElem.textContent = item.title;
  }

  const descElem = document.getElementById('heroDesc');
  if (descElem) {
    descElem.textContent = item.description || 'Tonton film dan serial drama pilihan berkualitas tinggi dengan streaming lancar dan subtitle lengkap.';
  }

  const genresElem = document.getElementById('heroGenres');
  if (genresElem && item.genre) {
    genresElem.innerHTML = item.genre
      .slice(0, 4)
      .map((g) => `<span class="genre-chip">${g}</span>`)
      .join('');
  }

  const playBtn = document.getElementById('heroPlayBtn');
  if (playBtn) {
    playBtn.onclick = () => {
      window.location.href = `/player.html?path=${encodeURIComponent(item.detailPath)}`;
    };
  }

  const detailBtn = document.getElementById('heroDetailBtn');
  if (detailBtn) {
    detailBtn.onclick = () => {
      window.location.href = `/detail.html?path=${encodeURIComponent(item.detailPath)}`;
    };
  }

  const watchlistBtn = document.getElementById('heroWatchlistBtn');
  if (watchlistBtn) {
    const checkState = () => {
      const active = StreamBoxApp.isWatchlisted(item.detailPath);
      watchlistBtn.innerHTML = active
        ? `<i class="fa-solid fa-check"></i> Disimpan`
        : `<i class="fa-solid fa-plus"></i> Watchlist`;
    };
    checkState();
    watchlistBtn.onclick = () => {
      StreamBoxApp.toggleWatchlist(item);
      checkState();
    };
  }
}

function setupCarousel(trackId, items) {
  const track = document.getElementById(trackId);
  if (!track) return;

  if (!items || items.length === 0) {
    track.innerHTML = `<p class="text-sm text-slate-500 py-4">Tidak ada konten tersedia.</p>`;
    return;
  }

  track.innerHTML = items.map((item) => StreamBoxApp.createPosterCard(item)).join('');
}

// Horizontal Scroll Carousel Button Actions
function scrollCarousel(trackId, direction) {
  const track = document.getElementById(trackId);
  if (!track) return;
  const distance = 450 * direction;
  track.scrollBy({ left: distance, behavior: 'smooth' });
}

// Render "Lanjutkan Menonton" from localStorage
function renderContinueWatching() {
  const section = document.getElementById('continueWatchingSection');
  const track = document.getElementById('continueWatchingTrack');
  if (!section || !track) return;

  const history = StreamBoxApp.getHistory();
  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  track.innerHTML = history.map((item) => {
    const playUrl = `/player.html?path=${encodeURIComponent(item.detailPath)}&se=${item.season || 0}&ep=${item.episode || 0}&t=${Math.floor(item.currentTime || 0)}`;
    const epText = item.isMovie ? 'Film' : `S${item.season || 1} E${item.episode || 1}`;

    return `
      <div class="cw-card" onclick="window.location.href='${playUrl}'">
        <div class="cw-thumb">
          <img src="${item.coverUrl || ''}" alt="${item.title}" onerror="this.src='/placeholder.jpg'" />
          <div class="cw-play-overlay">
            <i class="fa-solid fa-circle-play"></i>
          </div>
          <div class="cw-progress-bar">
            <div class="cw-progress-fill" style="width: ${item.percent || 0}%"></div>
          </div>
        </div>
        <div class="cw-info">
          <h4 class="cw-title">${item.title}</h4>
          <p class="cw-episode">${epText} • ${StreamBoxApp.formatTime(item.currentTime)} / ${StreamBoxApp.formatTime(item.duration)}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Render Watchlist Section if items exist
function renderWatchlistSection() {
  const section = document.getElementById('watchlistSection');
  const track = document.getElementById('watchlistTrack');
  if (!section || !track) return;

  const watchlist = StreamBoxApp.getWatchlist();
  if (watchlist.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  track.innerHTML = watchlist.map((item) => StreamBoxApp.createPosterCard(item)).join('');
}
