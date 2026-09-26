import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { isWatchlisted, toggleWatchlist, saveHistory, getHistory } from '../../lib/clientStorage';

export const config = {
  regions: ['sin1'],
};

export default function PlayerPage({ stream, detail, episode: initialEp, season: initialSe }) {
  const router = useRouter();
  const videoRef = useRef(null);

  const subType = Number(stream?.subjectType || detail?.subjectType) || (stream?.isMovie ? 1 : 2);
  const isShortDrama = subType === 7 || stream?.typeLabel === 'Short Drama' || detail?.typeLabel === 'Short Drama';
  const isSeries = !stream?.isMovie || isShortDrama || subType === 2;

  // Streams selection
  const streamList = stream?.streams || [];
  const defaultStream =
    streamList.find((s) => s.resolution === 720) ||
    streamList.find((s) => s.resolution === 1080) ||
    streamList[0] ||
    null;

  const [currentQuality, setCurrentQuality] = useState(defaultStream?.quality || '');
  const [currentSrc, setCurrentSrc] = useState(defaultStream?.url || '');
  const [saved, setSaved] = useState(false);

  // Subtitles
  const subtitles = stream?.subtitles || [];
  const idSub = subtitles.find(
    (s) => s.languageCode?.toLowerCase() === 'id' || s.languageName?.toLowerCase().includes('indonesia')
  );
  const [selectedSubId, setSelectedSubId] = useState(idSub?.id || 'none');

  // Episodes calculation
  const seasons = detail?.resource?.seasons || [];
  const currentSeasonObj = seasons.find((s) => s.seasonNumber === initialSe) || seasons[0];
  const allEpisodes = currentSeasonObj?.allEpisodes || [initialEp || 1];
  const curIdx = allEpisodes.indexOf(initialEp);
  const prevEp = curIdx > 0 ? allEpisodes[curIdx - 1] : null;
  const nextEp = curIdx < allEpisodes.length - 1 ? allEpisodes[curIdx + 1] : null;

  // Sync Watchlist
  useEffect(() => {
    if (stream?.detailPath) {
      setSaved(isWatchlisted(stream.detailPath));
    }
    function updateWatchlistState() {
      if (stream?.detailPath) {
        setSaved(isWatchlisted(stream.detailPath));
      }
    }
    window.addEventListener('watchlist-updated', updateWatchlistState);
    return () => window.removeEventListener('watchlist-updated', updateWatchlistState);
  }, [stream?.detailPath]);

  function handleWatchlistToggle() {
    if (!stream) return;
    const added = toggleWatchlist({
      detailPath: stream.detailPath,
      subjectId: stream.subjectId,
      title: stream.title,
      coverUrl: detail?.coverUrl || '',
      typeLabel: isShortDrama ? 'Short Drama' : isSeries ? 'Series' : 'Movie',
      imdbRating: detail?.imdbRating || '8.0',
      year: detail?.year || '2024',
    });
    setSaved(added);
  }

  // Resume playback from history
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream?.detailPath) return;

    const history = getHistory();
    const existing = history.find((h) => h.detailPath === stream.detailPath);

    if (existing && existing.currentTime > 5 && existing.percent < 95) {
      const handleLoaded = () => {
        try {
          video.currentTime = existing.currentTime;
        } catch {}
      };
      video.addEventListener('loadedmetadata', handleLoaded, { once: true });
    }
  }, [stream?.detailPath, currentSrc]);

  // Track playback time and save progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream?.detailPath) return;

    let lastSave = 0;
    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastSave > 4000) {
        lastSave = now;
        saveHistory({
          detailPath: stream.detailPath,
          subjectId: stream.subjectId,
          title: stream.title,
          coverUrl: detail?.coverUrl || '',
          isMovie: !isSeries,
          season: initialSe,
          episode: initialEp,
          currentTime: video.currentTime,
          duration: video.duration || 0,
        });
      }
    };

    const handleEnded = () => {
      if (nextEp) {
        router.push(
          `/play/${encodeURIComponent(stream.detailPath)}/${nextEp}/${initialSe}`
        );
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [stream?.detailPath, initialSe, initialEp, nextEp, detail?.coverUrl, isSeries, router]);

  // Switch Quality without losing playback time
  function switchResolution(quality, url) {
    const video = videoRef.current;
    const currentTime = video ? video.currentTime : 0;
    const isPaused = video ? video.paused : false;

    setCurrentQuality(quality);
    setCurrentSrc(url);

    if (video) {
      video.src = url;
      video.load();
      video.currentTime = currentTime;
      if (!isPaused) {
        video.play().catch(() => {});
      }
    }
  }

  const pageTitle = isSeries
    ? `Nonton ${stream?.title} ${isShortDrama ? `Ep ${initialEp}` : `S${initialSe} E${initialEp}`} — FathMovie`
    : `Nonton ${stream?.title} Sub Indo — FathMovie`;

  return (
    <Layout
      pageTitle={pageTitle}
      metaDescription={`Nonton streaming ${stream?.title} kualitas ${defaultStream?.quality || 'HD'} subtitle Indonesia di FathMovie.`}
      ogImage={detail?.coverUrl}
      hideNavbar={true}
    >
      <main className={`player-page-container ${isShortDrama ? 'is-shortdrama' : ''}`}>
        {/* Top Navigation Bar */}
        <div className="player-top-bar">
          <Link href={`/detail/${encodeURIComponent(stream?.detailPath || '')}`} className="player-back-btn">
            <i className="fa-solid fa-arrow-left"></i>
            <span className="back-text">Kembali</span>
          </Link>

          <div className="player-title-info">
            <h1 className="player-main-title">{stream?.title}</h1>
            <p className="player-sub-title">
              {isShortDrama
                ? `Drama Pendek • Episode ${initialEp}`
                : isSeries
                ? `Season ${initialSe} • Episode ${initialEp}`
                : 'Film Layar Lebar'}
            </p>
          </div>

          <div>
            <button
              className={`btn btn-secondary player-watchlist-btn ${saved ? 'btn-watchlist-active' : ''}`}
              onClick={handleWatchlistToggle}
            >
              <i className={`fa-solid ${saved ? 'fa-check text-red-500' : 'fa-bookmark'}`}></i>{' '}
              <span className="btn-text">{saved ? 'Tersimpan' : 'Watchlist'}</span>
            </button>
          </div>
        </div>

        {/* Short Drama Layout vs Standard Widescreen Layout */}
        {isShortDrama ? (
          <div className="shortdrama-player-layout">
            {/* Left Column: Portrait 9:16 Video Player */}
            <div className="shortdrama-player-col">
              <div className="native-player-container portrait-player">
                {!defaultStream ? (
                  <div className="player-empty-state">
                    <div className="player-empty-icon">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h3 className="player-empty-title">
                      Episode {initialEp} Belum Tersedia
                    </h3>
                    <p className="player-empty-desc">
                      Sumber streaming video untuk episode ini saat ini belum dirilis dari server provider. Silakan pilih episode berikutnya di bawah.
                    </p>
                    {nextEp && (
                      <Link
                        href={`/play/${encodeURIComponent(stream.detailPath)}/${nextEp}/${initialSe}`}
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.5rem' }}
                      >
                        <span>Tonton Episode {nextEp}</span>
                        <i className="fa-solid fa-arrow-right"></i>
                      </Link>
                    )}
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    id="mainVideo"
                    className="native-video"
                    controls
                    playsInline
                    preload="metadata"
                    referrerPolicy="no-referrer"
                    src={currentSrc}
                  >
                    {subtitles.map((sub, idx) => (
                      <track
                        key={idx}
                        kind="subtitles"
                        label={sub.languageName}
                        srcLang={sub.languageCode}
                        src={sub.vttUrl}
                        default={sub.id === idSub?.id}
                      />
                    ))}
                  </video>
                )}
              </div>

              {/* Quick Next/Prev for Short Drama */}
              <div className="portrait-quick-nav">
                {prevEp && (
                  <Link
                    href={`/play/${encodeURIComponent(stream.detailPath)}/${prevEp}/${initialSe}`}
                    className="btn btn-secondary ep-nav-btn"
                  >
                    <i className="fa-solid fa-chevron-left"></i> Ep {prevEp}
                  </Link>
                )}
                <span className="portrait-ep-indicator">
                  Episode {initialEp} / {allEpisodes.length}
                </span>
                {nextEp && (
                  <Link
                    href={`/play/${encodeURIComponent(stream.detailPath)}/${nextEp}/${initialSe}`}
                    className="btn btn-primary ep-nav-btn"
                  >
                    Ep {nextEp} <i className="fa-solid fa-chevron-right"></i>
                  </Link>
                )}
              </div>

              {/* Quality Pills for Short Drama */}
              {streamList.length > 0 && (
                <div className="stream-toolbar-card portrait-toolbar">
                  <div className="stream-toolbar-section">
                    <div className="toolbar-label">
                      <i className="fa-solid fa-sliders text-pink-500"></i>
                      <span>Pilihan Kualitas:</span>
                    </div>
                    <div className="quality-pills-wrap">
                      {streamList.map((s, idx) => {
                        const isCurrent = (currentQuality ? s.quality === currentQuality : idx === 0);
                        const streamUrl = s.url;
                        return (
                          <button
                            key={idx}
                            className={`quality-pill ${isCurrent ? 'active' : ''}`}
                            onClick={() => switchResolution(s.quality, streamUrl)}
                          >
                            <i className="fa-solid fa-circle-play"></i>
                            <span>{s.quality}</span>
                            {s.sizeFormatted && <small className="pill-size">{s.sizeFormatted}</small>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Episodes Grid Panel */}
            <div className="shortdrama-episodes-panel">
              <div className="series-nav-header">
                <div className="series-nav-title">
                  <i className="fa-solid fa-list text-pink-400"></i>
                  <span>Daftar Episode ({allEpisodes.length})</span>
                </div>
                <div className="series-nav-sub">Klik episode untuk langsung memutar</div>
              </div>

              <div className="series-ep-grid portrait-ep-grid">
                {allEpisodes.map((epNum) => {
                  const isCurrent = epNum === initialEp;
                  return (
                    <Link
                      key={epNum}
                      href={`/play/${encodeURIComponent(stream.detailPath)}/${epNum}/${initialSe}`}
                      className={`ep-badge-btn ${isCurrent ? 'current' : ''}`}
                    >
                      <span className="ep-badge-num">{epNum}</span>
                      <span className="ep-badge-lbl">Ep</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD 16:9 WIDESCREEN PLAYER FOR MOVIES & SERIES */
          <div className="standard-player-layout">
            <div className="native-player-container widescreen-player">
              {!defaultStream ? (
                <div className="player-empty-state">
                  <div className="player-empty-icon">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <h3 className="player-empty-title">Stream Belum Tersedia</h3>
                  <p className="player-empty-desc">
                    Sumber streaming video untuk konten ini sedang dalam antrean encoding. Silakan coba kembali sesaat lagi.
                  </p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  id="mainVideo"
                  className="native-video"
                  controls
                  playsInline
                  preload="metadata"
                  referrerPolicy="no-referrer"
                  src={currentSrc}
                >
                  {subtitles.map((sub, idx) => (
                    <track
                      key={idx}
                      kind="subtitles"
                      label={sub.languageName}
                      srcLang={sub.languageCode}
                      src={sub.vttUrl}
                      default={sub.id === idSub?.id}
                    />
                  ))}
                </video>
              )}
            </div>

            {/* Toolbar for Quality & Subtitles */}
            <div className="stream-toolbar-card">
              {streamList.length > 0 && (
                <div className="stream-toolbar-section">
                  <div className="toolbar-label">
                    <i className="fa-solid fa-sliders text-red-500"></i>
                    <span>Kualitas Video:</span>
                  </div>
                  <div className="quality-pills-wrap">
                    {streamList.map((s, idx) => {
                      const isCurrent = (currentQuality ? s.quality === currentQuality : idx === 0);
                      const streamUrl = s.url;
                      return (
                        <button
                          key={idx}
                          className={`quality-pill ${isCurrent ? 'active' : ''}`}
                          onClick={() => switchResolution(s.quality, streamUrl)}
                        >
                          <i className="fa-solid fa-circle-play"></i>
                          <span>{s.quality}</span>
                          {s.sizeFormatted && <small className="pill-size">{s.sizeFormatted}</small>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {subtitles.length > 0 && (
                <div className="stream-toolbar-section" style={{ marginTop: '1rem' }}>
                  <div className="toolbar-label">
                    <i className="fa-solid fa-closed-captioning text-amber-400"></i>
                    <span>Pilihan Subtitle:</span>
                  </div>
                  <div className="sub-pills-wrap">
                    {subtitles.map((sub, idx) => (
                      <span key={idx} className="sub-pill active">
                        {sub.languageName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Episodes Panel for Series */}
            {isSeries && allEpisodes.length > 1 && (
              <div className="series-nav-panel">
                <div className="series-nav-header">
                  <div className="series-nav-title">
                    <i className="fa-solid fa-layer-group text-red-500"></i>
                    <span>Daftar Episode Season {initialSe}</span>
                  </div>
                  <div className="series-nav-sub">Pilih episode untuk melanjutkan</div>
                </div>
                <div className="series-ep-grid">
                  {allEpisodes.map((epNum) => {
                    const isCurrent = epNum === initialEp;
                    return (
                      <Link
                        key={epNum}
                        href={`/play/${encodeURIComponent(stream.detailPath)}/${epNum}/${initialSe}`}
                        className={`ep-badge-btn ${isCurrent ? 'current' : ''}`}
                      >
                        <span className="ep-badge-num">{epNum}</span>
                        <span className="ep-badge-lbl">Episode</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { params, query: qObj } = context;

  const movie = require('../../lib/movie');
  const { detailCache } = require('../../lib/cache');

  const slugParts = params?.slug || [];
  const slug = slugParts[0] || qObj.path || qObj.slug;

  if (!slug) {
    return { redirect: { destination: '/', permanent: false } };
  }

  const subjectId = qObj.id || qObj.subjectId || '';
  const episode = parseInt(slugParts[1] || qObj.ep || qObj.episode || '1', 10);
  const season = parseInt(slugParts[2] || qObj.se || qObj.season || '1', 10);

  try {
    const [streamResult, detailResult] = await Promise.allSettled([
      movie.stream(slug, subjectId, season, episode, 'id'),
      (async () => {
        const cacheKey = `detail_${slug}_id`;
        let cached = detailCache.get(cacheKey);
        if (!cached) {
          cached = await movie.detail(slug, 'id');
          if (cached && cached.title) detailCache.set(cacheKey, cached);
        }
        return cached;
      })(),
    ]);

    const stream = streamResult.status === 'fulfilled' ? streamResult.value : null;
    const detail = detailResult.status === 'fulfilled' ? detailResult.value : null;

    if (!detail && (!stream || !stream.streams || stream.streams.length === 0)) {
      return { notFound: true };
    }

    const safeStream = stream?.streams
      ? stream
      : {
          subjectId: detail?.subjectId || subjectId,
          detailPath: slug,
          title: detail?.title || slug,
          isMovie: detail ? detail.subjectType === 1 : true,
          season,
          episode,
          streams: [],
          subtitles: [],
          hasResource: false,
        };

    return {
      props: {
        stream: safeStream,
        detail: detail || null,
        episode,
        season,
      },
    };
  } catch (err) {
    console.error('[Player SSR Error]:', err.message);
    return { notFound: true };
  }
}
