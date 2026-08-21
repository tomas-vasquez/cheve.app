import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const tabs = [
  {
    to: '/',
    label: 'Inicio',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/bolo',
    label: 'Coca machucada',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
  },
  {
    to: '/cart',
    label: 'Carrito',
    badge: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Perfil',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function NavBar() {
  const { items } = useCart();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <nav style={styles.bar}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          style={({ isActive }) => ({
            ...styles.tab,
            color: isActive ? '#1DB954' : '#B3B3B3',
          })}
        >
          <span style={styles.iconWrap}>
            {tab.icon}
            {tab.badge && count > 0 && <span style={styles.badge}>{count}</span>}
          </span>
          <span style={styles.label}>{tab.label}</span>
        </NavLink>
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
    background: 'rgba(18,18,18,0.9)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    textDecoration: 'none', fontSize: 11, padding: '4px 10px',
    transition: 'color 0.15s ease',
  },
  iconWrap: { position: 'relative' },
  label: { fontWeight: 500 },
  badge: {
    position: 'absolute', top: -6, right: -10,
    backgroundColor: '#1DB954', color: '#000',
    borderRadius: 500, fontSize: 10, fontWeight: 700,
    padding: '1px 5px', minWidth: 18, textAlign: 'center',
  },
};
