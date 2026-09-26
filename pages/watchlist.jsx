import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { getWatchlist, showToast } from '../lib/clientStorage';

export default function WatchlistPage() {
  const [items, setItems] = useState([]);
  const [isClient, setIsClient] = useState(false);

  function loadList() {
    setItems(getWatchlist());
  }

  useEffect(() => {
    setIsClient(true);
    loadList();
    window.addEventListener('watchlist-updated', loadList);
    return () => window.removeEventListener('watchlist-updated', loadList);
  }, []);

  function handleRemove(detailPath, e) {
    e.stopPropagation();
    let list = getWatchlist();
    list = list.filter((i) => i.detailPath !== detailPath);
    localStorage.setItem('movienas_watchlist', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('watchlist-updated'));
    showToast('Dihapus dari Watchlist');
    setItems(list);
  }

  function handleClearAll() {
    if (confirm('Yakin ingin menghapus semua daftar tontonan di Watchlist?')) {
      localStorage.removeItem('movienas_watchlist');
      window.dispatchEvent(new CustomEvent('watchlist-updated'));
      showToast('Semua tontonan telah dihapus');
      setItems([]);
    }
  }

  return (
    <Layout
      pageTitle="Watchlist Saya — FathMovie"
      metaDescription="Daftar tontonan tersimpan favorit Anda di FathMovie. Nonton film & series sub Indo."
    >
      <main className="main-container" style={{ marginTop: '5rem', minHeight: '65vh' }}>
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div className="section-title-wrap">
            <div className="section-title-bar"></div>
            <div>
              <h1 className="section-title" style={{ fontSize: '1.8rem' }}>
                <i className="fa-solid fa-bookmark text-red-500" style={{ marginRight: '0.5rem' }}></i>{' '}
                Watchlist Saya
              </h1>
              <p className="section-subtitle">
                Daftar tontonan film, serial TV, dan drama pendek yang Anda simpan.
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div>
              <button
                className="btn btn-secondary"
                onClick={handleClearAll}
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
              >
                <i className="fa-solid fa-trash-can"></i> Hapus Semua
              </button>
            </div>
          )}
        </div>

        {isClient && items.length === 0 && (
          <div
            className="player-empty-state"
            style={{ padding: '4rem 1.5rem', maxWidth: '600px', margin: '2rem auto' }}
          >
            <div
              className="player-empty-icon"
              style={{ background: 'rgba(229, 9, 20, 0.15)', color: 'var(--brand)' }}
            >
              <i className="fa-solid fa-bookmark"></i>
            </div>
            <h3 className="player-empty-title">Watchlist Anda Masih Kosong</h3>
            <p className="player-empty-desc">
              Anda belum menambahkan tontonan apapun. Jelajahi ribuan film, serial, dan drama pendek
              lalu klik tombol <strong>Watchlist</strong> untuk menyimpannya di sini.
            </p>
            <Link
              href="/"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1.8rem',
                borderRadius: '9999px',
              }}
            >
              <i className="fa-solid fa-compass"></i> Jelajahi Konten
            </Link>
          </div>
        )}

        {isClient && items.length > 0 && (
          <div className="responsive-grid">
            {items.map((item) => {
              const isMovie = item.typeLabel === 'Movie' || item.isMovie === true;
              const isShortDrama = item.typeLabel === 'Short Drama';
              const typeBadge = isShortDrama ? (
                <span className="badge badge-type-shortdrama">Short Drama</span>
              ) : isMovie ? (
                <span className="badge badge-type-movie">Movie</span>
              ) : (
                <span className="badge badge-type-series">Series</span>
              );

              const playUrl = isMovie
                ? `/play/${encodeURIComponent(item.detailPath)}`
                : `/play/${encodeURIComponent(item.detailPath)}/1/1`;

              const detailUrl = `/detail/${encodeURIComponent(item.detailPath)}`;

              return (
                <div key={item.detailPath} className="card-poster">
                  <div className="card-image-wrap">
                    <img
                      src={item.coverUrl || '/placeholder.jpg'}
                      alt={item.title}
                      loading="lazy"
                    />
                    <div className="card-badge-top">
                      {typeBadge}
                      {item.imdbRating && (
                        <span className="card-rating-badge">
                          <i className="fa-solid fa-star"></i> {item.imdbRating}
                        </span>
                      )}
                    </div>
                    <Link
                      href={detailUrl}
                      className="card-overlay-hover"
                      aria-label={`Lihat detail ${item.title}`}
                    >
                      <div className="card-hover-play">
                        <i className="fa-solid fa-play"></i>
                      </div>
                    </Link>
                  </div>
                  <div className="card-info" style={{ position: 'relative' }}>
                    <Link href={detailUrl} className="card-title" title={item.title}>
                      {item.title}
                    </Link>
                    <div className="card-meta">
                      <span>
                        {item.year ||
                          (isShortDrama ? 'Drama Pendek' : isMovie ? 'Film' : 'Serial')}
                      </span>
                      <button
                        onClick={(e) => handleRemove(item.detailPath, e)}
                        title="Hapus dari Watchlist"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                        }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </Layout>
  );
}
