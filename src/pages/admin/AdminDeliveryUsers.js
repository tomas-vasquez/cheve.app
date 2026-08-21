import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';

export default function AdminDeliveryUsers() {
  const { branchId } = useAuth();
  const [delivery, setDelivery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const feedbackTimer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (!branchId) {
      setDelivery([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, email, is_delivery, branch_id')
      .eq('is_delivery', true)
      .eq('branch_id', branchId)
      .order('name');
    if (data) setDelivery(data);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const showFeedback = (text) => {
    setFeedback(text);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 2600);
  };

  const toggle = async (user) => {
    const ok = await supabase.rpc('set_delivery', {
      p_email: user.email,
      p_flag: !user.is_delivery,
    });
    if (ok.error || !ok.data) {
      setError('No se pudo actualizar al repartidor.');
      return;
    }
    setError('');
    showFeedback(user.is_delivery ? '✓ Repartidor desactivado' : '✓ Repartidor activado');
    fetchData();
  };

  const add = async () => {
    setError('');
    if (!email.trim()) {
      setError('Escribe el correo del repartidor.');
      return;
    }
    setSaving(true);
    const res = await supabase.rpc('set_delivery', {
      p_email: email.trim(),
      p_flag: true,
    });
    setSaving(false);
    if (res.error || !res.data) {
      setError('No existe un usuario con ese correo.');
      return;
    }
    setEmail('');
    showFeedback('✓ Repartidor agregado');
    fetchData();
  };

  if (loading) {
    return (
      <div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} style={styles.card}>
            <Skeleton width="55%" height={15} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={13} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.title}>Repartidores</h2>

      {!branchId && (
        <p style={styles.warning}>
          Tu cuenta no tiene una sucursal asignada. Pídele al encargado de la BD que
          la asigne para poder gestionar repartidores.
        </p>
      )}

      <div style={styles.addCard}>
        <label style={styles.label}>Agregar repartidor por correo</label>
        <div style={styles.addRow}>
          <input
            type="email"
            placeholder="repartidor@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            disabled={!branchId}
          />
          <button style={styles.addButton} onClick={add} disabled={saving || !branchId}>
            {saving ? '...' : '+ Agregar'}
          </button>
        </div>
      </div>

      {feedback && (
        <p style={styles.feedback} role="status" aria-live="polite">
          {feedback}
        </p>
      )}
      {error && <p style={styles.error}>{error}</p>}

      {delivery.length === 0 && <p style={styles.empty}>Aún no hay repartidores</p>}

      {delivery.map((u) => (
        <div key={u.user_id} style={styles.card}>
          <div style={styles.cardInfo}>
            <span style={styles.name}>{u.name || 'Sin nombre'}</span>
            <span style={styles.details}>{u.email}</span>
          </div>
          <button
            style={u.is_delivery ? styles.onButton : styles.offButton}
            onClick={() => toggle(u)}
          >
            {u.is_delivery ? 'ON' : 'OFF'}
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  title: { fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#fff' },
  addCard: {
    padding: 16,
    borderRadius: 500,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    marginBottom: 16,
  },
  label: { display: 'block', fontSize: 13, color: '#cfcfcf', marginBottom: 8 },
  addRow: { display: 'flex', gap: 8 },
  input: {
    flex: 1,
    padding: '12px 14px',
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  },
  addButton: {
    background: '#1DB954',
    color: '#000',
    border: 'none',
    padding: '12px 18px',
    borderRadius: 500,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  feedback: { fontSize: 13, color: '#7ee787', margin: '0 0 12px' },
  warning: {
    fontSize: 13,
    color: '#ffb86b',
    background: 'rgba(255,184,107,0.1)',
    border: '1px solid rgba(255,184,107,0.35)',
    borderRadius: 500,
    padding: '10px 14px',
    margin: '0 0 12px',
  },
  error: { fontSize: 13, color: '#ff6b6b', margin: '0 0 12px' },
  empty: { fontSize: 13, color: '#8a8a8a', textAlign: 'center', marginTop: 40 },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    borderRadius: 500,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    marginBottom: 10,
  },
  cardInfo: { flex: 1, minWidth: 0 },
  name: { display: 'block', fontSize: 14, fontWeight: 600, color: '#fff' },
  details: {
    display: 'block',
    fontSize: 12,
    color: '#8a8a8a',
    marginTop: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  onButton: {
    padding: '6px 12px',
    borderRadius: 500,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    background: 'rgba(126,231,135,0.15)',
    color: '#7ee787',
    border: '1px solid rgba(126,231,135,0.4)',
  },
  offButton: {
    padding: '6px 12px',
    borderRadius: 500,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    color: '#8a8a8a',
    border: '1px solid rgba(255,255,255,0.15)',
  },
};
