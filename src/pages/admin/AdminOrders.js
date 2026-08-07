import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Skeleton from '../../components/Skeleton';
import SwipeCard from '../../components/SwipeCard';
import { useToast } from '../../context/ToastContext';
import { browserNotify, notifySupported, playBeep, requestNotifyPermission } from '../../lib/notify';

const STATUSES = [
  'Pendiente',
  'En preparación',
  'En camino',
  'Entregado',
  'Cancelado',
];

const ADMIN_ACTIONS = {
  'Pendiente': {
    right: { status: 'En preparación', label: '→ Aceptar' },
    left: { status: 'Cancelado', label: '← Rechazar' },
  },
  'En preparación': {
    right: null,
    left: { status: 'Cancelado', label: '← Cancelar' },
  },
  'En camino': {
    right: { status: 'En preparación', label: '→ Devolver' },
    left: { status: 'Cancelado', label: '← Cancelar' },
  },
  'Entregado': null,
  'Cancelado': null,
};

const HINTS = {
  'Pendiente': 'Desliza → para aceptar · ← para rechazar',
  'En preparación': 'Desliza ← para cancelar · los repartidores se asignan el pedido',
  'En camino': 'Desliza → para devolver a preparación · ← para cancelar',
  'Entregado': 'Pedidos entregados',
  'Cancelado': 'Pedidos cancelados',
};

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

export default function AdminOrders() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pendiente');
  const [askNotify, setAskNotify] = useState(
    notifySupported() && window.Notification.permission === 'default' && !localStorage.getItem('cheve:askedNotify')
  );

  const enableNotifications = async () => {
    const result = await requestNotifyPermission();
    localStorage.setItem('cheve:askedNotify', '1');
    setAskNotify(false);
    if (result === 'granted') showToast('Notificaciones activadas', { tone: 'success' });
  };

  const fetchData = useCallback(async () => {
    const [ordersRes, profilesRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, name, reference'),
    ]);
    if (ordersRes.data) setOrders(ordersRes.data);
    if (profilesRes.data) {
      setProfiles(Object.fromEntries(profilesRes.data.map((p) => [p.user_id, p])));
    }
    setLoading(false);
  }, []);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('user_id, name, reference');
    if (data) setProfiles(Object.fromEntries(data.map((p) => [p.user_id, p])));
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60000);

    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) =>
              prev.some((o) => o.id === payload.new.id) ? prev : [...prev, payload.new]
            );
            fetchProfiles();
            const total = Number(payload.new.total || 0).toFixed(2);
            const customer = payload.new.customer_name;
            const msg = customer
              ? `Nuevo pedido de ${customer} · Bs ${total}`
              : `Nuevo pedido · Bs ${total}`;
            showToast(msg, { tone: 'success', onClick: () => setFilter('Pendiente') });
            playBeep();
            browserNotify('Cheve.app', msg);
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
  }, [fetchData, fetchProfiles, showToast]);

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status,
                delivery_user_id:
                  status === 'Cancelado' || status === 'En preparación'
                    ? null
                    : o.delivery_user_id,
              }
            : o
        )
      );
    }
  };

  const doAction = (order, action) => {
    const customer = order.customer_name || 'el cliente';
    if (action.status === 'Cancelado') {
      const label = order.status === 'Pendiente' ? 'rechazar' : 'cancelar';
      if (!window.confirm(`¿${label === 'rechazar' ? 'Rechazar' : 'Cancelar'} el pedido de ${customer}?`)) {
        return;
      }
    } else if (action.status === 'En preparación' && order.status === 'En camino') {
      if (
        !window.confirm(
          `¿Devolver el pedido de ${customer} a "En preparación"? Se liberará para que otro repartidor lo tome.`
        )
      ) {
        return;
      }
    }
    updateStatus(order.id, action.status);
  };

  const visible = orders.filter((o) => o.status === filter);

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
      {askNotify && (
        <button onClick={enableNotifications} style={styles.notifyBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          Activar notificaciones de nuevos pedidos
        </button>
      )}

      <h2 style={styles.title}>Pedidos</h2>

      <p style={styles.hint}>{HINTS[filter]}</p>

      <div style={styles.chips}>
        {STATUSES.map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                ...styles.chip,
                ...(active ? styles.chipActive : {}),
                whiteSpace: 'nowrap',
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      {visible.length === 0 && <p style={styles.empty}>No hay pedidos</p>}

      {visible.map((order) => {
        const profile = profiles[order.user_id];
        const items = order.items || [];
        const itemCount = items.reduce((n, it) => n + (it.quantity || 1), 0);
        const actions = ADMIN_ACTIONS[order.status] || null;
        const deliveryProfile = order.delivery_user_id ? profiles[order.delivery_user_id] : null;
        const color = STATUS_COLORS[order.status] || STATUS_COLORS['Pendiente'];
        return (
          <SwipeCard
            key={order.id}
            onSwipeRight={
              actions?.right ? () => doAction(order, actions.right) : undefined
            }
            onSwipeLeft={
              actions?.left ? () => doAction(order, actions.left) : undefined
            }
            rightLabel={actions?.right?.label}
            leftLabel={actions?.left?.label}
          >
            <div style={styles.cardHead}>
              <div>
                <span style={styles.customer}>
                  {order.customer_name || profile?.name || 'Cliente'}
                </span>
                {profile?.reference && (
                  <span style={styles.reference}> · {profile.reference}</span>
                )}
                <span style={styles.date}> · llegó {timeAgo(order.created_at)}</span>
                {deliveryProfile && (
                  <span style={styles.delivery}> · Repartidor: {deliveryProfile.name}</span>
                )}
                <span style={styles.payment}>
                  {' '}· Pago: {order.payment_method === 'qr' ? 'QR' : 'Contra entrega'}
                </span>
              </div>
              <span
                style={{
                  ...styles.status,
                  background: color.bg,
                  color: color.fg,
                  borderColor: color.border,
                }}
              >
                {order.status}
              </span>
            </div>

            <div style={styles.foot}>
              <span style={styles.totalLabel}>
                {itemCount === 1 ? '1 producto' : `${itemCount} productos`}
              </span>
              <span style={styles.total}>Bs {Number(order.total).toFixed(2)}</span>
            </div>
          </SwipeCard>
        );
      })}
    </div>
  );
}

const styles = {
  title: { fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#fff' },
  notifyBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 14,
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(201,162,39,0.5)',
    background: 'rgba(201,162,39,0.12)',
    color: '#c9a227',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  chips: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    marginBottom: 16,
    scrollbarWidth: 'none',
  },
  chip: {
    padding: '8px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#cfcfcf',
    fontSize: 13,
    fontWeight: 600,
  },
  chipActive: {
    background: 'rgba(201,162,39,0.18)',
    border: '1px solid #c9a227',
    color: '#c9a227',
    fontWeight: 700,
  },
  empty: { fontSize: 13, color: '#8a8a8a', textAlign: 'center', marginTop: 40 },
  hint: {
    fontSize: 12,
    color: '#8a8a8a',
    margin: '-8px 0 14px',
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  customer: { fontSize: 14, fontWeight: 600, color: '#fff' },
  reference: { fontSize: 12, color: '#c9a227' },
  date: { fontSize: 12, color: '#8a8a8a' },
  delivery: { fontSize: 12, color: '#5b9bff' },
  payment: { fontSize: 12, color: '#7ee787' },
  status: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 8,
    border: '1px solid',
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
  },
  totalLabel: { fontSize: 13, color: '#8a8a8a' },
  total: { fontSize: 16, fontWeight: 800, color: '#c9a227' },
};
