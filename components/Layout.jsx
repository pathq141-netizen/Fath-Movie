import React from 'react';
import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';
import Toast from './Toast';

export default function Layout({
  children,
  pageTitle = 'FathMovie — Nonton Film & Series Subtitle Indonesia Gratis',
  metaDescription = 'Streaming film & series kualitas 360p-1080p dengan subtitle Indonesia lengkap tanpa buffering di FathMovie.',
  ogImage = 'https://www.gobox.my.id/file/swLU7OEx9HJk.png',
  ogType = 'website',
  hideNavbar = false,
}) {
  const currentOgImage = ogImage || 'https://www.gobox.my.id/file/swLU7OEx9HJk.png';

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
        />
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />

        {/* OpenGraph / Social Media SEO Tags */}
        <meta property="og:site_name" content="FathMovie" />
        <meta property="og:type" content={ogType} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={currentOgImage} />
        <meta property="og:image:secure_url" content={currentOgImage} />
        <meta property="og:image:alt" content="FathMovie — Platform Streaming Movie & Series" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="1200" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={currentOgImage} />

        {/* Favicon and App Icons */}
        <link rel="icon" type="image/png" href="/FathMovie.png" />
        <link rel="alternate icon" type="image/png" href="/FathMovie.png" />
        <link rel="shortcut icon" href="/FathMovie.png" />
        <link rel="apple-touch-icon" href="/FathMovie.png" />
      </Head>

      {!hideNavbar && <Header />}
      
      {children}

      {!hideNavbar && <Footer />}

      <Toast />
    </>
  );
}
