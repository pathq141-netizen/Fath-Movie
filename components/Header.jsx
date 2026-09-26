import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getWatchlist } from '../lib/clientStorage';

export default function Header() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [navSearch, setNavSearch] = useState('');

  // Watchlist badge count updater
  useEffect(() => {
    function updateCount() {
      setWatchlistCount(getWatchlist().length);
    }
    updateCount();
    window.addEventListener('watchlist-updated', updateCount);
    return () => window.removeEventListener('watchlist-updated', updateCount);
  }, []);

  // Navbar scroll background effect
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut '/' to focus nav search
  useEffect(() => {
    function handleKeyDown(e) {
      const input = document.getElementById('navSearchInput');
      if (e.key === '/' && document.activeElement !== input && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        input?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.asPath]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const query = navSearch.trim();
    if (!query) return;

    let typeSlug = 'all';
    if (router.asPath.includes('/search/drama')) typeSlug = 'drama';
    else if (router.asPath.includes('/search/movie')) typeSlug = 'movie';
    else if (router.asPath.includes('/search/series')) typeSlug = 'series';

    router.push(`/search/${typeSlug}/${encodeURIComponent(query)}`);
  }

  const currentPath = router.asPath;
  const isHome = currentPath === '/';
  const isMovie = currentPath.startsWith('/search/movie');
  const isSeries = currentPath.startsWith('/search/series');
  const isDrama = currentPath.startsWith('/search/drama');
  const isWatchlist = currentPath.startsWith('/watchlist');

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-left">
        <Link href="/" className="brand-logo" title="FathMovie Beranda">
          <picture className="logo-picture">
            <source srcSet="/FathMovie.png" type="image/png" />
            <img src="/FathMovie.png" alt="FathMovie Logo" className="brand-logo-img glow-pulse" width="32" height="32" />
          </picture>
          <span>Fath<span className="logo-tag">Movie</span></span>
        </Link>

        <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`} id="navLinks">
          <li>
            <Link href="/" className={`nav-link ${isHome ? 'active' : ''}`}>
              <i className="fa-solid fa-house"></i> Beranda
            </Link>
          </li>
          <li>
            <Link href="/search/movie" className={`nav-link ${isMovie ? 'active' : ''}`}>
              <i className="fa-solid fa-film"></i> Film
            </Link>
          </li>
          <li>
            <Link href="/search/series" className={`nav-link ${isSeries ? 'active' : ''}`}>
              <i className="fa-solid fa-tv"></i> Series
            </Link>
          </li>
          <li>
            <Link href="/search/drama" className={`nav-link ${isDrama ? 'active' : ''}`}>
              <i className="fa-solid fa-clapperboard text-pink-400"></i> Drama Pendek
            </Link>
          </li>
          <li>
            <Link href="/watchlist" className={`nav-link ${isWatchlist ? 'active' : ''}`}>
              <i className="fa-solid fa-bookmark"></i> Watchlist
            </Link>
          </li>
        </ul>
      </div>

      <div className="nav-right">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%' }}>
            <input
              type="text"
              name="q"
              id="navSearchInput"
              placeholder="Cari film, series... [/]"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              autoComplete="off"
            />
          </form>
        </div>

        <Link href="/watchlist" className="watchlist-btn-badge" title="Daftar Tontonan">
          <i className="fa-solid fa-bookmark"></i>
          {watchlistCount > 0 && (
            <span className="badge-count">{watchlistCount}</span>
          )}
        </Link>

        <button
          className="menu-toggle"
          id="menuToggleBtn"
          aria-label="Toggle Menu"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </div>
    </header>
  );
}
