import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import DeliveryOrders from './DeliveryOrders';

export default function DeliveryApp() {
  const { user, isDelivery, branchId, loading, signOut } = useAuth();
  const [branchName, setBranchName] = useState(null);

  useEffect(() => {
    if (!branchId) {
      setBranchName(null);
      return;
    }
    supabase
      .from('branches')
      .select('name')
      .eq('id', branchId)
      .maybeSingle()
      .then(({ data }) => setBranchName(data?.name ?? null));
  }, [branchId]);

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={styles.gold}>Cargando...</p>
      </div>
    );
  }

  if (!isDelivery) {
    return (
      <div style={styles.center}>
        <h1 style={styles.deniedTitle}>No autorizado</h1>
        <p style={styles.deniedText}>Esta área es solo para repartidores.</p>
        <button style={styles.loginButton} onClick={() => signOut()}>
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>
            <span style={{ color: '#c9a227' }}>Cheve</span>
            <span style={{ color: '#fff' }}>.app</span>
            <span style={styles.badge}>Reparto</span>
          </div>
          <div style={styles.email}>
            {user?.email}
            {branchName && <span style={styles.branch}> · {branchName}</span>}
          </div>
        </div>
        <button style={styles.logout} onClick={() => signOut()}>
          Cerrar sesión
        </button>
      </header>

      <main style={styles.content}>
        <DeliveryOrders />
      </main>
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
  loginButton: {
    marginTop: 16,
    padding: '12px 20px',
    borderRadius: 10,
    background: 'rgba(201,162,39,0.15)',
    border: '1px solid rgba(201,162,39,0.5)',
    color: '#c9a227',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  gold: { color: '#c9a227', fontSize: 15 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: '16px 20px',
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brand: { fontSize: 16, fontWeight: 800, letterSpacing: 0.5 },
  badge: {
    marginLeft: 8,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(126,231,135,0.15)',
    border: '1px solid rgba(126,231,135,0.5)',
    color: '#7ee787',
  },
  email: { fontSize: 12, color: '#8a8a8a', marginTop: 2 },
  branch: { color: '#c9a227', fontWeight: 700 },
  logout: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#cfcfcf',
    padding: '9px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  content: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '20px 20px 120px',
  },
};
