/**
 * MOVIENAS - Core Shared App Script
 * Handles High-Speed Navigation, Watchlist, Syncing, Toasts & Utilities
 */

const StreamBoxApp = {
  // 1. Initialize Global UI
  init() {
    this.initNavbar();
    this.initSearchInput();
    this.initMobileMenu();
    this.initBottomNav();
    this.updateWatchlistBadge();
    window.syncAllWatchlistButtons();
  },

  // Bottom Navigation Dock interaction
  initBottomNav() {
    // Navigates directly to /watchlist or other pages cleanly
  },

  // Navbar scroll background transition
  initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });

    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    }
  },

  // Navbar & Global Search
  initSearchInput() {
    const navSearch = document.getElementById('navSearchInput');
    if (!navSearch) return;

    navSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.submitNavSearch();
      }
    });

    // Keyboard shortcut '/' to quickly focus search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== navSearch && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        navSearch.focus();
      }
    });
  },

  // Mobile Menu Toggle
  initMobileMenu() {
    const toggleBtn = document.getElementById('menuToggleBtn');
    const navLinks = document.getElementById('navLinks');
    if (!toggleBtn || !navLinks) return;

    // Remove existing listener to avoid duplicates
    toggleBtn.onclick = () => {
      navLinks.classList.toggle('mobile-open');
    };
  },

  // ==========================================
  // WATCHLIST / FAVORIT (localStorage)
  // ==========================================
  getWatchlist() {
    try {
      return JSON.parse(localStorage.getItem('movienas_watchlist') || '[]');
    } catch {
      return [];
    }
  },

  isWatchlisted(detailPath) {
    if (!detailPath) return false;
    const list = this.getWatchlist();
    return list.some((item) => item.detailPath === detailPath);
  },

  toggleWatchlist(item) {
    let list = this.getWatchlist();
    const index = list.findIndex((i) => i.detailPath === item.detailPath);

    if (index > -1) {
      list.splice(index, 1);
      this.showToast(`Dihapus dari Watchlist: ${item.title}`);
    } else {
      list.unshift({
        detailPath: item.detailPath,
        subjectId: item.subjectId,
        title: item.title,
        coverUrl: item.coverUrl,
        typeLabel: item.typeLabel || 'Movie',
        imdbRating: item.imdbRating,
        year: item.year,
        addedAt: Date.now(),
      });
      this.showToast(`Ditambahkan ke Watchlist: ${item.title}`);
    }

    localStorage.setItem('movienas_watchlist', JSON.stringify(list));
    this.updateWatchlistBadge();
    window.dispatchEvent(new CustomEvent('watchlist-updated'));
    return index === -1; // true if added
  },

  updateWatchlistBadge() {
    const badges = document.querySelectorAll('.badge-count');
    const count = this.getWatchlist().length;
    badges.forEach((b) => {
      b.textContent = count;
      b.style.display = count > 0 ? 'inline-block' : 'none';
    });
  },

  // ==========================================
  // CONTINUE WATCHING / RIWAYAT (localStorage)
  // ==========================================
  getHistory() {
    try {
      return JSON.parse(localStorage.getItem('movienas_history') || '[]');
    } catch {
      return [];
    }
  },

  saveHistory(record) {
    if (!record || !record.detailPath) return;
    let list = this.getHistory();
    list = list.filter((i) => i.detailPath !== record.detailPath);

    list.unshift({
      detailPath: record.detailPath,
      subjectId: record.subjectId || '',
      title: record.title || '',
      coverUrl: record.coverUrl || '',
      isMovie: Boolean(record.isMovie),
      season: Number(record.season) || 0,
      episode: Number(record.episode) || 0,
      currentTime: Number(record.currentTime) || 0,
      duration: Number(record.duration) || 0,
      percent: Math.min(100, Math.round(((record.currentTime || 0) / (record.duration || 1)) * 100)),
      updatedAt: Date.now(),
    });

    if (list.length > 30) list = list.slice(0, 30);
    localStorage.setItem('movienas_history', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('history-updated'));
  },

  getHistoryItem(detailPath) {
    const list = this.getHistory();
    return list.find((i) => i.detailPath === detailPath) || null;
  },

  clearHistory() {
    localStorage.removeItem('movienas_history');
    window.dispatchEvent(new CustomEvent('history-updated'));
  },

  // ==========================================
  // UI UTILITIES & TOAST
  // ==========================================
  showToast(message, icon = 'fa-check') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon} text-red-500"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  formatTime(seconds) {
    const s = Math.floor(Number(seconds) || 0);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  },

  // Create card element for a Movie/Series/Drama item
  createPosterCard(item) {
    const isSeries = item.typeLabel === 'Series' || item.subjectType === 2;
    const isShortDrama = item.typeLabel === 'Short Drama' || item.subjectType === 7;
    const badgeTypeClass = isShortDrama ? 'badge-type-shortdrama' : (isSeries ? 'badge-type-series' : 'badge-type-movie');
    const badgeLabel = isShortDrama ? 'Short Drama' : (isSeries ? 'Series' : 'Movie');
    const detailUrl = `/detail/${encodeURIComponent(item.detailPath)}`;
    const playUrl = (isSeries || isShortDrama)
      ? `/play/${encodeURIComponent(item.detailPath)}/1/1`
      : `/play/${encodeURIComponent(item.detailPath)}`;
    const isSaved = this.isWatchlisted(item.detailPath);

    const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23171722'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='14'%3ENo Poster%3C/text%3E%3C/svg%3E";

    let metaInfo = item.durationFormatted || (isSeries ? 'Series' : (isShortDrama ? 'Drama Pendek' : 'Film'));
    if (item.totalEpisodes) metaInfo = `${item.totalEpisodes} Episode`;

    const safeTitle = (item.title || '').replace(/"/g, '&quot;');

    return `
      <div class="card-poster" onclick="window.location.href='${detailUrl}'">
        <div class="card-image-wrap">
          <img src="${item.coverUrl || fallbackImg}" alt="${safeTitle}" loading="lazy" onerror="this.src='${fallbackImg}'" />
          
          <div class="card-badge-top">
            <span class="badge ${badgeTypeClass}">${badgeLabel}</span>
          </div>

          <button class="card-quick-watchlist ${isSaved ? 'active' : ''}"
            data-path="${item.detailPath}"
            data-title="${safeTitle}"
            data-cover="${item.coverUrl || fallbackImg}"
            data-type="${badgeLabel}"
            data-rating="${item.imdbRating || ''}"
            data-year="${item.year || ''}"
            onclick="event.stopPropagation(); toggleWatchlistFromButton(this)"
            title="${isSaved ? 'Hapus dari Watchlist' : 'Tambah ke Watchlist'}">
            <i class="${isSaved ? 'fa-solid text-red-500' : 'fa-regular'} fa-bookmark"></i>
          </button>

          ${item.imdbRating && item.imdbRating !== '0.0' ? `
            <div class="card-rating-badge">
              <i class="fa-solid fa-star"></i>
              <span>${item.imdbRating}</span>
            </div>
          ` : ''}

          <div class="card-overlay-hover">
            <div class="card-hover-play" onclick="event.stopPropagation(); window.location.href='${playUrl}'" title="Putar Langsung">
              <i class="fa-solid fa-play"></i>
            </div>
          </div>
        </div>

        <div class="card-info">
          <h3 class="card-title" title="${safeTitle}">${safeTitle}</h3>
          <div class="card-meta">
            <span>${item.year || (item.releaseDate ? item.releaseDate.split('-')[0] : '') || '2024'}</span>
            <span>${metaInfo}</span>
          </div>
        </div>
      </div>
    `;
  },
};

// ==========================================
// Global Watchlist Button Actions & Sync
// ==========================================
window.toggleWatchlistFromButton = function(btn) {
  if (!btn) return;
  const item = {
    detailPath: btn.dataset.path,
    subjectId: btn.dataset.id || btn.dataset.subjectid || '',
    title: btn.dataset.title,
    coverUrl: btn.dataset.cover,
    typeLabel: btn.dataset.type || 'Movie',
    imdbRating: btn.dataset.rating || '',
    year: btn.dataset.year || '',
  };
  if (!item.detailPath) return;

  const added = StreamBoxApp.toggleWatchlist(item);
  window.syncWatchlistButtonState(btn, added);

  // Sync any other buttons on the page targeting the same content
  document.querySelectorAll(`[data-path="${item.detailPath}"]`).forEach((b) => {
    if (b !== btn) window.syncWatchlistButtonState(b, added);
  });
};

window.syncWatchlistButtonState = function(btn, isAdded) {
  if (!btn) return;
  const isQuickBtn = btn.classList.contains('card-quick-watchlist');
  if (isQuickBtn) {
    btn.classList.toggle('active', isAdded);
    btn.innerHTML = isAdded
      ? '<i class="fa-solid fa-bookmark text-red-500"></i>'
      : '<i class="fa-regular fa-bookmark"></i>';
    btn.title = isAdded ? 'Hapus dari Watchlist' : 'Tambah ke Watchlist';
    return;
  }

  btn.classList.toggle('btn-watchlist-active', isAdded);
  const textSpan = btn.querySelector('.btn-text');
  if (isAdded) {
    btn.innerHTML = '<i class="fa-solid fa-check text-red-500"></i> <span class="btn-text">Tersimpan</span>';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> <span class="btn-text">Watchlist</span>';
  }
};

window.syncAllWatchlistButtons = function() {
  document.querySelectorAll('[data-path]').forEach((btn) => {
    const path = btn.dataset.path;
    if (path) {
      const isSaved = StreamBoxApp.isWatchlisted(path);
      window.syncWatchlistButtonState(btn, isSaved);
    }
  });
};

// ==========================================
// Navbar Search Helper
// ==========================================
window.submitNavSearch = function() {
  const input = document.getElementById('navSearchInput');
  const q = (input ? input.value : '').trim();
  if (!q) return;

  const currentPath = window.location.pathname;
  let typeSlug = 'all';
  if (currentPath.includes('/search/drama')) typeSlug = 'drama';
  else if (currentPath.includes('/search/movie')) typeSlug = 'movie';
  else if (currentPath.includes('/search/series')) typeSlug = 'series';

  window.location.href = `/search/${typeSlug}/${encodeURIComponent(q)}`;
};

// ==========================================
// High-Speed Instant Navigation & Prefetching
// ==========================================
const pageCache = new Map();

function initInstantNavigation() {
  const progressBar = document.getElementById('topProgressBar');

  function startProgress() {
    if (!progressBar) return;
    progressBar.style.opacity = '1';
    progressBar.style.width = '35%';
    setTimeout(() => {
      if (progressBar.style.opacity === '1') progressBar.style.width = '75%';
    }, 100);
  }

  function finishProgress() {
    if (!progressBar) return;
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBar.style.opacity = '0';
      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 200);
    }, 150);
  }

  // Prefetch page on hover or touchstart
  function prefetch(url) {
    if (!url || pageCache.has(url)) return;
    if (!url.startsWith('/') || url.startsWith('/api') || url.startsWith('/play/')) return;
    pageCache.set(url, 'fetching');
    fetch(url, { priority: 'low' })
      .then((r) => r.text())
      .then((html) => pageCache.set(url, html))
      .catch(() => pageCache.delete(url));
  }

  document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && link.origin === window.location.origin) {
      prefetch(link.pathname + link.search);
    }
  });

  document.addEventListener('touchstart', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && link.origin === window.location.origin) {
      prefetch(link.pathname + link.search);
    }
  }, { passive: true });

  // Handle instant soft navigation
  document.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    if (!link || !link.href) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target && link.target !== '_self') return;
    if (link.origin !== window.location.origin) return;

    const url = link.pathname + link.search;
    const rawHref = link.getAttribute('href') || '';

    // Direct browser navigation for video player, APIs, in-page hashes
    if (url.startsWith('/play/') || url.startsWith('/api/') || rawHref.startsWith('#') || link.dataset.noInstant) {
      return;
    }

    if (url === window.location.pathname + window.location.search) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    await navigateTo(url, true);
  });

  window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname + window.location.search, false);
  });

  async function navigateTo(url, push = true) {
    startProgress();
    try {
      let html = pageCache.get(url);
      if (!html || html === 'fetching') {
        const res = await fetch(url);
        html = await res.text();
        pageCache.set(url, html);
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1. Update Title
      document.title = doc.title;

      // 2. Locate main content
      const currentMain = document.querySelector('main') || document.querySelector('.hero');
      const newMain = doc.querySelector('main') || doc.querySelector('.hero');

      if (currentMain && newMain) {
        currentMain.replaceWith(newMain);
      } else {
        window.location.href = url;
        return;
      }

      // 3. Update active classes on navigation
      updateActiveNavLinks(url);

      // 4. Update browser URL history
      if (push) {
        history.pushState(null, '', url);
      }

      // 5. Scroll smoothly to top
      window.scrollTo({ top: 0, behavior: 'instant' });

      // 6. Re-execute initializers
      StreamBoxApp.init();
      window.syncAllWatchlistButtons();

      if (typeof renderWatchlistPage === 'function' && document.getElementById('watchlistGrid')) {
        renderWatchlistPage();
      }

      finishProgress();
    } catch (err) {
      console.warn('Instant navigation fallback:', err);
      window.location.href = url;
    }
  }

  function updateActiveNavLinks(url) {
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      let isActive = false;
      if (href === '/' && (url === '/' || url === '')) isActive = true;
      else if (href !== '/' && url.startsWith(href)) isActive = true;
      a.classList.toggle('active', isActive);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  StreamBoxApp.init();
  initInstantNavigation();
});
