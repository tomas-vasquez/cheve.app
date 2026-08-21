import React from 'react';

export default function AdminNavbar({ tabs, active, onSelect }) {
  return (
    <nav style={styles.bar}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            ...styles.tab,
            color: active === t.id ? '#1DB954' : '#8a8a8a',
          }}
        >
          <span style={styles.iconWrap}>{t.icon}</span>
          <span style={styles.label}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

const styles = {
  bar: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0, zIndex: 20,
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    padding: '8px 0 0',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 11, padding: '4px 8px',
    transition: 'color 0.15s ease',
  },
  iconWrap: { display: 'flex' },
  label: { fontWeight: 500 },
};
