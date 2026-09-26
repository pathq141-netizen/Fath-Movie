import React, { useEffect, useState } from 'react';
import Router from 'next/router';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    Router.events.on('routeChangeStart', handleStart);
    Router.events.on('routeChangeComplete', handleComplete);
    Router.events.on('routeChangeError', handleComplete);

    return () => {
      Router.events.off('routeChangeStart', handleStart);
      Router.events.off('routeChangeComplete', handleComplete);
      Router.events.off('routeChangeError', handleComplete);
    };
  }, []);

  return (
    <>
      <div
        className="top-progress-bar"
        style={{
          width: loading ? '75%' : '0%',
          opacity: loading ? 1 : 0,
          transition: loading ? 'width 0.3s ease' : 'opacity 0.2s ease, width 0s 0.2s',
        }}
      />
      <Component {...pageProps} />
    </>
  );
}
