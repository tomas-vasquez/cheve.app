import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Skeleton from '../../components/Skeleton';

const PRESETS = [
  'linear-gradient(135deg, #1DB954 0%, #12823a 100%)',
  'linear-gradient(135deg, #3a7bd5 0%, #1e3c72 100%)',
  'linear-gradient(135deg, #d53a8d 0%, #7a1e5c 100%)',
  'linear-gradient(135deg, #0f8f5f 0%, #08543a 100%)',
];

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState({ title: '', subtitle: '', background: PRESETS[0], sort_order: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const feedbackTimer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order')
      .order('created_at');
    if (data) setBanners(data);
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
    setForm({ title: '', subtitle: '', background: PRESETS[0], sort_order: '' });
    setError('');
    setEditor({ id: null });
  };

  const openEdit = (b) => {
    setForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      background: b.background || PRESETS[0],
      sort_order: b.sort_order ?? '',
    });
    setError('');
    setEditor({ id: b.id });
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setError('');
    if (!form.title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || '',
      background: form.background.trim() || PRESETS[0],
      sort_order: form.sort_order === '' ? 0 : Number(form.sort_order),
    };
    setSaving(true);
    const res = editor.id
      ? await supabase.from('banners').update(payload).eq('id', editor.id)
      : await supabase.from('banners').insert({ ...payload, active: true });
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setEditor(null);
    showFeedback(editor.id ? '✓ Banner actualizado' : '✓ Banner creado');
    fetchData();
  };

  const toggleActive = async (b) => {
    const { error } = await supabase
      .from('banners')
      .update({ active: !b.active })
      .eq('id', b.id);
    if (!error) {
      setBanners((prev) =>
        prev.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x))
      );
    }
  };

  const remove = async (id, title) => {
    if (!window.confirm(`¿Eliminar el banner "${title}"?`)) return;
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (!error) {
      setBanners((prev) => prev.filter((b) => b.id !== id));
      showFeedback('✓ Banner eliminado');
    }
  };

  if (loading) {
    return (
      <div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} style={styles.card}>
            <Skeleton width="60%" height={15} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={13} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={styles.head}>
        <h2 style={styles.title}>Banners</h2>
        <button style={styles.newButton} onClick={openNew}>
          + Nuevo
        </button>
      </div>

      {feedback && (
        <p style={styles.feedback} role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      {banners.length === 0 && (
        <p style={styles.empty}>
          No hay banners. Se muestran los de prueba mientras tanto.
        </p>
      )}

      {banners.map((b) => (
        <div key={b.id} style={styles.card}>
          <div style={styles.preview}>
            <h3 style={styles.previewTitle}>{b.title}</h3>
            <p style={styles.previewSubtitle}>{b.subtitle}</p>
          </div>
          <div style={styles.cardRow}>
            <div style={styles.cardInfo}>
              <span style={styles.name}>
                {b.title}{' '}
                {!b.active && <span style={styles.inactive}>inactivo</span>}
              </span>
              <span style={styles.details}>Orden: {b.sort_order}</span>
            </div>
            <div style={styles.actions}>
              <button
                style={{ ...styles.toggleButton, ...(b.active ? styles.toggleOn : {}) }}
                aria-label={b.active ? 'Desactivar banner' : 'Activar banner'}
                onClick={() => toggleActive(b)}
              >
                {b.active ? 'ON' : 'OFF'}
              </button>
              <button
                style={styles.editButton}
                aria-label={`Editar ${b.title}`}
                onClick={() => openEdit(b)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                </svg>
              </button>
              <button
                style={styles.deleteButton}
                aria-label={`Eliminar ${b.title}`}
                onClick={() => remove(b.id, b.title)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}

      {editor && (
        <div style={styles.overlay} onClick={() => !saving && setEditor(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editor.id ? 'Editar banner' : 'Nuevo banner'}
            </h3>

            <label style={styles.label}>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              style={styles.input}
              autoFocus
            />

            <label style={styles.label}>Subtítulo</label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setField('subtitle', e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Fondo</label>
            <div style={styles.presets}>
              {PRESETS.map((bg) => (
                <button
                  key={bg}
                  onClick={() => setField('background', bg)}
                  style={{
                    ...styles.swatch,
                    background: bg,
                    ...(form.background === bg ? styles.swatchActive : {}),
                  }}
                  aria-label="Elegir fondo"
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="o escribe un gradiente/color CSS"
              value={form.background}
              onChange={(e) => setField('background', e.target.value)}
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

            <div style={{ ...styles.preview, ...styles.previewLive, background: form.background }}>
              <h3 style={styles.previewTitle}>{form.title || 'Título'}</h3>
              <p style={styles.previewSubtitle}>{form.subtitle || 'Subtítulo'}</p>
            </div>

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
    background: '#1DB954',
    color: '#000',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 500,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
  feedback: { fontSize: 13, color: '#7ee787', margin: '0 0 12px' },
  empty: { fontSize: 13, color: '#8a8a8a', textAlign: 'center', marginTop: 40 },
  card: {
    padding: 14,
    borderRadius: 500,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    marginBottom: 12,
  },
  preview: {
    height: 90,
    borderRadius: 500,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: '0 16px',
    marginBottom: 12,
  },
  previewTitle: { fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' },
  previewSubtitle: { fontSize: 12, margin: '4px 0 0', color: 'rgba(255,255,255,0.85)' },
  previewLive: { height: 70, marginTop: 4 },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
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
  details: { display: 'block', fontSize: 12, color: '#8a8a8a', marginTop: 2 },
  actions: { display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' },
  toggleButton: {
    padding: '6px 10px',
    borderRadius: 500,
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
    borderRadius: 500,
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
    borderRadius: 500,
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
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  presets: { display: 'flex', gap: 10, marginBottom: 12 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 500,
    border: '2px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    padding: 0,
  },
  swatchActive: { borderColor: '#fff' },
  error: { fontSize: 13, color: '#ff6b6b', margin: '0 0 12px' },
  actionsRow: { display: 'flex', gap: 10, marginTop: 6 },
  cancelButton: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    cursor: 'pointer',
    padding: 13,
    borderRadius: 500,
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
  },
  saveButton: {
    backgroundColor: '#1DB954',
    color: '#000',
    border: 'none',
    padding: 13,
    borderRadius: 500,
    flex: 1,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
};
