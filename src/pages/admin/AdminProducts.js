import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';
import ImageCropper from '../../components/ImageCropper';

const EMPTY = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock: '',
  image_url: '',
  abv: '',
  pack_of: '',
  units_per_pack: '12',
};

export default function AdminProducts() {
  const { branchId, user } = useAuth();
  const canManage = user?.id === '721ecd1b-204c-48cc-83f5-aa7ad2265d2c';
  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryHover, setCategoryHover] = useState(null);
  const feedbackTimer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: pData } = await supabase.from('products').select('*').order('name');
    if (pData) setProducts(pData);
    if (branchId) {
      const { data: sData } = await supabase
        .from('branch_stock')
        .select('product_id, stock')
        .eq('branch_id', branchId);
      const map = {};
      (sData || []).forEach((r) => {
        map[r.product_id] = r.stock;
      });
      setStockMap(map);
    } else {
      setStockMap({});
    }
    setLoading(false);
  }, [branchId]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null);
    if (data) {
      setCategories([...new Set(data.map((c) => c.category).filter(Boolean))].sort());
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [fetchData, fetchCategories]);

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
      stock: stockMap[p.id] ?? '',
      image_url: p.image_url || '',
      abv: p.abv ?? '',
      pack_of: p.pack_of || '',
      units_per_pack: p.units_per_pack ?? '12',
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
    if (!branchId) {
      setError(
        'Tu cuenta no tiene una sucursal asignada. Asígnala en la BD para gestionar stock.'
      );
      return;
    }
    const stock = form.stock === '' ? 0 : Number(form.stock);
    const isPack = !!form.pack_of;
    const unitsPerPack = Math.max(1, Math.floor(Number(form.units_per_pack) || 1));
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      category: form.category.trim() || null,
      image_url: form.image_url.trim() || null,
      abv: form.abv === '' ? null : Number(form.abv),
      pack_of: isPack ? form.pack_of : null,
      units_per_pack: isPack ? unitsPerPack : 1,
    };
    setSaving(true);
    let productId = editor.id;
    let res;
    if (editor.id) {
      res = await supabase.from('products').update(payload).eq('id', editor.id);
    } else {
      res = await supabase.from('products').insert(payload).select('id');
      if (!res.error && res.data?.[0]) productId = res.data[0].id;
    }
    if (res.error) {
      setSaving(false);
      setError(res.error.message);
      return;
    }
    if (productId && !isPack) {
      const stockRes = await supabase.from('branch_stock').upsert(
        { branch_id: branchId, product_id: productId, stock },
        { onConflict: 'branch_id,product_id' }
      );
      if (stockRes.error) {
        setSaving(false);
        setError(stockRes.error.message);
        return;
      }
    }
    setSaving(false);
    setEditor(null);
    showFeedback(editor.id ? '✓ Producto actualizado' : '✓ Producto creado');
    fetchData();
    fetchCategories();
  };

  const remove = async (id, name) => {
    if (!window.confirm(`¿Eliminar el producto "${name}"?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showFeedback('✓ Producto eliminado');
    }
  };

  const isPack = !!form.pack_of;
  const baseProducts = products.filter((p) => p.id !== editor?.id && !p.pack_of);

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
        {canManage && (
          <button style={styles.newButton} onClick={openNew}>
            + Nuevo
          </button>
        )}
      </div>

      {!canManage && (
        <p style={styles.warning}>
          Solo el encargado puede agregar o editar productos.
        </p>
      )}

      {!branchId && (
        <p style={styles.warning}>
          Tu cuenta no tiene una sucursal asignada. Pídele al encargado de la BD que
          asigne tu sucursal para poder gestionar stock.
        </p>
      )}

      {feedback && (
        <p style={styles.feedback} role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      {products.length === 0 && <p style={styles.empty}>No hay productos</p>}

      {(() => {
        const nameById = Object.fromEntries(products.map((p) => [p.id, p.name]));
        return products.map((p) => (
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
              {p.pack_of && (
                <span style={{ color: '#1DB954' }}>
                  {' '}
                  · Pack de {nameById[p.pack_of] || '?'} × {p.units_per_pack}
                </span>
              )}
              {!p.pack_of && (
                <span style={{ color: (stockMap[p.id] ?? 0) <= 0 ? '#ff6b6b' : '#7ee787' }}>
                  {' '}
                  · Stock: {stockMap[p.id] ?? 0}
                </span>
              )}
            </span>
          </div>
          <div style={styles.actions}>
            {canManage && (
              <>
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
              </>
            )}
          </div>
        </div>
        ));
      })()}

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
            <div style={styles.categoryWrap}>
              <input
                type="text"
                placeholder="Ej: Cervezas"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                onFocus={() => setCategoryOpen(true)}
                onBlur={() => setTimeout(() => setCategoryOpen(false), 120)}
                style={styles.input}
              />
              {categoryOpen && (
                <div style={styles.categoryList}>
                  {categories
                    .filter((c) =>
                      c.toLowerCase().includes(form.category.trim().toLowerCase())
                    )
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setField('category', c);
                          setCategoryOpen(false);
                        }}
                        onMouseEnter={() => setCategoryHover(c)}
                        onMouseLeave={() => setCategoryHover(null)}
                        style={{
                          ...styles.categoryItem,
                          ...(categoryHover === c ? styles.categoryItemActive : {}),
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  {categories.filter((c) =>
                    c.toLowerCase().includes(form.category.trim().toLowerCase())
                  ).length === 0 && (
                    <span style={styles.categoryEmpty}>Sin coincidencias</span>
                  )}
                </div>
              )}
            </div>

            <label style={styles.label}>Es pack de (producto unidad)</label>
            <select
              value={form.pack_of}
              onChange={(e) => setField('pack_of', e.target.value)}
              style={styles.input}
            >
              <option value="">— Ninguno (producto normal) —</option>
              {baseProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {isPack && (
              <>
                <label style={styles.label}>Unidades por pack</label>
                <input
                  type="number"
                  min="1"
                  value={form.units_per_pack}
                  onChange={(e) => setField('units_per_pack', e.target.value)}
                  style={styles.input}
                />
                <p style={styles.packHint}>
                  El stock de este pack se gestiona desde la pestaña Stock (en packs);
                  se guarda como unidades del producto base.
                </p>
              </>
            )}

            {!isPack && (
              <>
                <label style={styles.label}>Stock en tu sucursal</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setField('stock', e.target.value)}
                  style={styles.input}
                />
              </>
            )}

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
                    const file = e.target.files[0];
                    e.target.value = '';
                    if (!file) return;
                    setUploadError('');
                    if (!file.type.startsWith('image/')) {
                      setUploadError('Selecciona un archivo de imagen.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setPendingImage(reader.result);
                    reader.readAsDataURL(file);
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

      {pendingImage && (
        <ImageCropper
          imageSrc={pendingImage}
          onCancel={() => setPendingImage(null)}
          onComplete={async (file) => {
            setPendingImage(null);
            await uploadImage(file);
          }}
        />
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
  warning: {
    fontSize: 13,
    color: '#ffb86b',
    background: 'rgba(255,184,107,0.1)',
    border: '1px solid rgba(255,184,107,0.35)',
    borderRadius: 500,
    padding: '10px 14px',
    margin: '0 0 12px',
  },
  empty: { fontSize: 13, color: '#8a8a8a', textAlign: 'center', marginTop: 40 },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 500,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    marginBottom: 10,
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 500,
    objectFit: 'cover',
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  productThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 500,
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
    borderRadius: 500,
    cursor: 'pointer',
    background: 'rgba(29, 185, 84,0.18)',
    border: '1px solid #1DB954',
    color: '#1DB954',
    flexShrink: 0,
  },
  uploadText: { fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' },
  inputInline: {
    flex: 1,
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  categoryWrap: { position: 'relative' },
  categoryList: {
    position: 'absolute',
    top: 'calc(100% - 12px)',
    left: 0,
    right: 0,
    zIndex: 10,
    maxHeight: 190,
    overflowY: 'auto',
    background: 'rgba(24,24,26,0.98)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 500,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  categoryItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  categoryItemActive: {
    background: 'rgba(29, 185, 84,0.15)',
    color: '#1DB954',
  },
  categoryEmpty: {
    display: 'block',
    padding: '12px 14px',
    fontSize: 13,
    color: '#8a8a8a',
  },
  previewBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 500,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    margin: '-8px 0 16px',
  },
  previewImg: {
    width: 56,
    height: 56,
    borderRadius: 500,
    objectFit: 'cover',
    flexShrink: 0,
    background: 'rgba(255,255,255,0.05)',
  },
  previewNote: { fontSize: 12, color: '#8a8a8a' },
  error: { fontSize: 13, color: '#ff6b6b', margin: '0 0 12px' },
  packHint: {
    fontSize: 12,
    color: '#ffb86b',
    background: 'rgba(255,184,107,0.1)',
    border: '1px solid rgba(255,184,107,0.35)',
    borderRadius: 500,
    padding: '8px 12px',
    margin: '-8px 0 16px',
  },
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
