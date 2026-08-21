import React from 'react';

const OPTIONS = [
  {
    id: 'branch',
    title: 'Mi sucursal',
    description: 'Edita nombre, dirección y radio de entrega',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    id: 'banners',
    title: 'Banners',
    description: 'Administra los banners del inicio',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 10h16M4 14h16M4 18h10" />
      </svg>
    ),
  },
  {
    id: 'delivery',
    title: 'Repartidores',
    description: 'Agrega o desactiva repartidores',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </svg>
    ),
  },
];

export default function AdminSettings({ onOpen }) {
  return (
    <div>
      <h2 style={styles.title}>Configuraciones</h2>
      <div style={styles.list}>
        {OPTIONS.map((o) => (
          <button key={o.id} style={styles.card} onClick={() => onOpen(o.id)}>
            <span style={styles.icon}>{o.icon}</span>
            <span style={styles.info}>
              <span style={styles.name}>{o.title}</span>
              <span style={styles.desc}>{o.description}</span>
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  title: { fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#fff' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 500,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    cursor: 'pointer',
    color: '#fff',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 500,
    flexShrink: 0,
    background: 'rgba(29, 185, 84,0.15)',
    color: '#1DB954',
    border: '1px solid rgba(29, 185, 84,0.4)',
  },
  info: { flex: 1, minWidth: 0 },
  name: { display: 'block', fontSize: 14, fontWeight: 600, color: '#fff' },
  desc: { display: 'block', fontSize: 12, color: '#8a8a8a', marginTop: 2 },
  chevron: { color: '#8a8a8a', flexShrink: 0 },
};
