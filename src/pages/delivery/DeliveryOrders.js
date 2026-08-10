import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';
import SwipeCard from '../../components/SwipeCard';

const ACTIVE_STATUSES = ['Pendiente', 'En preparación', 'En camino'];

const isTerminal = (status) => status === 'Cancelado' || status === 'Entregado';

const STATUS_COLORS = {
  'Pendiente': { bg: 'rgba(255,255,255,0.1)', fg: '#cfcfcf', border: 'rgba(255,255,255,0.25)' },
  'En preparación': { bg: 'rgba(201,162,39,0.15)', fg: '#c9a227', border: 'rgba(201,162,39,0.5)' },
  'En camino': { bg: 'rgba(58,123,213,0.15)', fg: '#5b9bff', border: 'rgba(58,123,213,0.5)' },
  'Entregado': { bg: 'rgba(126,231,135,0.15)', fg: '#7ee787', border: 'rgba(126,231,135,0.4)' },
  'Cancelado': { bg: 'rgba(255,107,107,0.15)', fg: '#ff6b6b', border: 'rgba(255,107,107,0.4)' },
};

const timeAgo = (value) => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'hace unos segundos';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
};

export default function DeliveryOrders() {
  const { user, branchId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Activos');
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef(null);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60000);

    const channel = supabase
      .channel('delivery-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) =>
              prev.some((o) => o.id === payload.new.id) ? prev : [...prev, payload.new]
            );
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new : o))
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const showNotice = (text) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3000);
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    }
  };

  const claim = async (id) => {
    const { data, error } = await supabase.rpc('claim_order', { p_id: id });
    if (!error && data) {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, delivery_user_id: user.id } : o))
      );
      showNotice('Pedido asignado a ti ✓');
    } else {
      showNotice('El pedido ya fue tomado por otro repartidor');
    }
  };

  const visible = orders.filter((o) => {
    if (filter === 'Activos') return ACTIVE_STATUSES.includes(o.status);
    if (filter === 'Entregados') return o.status === 'Entregado';
    return true;
  });

  if (loading) {
    return (
      <div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={styles.card}>
            <Skeleton width="55%" height={15} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={13} style={{ marginBottom: 8 }} />
            <Skeleton width="30%" height={13} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={styles.head}>
        <h2 style={styles.title}>Pedidos para entrega</h2>
        <button style={styles.refreshButton} onClick={fetchData} aria-label="Actualizar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85 1 6.6 2.76L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>

      <p style={styles.hint}>
        Desliza → para iniciar la entrega o marcarla como entregada · pulsa "Asignarme" para
        tomarte un pedido
      </p>
      {!branchId && (
        <p style={styles.noBranch}>
          Tu cuenta no tiene una sucursal asignada. Pídele a un administrador que te
          agregue como repartidor para recibir pedidos.
        </p>
      )}
      {notice && <p style={styles.notice}>{notice}</p>}

      <div style={styles.chips}>
        {['Activos', 'Entregados', 'Todos'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              ...styles.chip,
              ...(filter === s ? styles.chipActive : {}),
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p style={styles.empty}>No hay pedidos</p>}

      {visible.map((order) => {
        const items = order.items || [];
        const itemCount = items.reduce((n, it) => n + (it.quantity || 1), 0);
        const color = STATUS_COLORS[order.status] || STATUS_COLORS['Pendiente'];
        const hasLocation = order.delivery_lat != null && order.delivery_lng != null;
        const mine = !!user && order.delivery_user_id === user.id;
        const claimable = order.status === 'En preparación' && !order.delivery_user_id;
        const rightAction =
          mine && order.status === 'En preparación'
            ? { status: 'En camino', label: '→ Iniciar entrega' }
            : mine && order.status === 'En camino'
            ? { status: 'Entregado', label: '→ Entregado' }
            : null;
        return (
          <SwipeCard
            key={order.id}
            onSwipeRight={rightAction ? () => updateStatus(order.id, rightAction.status) : undefined}
            rightLabel={rightAction?.label}
          >
            <div style={styles.cardHead}>
              <div style={styles.customerBlock}>
                <span style={styles.customer}>
                  {order.customer_name || 'Cliente'}
                </span>
                <span style={styles.date}> · llegó {timeAgo(order.created_at)}</span>
                <span style={styles.payment}>
                  {' '}· Pago: {order.payment_method === 'qr' ? 'QR' : 'Contra entrega'}
                </span>
                <span
                  style={{
                    ...styles.statusBadge,
                    background: color.bg,
                    color: color.fg,
                    borderColor: color.border,
                  }}
                >
                  {order.status}
                </span>
                {mine && <span style={styles.mineBadge}>Tu pedido</span>}
              </div>
            </div>

            {order.delivery_reference && (
              <p style={styles.reference}>📍 {order.delivery_reference}</p>
            )}

            <div style={styles.foot}>
              <span style={styles.totalLabel}>
                {itemCount === 1 ? '1 producto' : `${itemCount} productos`}
              </span>
              <span style={styles.total}>Bs {Number(order.total).toFixed(2)}</span>
            </div>

            <div style={styles.actions}>
              {claimable && (
                <button style={styles.claimButton} onClick={() => claim(order.id)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4Z" />
                  </svg>
                  Asignarme
                </button>
              )}
              {hasLocation && (
                <a
                  href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.mapLink}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Abrir en Google Maps
                </a>
              )}
              {!hasLocation && !isTerminal(order.status) && (
                <span style={styles.noLocation}>Sin ubicación guardada</span>
              )}
              {!mine && order.delivery_user_id && !isTerminal(order.status) && (
                <span style={styles.otherDelivery}>Asignado a otro repartidor</span>
              )}
            </div>
          </SwipeCard>
        );
      })}
    </div>
  );
}

const styles = {
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    padding: 0,
    borderRadius: 10,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.08)',
    color: '#cfcfcf',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  chips: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    padding: '8px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#cfcfcf',
    fontSize: 13,
  },
  chipActive: {
    background: 'rgba(201,162,39,0.18)',
    border: '1px solid #c9a227',
    color: '#c9a227',
    fontWeight: 600,
  },
  empty: { fontSize: 13, color: '#8a8a8a', textAlign: 'center', marginTop: 40 },
  hint: {
    fontSize: 12,
    color: '#8a8a8a',
    margin: '0 0 14px',
  },
  notice: {
    fontSize: 12,
    fontWeight: 700,
    color: '#7ee787',
    margin: '-6px 0 12px',
  },
  mineBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(126,231,135,0.15)',
    border: '1px solid rgba(126,231,135,0.5)',
    color: '#7ee787',
  },
  otherDelivery: { fontSize: 12, color: '#8a8a8a' },
  claimButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'rgba(201,162,39,0.18)',
    color: '#c9a227',
    border: '1px solid #c9a227',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
  },
  card: {
    padding: 16,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    marginBottom: 12,
  },
  cardHead: { marginBottom: 8 },
  customerBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  customer: { fontSize: 14, fontWeight: 600, color: '#fff' },
  date: { fontSize: 12, color: '#8a8a8a' },
  payment: { fontSize: 12, color: '#7ee787' },
  statusBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 8,
    border: '1px solid',
  },
  reference: {
    fontSize: 13,
    color: '#c9a227',
    margin: '0 0 8px',
    background: 'rgba(201,162,39,0.08)',
    padding: '8px 12px',
    borderRadius: 10,
  },
  items: {
    borderTop: '1px solid rgba(255,255,255,0.07)',
    paddingTop: 10,
    marginBottom: 10,
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    padding: '3px 0',
  },
  itemName: { fontSize: 13, color: '#cfcfcf' },
  itemPrice: { fontSize: 13, color: '#cfcfcf', fontWeight: 600 },
  foot: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    paddingTop: 10,
    marginBottom: 12,
  },
  totalLabel: { fontSize: 13, color: '#8a8a8a' },
  total: { fontSize: 16, fontWeight: 800, color: '#c9a227' },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  mapLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'rgba(58,123,213,0.15)',
    color: '#5b9bff',
    border: '1px solid rgba(58,123,213,0.5)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    textDecoration: 'none',
  },
  noLocation: { fontSize: 12, color: '#8a8a8a' },
  noBranch: {
    fontSize: 13,
    color: '#ffb86b',
    background: 'rgba(255,184,107,0.1)',
    border: '1px solid rgba(255,184,107,0.35)',
    borderRadius: 10,
    padding: '10px 14px',
    margin: '0 0 12px',
    lineHeight: 1.5,
  },
};
