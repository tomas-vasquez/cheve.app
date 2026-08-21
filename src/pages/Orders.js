import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { browserNotify, playBeep } from '../lib/notify';
import Skeleton from '../components/Skeleton';

export default function Orders({ hideTitle }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setOrders(data);
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel(`my-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) =>
              prev.some((o) => o.id === payload.new.id) ? prev : [payload.new, ...prev]
            );
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new : o))
            );
            const oldStatus = payload.old?.status;
            const newStatus = payload.new.status;
            if (oldStatus && oldStatus !== newStatus) {
              const msg = `Tu pedido ahora está: ${newStatus}`;
              showToast(msg, { tone: newStatus === 'Cancelado' ? 'error' : 'info' });
              playBeep();
              browserNotify('Cheve.app', msg);
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
            showToast('Tu pedido fue cancelado', { tone: 'error' });
            playBeep();
            browserNotify('Cheve.app', 'Tu pedido fue cancelado');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, showToast]);

  return (
    <div style={styles.section}>
      {!hideTitle && <h2 style={styles.sectionTitle}>Mis pedidos</h2>}

      {loading && (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={styles.card}>
              <div style={styles.cardHeader}>
                <Skeleton width={90} height={12} />
                <Skeleton width={60} height={12} />
              </div>
              <Skeleton width="80%" height={12} style={{ margin: '6px 0' }} />
              <Skeleton width="60%" height={12} style={{ margin: '6px 0' }} />
            </div>
          ))}
        </div>
      )}
      {!loading && orders.length === 0 && (
        <p style={styles.empty}>Aún no tienes pedidos</p>
      )}

      {orders.map((order) => (
        <div key={order.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.date}>
              {new Date(order.created_at).toLocaleString('es-MX', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
            <div style={styles.headerRight}>
              <span style={styles.status(order.status)}>{order.status}</span>
              <span style={styles.total}>Bs {Number(order.total).toFixed(2)}</span>
            </div>
          </div>
          {order.items.map((item, i) => (
            <div key={i} style={styles.itemRow}>
              <span style={styles.itemName}>
                {item.name} <span style={styles.itemQty}>x{item.quantity}</span>
                {item.options && item.options.length > 0 && (
                  <span style={styles.itemOptions}>{item.options.join(', ')}</span>
                )}
              </span>
              <span style={styles.itemPrice}>
                Bs {(Number(item.price) * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const styles = {
  section: { marginTop: 20, textAlign: 'left' },
  sectionTitle: {
    fontSize: 14, fontWeight: 600, color: '#1DB954', margin: '0 0 12px',
  },
  empty: { fontSize: 13, color: '#8a8a8a', margin: '12px 0 0' },
  card: {
    padding: 16,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    marginBottom: 12,
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 10, marginBottom: 8,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  date: { fontSize: 13, color: '#cfcfcf' },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  status: (s) => ({
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    ...(s === 'Entregado'
      ? { background: 'rgba(34,197,94,0.18)', color: '#4ade80' }
      : s === 'En camino'
        ? { background: 'rgba(29, 185, 84,0.18)', color: '#1DB954' }
        : { background: 'rgba(255,255,255,0.1)', color: '#cfcfcf' }),
  }),
  total: { fontWeight: 700, color: '#1DB954' },
  itemRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 0',
  },
  itemName: { fontSize: 14, color: '#fff' },
  itemOptions: { display: 'block', fontSize: 12, color: '#8a8a8a', marginTop: 2 },
  itemQty: { color: '#8a8a8a', fontSize: 12 },
  itemPrice: { fontSize: 14, color: '#cfcfcf' },
};
