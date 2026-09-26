import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import MovieCard from '../components/MovieCard';
import { getHistory, clearHistory, toggleWatchlist, isWatchlisted } from '../lib/clientStorage';

export default function HomePage({ heroItem, categories }) {
  const [history, setHistory] = useState([]);
  const [heroSaved, setHeroSaved] = useState(false);

  useEffect(() => {
    function loadHistory() {
      setHistory(getHistory());
    }
    loadHistory();
    window.addEventListener('history-updated', loadHistory);
    return () => window.removeEventListener('history-updated', loadHistory);
  }, []);

  useEffect(() => {
    if (heroItem?.detailPath) {
      setHeroSaved(isWatchlisted(heroItem.detailPath));
    }
    function updateWatchlistState() {
      if (heroItem?.detailPath) {
        setHeroSaved(isWatchlisted(heroItem.detailPath));
      }
    }
    window.addEventListener('watchlist-updated', updateWatchlistState);
    return () => window.removeEventListener('watchlist-updated', updateWatchlistState);
  }, [heroItem?.detailPath]);

  function handleHeroWatchlist() {
    if (!heroItem) return;
    const added = toggleWatchlist({
      detailPath: heroItem.detailPath,
      subjectId: heroItem.subjectId,
      title: heroItem.title,
      coverUrl: heroItem.coverUrl,
      typeLabel: heroItem.typeLabel || 'Movie',
      imdbRating: heroItem.imdbRating,
      year: heroItem.year,
    });
    setHeroSaved(added);
  }

  const subType = Number(heroItem?.subjectType) || 1;
  const isShortDrama = subType === 7 || heroItem?.typeLabel === 'Short Drama';
  const isSeries = subType === 2 || heroItem?.typeLabel === 'Series';
  const isEpisodic = isSeries || isShortDrama;
  const bgImg = heroItem?.stillsUrl || heroItem?.coverUrl || '';
  const heroPlayUrl = isEpisodic
    ? `/play/${encodeURIComponent(heroItem?.detailPath || '')}/1/1`
    : `/play/${encodeURIComponent(heroItem?.detailPath || '')}`;

  return (
    <Layout
      pageTitle="FathMovie — Nonton Film & Series Subtitle Indonesia Gratis"
      metaDescription={
        heroItem
          ? `Nonton ${heroItem.title} dan ribuan film & series lainnya dengan sub Indo kualitas HD di FathMovie.`
          : 'Streaming film & series sub Indo terlengkap.'
      }
      ogImage="https://www.gobox.my.id/file/swLU7OEx9HJk.png"
    >
      {heroItem && (
        <section
          className="hero"
          id="heroBanner"
          style={{ backgroundImage: `url('${bgImg}')` }}
        >
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <div className="hero-badge-row">
              <span className="badge badge-brand">
                <i className="fa-solid fa-bolt"></i> TRENDING #1
              </span>
              <span
                className={`badge ${
                  isShortDrama
                    ? 'badge-type-shortdrama'
                    : isSeries
                    ? 'badge-type-series'
                    : 'badge-type-movie'
                }`}
              >
                {isShortDrama ? 'Short Drama' : isSeries ? 'Series' : 'Movie'}
              </span>
              <span className="badge badge-rating">
                <i className="fa-solid fa-star"></i>
                <span>{heroItem.imdbRating || '8.5'}</span>
              </span>
              <span className="badge badge-quality">Full HD</span>
              <span className="badge badge-meta">
                {heroItem.year ||
                  (heroItem.releaseDate ? heroItem.releaseDate.split('-')[0] : '2024')}
              </span>
              <span className="badge badge-meta">
                {isEpisodic ? (
                  <>
                    <i className="fa-solid fa-list-ol"></i>{' '}
                    {heroItem.totalEpisodes
                      ? `${heroItem.totalEpisodes} Episode`
                      : isShortDrama
                      ? 'Drama Pendek'
                      : 'Series'}
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-clock"></i>{' '}
                    {heroItem.durationFormatted || 'Film'}
                  </>
                )}
              </span>
            </div>

            <h1 className="hero-title">{heroItem.title}</h1>

            {heroItem.genre && heroItem.genre.length > 0 && (
              <div className="hero-genres">
                {heroItem.genre.slice(0, 4).map((g, idx) => (
                  <span key={idx} className="genre-chip">
                    {g}
                  </span>
                ))}
              </div>
            )}

            <p className="hero-desc">
              {heroItem.description ||
                'Streaming film dan series pilihan berkualitas tinggi.'}
            </p>

            <div className="hero-actions">
              <Link href={heroPlayUrl} className="btn btn-primary">
                <i className="fa-solid fa-play"></i> Putar Sekarang
              </Link>
              <Link
                href={`/detail/${encodeURIComponent(heroItem.detailPath)}`}
                className="btn btn-secondary"
              >
                <i className="fa-solid fa-circle-info"></i> Info Lengkap
              </Link>
              <button
                className={`btn btn-secondary ${heroSaved ? 'btn-watchlist-active' : ''}`}
                onClick={handleHeroWatchlist}
              >
                <i className={`fa-solid ${heroSaved ? 'fa-check text-red-500' : 'fa-plus'}`}></i>{' '}
                <span className="btn-text">{heroSaved ? 'Tersimpan' : 'Watchlist'}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      <main className="main-container">
        {/* Continue Watching Section (LocalStorage) */}
        {history.length > 0 && (
          <section className="content-section" id="continueWatchingSection">
            <div className="section-header">
              <div className="section-title-wrap">
                <div className="section-title-bar"></div>
                <h2 className="section-title">Lanjutkan Menonton</h2>
                <span className="section-subtitle">Tersimpan otomatis</span>
              </div>
              <button
                onClick={clearHistory}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
              >
                <i className="fa-solid fa-trash-can"></i> Hapus Riwayat
              </button>
            </div>
            <div className="carousel-track">
              {history.map((rec) => {
                const itemPlayUrl = rec.isMovie
                  ? `/play/${encodeURIComponent(rec.detailPath)}`
                  : `/play/${encodeURIComponent(rec.detailPath)}/${rec.episode || 1}/${rec.season || 1}`;
                return (
                  <div key={rec.detailPath} className="cw-card">
                    <Link href={itemPlayUrl} className="cw-thumb-link">
                      <div className="cw-thumb">
                        <img src={rec.coverUrl || '/placeholder.jpg'} alt={rec.title} />
                        <div className="cw-play-overlay">
                          <i className="fa-solid fa-play"></i>
                        </div>
                        <div className="cw-progress-bar">
                          <div
                            className="cw-progress-fill"
                            style={{ width: `${rec.percent || 0}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                    <div className="cw-info">
                      <Link href={`/detail/${encodeURIComponent(rec.detailPath)}`} className="cw-title" title={rec.title}>
                        {rec.title}
                      </Link>
                      <div className="cw-episode">
                        {rec.isMovie
                          ? 'Film'
                          : `S${rec.season || 1} • Ep ${rec.episode || 1}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Dynamic Category Carousels */}
        {categories && categories.length > 0 && categories.map((cat, cIdx) => (
          <section key={cIdx} className="content-section" id={`cat-${cIdx}`}>
            <div className="section-header">
              <div className="section-title-wrap">
                <div className="section-title-bar"></div>
                <h2 className="section-title">{cat.title}</h2>
                <span className="section-subtitle">Rekomendasi Pilihan</span>
              </div>
              <div className="carousel-controls">
                <button
                  className="carousel-btn"
                  onClick={() => {
                    const el = document.getElementById(`track-cat-${cIdx}`);
                    el?.scrollBy({ left: -450, behavior: 'smooth' });
                  }}
                  title="Geser Kiri"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <button
                  className="carousel-btn"
                  onClick={() => {
                    const el = document.getElementById(`track-cat-${cIdx}`);
                    el?.scrollBy({ left: 450, behavior: 'smooth' });
                  }}
                  title="Geser Kanan"
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
            <div className="carousel-track" id={`track-cat-${cIdx}`}>
              {(cat.items || []).slice(0, 16).map((item, iIdx) => (
                <MovieCard key={item.detailPath || iIdx} item={item} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </Layout>
  );
}

export async function getServerSideProps({ res }) {
  try {
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    const movie = require('../lib/movie');
    const { homeCache, trendingCache } = require('../lib/cache');

    const cacheKey = 'home_sections_id';
    let homeData = homeCache.get(cacheKey);

    if (!homeData) {
      try {
        homeData = await movie.home('id');
        if (homeData && homeData.categories && homeData.categories.length > 0) {
          homeCache.set(cacheKey, homeData);
        }
      } catch (err) {
        console.warn('[Next.js Home Error]:', err.message);
        let trending = trendingCache.get('trending_1_30_id');
        if (!trending) {
          trending = await movie.trending(1, 30, 'id');
          trendingCache.set('trending_1_30_id', trending);
        }
        homeData = {
          heroItem: trending[0] || null,
          categories: [{ title: 'Trending Sekarang', items: trending }],
        };
      }
    }

    let heroItem = homeData?.heroItem || null;
    if (!heroItem && homeData?.categories?.[0]?.items?.[0]) {
      heroItem = homeData.categories[0].items[0];
    }

    return {
      props: {
        heroItem: heroItem || null,
        categories: homeData?.categories || [],
      },
    };
  } catch (err) {
    console.error('[getServerSideProps Home]:', err.message);
    return {
      props: {
        heroItem: null,
        categories: [],
      },
    };
  }
}
