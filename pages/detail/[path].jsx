import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import TrailerModal from '../../components/TrailerModal';
import { isWatchlisted, toggleWatchlist } from '../../lib/clientStorage';

export default function DetailPage({ detail }) {
  const router = useRouter();
  const [activeSeasonIdx, setActiveSeasonIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const subType = Number(detail?.subjectType) || 1;
  const isShortDrama = subType === 7 || detail?.typeLabel === 'Short Drama';
  const isSeries = subType === 2 || detail?.typeLabel === 'Series';
  const isEpisodic = isSeries || isShortDrama;
  const bgImg = detail?.coverUrl || '';
  const seasons = detail?.resource?.seasons || [];

  useEffect(() => {
    if (detail?.detailPath) {
      setSaved(isWatchlisted(detail.detailPath));
    }
    function updateWatchlistState() {
      if (detail?.detailPath) {
        setSaved(isWatchlisted(detail.detailPath));
      }
    }
    window.addEventListener('watchlist-updated', updateWatchlistState);
    return () => window.removeEventListener('watchlist-updated', updateWatchlistState);
  }, [detail?.detailPath]);

  function handleWatchlistToggle() {
    if (!detail) return;
    const added = toggleWatchlist({
      detailPath: detail.detailPath,
      subjectId: detail.subjectId,
      title: detail.title,
      coverUrl: detail.coverUrl,
      typeLabel: isShortDrama ? 'Short Drama' : (isSeries ? 'Series' : 'Movie'),
      imdbRating: detail.imdbRating,
      year: detail.year,
    });
    setSaved(added);
  }

  let directPlayUrl = `/play/${encodeURIComponent(detail?.detailPath || '')}`;
  if (isEpisodic && seasons.length > 0) {
    const s1 = seasons[0];
    const ep1 = s1.allEpisodes?.[0] || 1;
    directPlayUrl = `/play/${encodeURIComponent(detail?.detailPath || '')}/${ep1}/${s1.seasonNumber || 1}`;
  }

  const metaDesc = detail?.description
    ? detail.description.slice(0, 160) + '...'
    : `Nonton ${detail?.title} subtitle Indonesia gratis di FathMovie.`;

  return (
    <Layout
      pageTitle={`${detail?.title} — Streaming FathMovie`}
      metaDescription={metaDesc}
      ogImage={detail?.coverUrl}
      ogType={isEpisodic ? 'video.tv_show' : 'video.movie'}
    >
      {/* Detail Header Backdrop */}
      <section
        className="detail-header-backdrop"
        style={{ backgroundImage: `url('${bgImg}')` }}
      >
        <div className="detail-backdrop-overlay"></div>

        <div className="detail-content-wrap">
          {/* Left: Poster Card & CTA */}
          <div className="detail-poster-col">
            <div className="detail-poster-card">
              <img src={detail?.coverUrl || '/placeholder.jpg'} alt={detail?.title} />
              <div className="detail-poster-actions">
                <Link href={directPlayUrl} className="btn btn-primary" style={{ width: '100%' }}>
                  <i className="fa-solid fa-play"></i> Putar Sekarang
                </Link>

                <button
                  className={`btn btn-secondary ${saved ? 'btn-watchlist-active' : ''}`}
                  style={{ width: '100%' }}
                  onClick={handleWatchlistToggle}
                >
                  <i className={`fa-solid ${saved ? 'fa-check text-red-500' : 'fa-plus'}`}></i>{' '}
                  <span className="btn-text">{saved ? 'Tersimpan' : 'Watchlist'}</span>
                </button>

                {detail?.trailer && (detail.trailer.proxyUrl || detail.trailer.url) && (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => setTrailerOpen(true)}
                  >
                    <i className="fa-solid fa-film"></i> Tonton Trailer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Metadata & Synopsis */}
          <div className="detail-info-col">
            <div className="hero-badge-row">
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
                <span>{detail?.imdbRating || '8.0'}</span>
                {detail?.imdbRatingCount && (
                  <span style={{ fontWeight: 'normal', opacity: 0.8, fontSize: '0.65rem' }}>
                    ({Number(detail.imdbRatingCount).toLocaleString()} votes)
                  </span>
                )}
              </span>
              <span className="badge badge-quality">Full HD 1080p</span>
              <span className="badge badge-meta">
                {detail?.year ||
                  (detail?.releaseDate ? detail.releaseDate.split('-')[0] : '2024')}
              </span>
              <span className="badge badge-meta">
                {isEpisodic ? (
                  <>
                    <i className="fa-solid fa-list-ol"></i>{' '}
                    {detail?.totalEpisodes
                      ? `${detail.totalEpisodes} Episode`
                      : isShortDrama
                      ? 'Drama Pendek'
                      : 'Series'}
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-clock"></i>{' '}
                    {detail?.durationFormatted || 'Film'}
                  </>
                )}
              </span>
              {detail?.countryName && (
                <span className="badge badge-meta">{detail.countryName}</span>
              )}
            </div>

            <h1 className="detail-title">{detail?.title}</h1>

            {detail?.genre && detail.genre.length > 0 && (
              <div className="hero-genres">
                {detail.genre.map((g, idx) => (
                  <span key={idx} className="genre-chip">
                    {g}
                  </span>
                ))}
              </div>
            )}

            <div>
              <h3 className="detail-synopsis-title">Sinopsis</h3>
              <p className="detail-synopsis-text">
                {detail?.description || 'Sinopsis belum tersedia.'}
              </p>
            </div>

            {/* Audio / Dubbing Options */}
            {detail?.dubs && detail.dubs.length > 0 && (
              <div className="detail-dubs-box">
                <div className="dubs-title">
                  <i className="fa-solid fa-language"></i> Audio / Dubbing Tersedia:
                </div>
                <div className="dubs-list">
                  {detail.dubs.map((d, dIdx) => {
                    const isCurrent = d.detailPath === detail.detailPath;
                    return (
                      <Link
                        key={dIdx}
                        href={`/detail/${encodeURIComponent(d.detailPath)}`}
                        className={`dub-pill ${isCurrent ? 'active' : ''}`}
                      >
                        {d.language} {d.isOriginal ? '(Original)' : ''}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subtitles list info */}
            {detail?.subtitles && detail.subtitles.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-closed-captioning"></i> Subtitle:{' '}
                <span className="text-slate-300">
                  {detail.subtitles.slice(0, 8).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Seasons & Episodes Section */}
      {isEpisodic && seasons.length > 0 && (
        <section className="seasons-section">
          <div className="section-header">
            <div className="section-title-wrap">
              <div className="section-title-bar"></div>
              <h2 className="section-title">
                {isShortDrama ? 'Daftar Episode Drama Pendek' : 'Daftar Episode'}
              </h2>
            </div>
          </div>

          {/* Season Tabs */}
          {seasons.length > 1 && (
            <div className="season-tabs" id="seasonTabs">
              {seasons.map((s, idx) => (
                <button
                  key={idx}
                  className={`season-tab ${activeSeasonIdx === idx ? 'active' : ''}`}
                  onClick={() => setActiveSeasonIdx(idx)}
                >
                  {isShortDrama ? `Part ${idx + 1}` : `Season ${s.seasonNumber || idx + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Episodes Grid for active season */}
          {seasons[activeSeasonIdx] && (
            <div className="episodes-grid">
              {(seasons[activeSeasonIdx].allEpisodes || [1]).map((epNum) => (
                <Link
                  key={epNum}
                  href={`/play/${encodeURIComponent(detail.detailPath)}/${epNum}/${seasons[activeSeasonIdx].seasonNumber || 1}`}
                  className="episode-card"
                >
                  <div className="episode-number">{epNum}</div>
                  <div className="episode-label">Episode {epNum}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        trailerUrl={detail?.trailer?.proxyUrl || detail?.trailer?.url}
        title={detail?.title}
      />
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { params, res } = context;
  res.setHeader('Cache-Control', 'public, max-age=180, stale-while-revalidate=600');

  const movie = require('../../lib/movie');
  const { detailCache } = require('../../lib/cache');

  const detailPath = params?.path;
  if (!detailPath) {
    return { redirect: { destination: '/', permanent: false } };
  }

  try {
    const cacheKey = `detail_${detailPath}_id`;
    let detail = detailCache.get(cacheKey);

    if (!detail) {
      detail = await movie.detail(detailPath, 'id');
      if (detail && detail.title) {
        detailCache.set(cacheKey, detail);
      }
    }

    if (!detail) {
      return { notFound: true };
    }

    return {
      props: {
        detail,
      },
    };
  } catch (err) {
    console.error('[Detail SSR Error]:', err.message);
    return { notFound: true };
  }
}
