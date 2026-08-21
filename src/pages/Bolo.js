import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Skeleton from '../components/Skeleton';

const BASE_PRICE = 15.0;
const CATEGORIES = ['Bicarbonatos saborizados', 'Café', 'Estevia', 'Otros'];
const CAT_CHOICES = [
  { id: 'todas', label: 'Todas' },
  { id: 'preset', label: 'Preestablecidas' },
  { id: 'personal', label: 'Personalizadas' },
];
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

const CONDIMENT_EMOJIS = {
  menta: '🌿',
  'hierba luisa': '🌱',
  eucalipto: '🍃',
  anís: '⭐',
  café: '☕',
  canela: '🪵',
  chocolate: '🍫',
  'coco rallado': '🥥',
  miel: '🍯',
  limón: '🍋',
  naranja: '🍊',
  estevia: '🍀',
  bicarbonato: '🧂',
};
const CATEGORY_EMOJIS = {
  'Bicarbonatos saborizados': '🧂',
  Café: '☕',
  Estevia: '🍀',
  Otros: '✨',
};
const FALLBACK_EMOJI = '🍃';

const THUMB_GRADIENTS = [
  'linear-gradient(135deg, #3a5a3c 0%, #1d2b1e 100%)',
  'linear-gradient(135deg, #5a3a2a 0%, #2b1d14 100%)',
  'linear-gradient(135deg, #3a3a5a 0%, #1d1d2b 100%)',
  'linear-gradient(135deg, #5a3a4a 0%, #2b141d 100%)',
  'linear-gradient(135deg, #4a5a2a 0%, #242b14 100%)',
  'linear-gradient(135deg, #3a4a5a 0%, #141d2b 100%)',
];

const emojiForCondiment = (c) =>
  CONDIMENT_EMOJIS[c.name.trim().toLowerCase()] ||
  CATEGORY_EMOJIS[c.category] ||
  FALLBACK_EMOJI;

const recipeEmojis = (items) =>
  items.length === 0 ? ['✨'] : items.slice(0, 4).map(emojiForCondiment);

const gradientFor = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return THUMB_GRADIENTS[h % THUMB_GRADIENTS.length];
};

const formatCantidad = (value) => {
  const match = PORCIONES.find((p) => p.value === Number(value));
  return match ? match.label : `${Number(value)} libras`;
};

export default function Bolo() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [condiments, setCondiments] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [presetRecipes, setPresetRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editor, setEditor] = useState(null);
  const [recipeName, setRecipeName] = useState('');
  const [cantidad, setCantidad] = useState(0.25);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('todas');
  const [step, setStep] = useState(1);
  const feedbackTimer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [condRes, recRes, presetRes] = await Promise.all([
      supabase
        .from('condiments')
        .select('*')
        .eq('active', true)
        .order('sort_order')
        .order('name'),
      supabase.from('recipes').select('*').eq('user_id', user.id),
      supabase.from('preset_recipes').select('*').eq('active', true).order('sort_order'),
    ]);
    if (condRes.error) {
      setError('No se pudieron cargar los ingredientes.');
    } else if (condRes.data) {
      setCondiments(condRes.data);
    }
    if (!recRes.error && recRes.data) setRecipes(recRes.data);
    if (!presetRes.error && presetRes.data) setPresetRecipes(presetRes.data);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const showFeedback = (text) => {
    setFeedback(text);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 2200);
  };

  const buildItem = (condIds) => {
    const list = condiments.filter((c) => condIds.includes(c.id));
    const price = BASE_PRICE + list.reduce((sum, c) => sum + Number(c.price), 0);
    return {
      id: `machucada-${list.map((c) => c.id).sort().join('-')}`,
      name: 'Machucada de coca',
      price,
      options: list.map((c) => c.name),
    };
  };

  const closeEditor = () => {
    if (saving) return;
    setEditor(null);
    setEditorError('');
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) delete next[id];
      else next[id] = 10;
      return next;
    });
  };

  const setGrams = (id, grams) => {
    setSelected((prev) => ({ ...prev, [id]: grams }));
  };

  const openNew = () => {
    setEditor({ id: null });
    setRecipeName('');
    setCantidad(0.25);
    setSelected({});
    setEditorError('');
    setStep(1);
  };

  const openEdit = (recipe) => {
    setEditor({ id: recipe.id });
    setRecipeName(recipe.name);
    setCantidad(Number(recipe.cantidad) || 1);
    const sel = {};
    (recipe.condiment_ids || []).forEach((c) => {
      const id = typeof c === 'string' ? c : String(c.id);
      const grams = typeof c === 'string' ? 10 : Number(c.grams) || 10;
      sel[id] = grams;
    });
    setSelected(sel);
    setEditorError('');
    setStep(1);
  };

  const saveRecipe = async () => {
    setEditorError('');
    const selectedIds = Object.keys(selected);
    const condiment_ids = condiments
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => ({ id: c.id, grams: Number(selected[c.id]) || 0 }));
    if (!recipeName.trim()) {
      setEditorError('Escribe un nombre para la receta.');
      return;
    }
    if (condiment_ids.length === 0) {
      setEditorError('Selecciona al menos un condimento.');
      return;
    }
    if (condiment_ids.some((x) => x.grams <= 0 || x.grams % 10 !== 0)) {
      setEditorError('Indica la cantidad en gramos de cada condimento (múltiplos de 10, mayor a 0).');
      return;
    }
    if (!cantidad || cantidad <= 0) {
      setEditorError('Elige una cantidad.');
      return;
    }

    setSaving(true);
    const payload = { name: recipeName.trim(), condiment_ids, cantidad };
    if (editor.id) {
      const { error } = await supabase
        .from('recipes')
        .update(payload)
        .eq('id', editor.id)
        .eq('user_id', user.id);
      if (error) {
        setSaving(false);
        setEditorError('No se pudo actualizar la receta.');
        return;
      }
      showFeedback('✓ Receta actualizada');
    } else {
      const { error } = await supabase.from('recipes').insert({ user_id: user.id, ...payload });
      if (error) {
        setSaving(false);
        setEditorError('No se pudo guardar la receta.');
        return;
      }
      showFeedback('✓ Receta guardada');
    }
    setSaving(false);
    setEditor(null);
    fetchData();
  };

  const goNext = () => {
    const selectedIds = Object.keys(selected);
    const condiment_ids = condiments
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => ({ id: c.id, grams: Number(selected[c.id]) || 0 }));
    setEditorError('');
    if (step === 1) {
      if (!recipeName.trim()) {
        setEditorError('Escribe un nombre para la receta.');
        return;
      }
      if (!cantidad || cantidad <= 0) {
        setEditorError('Elige una cantidad.');
        return;
      }
    } else if (step === 2) {
      if (condiment_ids.length === 0) {
        setEditorError('Selecciona al menos un condimento.');
        return;
      }
    } else if (step === 3) {
      if (condiment_ids.some((x) => x.grams <= 0 || x.grams % 10 !== 0)) {
        setEditorError('Indica la cantidad en gramos de cada condimento (múltiplos de 10, mayor a 0).');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const goBack = () => {
    setEditorError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const deleteRecipe = async (id, name) => {
    if (!window.confirm(`¿Eliminar la receta "${name}"?`)) return;
    await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    showFeedback('✓ Receta eliminada');
  };

  const addToCart = (entry) => {
    if (!entry.hasCondiments) return;
    const w = Number(entry.cantidad) || 1;
    const item = buildItem(entry.ids);
    addItem(
      {
        ...item,
        price: item.price * w,
        options: [...item.options, formatCantidad(w)],
      },
      1
    );
    showFeedback('✓ Agregado al carrito');
  };

  const list = [
    ...presetRecipes.map((preset) => {
      const ids = (preset.condiment_ids || [])
        .map((c) => (typeof c === 'string' ? c : String(c.id)))
        .filter(Boolean);
      const items = condiments.filter((c) => ids.includes(c.id));
      const hasCondiments = ids.length > 0 && items.length === ids.length;
      return {
        key: `preset-${preset.id}`,
        source: 'preset',
        id: preset.id,
        name: preset.name,
        image_url: preset.image_url || '',
        emojis: recipeEmojis(items),
        details: items.map((c) => c.name).join(', '),
        hasCondiments,
        ids,
        cantidad: preset.cantidad || 1,
        price: hasCondiments ? buildItem(ids).price : 0,
      };
    }),
    ...recipes.map((recipe) => {
      const ids = (recipe.condiment_ids || [])
        .map((c) => (typeof c === 'string' ? c : String(c.id)))
        .filter(Boolean);
      const items = condiments.filter((c) => ids.includes(c.id));
      return {
        key: `personal-${recipe.id}`,
        source: 'personal',
        id: recipe.id,
        name: recipe.name,
        emojis: recipeEmojis(items),
        details: items.map((c) => c.name).join(', '),
        hasCondiments: ids.length > 0,
        ids,
        cantidad: recipe.cantidad || 1,
        price: buildItem(ids).price,
      };
    }),
  ];

  const q = query.trim().toLowerCase();
  const visible = list.filter((r) => {
    if (cat !== 'todas' && r.source !== cat) return false;
    if (q && !`${r.name} ${r.details}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const editorPrice =
    BASE_PRICE +
    condiments
      .filter((c) => selected[c.id] !== undefined)
      .reduce((sum, c) => sum + Number(c.price), 0);
  const editorTotal = editorPrice * cantidad;

  if (loading) {
    return (
      <div style={styles.container}>
        <div className="products-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={styles.card}>
              <Skeleton height={140} borderRadius={10} style={{ marginBottom: 8 }} />
              <Skeleton width="75%" height={14} style={{ margin: '4px 0' }} />
              <Skeleton width="40%" height={14} style={{ margin: '4px 0' }} />
              <Skeleton height={38} borderRadius={8} style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.messageError}>{error}</p>
          <button style={styles.addButton} onClick={fetchData}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Coca machucada</h1>
          <p style={styles.subtitle}>Machucadas de coca listas para llevar</p>
        </div>
        <button style={styles.newButton} onClick={openNew}>
          + Nueva
        </button>
      </div>

      <div style={styles.toolbar}>
        <input
          type="search"
          placeholder="Buscar recetas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.chips} className="chips-scroll">
          {CAT_CHOICES.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  ...styles.chip,
                  ...(active ? styles.chipActive : {}),
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <p style={styles.feedback} role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      {visible.length === 0 ? (
        <p style={styles.empty}>
          {q ? `Sin resultados para "${query}"` : 'No hay recetas en esta categoría'}
        </p>
      ) : (
        <div className="products-grid">
          {visible.map((r) => {
            const w = Number(r.cantidad) || 1;
            const price = r.hasCondiments ? r.price * w : 0;
            return (
              <div key={r.key} style={styles.card}>
                {r.image_url ? (
                  <div style={styles.cardThumb}>
                    <img
                      src={r.image_url}
                      alt={r.name}
                      style={styles.thumbImg}
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.visibility = 'visible';
                      }}
                    />
                    {r.source === 'personal' && <span style={styles.badge}>Tuya</span>}
                  </div>
                ) : (
                  <div style={{ ...styles.cardThumb, background: gradientFor(r.name) }}>
                    {r.emojis.length === 1 ? (
                      <span style={styles.thumbEmojiLarge}>{r.emojis[0]}</span>
                    ) : (
                      <div style={styles.thumbGrid}>
                        {r.emojis.map((e, i) => (
                          <span key={i} style={styles.thumbEmoji}>
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.source === 'personal' && <span style={styles.badge}>Tuya</span>}
                  </div>
                )}
                <p style={styles.name}>{r.name}</p>
                <p style={styles.details}>{r.details}</p>
                <p style={styles.price}>
                  Bs {price.toFixed(2)}
                  <span style={styles.qty}> · {formatCantidad(w)}</span>
                </p>
                <div style={styles.cardFooter}>
                  <button
                    style={r.hasCondiments ? styles.addButton : styles.addButtonDisabled}
                    disabled={!r.hasCondiments}
                    onClick={() => addToCart(r)}
                  >
                    {r.hasCondiments ? 'Agregar' : 'No disponible'}
                  </button>
                  {r.source === 'personal' && (
                    <>
                      <button
                        style={styles.actionButton}
                        aria-label={`Editar ${r.name}`}
                        onClick={() => openEdit(recipes.find((x) => x.id === r.id))}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                        </svg>
                      </button>
                      <button
                        style={{ ...styles.actionButton, ...styles.actionDelete }}
                        aria-label={`Eliminar ${r.name}`}
                        onClick={() => deleteRecipe(r.id, r.name)}
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
            );
          })}
        </div>
      )}

      {editor && (
        <div style={styles.overlay} onClick={closeEditor}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editor.id ? 'Editar receta' : 'Nueva receta'}
            </h2>

            <div style={styles.breadcrumb}>
              {STEPS.map((s, i) => {
                const done = step > s.id;
                const active = step === s.id;
                const dotActive = {
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
                    onClick={() => (done || active ? setStep(s.id) : goNext())}
                    style={styles.bcItem}
                  >
                    <span style={dotActive}>{done ? '✓' : s.id}</span>
                    <span style={labelStyle}>{s.label}</span>
                    {i < STEPS.length - 1 && <span style={styles.bcArrow}>›</span>}
                  </button>
                );
              })}
            </div>

            {step === 1 && (
              <>
                <label style={styles.label}>Nombre de la receta</label>
                <input
                  type="text"
                  placeholder="Ej. Clásica con café"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  style={styles.input}
                  autoFocus
                />

                <label style={styles.label}>Cantidad</label>
                <div style={styles.chipsWrap}>
                  {PORCIONES.map((p) => {
                    const active = cantidad === p.value;
                    return (
                      <button
                        key={p.value}
                        onClick={() => setCantidad(p.value)}
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
              </>
            )}

            {step === 2 && (
              <>
                <label style={styles.label}>Condimentos</label>
                {CATEGORIES.map((category) => {
                  const items = condiments.filter((c) => c.category === category);
                  if (items.length === 0) return null;
                  return (
                    <div key={category} style={styles.group}>
                      <h3 style={styles.groupTitle}>{category}</h3>
                      <div style={styles.chipsWrap}>
                        {items.map((c) => {
                          const active = selected[c.id] !== undefined;
                          return (
                            <button
                              key={c.id}
                              onClick={() => toggle(c.id)}
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
              </>
            )}

            {step === 3 && (
              <>
                <label style={styles.label}>Cantidad en gramos</label>
                {Object.keys(selected).length > 0 ? (
                  <div style={styles.gramsBox}>
                    {Object.keys(selected).map((id) => {
                      const cond = condiments.find((c) => c.id === id);
                      if (!cond) return null;
                      const grams = Number(selected[id]) || 0;
                      return (
                        <div key={id} style={styles.gramsRow}>
                          <span style={styles.gramsName}>{cond.name}</span>
                          <div style={styles.gramsStepper}>
                            <button
                              type="button"
                              style={styles.stepButton}
                              aria-label={`Restar 10g a ${cond.name}`}
                              onClick={() => setGrams(id, Math.max(0, grams - 10))}
                              disabled={grams <= 0}
                            >
                              −
                            </button>
                            <span style={styles.gramsValue}>{grams} g</span>
                            <button
                              type="button"
                              style={styles.stepButton}
                              aria-label={`Sumar 10g a ${cond.name}`}
                              onClick={() => setGrams(id, grams + 10)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={styles.empty}>
                    No hay condimentos seleccionados. Vuelve al paso anterior.
                  </p>
                )}
              </>
            )}

            {step === 4 && (
              <div style={styles.confirmBox}>
                <h3 style={styles.gramsTitle}>Confirmación</h3>
                <div style={styles.confirmRow}>
                  <span style={styles.confirmLabel}>Nombre</span>
                  <span style={styles.confirmValue}>{recipeName}</span>
                </div>
                <div style={styles.confirmRow}>
                  <span style={styles.confirmLabel}>Cantidad</span>
                  <span style={styles.confirmValue}>
                    {formatCantidad(cantidad)}
                  </span>
                </div>
                <div style={styles.confirmRow}>
                  <span style={styles.confirmLabel}>Precio</span>
                  <span style={styles.confirmValue}>
                    Bs {editorTotal.toFixed(2)}
                  </span>
                </div>
                {Object.keys(selected).length > 0 && (
                  <div style={styles.confirmGrams}>
                    {Object.keys(selected).map((id) => {
                      const cond = condiments.find((c) => c.id === id);
                      if (!cond) return null;
                      return (
                        <div key={id} style={styles.confirmGramRow}>
                          <span>{cond.name}</span>
                          <span style={styles.confirmGramValue}>
                            {selected[id]} g
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div style={styles.priceRow}>
              <span style={styles.priceLabel}>
                Bs {editorPrice.toFixed(2)} / libra · {formatCantidad(cantidad)}
              </span>
              <span style={styles.priceValue}>Bs {editorTotal.toFixed(2)}</span>
            </div>

            {editorError && <p style={styles.messageError}>{editorError}</p>}

            <div style={styles.editorActions}>
              <button
                style={styles.cancelButton}
                aria-label="Cancelar"
                onClick={closeEditor}
                disabled={saving}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
              {step > 1 && (
                <button
                  style={styles.addButton}
                  aria-label="Paso anterior"
                  onClick={goBack}
                  disabled={saving}
                >
                  ← Atrás
                </button>
              )}
              {step < 4 && (
                <button
                  style={styles.addButton}
                  aria-label="Siguiente paso"
                  onClick={goNext}
                >
                  Continuar →
                </button>
              )}
              {step === 4 && (
                <button
                  style={styles.addButton}
                  aria-label={editor.id ? 'Guardar cambios' : 'Guardar receta'}
                  onClick={saveRecipe}
                  disabled={saving}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '12px 12px 0',
    maxWidth: 1200,
    margin: '0 auto',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#fff' },
  subtitle: { fontSize: 14, color: '#8a8a8a', margin: 0 },
  newButton: {
    background: '#1DB954',
    color: '#000',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 500,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  toolbar: {
    position: 'sticky',
    top: 0,
    zIndex: 5,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    margin: '0 -12px',
    paddingLeft: 12,
    paddingRight: 12,
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 15,
    outline: 'none',
    marginBottom: 10,
    boxSizing: 'border-box',
  },
  chips: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 14px',
    borderRadius: 500,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: 14,
  },
  chipActive: {
    background: 'rgba(29, 185, 84,0.18)',
    border: '1px solid #1DB954',
    color: '#1DB954',
    fontWeight: 600,
  },
  feedback: { fontSize: 13, color: '#7ee787', margin: '12px 0 0' },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderRadius: 16,
    padding: 12,
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
    width: '100%',
  },
  cardThumb: {
    position: 'relative',
    width: '100%',
    height: 140,
    borderRadius: 500,
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
  },
  thumbImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    borderRadius: 500,
    objectFit: 'cover',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(29, 185, 84,0.9)',
    color: '#000',
  },
  thumbGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  thumbEmoji: { fontSize: 30, lineHeight: 1, textAlign: 'center' },
  thumbEmojiLarge: { fontSize: 48, lineHeight: 1 },
  name: { fontWeight: 600, fontSize: 14, margin: '4px 0', color: '#fff' },
  details: {
    fontSize: 12,
    color: '#8a8a8a',
    margin: '0 0 4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  price: { color: '#1DB954', fontWeight: 700, margin: '4px 0', fontSize: 15 },
  qty: { color: '#8a8a8a', fontSize: 12, fontWeight: 600 },
  cardFooter: { display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8 },
  addButton: {
    backgroundColor: '#1DB954',
    color: '#000',
    border: 'none',
    padding: '10px 12px',
    borderRadius: 500,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
  addButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#8a8a8a',
    border: 'none',
    padding: '10px 12px',
    borderRadius: 500,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    cursor: 'not-allowed',
    fontWeight: 700,
    fontSize: 14,
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    flexShrink: 0,
    background: 'rgba(255,255,255,0.08)',
    color: '#cfcfcf',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 500,
    cursor: 'pointer',
  },
  actionDelete: {
    background: 'rgba(255,107,107,0.12)',
    color: '#ff6b6b',
    border: '1px solid rgba(255,107,107,0.4)',
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
  bcItemActive: {},
  bcItemDone: {},
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
    background: '#1DB954',
    border: '1px solid #1DB954',
  },
  bcDotActive: {
    color: '#1DB954',
    background: 'rgba(29, 185, 84,0.18)',
    border: '1px solid #1DB954',
  },
  bcLabel: { fontSize: 11, color: '#8a8a8a', whiteSpace: 'nowrap' },
  bcLabelDone: { color: '#cfcfcf' },
  bcLabelActive: { color: '#1DB954', fontWeight: 700 },
  bcArrow: { fontSize: 14, color: '#5a5a5a', margin: '0 1px' },
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
  chipsWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  group: { marginTop: 12 },
  groupTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1DB954',
    margin: '0 0 8px',
  },
  chipPrice: { fontSize: 10, opacity: 0.8 },
  gramsBox: {
    marginTop: 12,
    marginBottom: 16,
    padding: '12px 14px',
    borderRadius: 500,
    background: 'rgba(29, 185, 84,0.08)',
    border: '1px solid rgba(29, 185, 84,0.25)',
  },
  gramsTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1DB954',
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
    borderRadius: 500,
    background: 'rgba(29, 185, 84,0.18)',
    border: '1px solid #1DB954',
    color: '#1DB954',
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
    borderRadius: 500,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    padding: '10px 0',
    fontSize: 14,
    color: '#cfcfcf',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  priceLabel: { color: '#cfcfcf' },
  priceValue: { color: '#1DB954', fontWeight: 700, fontSize: 16 },
  editorActions: { display: 'flex', gap: 10, marginTop: 6 },
  cancelButton: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    cursor: 'pointer',
    padding: 14,
    borderRadius: 500,
    flex: 1,
    fontSize: 15,
    fontWeight: 600,
  },
  messageError: { fontSize: 13, color: '#ff6b6b', margin: '10px 0 0' },
  confirmBox: {
    padding: '12px 14px',
    borderRadius: 500,
    background: 'rgba(29, 185, 84,0.08)',
    border: '1px solid rgba(29, 185, 84,0.25)',
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
    borderTop: '1px solid rgba(29, 185, 84,0.25)',
  },
  confirmGramRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
    fontSize: 13,
  },
  confirmGramValue: { color: '#1DB954', fontWeight: 700 },
};
