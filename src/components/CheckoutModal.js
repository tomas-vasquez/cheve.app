import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useBranch } from '../context/BranchContext';
import { placeOrder } from '../lib/orders';

const QR_PAYMENT_DATA = 'cheve.app';

const PAYMENT_METHODS = [
  {
    id: 'contra_entrega',
    title: 'Contra entrega',
    description: 'Pagas en efectivo cuando llega tu pedido',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
  {
    id: 'qr',
    title: 'QR',
    description: 'Paga escaneando el código QR',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM21 14h.01M21 21h.01M14 21h.01" />
      </svg>
    ),
  },
];

export default function CheckoutModal({ total, onClose }) {
  const { user } = useAuth();
  const { items, clear } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    currentBranch,
    distanceKm,
    covered,
    loading: branchLoading,
  } = useBranch();

  const [address, setAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [method, setMethod] = useState('contra_entrega');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('name, lat, lng, reference')
        .eq('user_id', user.id)
        .maybeSingle();
      if (active) {
        setAddress(data || {});
        setAddressLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user.id]);

  const hasLocation = address && address.lat != null && address.lng != null;
  const reference = address?.reference?.trim();

  const confirm = async () => {
    setError('');
    if (!currentBranch || !covered) {
      setError('No hay una sucursal con cobertura para tu ubicación.');
      return;
    }
    setSubmitting(true);
    const { error: orderError } = await placeOrder(items, total, method, currentBranch.id);
    setSubmitting(false);
    if (orderError) {
      setError(orderError.message);
      return;
    }
    showToast('Pedido realizado ✓', { tone: 'success' });
    clear();
    onClose();
    navigate('/profile');
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <header style={styles.header}>
          <button style={styles.backButton} onClick={onClose} aria-label="Volver al carrito">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Carrito
          </button>
          <h1 style={styles.title}>Confirmar pedido</h1>
          <span style={styles.headerSpacer} />
        </header>

        <div style={styles.body}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Dirección de entrega</h2>

            {addressLoading ? (
              <p style={styles.muted}>Cargando dirección...</p>
            ) : !hasLocation ? (
              <div style={styles.addressCard}>
                <p style={styles.warning}>
                  No tienes una dirección de entrega guardada. Defínela antes de confirmar el pedido.
                </p>
                <button style={styles.mapButton} onClick={() => navigate('/map')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Definir ubicación
                </button>
              </div>
            ) : (
              <div style={styles.addressCard}>
                <div style={styles.addressRow}>
                  <span style={styles.check}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span style={styles.addressText}>
                    {reference || 'Ubicación guardada'}
                    <span style={styles.addressSub}>
                      {reference ? 'Verificada' : `Lat ${Number(address.lat).toFixed(5)}, Lng ${Number(address.lng).toFixed(5)}`}
                    </span>
                  </span>
                </div>
                <button style={styles.changeButton} onClick={() => navigate('/map')}>
                  Cambiar
                </button>
              </div>
            )}
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Sucursal</h2>

            {branchLoading ? (
              <p style={styles.muted}>Cargando sucursal...</p>
            ) : !currentBranch ? (
              <div style={styles.addressCard}>
                <p style={styles.warning}>
                  No hay una sucursal seleccionada. Elige una sucursal antes de confirmar el pedido.
                </p>
                <button style={styles.mapButton} onClick={onClose}>
                  Elegir sucursal
                </button>
              </div>
            ) : (
              <div style={styles.addressCard}>
                <div style={styles.addressRow}>
                  <span style={{ ...styles.check, ...(covered ? {} : styles.checkBad) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      {covered ? <path d="M20 6 9 17l-5-5" /> : <path d="M18 6 6 18M6 6l12 12" />}
                    </svg>
                  </span>
                  <span style={styles.addressText}>
                    {currentBranch.name}
                    <span style={styles.addressSub}>
                      {hasLocation && distanceKm != null
                        ? covered
                          ? `Cobertura OK · ${distanceKm.toFixed(1)} km de la sucursal`
                          : `Sin cobertura · a ${distanceKm.toFixed(1)} km (radio ${Number(currentBranch.delivery_radius_km)} km)`
                        : 'Entrega a esta sucursal'}
                    </span>
                  </span>
                </div>
                <button style={styles.changeButton} onClick={onClose}>
                  Cambiar
                </button>
              </div>
            )}
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Método de pago</h2>
            <div style={styles.methods}>
              {PAYMENT_METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    style={{
                      ...styles.method,
                      ...(active ? styles.methodActive : {}),
                    }}
                  >
                    <span style={styles.methodIcon}>{m.icon}</span>
                    <span style={styles.methodInfo}>
                      <span style={styles.methodTitle}>{m.title}</span>
                      <span style={styles.methodDesc}>{m.description}</span>
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

            {method === 'qr' && (
              <div style={styles.qrWrap}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(
                    `${QR_PAYMENT_DATA} · Bs ${total.toFixed(2)}`
                  )}`}
                  alt="Código QR de pago"
                  style={styles.qr}
                />
                <p style={styles.qrHint}>Escanea el QR con tu app de pagos</p>
              </div>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.footer}>
            <p style={styles.total}>
              Total: <span style={styles.totalValue}>Bs {total.toFixed(2)}</span>
            </p>
            <button
              style={styles.confirmButton}
              onClick={confirm}
              disabled={submitting || branchLoading || !currentBranch || !covered}
            >
              {submitting
                ? 'Procesando...'
                : !currentBranch
                  ? 'Sin sucursal seleccionada'
                  : !covered
                    ? 'Sin cobertura de entrega'
                    : 'Confirmar pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 600,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#000',
    animation: 'toast-in 0.25s ease-out',
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
    gap: 6,
    padding: '8px 10px',
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  title: { fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 },
  headerSpacer: { width: 78 },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px 24px',
  },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1DB954',
    margin: '0 0 10px',
  },
  muted: { fontSize: 13, color: '#8a8a8a', margin: 0 },
  addressCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 500,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
  },
  addressRow: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  check: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: '50%',
    background: 'rgba(126,231,135,0.15)',
    color: '#7ee787',
    border: '1px solid rgba(126,231,135,0.5)',
  },
  checkBad: {
    background: 'rgba(255,107,107,0.15)',
    color: '#ff6b6b',
    border: '1px solid rgba(255,107,107,0.5)',
  },
  addressText: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  addressSub: {
    display: 'block',
    fontSize: 12,
    fontWeight: 400,
    color: '#8a8a8a',
    marginTop: 2,
  },
  warning: {
    flex: 1,
    fontSize: 13,
    color: '#ffb86b',
    margin: 0,
    lineHeight: 1.4,
  },
  changeButton: {
    flexShrink: 0,
    padding: '8px 14px',
    borderRadius: 500,
    border: '1px solid rgba(29, 185, 84,0.5)',
    background: 'rgba(29, 185, 84,0.12)',
    color: '#1DB954',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
  },
  mapButton: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 500,
    border: '1px solid #1DB954',
    background: '#1DB954',
    color: '#000',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
  },
  methods: { display: 'flex', flexDirection: 'column', gap: 10 },
  method: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 500,
    cursor: 'pointer',
    textAlign: 'left',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    color: '#fff',
    fontFamily: 'inherit',
  },
  methodActive: {
    background: 'rgba(29, 185, 84,0.12)',
    border: '1px solid #1DB954',
  },
  methodIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 500,
    background: 'rgba(29, 185, 84,0.15)',
    color: '#1DB954',
  },
  methodInfo: { flex: 1, minWidth: 0 },
  methodTitle: { display: 'block', fontSize: 14, fontWeight: 600, color: '#fff' },
  methodDesc: { display: 'block', fontSize: 12, color: '#8a8a8a', marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.25)',
  },
  radioActive: {
    borderColor: '#1DB954',
    background: '#1DB954',
    boxShadow: 'inset 0 0 0 4px #000',
  },
  qrWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 14,
    padding: 18,
    borderRadius: 500,
    background: '#fff',
  },
  qr: { width: 180, height: 180 },
  qrHint: { fontSize: 12, color: '#555', margin: '10px 0 0' },
  error: { fontSize: 13, color: '#ff6b6b', margin: '0 0 12px' },
  footer: {
    padding: '16px 0 0',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  total: { fontSize: 16, fontWeight: 600, color: '#fff', margin: '0 0 12px' },
  totalValue: { color: '#1DB954', fontWeight: 700, fontSize: 18 },
  confirmButton: {
    backgroundColor: '#1DB954',
    color: '#000',
    border: 'none',
    padding: 14,
    borderRadius: 500,
    width: '100%',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 15,
    fontFamily: 'inherit',
  },
};
