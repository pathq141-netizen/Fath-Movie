import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { isWatchlisted, toggleWatchlist } from '../lib/clientStorage';

const fallbackImg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23171722'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='14'%3ENo Poster%3C/text%3E%3C/svg%3E";

export default function MovieCard({ item }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [imgSrc, setImgSrc] = useState(item?.coverUrl || fallbackImg);

  const subType = Number(item?.subjectType) || 1;
  const isShortDrama = subType === 7 || item?.typeLabel === 'Short Drama';
  const isSeries = subType === 2 || item?.typeLabel === 'Series';
  const isEpisodic = isSeries || isShortDrama;

  let badgeClass = 'badge-type-movie';
  let badgeLabel = 'Movie';
  let metaInfo = (item?.durationFormatted && item?.durationFormatted !== '0 mnt') ? item.durationFormatted : 'Film';

  if (isShortDrama) {
    badgeClass = 'badge-type-shortdrama';
    badgeLabel = 'Short Drama';
    metaInfo = item?.totalEpisodes ? `${item.totalEpisodes} Episode` : (item?.episodeCount ? `${item.episodeCount} Episode` : 'Drama Pendek');
  } else if (isSeries) {
    badgeClass = 'badge-type-series';
    badgeLabel = 'Series';
    metaInfo = item?.totalEpisodes ? `${item.totalEpisodes} Episode` : (item?.episodeCount ? `${item.episodeCount} Episode` : 'Series');
  }

  const detailUrl = `/detail/${encodeURIComponent(item?.detailPath || '')}`;
  const playUrl = isEpisodic
    ? `/play/${encodeURIComponent(item?.detailPath || '')}/1/1`
    : `/play/${encodeURIComponent(item?.detailPath || '')}`;

  useEffect(() => {
    if (item?.detailPath) {
      setSaved(isWatchlisted(item.detailPath));
    }
  }, [item?.detailPath]);

  useEffect(() => {
    function handleUpdate(e) {
      if (e.detail?.path === item?.detailPath) {
        setSaved(Boolean(e.detail?.added));
      } else {
        setSaved(isWatchlisted(item?.detailPath));
      }
    }
    window.addEventListener('watchlist-updated', handleUpdate);
    return () => window.removeEventListener('watchlist-updated', handleUpdate);
  }, [item?.detailPath]);

  function handleWatchlistToggle(e) {
    e.stopPropagation();
    const added = toggleWatchlist({
      detailPath: item.detailPath,
      subjectId: item.subjectId,
      title: item.title,
      coverUrl: item.coverUrl,
      typeLabel: badgeLabel,
      imdbRating: item.imdbRating,
      year: item.year || (item.releaseDate ? item.releaseDate.split('-')[0] : ''),
    });
    setSaved(added);
  }

  function handleCardClick() {
    router.push(detailUrl);
  }

  function handlePlayClick(e) {
    e.stopPropagation();
    router.push(playUrl);
  }

  const yearDisplay = item?.year || (item?.releaseDate ? item.releaseDate.split('-')[0] : '') || '2024';

  return (
    <div className="card-poster" onClick={handleCardClick}>
      <div className="card-image-wrap">
        <img
          src={imgSrc}
          alt={item?.title || 'Movie'}
          loading="lazy"
          decoding="async"
          onError={() => setImgSrc(fallbackImg)}
        />

        <div className="card-badge-top">
          <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
        </div>

        {/* Quick Bookmark Watchlist Button */}
        <button
          className={`card-quick-watchlist ${saved ? 'active' : ''}`}
          onClick={handleWatchlistToggle}
          title={saved ? 'Hapus dari Watchlist' : 'Tambah ke Watchlist'}
        >
          <i className={saved ? 'fa-solid text-red-500 fa-bookmark' : 'fa-regular fa-bookmark'}></i>
        </button>

        {item?.imdbRating && item.imdbRating !== '0.0' && (
          <div className="card-rating-badge">
            <i className="fa-solid fa-star"></i>
            <span>{item.imdbRating}</span>
          </div>
        )}

        <div className="card-overlay-hover">
          <div className="card-hover-play" onClick={handlePlayClick} title="Putar Langsung">
            <i className="fa-solid fa-play"></i>
          </div>
        </div>
      </div>

      <div className="card-info">
        <h3 className="card-title" title={item?.title}>
          {item?.title}
        </h3>
        <div className="card-meta">
          <span>{yearDisplay}</span>
          <span>{metaInfo}</span>
        </div>
      </div>
    </div>
  );
}
