import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Skeleton from '../../components/Skeleton';

const CATEGORIES = ['Bicarbonatos saborizados', 'Café', 'Estevia', 'Otros'];
const EMPTY = {
  name: '',
  category: CATEGORIES[0],
  price: '',
  sort_order: '',
};

export default function AdminCondiments() {
  const [condiments, setCondiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const feedbackTimer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('condiments')
      .select('*')
      .order('sort_order')
      .order('name');
    if (data) setCondiments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const showFeedback = (text) => {
    setFeedback(text);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 2200);
  };

  const openNew = () => {
    setForm(EMPTY);
    setError('');
    setEditor({ id: null });
  };

  const openEdit = (c) => {
    setForm({
      name: c.name || '',
      category: c.category || CATEGORIES[0],
      price: c.price ?? '',
      sort_order: c.sort_order ?? '',
    });
    setError('');
    setEditor({ id: c.id });
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category || CATEGORIES[0],
      price: Number(form.price) || 0,
      sort_order: form.sort_order === '' ? 0 : Number(form.sort_order),
    };
    setSaving(true);
    const res = editor.id
      ? await supabase.from('condiments').update(payload).eq('id', editor.id)
      : await supabase.from('condiments').insert(payload);
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setEditor(null);
    showFeedback(editor.id ? '✓ Ingrediente actualizado' : '✓ Ingrediente creado');
    fetchData();
  };

  const toggleActive = async (c) => {
    const { error } = await supabase
      .from('condiments')
      .update({ active: !c.active })
      .eq('id', c.id);
    if (!error) {
      setCondiments((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x))
      );
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`¿Eliminar el ingrediente "${name}"?`)) return;
    const { error } = await supabase.from('condiments').delete().eq('id', id);
    if (!error) {
      setCondiments((prev) => prev.filter((c) => c.id !== id));
      showFeedback('✓ Ingrediente eliminado');
    }
  };

  if (loading) {
    return (
      <div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={styles.card}>
            <Skeleton width="55%" height={15} style={{ marginBottom: 8 }} />
            <Skeleton width="30%" height={13} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={styles.head}>
        <h2 style={styles.title}>Ingredientes</h2>
        <button style={styles.newButton} onClick={openNew}>
          + Nuevo
        </button>
      </div>

      {feedback && (
        <p style={styles.feedback} role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      {condiments.length === 0 && <p style={styles.empty}>No hay ingredientes</p>}

      {condiments.map((c) => (
        <div key={c.id} style={styles.card}>
          <div style={styles.cardInfo}>
            <span style={styles.name}>
              {c.name}{' '}
              {!c.active && <span style={styles.inactive}>inactivo</span>}
            </span>
            <span style={styles.details}>
              {c.category} · +Bs {Number(c.price).toFixed(2)}
            </span>
          </div>
          <div style={styles.actions}>
            <button
              style={{ ...styles.toggleButton, ...(c.active ? styles.toggleOn : {}) }}
              aria-label={c.active ? 'Desactivar ingrediente' : 'Activar ingrediente'}
              onClick={() => toggleActive(c)}
            >
              {c.active ? 'ON' : 'OFF'}
            </button>
            <button
              style={styles.editButton}
              aria-label={`Editar ${c.name}`}
              onClick={() => openEdit(c)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
              </svg>
            </button>
            <button
              style={styles.deleteButton}
              aria-label={`Eliminar ${c.name}`}
              onClick={() => remove(c.id, c.name)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {editor && (
        <div style={styles.overlay} onClick={() => !saving && setEditor(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editor.id ? 'Editar ingrediente' : 'Nuevo ingrediente'}
            </h3>

            <label style={styles.label}>Nombre *</label>
            <input
              type="text"
              placeholder="Ej: Chicle"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              style={styles.input}
              autoFocus
            />

            <label style={styles.label}>Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              style={styles.input}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <label style={styles.label}>Precio adicional (Bs / libra)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Orden</label>
            <input
              type="number"
              min="0"
              value={form.sort_order}
              onChange={(e) => setField('sort_order', e.target.value)}
              style={styles.input}
            />

            {error && <p style={styles.error}>{error}</p>}

            <div style={styles.actionsRow}>
              <button
                style={styles.cancelButton}
                onClick={() => setEditor(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button style={styles.saveButton} onClick={save} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  newButton: {
    background: '#c9a227',
    color: '#000',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
  feedback: { fontSize: 13, color: '#7ee787', margin: '0 0 12px' },
  empty: { fontSize: 13, color: '#8a8a8a', textAlign: 'center', marginTop: 40 },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    marginBottom: 10,
  },
  cardInfo: { flex: 1, minWidth: 0 },
  name: { display: 'block', fontSize: 14, fontWeight: 600, color: '#fff' },
  inactive: {
    fontSize: 10,
    fontWeight: 700,
    color: '#8a8a8a',
    marginLeft: 6,
    padding: '2px 6px',
    borderRadius: 5,
    background: 'rgba(255,255,255,0.08)',
  },
  details: {
    display: 'block',
    fontSize: 12,
    color: '#8a8a8a',
    marginTop: 2,
  },
  actions: { display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' },
  toggleButton: {
    padding: '6px 10px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    color: '#8a8a8a',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  toggleOn: {
    background: 'rgba(126,231,135,0.15)',
    color: '#7ee787',
    border: '1px solid rgba(126,231,135,0.4)',
  },
  editButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    padding: 0,
    background: 'rgba(255,255,255,0.08)',
    color: '#cfcfcf',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    padding: 0,
    background: 'rgba(255,107,107,0.12)',
    color: '#ff6b6b',
    border: '1px solid rgba(255,107,107,0.4)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 30,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: 24,
    borderRadius: 20,
    background: 'rgba(18,18,18,0.98)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  modalTitle: { fontSize: 20, fontWeight: 700, margin: '0 0 18px', color: '#fff' },
  label: { display: 'block', fontSize: 13, color: '#cfcfcf', marginBottom: 6 },
  input: {
    width: '100%',
    marginBottom: 16,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  error: { fontSize: 13, color: '#ff6b6b', margin: '0 0 12px' },
  actionsRow: { display: 'flex', gap: 10, marginTop: 6 },
  cancelButton: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    cursor: 'pointer',
    padding: 13,
    borderRadius: 10,
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
  },
  saveButton: {
    backgroundColor: '#c9a227',
    color: '#000',
    border: 'none',
    padding: 13,
    borderRadius: 10,
    flex: 1,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
};
