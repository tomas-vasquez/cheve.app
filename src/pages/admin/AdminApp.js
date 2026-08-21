import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AdminNavbar from '../../components/AdminNavbar';
import AdminSegmented from '../../components/AdminSegmented';
import AdminProducts from './AdminProducts';
import AdminStock from './AdminStock';
import AdminCondiments from './AdminCondiments';
import AdminRecipes from './AdminRecipes';
import AdminOrders from './AdminOrders';
import AdminBanners from './AdminBanners';
import AdminDeliveryUsers from './AdminDeliveryUsers';
import AdminBranches from './AdminBranches';
import AdminSettings from './AdminSettings';

const TABS = [
  { id: 'orders', label: 'Órdenes', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85 1 6.6 2.76L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M12 7v5l3 2" />
    </svg>
  ) },
  { id: 'catalog', label: 'Productos', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ) },
  { id: 'recipes', label: 'Coca', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
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
  const { isAdmin, branchId, loading, signOut } = useAuth();
  const [tab, setTab] = useState('orders');
  const [sub, setSub] = useState(null);
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
        <button style={styles.loginButton} onClick={() => signOut()}>
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {branchId ? (
        <div style={styles.branchBanner}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Sucursal: <strong>{branchName || '...'}</strong>
        </div>
      ) : (
        <div style={{ ...styles.branchBanner, ...styles.branchBannerWarn }}>
          Tu cuenta no tiene una sucursal asignada. Asígnala en la BD para operar.
        </div>
      )}
      <main style={styles.content}>
        {tab === 'orders' && <AdminOrders />}
        {tab === 'catalog' && (
          <>
            <AdminSegmented
              options={[
                { id: 'products', label: 'Productos' },
                { id: 'stock', label: 'Stock' },
              ]}
              active={sub ?? 'products'}
              onSelect={setSub}
            />
            {sub === 'stock' ? <AdminStock /> : <AdminProducts />}
          </>
        )}
        {tab === 'recipes' && (
          <>
            <AdminSegmented
              options={[
                { id: 'condiments', label: 'Ingredientes' },
                { id: 'recipes', label: 'Coca' },
              ]}
              active={sub ?? 'condiments'}
              onSelect={setSub}
            />
            {sub === 'recipes' ? <AdminRecipes /> : <AdminCondiments />}
          </>
        )}
        {tab === 'settings' &&
          (sub === null ? (
            <AdminSettings onOpen={setSub} />
          ) : sub === 'branch' ? (
            <SubScreen onBack={() => setSub(null)}>
              <AdminBranches />
            </SubScreen>
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
  loginButton: {
    marginTop: 16,
    padding: '12px 20px',
    borderRadius: 500,
    background: 'rgba(29, 185, 84,0.15)',
    border: '1px solid rgba(29, 185, 84,0.5)',
    color: '#1DB954',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  gold: { color: '#1DB954', fontSize: 15 },
  branchBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 16px',
    background: 'rgba(29, 185, 84,0.1)',
    borderBottom: '1px solid rgba(29, 185, 84,0.35)',
    color: '#1DB954',
    fontSize: 13,
  },
  branchBannerWarn: {
    background: 'rgba(255,184,107,0.1)',
    borderBottom: '1px solid rgba(255,184,107,0.35)',
    color: '#ffb86b',
  },
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
    borderRadius: 500,
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
