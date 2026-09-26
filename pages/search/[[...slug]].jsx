import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import MovieCard from '../../components/MovieCard';

const TYPE_SLUG_TO_ID = {
  movie: 1,
  film: 1,
  series: 2,
  serial: 2,
  tv: 2,
  drama: 7,
  dramapendek: 7,
  shortdrama: 7,
  all: 0,
  semua: 0,
};

const TYPE_ID_TO_SLUG = {
  1: 'movie',
  2: 'series',
  7: 'drama',
  0: 'all',
};

export default function SearchPage({ initialResults, query: initialQuery, currentType, currentSlug }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState(initialResults || []);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    setQuery(initialQuery || '');
    setResults(initialResults || []);
  }, [initialQuery, initialResults, currentSlug]);

  function handleInputChange(e) {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      const trimmed = val.trim();
      if (!trimmed) {
        window.history.replaceState(null, '', `/search/${currentSlug}`);
        setResults(initialResults);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&type=${currentType}`);
        const data = await res.json();
        setResults(data.data || []);
        window.history.replaceState(null, '', `/search/${currentSlug}/${encodeURIComponent(trimmed)}`);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search/${currentSlug}/${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/search/${currentSlug}`);
    }
  }

  const pageTitle = query
    ? `Hasil Pencarian "${query}" — FathMovie`
    : 'Pencarian Film & Series — FathMovie';

  return (
    <Layout
      pageTitle={pageTitle}
      metaDescription={
        query
          ? `Nonton film & series terkait "${query}" dengan subtitle Indonesia di FathMovie.`
          : 'Cari ribuan film & series sub Indo kualitas HD.'
      }
    >
      <main className="search-page-container">
        {/* Search Header Bar */}
        <div className="search-header-bar">
          <form onSubmit={handleFormSubmit} className="search-input-large-wrap">
            <i className="fa-solid fa-magnifying-glass search-icon-lg"></i>
            <input
              type="text"
              id="mainSearchInput"
              className="search-input-large"
              placeholder="Ketik judul film atau serial (contoh: Avatar, Spider-Man, John Wick, Istri)..."
              value={query}
              onChange={handleInputChange}
              autoComplete="off"
              autoFocus
            />
            {query && (
              <Link
                href={`/search/${currentSlug}`}
                className="search-clear-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Hapus kata kunci"
                onClick={() => setQuery('')}
              >
                <i className="fa-solid fa-xmark"></i>
              </Link>
            )}
          </form>

          {/* Filter Pills */}
          <div className="filter-pills">
            <Link
              href={`/search/all${query ? '/' + encodeURIComponent(query) : ''}`}
              className={`filter-pill ${currentSlug === 'all' ? 'active' : ''}`}
            >
              Semua Kategori
            </Link>
            <Link
              href={`/search/movie${query ? '/' + encodeURIComponent(query) : ''}`}
              className={`filter-pill ${currentSlug === 'movie' ? 'active' : ''}`}
            >
              <i className="fa-solid fa-film"></i> Film (Movie)
            </Link>
            <Link
              href={`/search/series${query ? '/' + encodeURIComponent(query) : ''}`}
              className={`filter-pill ${currentSlug === 'series' ? 'active' : ''}`}
            >
              <i className="fa-solid fa-tv"></i> Serial TV (Series)
            </Link>
            <Link
              href={`/search/drama${query ? '/' + encodeURIComponent(query) : ''}`}
              className={`filter-pill ${currentSlug === 'drama' ? 'active' : ''}`}
            >
              <i className="fa-solid fa-clapperboard text-pink-400"></i> Drama Pendek
            </Link>
          </div>

          {/* Result Stat Text */}
          <div className="text-sm text-slate-400 font-medium" style={{ minHeight: '20px' }}>
            {loading ? (
              <span>
                <i className="fa-solid fa-spinner fa-spin text-red-500"></i> Sedang mencari konten...
              </span>
            ) : query ? (
              results && results.length > 0 ? (
                <>
                  Menemukan <strong>{results.length}</strong> hasil pencarian untuk "
                  <strong>{query}</strong>":
                </>
              ) : (
                <>
                  Tidak ada hasil ditemukan untuk "<strong>{query}</strong>".
                </>
              )
            ) : (
              'Menampilkan rekomendasi populer:'
            )}
          </div>
        </div>

        {/* Results Grid */}
        <div className="responsive-grid" id="searchResultsContainer">
          {results && results.length > 0 ? (
            results.map((item, idx) => (
              <MovieCard key={item.detailPath || idx} item={item} />
            ))
          ) : query && !loading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                <i className="fa-solid fa-film"></i>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Tidak Ada Hasil Ditemukan
              </h3>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '400px',
                  margin: '0 auto',
                }}
              >
                Coba periksa kembali ejaan judul film, gunakan kata kunci yang lebih ringkas, atau pilih kategori lain.
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { params, query: qObj, res } = context;
  res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');

  const movie = require('../../lib/movie');
  const { searchCache, trendingCache, homeCache } = require('../../lib/cache');

  const slugParts = params?.slug || [];
  let rawType = (slugParts[0] || '').toLowerCase();
  let query = (slugParts[1] || qObj.q || '').trim();
  let typeId = 0;

  if (rawType && TYPE_SLUG_TO_ID.hasOwnProperty(rawType)) {
    typeId = TYPE_SLUG_TO_ID[rawType];
  } else if (rawType) {
    query = rawType;
    typeId = 0;
    rawType = 'all';
  } else {
    typeId = parseInt(qObj.type, 10) || 0;
    rawType = TYPE_ID_TO_SLUG[typeId] || 'all';
  }

  const currentSlug = TYPE_ID_TO_SLUG[typeId] || 'all';

  let results = [];
  try {
    if (query) {
      const cacheKey = `search_${query.toLowerCase()}_1_30_${typeId}_id`;
      let cached = searchCache.get(cacheKey);
      if (!cached) {
        cached = await movie.search(query, 1, 30, typeId, 'id');
        if (cached && cached.length > 0) {
          searchCache.set(cacheKey, cached);
        }
      }
      results = cached || [];
    } else {
      if (typeId === 7) {
        // Short dramas recommendations
        let homeData = homeCache.get('home_sections_id');
        if (!homeData) {
          homeData = await movie.home('id');
          homeCache.set('home_sections_id', homeData);
        }
        const shortDramas = [];
        const seen = new Set();
        (homeData?.categories || []).forEach((c) => {
          c.items?.forEach((item) => {
            if ((item.subjectType === 7 || item.typeLabel === 'Short Drama') && !seen.has(item.subjectId)) {
              seen.add(item.subjectId);
              shortDramas.push(item);
            }
          });
        });
        results = shortDramas;
      } else {
        let trending = trendingCache.get('trending_1_30_id');
        if (!trending) {
          trending = await movie.trending(1, 30, 'id');
          trendingCache.set('trending_1_30_id', trending);
        }
        results = trending || [];
        if (typeId === 1) results = results.filter((i) => i.typeLabel === 'Movie' || i.subjectType === 1);
        if (typeId === 2) results = results.filter((i) => i.typeLabel === 'Series' || i.subjectType === 2);
      }
    }
  } catch (err) {
    console.error('[Search SSR Error]:', err.message);
    results = [];
  }

  return {
    props: {
      initialResults: results,
      query,
      currentType: typeId,
      currentSlug,
    },
  };
}
