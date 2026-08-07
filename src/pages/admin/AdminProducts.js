import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Skeleton from '../../components/Skeleton';

const EMPTY = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock: '',
  image_url: '',
  abv: '',
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const feedbackTimer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
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
    setUploadError('');
    setEditor({ id: null });
  };

  const openEdit = (p) => {
    setForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price ?? '',
      category: p.category || '',
      stock: p.stock ?? '',
      image_url: p.image_url || '',
      abv: p.abv ?? '',
    });
    setError('');
    setUploadError('');
    setEditor({ id: p.id });
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadImage = async (file) => {
    setUploadError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Selecciona un archivo de imagen.');
      return;
    }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    setUploading(true);
    const { error } = await supabase.storage
      .from('products')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('products').getPublicUrl(path);
    setField('image_url', data.publicUrl);
    setUploading(false);
  };

  const save = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      category: form.category.trim() || null,
      stock: form.stock === '' ? 0 : Number(form.stock),
      image_url: form.image_url.trim() || null,
      abv: form.abv === '' ? null : Number(form.abv),
    };
    setSaving(true);
    const res = editor.id
      ? await supabase.from('products').update(payload).eq('id', editor.id)
      : await supabase.from('products').insert(payload);
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setEditor(null);
    showFeedback(editor.id ? '✓ Producto actualizado' : '✓ Producto creado');
    fetchData();
  };

  const remove = async (id, name) => {
    if (!window.confirm(`¿Eliminar el producto "${name}"?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showFeedback('✓ Producto eliminado');
    }
  };

  if (loading) {
    return (
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
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
      <div style={styles.head}>
        <h2 style={styles.title}>Productos</h2>
        <button style={styles.newButton} onClick={openNew}>
          + Nuevo
        </button>
      </div>

      {feedback && (
        <p style={styles.feedback} role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      {products.length === 0 && <p style={styles.empty}>No hay productos</p>}

      {products.map((p) => (
        <div key={p.id} style={styles.card}>
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} style={styles.productThumb} />
          ) : (
            <div style={styles.productThumbPlaceholder}>🍺</div>
          )}
          <div style={styles.cardInfo}>
            <span style={styles.name}>{p.name}</span>
            <span style={styles.details}>
              {p.category || 'Sin categoría'} · Bs {Number(p.price).toFixed(2)}
              {p.stock !== null && p.stock !== undefined && (
                <> · Stock: {p.stock}</>
              )}
            </span>
          </div>
          <div style={styles.actions}>
            <button
              style={styles.editButton}
              aria-label={`Editar ${p.name}`}
              onClick={() => openEdit(p)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
              </svg>
            </button>
            <button
              style={styles.deleteButton}
              aria-label={`Eliminar ${p.name}`}
              onClick={() => remove(p.id, p.name)}
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
              {editor.id ? 'Editar producto' : 'Nuevo producto'}
            </h3>

            <label style={styles.label}>Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              style={styles.input}
              autoFocus
            />

            <label style={styles.label}>Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Precio (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Categoría</label>
            <input
              type="text"
              placeholder="Ej: Cervezas"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Stock</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setField('stock', e.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Imagen</label>
            <div style={styles.uploadRow}>
              <label style={styles.uploadButton}>
                {uploading ? (
                  <span style={styles.uploadText}>Subiendo...</span>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m17 8-5-5-5 5" />
                      <path d="M12 3v12" />
                    </svg>
                    <span style={styles.uploadText}>Subir imagen</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={(e) => {
                    uploadImage(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              <input
                type="text"
                placeholder="o pega una URL directa https://i.ibb.co/..."
                value={form.image_url}
                onChange={(e) => setField('image_url', e.target.value)}
                style={styles.inputInline}
              />
            </div>
            {uploadError && <p style={styles.error}>{uploadError}</p>}
            {form.image_url.trim() && (
              <div style={styles.previewBox}>
                <img
                  src={form.image_url.trim()}
                  alt="Vista previa"
                  style={styles.previewImg}
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden';
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.visibility = 'visible';
                  }}
                />
                <span style={styles.previewNote}>Vista previa de la imagen</span>
              </div>
            )}

            <label style={styles.label}>ABV (%)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.abv}
              onChange={(e) => setField('abv', e.target.value)}
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
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    marginBottom: 10,
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  productThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.1)',
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
  actions: { display: 'flex', gap: 6, flexShrink: 0 },
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
  uploadRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    background: 'rgba(201,162,39,0.18)',
    border: '1px solid #c9a227',
    color: '#c9a227',
    flexShrink: 0,
  },
  uploadText: { fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' },
  inputInline: {
    flex: 1,
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  previewBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    margin: '-8px 0 16px',
  },
  previewImg: {
    width: 56,
    height: 56,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
    background: 'rgba(255,255,255,0.05)',
  },
  previewNote: { fontSize: 12, color: '#8a8a8a' },
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
