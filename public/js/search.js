/**
 * MOVIENAS - Search Page Logic
 * Handles Debounced Searching, Category Filtering, and Infinite Pagination
 */

let currentQuery = '';
let currentType = 0; // 0=All, 1=Movie, 2=Series
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q') || '';
  const typeParam = parseInt(urlParams.get('type'), 10) || 0;

  const inputElem = document.getElementById('mainSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const filterPills = document.querySelectorAll('.filter-pill');

  if (typeParam > 0) {
    currentType = typeParam;
    filterPills.forEach((p) => {
      p.classList.toggle('active', parseInt(p.getAttribute('data-type'), 10) === currentType);
    });
  }

  // Filter pills click
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentType = parseInt(pill.getAttribute('data-type'), 10) || 0;
      currentPage = 1;
      executeSearch(true);
    });
  });

  // Search input typing with debounce
  inputElem.addEventListener('input', (e) => {
    const val = e.target.value;
    clearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentQuery = val.trim();
      currentPage = 1;
      executeSearch(true);
    }, 450);
  });

  // Clear button click
  clearBtn.addEventListener('click', () => {
    inputElem.value = '';
    clearBtn.style.display = 'none';
    currentQuery = '';
    inputElem.focus();
    renderEmptyQueryState();
  });

  // Load More button click
  loadMoreBtn.addEventListener('click', () => {
    if (!isLoading && hasMore) {
      currentPage++;
      executeSearch(false);
    }
  });

  // Initial query if provided in URL
  if (qParam) {
    inputElem.value = qParam;
    clearBtn.style.display = 'block';
    currentQuery = qParam.trim();
    executeSearch(true);
  } else {
    // If no query but category filter is chosen, load initial trending for that category
    loadTrendingAsDefault();
  }
});

async function loadTrendingAsDefault() {
  const statusElem = document.getElementById('searchStatus');
  const gridElem = document.getElementById('resultsGrid');
  if (statusElem) statusElem.textContent = 'Menampilkan rekomendasi trending populer:';

  gridElem.innerHTML = Array.from({ length: 12 })
    .map(() => '<div class="skeleton skeleton-card" style="width: 100%;"></div>')
    .join('');

  try {
    const res = await fetch('/api/trending?page=1&perPage=24');
    const json = await res.json();
    if (json.status && json.data) {
      let filtered = json.data;
      if (currentType === 1) filtered = filtered.filter((i) => i.typeLabel === 'Movie');
      if (currentType === 2) filtered = filtered.filter((i) => i.typeLabel === 'Series');
      gridElem.innerHTML = filtered.map((item) => StreamBoxApp.createPosterCard(item)).join('');
    }
  } catch (err) {
    console.error('Error loading default trending:', err);
  }
}

async function executeSearch(isNewSearch = false) {
  if (!currentQuery) {
    renderEmptyQueryState();
    return;
  }

  const gridElem = document.getElementById('resultsGrid');
  const statusElem = document.getElementById('searchStatus');
  const emptyElem = document.getElementById('emptyState');
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  if (isNewSearch) {
    gridElem.innerHTML = Array.from({ length: 12 })
      .map(() => '<div class="skeleton skeleton-card" style="width: 100%;"></div>')
      .join('');
    emptyElem.style.display = 'none';
    loadMoreWrap.style.display = 'none';
  }

  isLoading = true;
  if (loadMoreBtn) loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat...';

  try {
    const url = `/api/search?q=${encodeURIComponent(currentQuery)}&page=${currentPage}&perPage=20&type=${currentType}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.status || !json.data || json.data.length === 0) {
      if (isNewSearch) {
        gridElem.innerHTML = '';
        emptyElem.style.display = 'block';
        statusElem.textContent = `Tidak ditemukan hasil untuk "${currentQuery}"`;
      }
      hasMore = false;
      loadMoreWrap.style.display = 'none';
      return;
    }

    const items = json.data;
    statusElem.textContent = `Ditemukan ${items.length} hasil untuk "${currentQuery}"`;

    if (isNewSearch) {
      gridElem.innerHTML = items.map((item) => StreamBoxApp.createPosterCard(item)).join('');
    } else {
      const cardsHtml = items.map((item) => StreamBoxApp.createPosterCard(item)).join('');
      gridElem.insertAdjacentHTML('beforeend', cardsHtml);
    }

    hasMore = items.length >= 20;
    loadMoreWrap.style.display = hasMore ? 'block' : 'none';
    if (loadMoreBtn) loadMoreBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Muat Lebih Banyak';

    // Update browser URL query without reload
    const newUrl = `/search.html?q=${encodeURIComponent(currentQuery)}&type=${currentType}`;
    window.history.replaceState({}, '', newUrl);

  } catch (err) {
    console.error('Search error:', err);
    statusElem.textContent = `Terjadi kesalahan saat mencari. Silakan coba lagi.`;
  } finally {
    isLoading = false;
  }
}

function renderEmptyQueryState() {
  const gridElem = document.getElementById('resultsGrid');
  const statusElem = document.getElementById('searchStatus');
  const emptyElem = document.getElementById('emptyState');
  const loadMoreWrap = document.getElementById('loadMoreWrap');

  statusElem.textContent = 'Ketik kata kunci untuk mulai mencari...';
  gridElem.innerHTML = '';
  emptyElem.style.display = 'none';
  loadMoreWrap.style.display = 'none';
  loadTrendingAsDefault();
}
