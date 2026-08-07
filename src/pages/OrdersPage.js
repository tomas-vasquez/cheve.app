import React from 'react';
import { useNavigate } from 'react-router-dom';
import Orders from './Orders';

export default function OrdersPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.backButton} aria-label="Volver" onClick={() => navigate('/profile')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        <h1 style={styles.title}>Mis pedidos</h1>
        <span style={styles.headerSpacer} />
      </header>
      <div style={styles.body}>
        <Orders hideTitle />
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#000',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
  },
  title: { fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 },
  headerSpacer: { width: 36 },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    maxWidth: 600,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
};
