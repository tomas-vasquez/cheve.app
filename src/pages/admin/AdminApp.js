import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminNavbar from '../../components/AdminNavbar';
import AdminProducts from './AdminProducts';
import AdminCondiments from './AdminCondiments';
import AdminOrders from './AdminOrders';
import AdminBanners from './AdminBanners';
import AdminDeliveryUsers from './AdminDeliveryUsers';
import AdminSettings from './AdminSettings';

const TABS = [
  { id: 'orders', label: 'Órdenes', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85 1 6.6 2.76L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M12 7v5l3 2" />
    </svg>
  ) },
  { id: 'products', label: 'Productos', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ) },
  { id: 'condiments', label: 'Recetas', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l-1 5H10l-1-5Z" />
      <path d="M10 8v3a5 5 0 0 1-5 5 5 5 0 0 0 5 5h4a5 5 0 0 0 5-5 5 5 0 0 1-5-5V8" />
    </svg>
  ) },
  { id: 'settings', label: 'Configuraciones', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ) },
];

export default function AdminApp() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState('orders');
  const [sub, setSub] = useState(null);

  const selectTab = (id) => {
    setTab(id);
    setSub(null);
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={styles.gold}>Cargando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.center}>
        <h1 style={styles.deniedTitle}>No autorizado</h1>
        <p style={styles.deniedText}>Esta área es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <main style={styles.content}>
        {tab === 'orders' && <AdminOrders />}
        {tab === 'products' && <AdminProducts />}
        {tab === 'condiments' && <AdminCondiments />}
        {tab === 'settings' &&
          (sub === null ? (
            <AdminSettings onOpen={setSub} />
          ) : sub === 'banners' ? (
            <SubScreen onBack={() => setSub(null)}>
              <AdminBanners />
            </SubScreen>
          ) : (
            <SubScreen onBack={() => setSub(null)}>
              <AdminDeliveryUsers />
            </SubScreen>
          ))}
      </main>

      <AdminNavbar tabs={TABS} active={tab} onSelect={selectTab} />
    </div>
  );
}

function SubScreen({ onBack, children }) {
  return (
    <div>
      <div style={styles.subHead}>
        <button style={styles.backButton} onClick={onBack} aria-label="Volver">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver
        </button>
      </div>
      {children}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#000',
    color: '#fff',
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: '#000',
    color: '#fff',
    padding: 20,
    textAlign: 'center',
  },
  deniedTitle: { fontSize: 22, fontWeight: 700, margin: 0, color: '#ff6b6b' },
  deniedText: { fontSize: 14, color: '#8a8a8a', margin: 0 },
  gold: { color: '#c9a227', fontSize: 15 },
  subHead: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.08)',
    color: '#cfcfcf',
    border: '1px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  content: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '20px 20px 120px',
  },
};
