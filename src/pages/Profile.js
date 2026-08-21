import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const initial = (user?.email?.[0] || 'U').toUpperCase();

  const [profile, setProfile] = useState({});
  const [orderCount, setOrderCount] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const loadProfile = useCallback(async () => {
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('profiles')
        .select('name, avatar, reference, lat, lng')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);
    if (data) setProfile(data);
    if (count != null) setOrderCount(count);
    setLoadingProfile(false);
  }, [user.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const hasLocation = profile.lat != null && profile.lng != null;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
      })
    : null;
  const displayName = profile.name || user?.email;

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.avatarWrap}>
          {profile.avatar ? (
            <img src={profile.avatar} alt="Foto de perfil" style={styles.avatarImage} />
          ) : (
            <div style={styles.avatar}>{initial}</div>
          )}
        </div>
        <h2 style={styles.name}>{displayName}</h2>
        <p style={styles.email}>{user?.email}</p>
        {memberSince && <p style={styles.memberSince}>Miembro desde {memberSince}</p>}
        <button style={styles.logoutButton} onClick={() => signOut()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Cerrar sesión
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{orderCount}</span>
          <span style={styles.statLabel}>Pedidos</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{hasLocation ? '✓' : '—'}</span>
          <span style={styles.statLabel}>Ubicación</span>
        </div>
      </div>

      <div style={styles.menu}>
        <button style={styles.menuRow} onClick={() => navigate('/pedidos')}>
          <div style={styles.menuIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1DB954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" />
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
            </svg>
          </div>
          <div style={styles.menuText}>
            <span style={styles.menuTitle}>Mis pedidos</span>
            <span style={styles.menuSub}>Ver y seguir tus pedidos</span>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <button style={styles.menuRow} onClick={() => navigate('/perfil')}>
          <div style={styles.menuIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1DB954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div style={styles.menuText}>
            <span style={styles.menuTitle}>Editar perfil</span>
            <span style={styles.menuSub}>Cambiar foto y nombre</span>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <button style={styles.menuRow} onClick={() => navigate('/')}>
          <div style={styles.menuIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1DB954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div style={styles.menuText}>
            <span style={styles.menuTitle}>Mi sucursal</span>
            <span style={styles.menuSub}>
              {currentBranch ? currentBranch.name : 'Sin sucursal asignada'}
            </span>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <button style={styles.menuRow} onClick={() => navigate('/map')}>
          <div style={styles.menuIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1DB954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div style={styles.menuText}>
            <span style={styles.menuTitle}>Mi ubicación</span>
            <span style={styles.menuSub}>
              {loadingProfile
                ? 'Cargando...'
                : hasLocation
                  ? profile.reference || 'Ubicación definida'
                  : 'Aún no definida'}
            </span>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    maxWidth: 480,
    margin: '0 auto',
    background:
      'radial-gradient(circle at 20% 0%, rgba(29, 185, 84,0.1), transparent 45%)',
  },
  hero: {
    textAlign: 'center',
    padding: '28px 20px 20px',
    borderRadius: 24,
    background:
      'linear-gradient(160deg, rgba(29, 185, 84,0.14), rgba(255,255,255,0.04) 55%)',
    border: '1px solid rgba(29, 185, 84,0.25)',
    marginBottom: 16,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    padding: 4,
    background: 'linear-gradient(135deg, #1DB954, #1ed760)',
    boxShadow: '0 0 30px rgba(29, 185, 84,0.45)',
    margin: '0 auto 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
    fontWeight: 800,
    background: '#000',
    color: '#1DB954',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
  },
  name: { fontSize: 20, fontWeight: 800, color: '#fff', wordBreak: 'break-all', margin: '0 0 2px' },
  email: { fontSize: 13, color: '#8a8a8a', wordBreak: 'break-all', margin: '0 0 6px' },
  memberSince: { fontSize: 12, color: '#8a8a8a', margin: '0 0 18px' },
  logoutButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#cfcfcf',
    cursor: 'pointer',
    padding: '10px 18px',
    borderRadius: 500,
    fontSize: 13,
    fontWeight: 600,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '16px 12px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
  },
  statValue: { fontSize: 22, fontWeight: 800, color: '#1DB954' },
  statLabel: { fontSize: 12, color: '#8a8a8a' },
  menu: {
    borderRadius: 20,
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    overflow: 'hidden',
  },
  menuRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
  },
  menuIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(29, 185, 84,0.12)',
  },
  menuText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  menuTitle: { fontSize: 15, fontWeight: 600 },
  menuSub: { fontSize: 12, color: '#8a8a8a' },
};
