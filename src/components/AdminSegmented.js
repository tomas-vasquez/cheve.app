import React from 'react';

export default function AdminSegmented({ options, active, onSelect }) {
  return (
    <div style={styles.container}>
      {options.map((o) => {
        const isActive = active === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            style={{
              ...styles.segment,
              ...(isActive ? styles.segmentActive : {}),
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: 4,
    padding: 4,
    marginBottom: 16,
    borderRadius: 500,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  segment: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 500,
    background: 'transparent',
    border: 'none',
    color: '#8a8a8a',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s ease, color 0.15s ease',
  },
  segmentActive: {
    background: '#1DB954',
    color: '#000000',
  },
};
