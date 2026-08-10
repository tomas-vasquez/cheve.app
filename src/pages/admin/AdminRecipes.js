import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Skeleton from '../../components/Skeleton';
import ImageCropper from '../../components/ImageCropper';

const BASE_PRICE = 15;
const CATEGORIES = ['Bicarbonatos saborizados', 'Café', 'Estevia', 'Otros'];
const PORCIONES = [
  { value: 0.25, label: 'Cuartilla (¼)' },
  { value: 0.125, label: 'Media cuartilla (⅛)' },
];

const STEPS = [
  { id: 1, label: 'Nombre y cantidad' },
  { id: 2, label: 'Ingredientes' },
  { id: 3, label: 'Cantidades' },
  { id: 4, label: 'Confirmación' },
];

const EMPTY = {
  name: '',
  cantidad: 0.25,
  sort_order: '',
  image_url: '',
  condiment_ids: [],
};

export default function AdminRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [condiments, setCondiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [step, setStep] = useState(1);
  const feedbackTimer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [recRes, condRes] = await Promise.all([
      supabase
        .from('preset_recipes')
        .select('*')
        .order('sort_order')
        .order('name'),
      supabase.from('condiments').select('*').eq('active', true).order('sort_order').order('name'),
    ]);
    if (recRes.data) setRecipes(recRes.data);
    if (condRes.data) setCondiments(condRes.data);
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
    setStep(1);
  };

  const openEdit = (r) => {
    setForm({
      name: r.name || '',
      cantidad: Number(r.cantidad) || 1,
      sort_order: r.sort_order ?? '',
      image_url: r.image_url || '',
      condiment_ids: (r.condiment_ids || []).map((c) => {
        const id = typeof c === 'string' ? c : String(c.id);
        return { id, grams: typeof c === 'string' ? 10 : Number(c.grams) || 10 };
      }),
    });
    setError('');
    setUploadError('');
    setEditor({ id: r.id });
    setStep(1);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCondiment = (id) => {
    setForm((prev) => {
      const has = prev.condiment_ids.some((x) => x.id === id);
      return {
        ...prev,
        condiment_ids: has
          ? prev.condiment_ids.filter((x) => x.id !== id)
          : [...prev.condiment_ids, { id, grams: 10 }],
      };
    });
  };

  const setGrams = (id, grams) => {
    setForm((prev) => ({
      ...prev,
      condiment_ids: prev.condiment_ids.map((x) =>
        x.id === id ? { ...x, grams } : x
      ),
    }));
  };

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
      .from('recipes')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('recipes').getPublicUrl(path);
    setField('image_url', data.publicUrl);
    setUploading(false);
  };

  const goNext = () => {
    setError('');
    if (step === 1) {
      if (!form.name.trim()) {
        setError('Escribe un nombre para la receta.');
        return;
      }
      if (!form.cantidad || form.cantidad <= 0) {
        setError('Elige una cantidad.');
        return;
      }
    } else if (step === 2) {
      if (form.condiment_ids.length === 0) {
        setError('Selecciona al menos un ingrediente.');
        return;
      }
    } else if (step === 3) {
      const invalid = form.condiment_ids.some(
        (x) => !x.grams || Number(x.grams) <= 0 || Number(x.grams) % 10 !== 0
      );
      if (invalid) {
        setError('Indica la cantidad en gramos de cada ingrediente (múltiplos de 10, mayor a 0).');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const save = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (form.condiment_ids.length === 0) {
      setError('Selecciona al menos un ingrediente.');
      return;
    }
    const invalid = form.condiment_ids.some(
      (x) => !x.grams || Number(x.grams) <= 0 || Number(x.grams) % 10 !== 0
    );
    if (invalid) {
      setError('Indica la cantidad en gramos de cada ingrediente (múltiplos de 10, mayor a 0).');
      return;
    }
    if (!form.cantidad || form.cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      cantidad: Number(form.cantidad),
      sort_order: form.sort_order === '' ? 0 : Number(form.sort_order),
      image_url: form.image_url.trim() || null,
      condiment_ids: form.condiment_ids.map((x) => ({
        id: x.id,
        grams: Number(x.grams),
      })),
    };
    setSaving(true);
    const res = editor.id
      ? await supabase.from('preset_recipes').update(payload).eq('id', editor.id)
      : await supabase.from('preset_recipes').insert(payload);
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setEditor(null);
    showFeedback(editor.id ? '✓ Receta actualizada' : '✓ Receta creada');
    fetchData();
  };

  const toggleActive = async (r) => {
    const { error } = await supabase
      .from('preset_recipes')
      .update({ active: !r.active })
      .eq('id', r.id);
    if (!error) {
      setRecipes((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x))
      );
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`¿Eliminar la receta "${name}"?`)) return;
    const { error } = await supabase.from('preset_recipes').delete().eq('id', id);
    if (!error) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      showFeedback('✓ Receta eliminada');
    }
  };

  const condimentsById = (list) =>
    (list || [])
      .map((c) => {
        const id = typeof c === 'string' ? c : String(c.id);
        const cond = condiments.find((x) => x.id === id);
        if (!cond) return null;
        const grams = typeof c === 'string' ? 0 : Number(c.grams) || 0;
        return grams > 0 ? `${cond.name} (${grams}g)` : cond.name;
      })
      .filter(Boolean)
      .join(', ');

  const priceFor = (list) =>
    BASE_PRICE +
    (list || [])
      .filter((c) => {
        const id = typeof c === 'string' ? c : String(c.id);
        return condiments.some((x) => x.id === id);
      })
      .reduce((sum, c) => {
        const id = typeof c === 'string' ? c : String(c.id);
        const cond = condiments.find((x) => x.id === id);
        return sum + Number(cond.price);
      }, 0);

  const selectedNames = condiments.filter((c) =>
    form.condiment_ids.some((x) => x.id === c.id)
  );
  const editorPrice =
    BASE_PRICE + selectedNames.reduce((sum, c) => sum + Number(c.price), 0);

  if (loading) {
    return (
      <div>
        {Array.from({ length: 3 }).map((_, i) => (
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
      <div style={styles.head}>
        <h2 style={styles.title}>Recetas</h2>
        <button style={styles.newButton} onClick={openNew}>
          + Nueva
        </button>
      </div>

      {feedback && (
        <p style={styles.feedback} role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      {recipes.length === 0 && <p style={styles.empty}>No hay recetas</p>}

      {recipes.map((r) => (
        <div key={r.id} style={styles.card}>
          {r.image_url ? (
            <img src={r.image_url} alt={r.name} style={styles.thumb} />
          ) : (
            <div style={styles.thumbPlaceholder}>🍹</div>
          )}
          <div style={styles.cardInfo}>
            <span style={styles.name}>
              {r.name}{' '}
              {!r.active && <span style={styles.inactive}>inactivo</span>}
            </span>
            <span style={styles.details}>
              {condimentsById(r.condiment_ids) || 'Sin ingredientes'} · Bs{' '}
              {priceFor(r.condiment_ids).toFixed(2)}
            </span>
          </div>
          <div style={styles.actions}>
            <button
              style={{ ...styles.toggleButton, ...(r.active ? styles.toggleOn : {}) }}
              aria-label={r.active ? 'Desactivar receta' : 'Activar receta'}
              onClick={() => toggleActive(r)}
            >
              {r.active ? 'ON' : 'OFF'}
            </button>
            <button
              style={styles.editButton}
              aria-label={`Editar ${r.name}`}
              onClick={() => openEdit(r)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
              </svg>
            </button>
            <button
              style={styles.deleteButton}
              aria-label={`Eliminar ${r.name}`}
              onClick={() => remove(r.id, r.name)}
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
              {editor.id ? 'Editar receta' : 'Nueva receta'}
            </h3>

            <div style={styles.breadcrumb}>
              {STEPS.map((s, i) => {
                const done = step > s.id;
                const active = step === s.id;
                const dotStyle = {
                  ...styles.bcDot,
                  ...(done ? styles.bcDotDone : {}),
                  ...(active ? styles.bcDotActive : {}),
                };
                const labelStyle = {
                  ...styles.bcLabel,
                  ...(done ? styles.bcLabelDone : {}),
                  ...(active ? styles.bcLabelActive : {}),
                };
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => (done || active ? setStep(s.id) : goNext())}
                    style={styles.bcItem}
                  >
                    <span style={dotStyle}>{done ? '✓' : s.id}</span>
                    <span style={labelStyle}>{s.label}</span>
                    {i < STEPS.length - 1 && <span style={styles.bcArrow}>›</span>}
                  </button>
                );
              })}
            </div>

            {step === 1 && (
              <>
                <label style={styles.label}>Nombre *</label>
                <input
                  type="text"
                  placeholder="Ej: Miratecho"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  style={styles.input}
                  autoFocus
                />

                <label style={styles.label}>Cantidad</label>
                <div style={styles.chipsWrap}>
                  {PORCIONES.map((p) => {
                    const active = Number(form.cantidad) === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setField('cantidad', p.value)}
                        style={{
                          ...styles.chip,
                          ...(active ? styles.chipActive : {}),
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

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

                <label style={styles.label}>Orden</label>
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) => setField('sort_order', e.target.value)}
                  style={styles.input}
                />
              </>
            )}

            {step === 2 && (
              <>
                <label style={styles.label}>Ingredientes</label>
                <div style={styles.condimentBox}>
                  {CATEGORIES.map((category) => {
                    const items = condiments.filter((c) => c.category === category);
                    if (items.length === 0) return null;
                    return (
                      <div key={category} style={styles.group}>
                        <h3 style={styles.groupTitle}>{category}</h3>
                        <div style={styles.chips}>
                          {items.map((c) => {
                            const active = form.condiment_ids.some((x) => x.id === c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleCondiment(c.id)}
                                style={{
                                  ...styles.chip,
                                  ...(active ? styles.chipActive : {}),
                                }}
                              >
                                {c.name}
                                {Number(c.price) > 0 && (
                                  <span style={styles.chipPrice}>
                                    +Bs {Number(c.price).toFixed(2)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {condiments.length === 0 && (
                    <p style={styles.condimentEmpty}>
                      No hay ingredientes activos. Crea algunos en la pestaña Ingredientes.
                    </p>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <label style={styles.label}>Cantidad en gramos</label>
                {form.condiment_ids.length > 0 ? (
                  <div style={styles.gramsBox}>
                    {form.condiment_ids.map(({ id, grams }) => {
                      const cond = condiments.find((c) => c.id === id);
                      if (!cond) return null;
                      const g = Number(grams) || 0;
                      return (
                        <div key={id} style={styles.gramsRow}>
                          <span style={styles.gramsName}>{cond.name}</span>
                          <div style={styles.gramsStepper}>
                            <button
                              type="button"
                              style={styles.stepButton}
                              aria-label={`Restar 10g a ${cond.name}`}
                              onClick={() => setGrams(id, Math.max(0, g - 10))}
                              disabled={g <= 0}
                            >
                              −
                            </button>
                            <span style={styles.gramsValue}>{g} g</span>
                            <button
                              type="button"
                              style={styles.stepButton}
                              aria-label={`Sumar 10g a ${cond.name}`}
                              onClick={() => setGrams(id, g + 10)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={styles.condimentEmpty}>
                    No hay ingredientes seleccionados. Vuelve al paso anterior.
                  </p>
                )}
              </>
            )}

            {step === 4 && (
              <div style={styles.confirmBox}>
                <h3 style={styles.gramsTitle}>Confirmación</h3>
                <div style={styles.confirmRow}>
                  <span style={styles.confirmLabel}>Nombre</span>
                  <span style={styles.confirmValue}>{form.name}</span>
                </div>
                <div style={styles.confirmRow}>
                  <span style={styles.confirmLabel}>Cantidad</span>
                  <span style={styles.confirmValue}>
                    {PORCIONES.find((p) => p.value === Number(form.cantidad))?.label || form.cantidad}
                  </span>
                </div>
                <div style={styles.confirmRow}>
                  <span style={styles.confirmLabel}>Precio</span>
                  <span style={styles.confirmValue}>Bs {editorPrice.toFixed(2)}</span>
                </div>
                {form.condiment_ids.length > 0 && (
                  <div style={styles.confirmGrams}>
                    {form.condiment_ids.map(({ id, grams }) => {
                      const cond = condiments.find((c) => c.id === id);
                      if (!cond) return null;
                      return (
                        <div key={id} style={styles.confirmGramRow}>
                          <span>{cond.name}</span>
                          <span style={styles.confirmGramValue}>{grams} g</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div style={styles.priceRow}>
              <span style={styles.priceLabel}>Precio por libra (base + ingredientes)</span>
              <span style={styles.priceValue}>Bs {editorPrice.toFixed(2)}</span>
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
              {step > 1 && (
                <button style={styles.saveButton} onClick={goBack} disabled={saving}>
                  ← Atrás
                </button>
              )}
              {step < 4 && (
                <button style={styles.saveButton} onClick={goNext}>
                  Continuar →
                </button>
              )}
              {step === 4 && (
                <button style={styles.saveButton} onClick={save} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              )}
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
    gap: 12,
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    marginBottom: 10,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  thumbPlaceholder: {
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
  modalTitle: { fontSize: 20, fontWeight: 700, margin: '0 0 14px', color: '#fff' },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    overflowX: 'auto',
  },
  bcItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 0',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
  bcDot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: '50%',
    fontSize: 11,
    fontWeight: 700,
    color: '#8a8a8a',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    flexShrink: 0,
  },
  bcDotDone: {
    color: '#000',
    background: '#c9a227',
    border: '1px solid #c9a227',
  },
  bcDotActive: {
    color: '#c9a227',
    background: 'rgba(201,162,39,0.18)',
    border: '1px solid #c9a227',
  },
  bcLabel: { fontSize: 11, color: '#8a8a8a', whiteSpace: 'nowrap' },
  bcLabelDone: { color: '#cfcfcf' },
  bcLabelActive: { color: '#c9a227', fontWeight: 700 },
  bcArrow: { fontSize: 14, color: '#5a5a5a', margin: '0 1px' },
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
  condimentBox: {
    marginBottom: 16,
    padding: '4px 0 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    maxHeight: 240,
    overflowY: 'auto',
  },
  group: { padding: '10px 12px 0' },
  groupTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#c9a227',
    margin: '0 0 8px',
    textTransform: 'uppercase',
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chipsWrap: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '7px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: 12,
  },
  chipActive: {
    background: 'rgba(201,162,39,0.18)',
    border: '1px solid #c9a227',
    color: '#c9a227',
    fontWeight: 600,
  },
  chipPrice: { fontSize: 10, opacity: 0.8 },
  condimentEmpty: {
    padding: '12px 14px',
    fontSize: 12,
    color: '#8a8a8a',
    margin: 0,
  },
  gramsBox: {
    marginBottom: 16,
    padding: '12px 14px',
    borderRadius: 10,
    background: 'rgba(201,162,39,0.08)',
    border: '1px solid rgba(201,162,39,0.25)',
  },
  gramsTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#c9a227',
    margin: '0 0 10px',
    textTransform: 'uppercase',
  },
  gramsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  gramsName: { fontSize: 13, color: '#fff' },
  gramsStepper: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  stepButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    padding: 0,
    borderRadius: 8,
    background: 'rgba(201,162,39,0.18)',
    border: '1px solid #c9a227',
    color: '#c9a227',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1,
  },
  gramsValue: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
    padding: '8px 6px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
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
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'rgba(201,162,39,0.1)',
    border: '1px solid rgba(201,162,39,0.35)',
    fontSize: 13,
  },
  priceLabel: { color: '#cfcfcf' },
  priceValue: { color: '#c9a227', fontWeight: 700, fontSize: 15 },
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
  confirmBox: {
    padding: '12px 14px',
    borderRadius: 10,
    background: 'rgba(201,162,39,0.08)',
    border: '1px solid rgba(201,162,39,0.25)',
    marginBottom: 16,
  },
  confirmRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  confirmLabel: { color: '#8a8a8a' },
  confirmValue: { color: '#fff', fontWeight: 700, textAlign: 'right' },
  confirmGrams: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid rgba(201,162,39,0.25)',
  },
  confirmGramRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
    fontSize: 13,
  },
  confirmGramValue: { color: '#c9a227', fontWeight: 700 },
};
