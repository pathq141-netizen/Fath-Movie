/**
 * Client-Side Storage & Event Helpers (Watchlist & History)
 */

export function getWatchlist() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('movienas_watchlist') || '[]');
  } catch {
    return [];
  }
}

export function isWatchlisted(detailPath) {
  if (typeof window === 'undefined' || !detailPath) return false;
  const list = getWatchlist();
  return list.some((item) => item.detailPath === detailPath);
}

export function toggleWatchlist(item) {
  if (typeof window === 'undefined' || !item || !item.detailPath) return false;
  let list = getWatchlist();
  const index = list.findIndex((i) => i.detailPath === item.detailPath);
  let added = false;

  if (index > -1) {
    list.splice(index, 1);
    showToast(`Dihapus dari Watchlist: ${item.title}`);
    added = false;
  } else {
    list.unshift({
      detailPath: item.detailPath,
      subjectId: item.subjectId || '',
      title: item.title,
      coverUrl: item.coverUrl,
      typeLabel: item.typeLabel || 'Movie',
      imdbRating: item.imdbRating || '',
      year: item.year || '',
      addedAt: Date.now(),
    });
    showToast(`Ditambahkan ke Watchlist: ${item.title}`);
    added = true;
  }

  localStorage.setItem('movienas_watchlist', JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('watchlist-updated', { detail: { path: item.detailPath, added } }));
  return added;
}

export function getHistory() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('movienas_history') || '[]');
  } catch {
    return [];
  }
}

export function saveHistory(record) {
  if (typeof window === 'undefined' || !record || !record.detailPath) return;
  let list = getHistory();
  list = list.filter((i) => i.detailPath !== record.detailPath);

  list.unshift({
    detailPath: record.detailPath,
    subjectId: record.subjectId || '',
    title: record.title || '',
    coverUrl: record.coverUrl || '',
    isMovie: Boolean(record.isMovie),
    season: Number(record.season) || 1,
    episode: Number(record.episode) || 1,
    currentTime: Number(record.currentTime) || 0,
    duration: Number(record.duration) || 0,
    percent: Math.min(100, Math.round(((record.currentTime || 0) / (record.duration || 1)) * 100)),
    updatedAt: Date.now(),
  });

  if (list.length > 30) list = list.slice(0, 30);
  localStorage.setItem('movienas_history', JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('history-updated'));
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('movienas_history');
  window.dispatchEvent(new CustomEvent('history-updated'));
  showToast('Riwayat menonton dibersihkan');
}

export function showToast(message, icon = 'fa-check') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, icon } }));
}
