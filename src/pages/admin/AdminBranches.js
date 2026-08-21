import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';

export default function AdminBranches() {
  const { branchId } = useAuth();
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    delivery_radius_km: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const feedbackTimer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (branchId) {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .maybeSingle();
      if (data) {
        setBranch(data);
        setForm({
          name: data.name || '',
          address: data.address || '',
          lat: data.lat ?? '',
          lng: data.lng ?? '',
          delivery_radius_km: data.delivery_radius_km ?? '',
          active: data.active !== false,
        });
      }
    } else {
      setBranch(null);
    }
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const showFeedback = (text) => {
    setFeedback(text);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 2200);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (form.lat === '' || form.lng === '') {
      setError('Las coordenadas (lat/lng) son obligatorias.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      lat: Number(form.lat),
      lng: Number(form.lng),
      delivery_radius_km: form.delivery_radius_km === '' ? 5 : Number(form.delivery_radius_km),
      active: form.active,
    };
    const { error: saveError } = await supabase
      .from('branches')
      .update(payload)
      .eq('id', branchId);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    showFeedback('✓ Sucursal actualizada');
  };

  if (loading) {
    return (
      <div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={styles.card}>
            <Skeleton width="60%" height={15} style={{ marginBottom: 8 }} />
            <Skeleton width="35%" height={13} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.title}>Mi sucursal</h2>

      {!branch ? (
        <p style={styles.warning}>
          Tu cuenta no tiene una sucursal asignada. Pídele al encargado de la BD que
          cree tu sucursal y la asigne a tu usuario.
        </p>
      ) : (
        <>
          {feedback && (
            <p style={styles.feedback} role="status" aria-live="polite">
              {feedback}
            </p>
          )}

          <label style={styles.label}>Nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Dirección</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
            style={styles.input}
          />

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Latitud *</label>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setField('lat', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Longitud *</label>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setField('lng', e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <label style={styles.label}>Radio de entrega (km)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.delivery_radius_km}
            onChange={(e) => setField('delivery_radius_km', e.target.value)}
            style={styles.input}
          />

          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField('active', e.target.checked)}
              style={styles.checkbox}
            />
            Sucursal activa (acepta pedidos)
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.saveButton} onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar sucursal'}
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#fff' },
  warning: {
    fontSize: 13,
    color: '#ffb86b',
    background: 'rgba(255,184,107,0.1)',
    border: '1px solid rgba(255,184,107,0.35)',
    borderRadius: 500,
    padding: '12px 14px',
    lineHeight: 1.5,
  },
  feedback: { fontSize: 13, color: '#7ee787', margin: '0 0 12px' },
  error: { fontSize: 13, color: '#ff6b6b', margin: '0 0 12px' },
  label: { display: 'block', fontSize: 13, color: '#cfcfcf', marginBottom: 6 },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#cfcfcf',
    marginBottom: 16,
    cursor: 'pointer',
  },
  checkbox: { width: 18, height: 18, accentColor: '#1DB954' },
  input: {
    width: '100%',
    marginBottom: 16,
    padding: '12px 14px',
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  row: { display: 'flex', gap: 10 },
  col: { flex: 1, minWidth: 0 },
  saveButton: {
    backgroundColor: '#1DB954',
    color: '#000',
    border: 'none',
    padding: 13,
    borderRadius: 500,
    width: '100%',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
};
