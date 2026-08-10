import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranch } from '../context/BranchContext';

export default function BranchSelector({ onClose }) {
  const { branches, currentBranch, selectBranch, hasLocation } = useBranch();
  const navigate = useNavigate();

  const pick = async (id) => {
    await selectBranch(id);
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <header style={styles.header}>
          <h2 style={styles.title}>Elige tu sucursal</h2>
          <button style={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div style={styles.body}>
          <button
            style={styles.locateRow}
            onClick={() => {
              onClose();
              navigate('/map');
            }}
          >
            <span style={styles.locateIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h6" />
                <circle cx="12" cy="12" r="3" />
                <path d="M22 12h-6" />
                <path d="M12 2v6" />
                <path d="M12 22v-6" />
              </svg>
            </span>
            <span style={styles.locateText}>
              <span style={styles.locateTitle}>Usar mi ubicación</span>
              <span style={styles.locateSub}>
                {hasLocation ? 'Elegir la sucursal más cercana' : 'Define tu ubicación para la sucursal más cercana'}
              </span>
            </span>
          </button>

          <p style={styles.sectionLabel}>Sucursales</p>

          {branches.length === 0 && (
            <p style={styles.empty}>Aún no hay sucursales activas</p>
          )}

          {branches.map((b) => {
            const active = currentBranch?.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => pick(b.id)}
                style={{
                  ...styles.card,
                  ...(active ? styles.cardActive : {}),
                }}
              >
                <span style={styles.cardIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span style={styles.cardInfo}>
                  <span style={styles.cardName}>
                    {b.name}
                    {active && <span style={styles.currentBadge}>Actual</span>}
                  </span>
                  {b.address && <span style={styles.cardAddress}>{b.address}</span>}
                  <span style={styles.cardMeta}>
                    Radio de entrega: {Number(b.delivery_radius_km).toFixed(1)} km
                  </span>
                </span>
                <span
                  style={{
                    ...styles.radio,
                    ...(active ? styles.radioActive : {}),
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '82vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(14,14,16,0.98)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    animation: 'toast-in 0.25s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  title: { fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#cfcfcf',
    cursor: 'pointer',
  },
  body: { flex: 1, overflowY: 'auto', padding: 16 },
  locateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 14,
    borderRadius: 14,
    background: 'rgba(201,162,39,0.1)',
    border: '1px solid rgba(201,162,39,0.4)',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
    marginBottom: 18,
    fontFamily: 'inherit',
  },
  locateIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 10,
    background: 'rgba(201,162,39,0.18)',
    color: '#c9a227',
  },
  locateText: { display: 'flex', flexDirection: 'column', gap: 2 },
  locateTitle: { fontSize: 14, fontWeight: 700 },
  locateSub: { fontSize: 12, color: '#8a8a8a' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#8a8a8a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    margin: '0 0 10px',
  },
  empty: { fontSize: 13, color: '#8a8a8a', textAlign: 'center', marginTop: 20 },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 14,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
    marginBottom: 10,
    fontFamily: 'inherit',
  },
  cardActive: {
    background: 'rgba(201,162,39,0.12)',
    border: '1px solid #c9a227',
  },
  cardIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 10,
    background: 'rgba(201,162,39,0.15)',
    color: '#c9a227',
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
  },
  currentBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
    background: 'rgba(126,231,135,0.15)',
    border: '1px solid rgba(126,231,135,0.5)',
    color: '#7ee787',
  },
  cardAddress: {
    display: 'block',
    fontSize: 12,
    color: '#8a8a8a',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    display: 'block',
    fontSize: 11,
    color: '#8a8a8a',
    marginTop: 4,
  },
  radio: {
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.25)',
  },
  radioActive: {
    borderColor: '#c9a227',
    background: '#c9a227',
    boxShadow: 'inset 0 0 0 4px #141416',
  },
};
