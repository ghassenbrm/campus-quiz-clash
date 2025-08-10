import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title = 'Campus Quiz Clash - Test Your Knowledge',
  description = 'Challenge yourself with our interactive quiz platform. Test your knowledge, compete with others, and climb the leaderboard!',
  type = 'website',
  name = 'Campus Quiz Clash',
  image = '/og-image.jpg',
  url = window?.location?.href || 'https://yourdomain.com',
  keywords = 'quiz, knowledge, test, challenge, education, learning, campus quiz, quiz game',
  twitterCard = 'summary_large_image',
  twitterSite = '@campusquizclash',
  twitterCreator = '@campusquizclash',
  locale = 'en_US',
  siteName = 'Campus Quiz Clash',
}) => {
  return (
    <Helmet>
      {/* Standard metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional tags */}
      <meta name="theme-color" content="#4361ee" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={name} />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="msapplication-TileColor" content="#4361ee" />
      <meta name="msapplication-tap-highlight" content="no" />

      {/* Favicon */}
      <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />
      <link rel="icon" type="image/png" href="/favicon-16x16.png" sizes="16x16" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#4361ee" />
    </Helmet>
  );
};

export default SEO;
