import React from 'react';
import Skeleton from './Skeleton';

export default function HomeSkeleton({ count = 6, bare = false }) {
  if (bare) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={styles.card}>
            <Skeleton height={140} borderRadius={10} style={{ marginBottom: 8 }} />
            <Skeleton width="75%" height={14} style={{ margin: '4px 0' }} />
            <Skeleton width="40%" height={14} style={{ margin: '4px 0' }} />
            <Skeleton height={38} borderRadius={8} style={{ marginTop: 8 }} />
          </div>
        ))}
      </>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.carouselWrap}>
        <Skeleton height={150} borderRadius={16} />
      </div>

      <div style={styles.section}>
        <Skeleton width={110} height={14} style={{ marginBottom: 10 }} />
        <div style={styles.chips}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              width={i === 0 ? 70 : 96}
              height={36}
              borderRadius={10}
            />
          ))}
        </div>
      </div>

      <div className="products-grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={styles.card}>
            <Skeleton height={140} borderRadius={10} style={{ marginBottom: 8 }} />
            <Skeleton width="75%" height={14} style={{ margin: '4px 0' }} />
            <Skeleton width="40%" height={14} style={{ margin: '4px 0' }} />
            <Skeleton height={38} borderRadius={8} style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '12px 12px 0',
  },
  carouselWrap: {
    maxWidth: 600,
    margin: '0 auto',
  },
  section: {
    marginTop: 20,
  },
  chips: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollbarWidth: 'none',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderRadius: 16,
    padding: 12,
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    textAlign: 'left',
  },
};
