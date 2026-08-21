import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_BANNERS = [
  {
    title: 'Machucada de coca',
    subtitle: 'Crea tu propia combinación con condimentos',
    background: 'linear-gradient(135deg, #1DB954 0%, #12823a 100%)',
  },
  {
    title: 'Cerveza bien fría',
    subtitle: 'Directo a tu puerta',
    background: 'linear-gradient(135deg, #3a7bd5 0%, #1e3c72 100%)',
  },
  {
    title: 'Nuevos sabores',
    subtitle: 'Bicarbonatos saborizados y café',
    background: 'linear-gradient(135deg, #d53a8d 0%, #7a1e5c 100%)',
  },
];

export default function BannerCarousel() {
  const [banners, setBanners] = useState(DEFAULT_BANNERS);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    supabase
      .from('banners')
      .select('title, subtitle, background, image_url, link')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setBanners(data);
        }
      });
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % banners.length),
      4000
    );
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.track, transform: `translateX(-${index * 100}%)` }}>
        {banners.map((banner) => {
          const slideStyle = banner.image_url
            ? {
                ...styles.slide,
                backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.6)), url(${banner.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {
                ...styles.slide,
                background: banner.background || 'linear-gradient(135deg, #1DB954 0%, #12823a 100%)',
              };

          return (
            <div
              key={banner.id ?? banner.title}
              style={slideStyle}
              onClick={() => banner.link && window.open(banner.link, '_blank')}
              role={banner.link ? 'link' : undefined}
            >
              <h2 style={styles.slideTitle}>{banner.title}</h2>
              {banner.subtitle && <p style={styles.slideSubtitle}>{banner.subtitle}</p>}
            </div>
          );
        })}
      </div>
      <div style={styles.dots}>
        {banners.map((banner, i) => (
          <button
            key={banner.id ?? banner.title}
            aria-label={`Ir al banner ${i + 1}`}
            onClick={() => setIndex(i)}
            style={{ ...styles.dot, ...(i === index ? styles.dotActive : {}) }}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  track: {
    display: 'flex',
    transition: 'transform 0.45s ease',
  },
  slide: {
    minWidth: '100%',
    height: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: '0 24px',
  },
  slideTitle: { fontSize: 22, fontWeight: 800, margin: 0, color: '#fff' },
  slideSubtitle: {
    fontSize: 13,
    margin: '6px 0 0',
    color: 'rgba(255,255,255,0.85)',
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.4)',
    transition: 'all 0.2s ease',
  },
  dotActive: {
    width: 20,
    background: '#fff',
  },
};
