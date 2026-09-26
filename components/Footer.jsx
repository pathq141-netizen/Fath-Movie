import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getWatchlist } from '../lib/clientStorage';

export default function Footer() {
  const router = useRouter();
  const [watchlistCount, setWatchlistCount] = useState(0);

  useEffect(() => {
    function updateCount() {
      setWatchlistCount(getWatchlist().length);
    }
    updateCount();
    window.addEventListener('watchlist-updated', updateCount);
    return () => window.removeEventListener('watchlist-updated', updateCount);
  }, []);

  const currentPath = router.asPath;
  const isHome = currentPath === '/';
  const isSearch = currentPath.startsWith('/search');
  const isWatchlist = currentPath.startsWith('/watchlist');

  return (
    <>
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="brand-logo" style={{ fontSize: '1.15rem' }}>
              <picture className="logo-picture">
                <source srcSet="/FathMovie.png" type="image/png" />
                <img
                  src="/FathMovie.png"
                  alt="FathMovie Logo"
                  className="brand-logo-img"
                  width="26"
                  height="26"
                  style={{ width: '26px', height: '26px', borderRadius: '6px' }}
                />
              </picture>
              <span>Movie<span className="logo-tag">Nas</span></span>
            </div>
            <p className="text-xs text-slate-400">
              Platform streaming movie &amp; series modern dengan Next.js Server-Side Rendering (SSR).
            </p>
          </div>
          <div className="footer-bottom">
            <p>© 2026 FathMovie. Dipersembahkan untuk kenyamanan streaming Anda.</p>
            <p className="text-xs text-slate-500">
              Powered by Next.js 14, React &amp; FathMovie Engine.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating 3D Bottom Navigation Dock for Mobile */}
      <nav className="bottom-nav-dock" id="bottomNavDock" aria-label="Navigasi Bawah">
        <div className="bottom-nav-inner">
          <Link
            href="/"
            className={`bottom-nav-item ${isHome ? 'active' : ''}`}
            title="Beranda"
          >
            <div className="bottom-nav-icon">
              <i className="fa-solid fa-house"></i>
            </div>
            <span className="bottom-nav-label">Beranda</span>
          </Link>

          <Link
            href="/search/all"
            className={`bottom-nav-item ${isSearch ? 'active' : ''}`}
            title="Pencarian"
          >
            <div className="bottom-nav-icon">
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
            <span className="bottom-nav-label">Cari</span>
          </Link>

          <Link
            href="/watchlist"
            className={`bottom-nav-item ${isWatchlist ? 'active' : ''}`}
            title="Watchlist Saya"
          >
            <div className="bottom-nav-icon">
              <i className="fa-solid fa-bookmark"></i>
              {watchlistCount > 0 && (
                <span className="badge-count bottom-nav-badge">{watchlistCount}</span>
              )}
            </div>
            <span className="bottom-nav-label">Watchlist</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
