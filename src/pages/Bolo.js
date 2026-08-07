import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Skeleton from '../components/Skeleton';

const BASE_PRICE = 15.0;
const CATEGORIES = ['Bicarbonatos saborizados', 'Café', 'Estevia', 'Otros'];
const PRESET_RECIPES = [
  { name: 'Clásica menta', condiments: ['Menta'], cantidad: 1 },
  { name: 'Café con canela', condiments: ['Café', 'Canela'], cantidad: 1 },
  { name: 'Chocolate dulce', condiments: ['Chocolate', 'Coco rallado', 'Miel'], cantidad: 1 },
  { name: 'Cítrica', condiments: ['Limón', 'Naranja'], cantidad: 1 },
  { name: 'Relajante', condiments: ['Eucalipto', 'Anís', 'Miel'], cantidad: 1 },
  { name: 'Hierba luisa y menta', condiments: ['Hierba luisa', 'Menta'], cantidad: 1 },
  { name: 'Sin azúcar', condiments: ['Estevia', 'Limón', 'Menta'], cantidad: 1 },
];
const PORCIONES = [
  { value: 1, label: '1 libra' },
  { value: 0.75, label: '¾ de libra' },
  { value: 0.5, label: '½ libra' },
  { value: 0.25, label: 'Cuartilla (¼)' },
  { value: 0.125, label: 'Media cuartilla (⅛)' },
];

const formatCantidad = (value) => {
  const match = PORCIONES.find((p) => p.value === Number(value));
  return match ? match.label : `${Number(value)} libras`;
};

export default function Bolo() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [condiments, setCondiments] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editor, setEditor] = useState(null);
  const [recipeName, setRecipeName] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [openPresets, setOpenPresets] = useState(true);
  const [openPersonal, setOpenPersonal] = useState(true);
  const feedbackTimer = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [condRes, recRes] = await Promise.all([
      supabase
        .from('condiments')
        .select('*')
        .eq('active', true)
        .order('sort_order')
        .order('name'),
      supabase.from('recipes').select('*').eq('user_id', user.id),
    ]);
    if (condRes.error) {
      setError('No se pudieron cargar los condimentos.');
    } else if (condRes.data) {
      setCondiments(condRes.data);
    }
    if (!recRes.error && recRes.data) setRecipes(recRes.data);
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
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const saveRecipe = async () => {
    setEditorError('');
    const condiment_ids = condiments.filter((c) => selected[c.id]).map((c) => c.id);
    if (!recipeName.trim()) {
      setEditorError('Escribe un nombre para la receta.');
      return;
    }
    if (condiment_ids.length === 0) {
      setEditorError('Selecciona al menos un condimento.');
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
      const { error } = await supabase
        .from('recipes')
        .insert({ user_id: user.id, ...payload });
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

  const deleteRecipe = async (id, name) => {
    if (!window.confirm(`¿Eliminar la receta "${name}"?`)) return;
    await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    showFeedback('✓ Receta eliminada');
  };

  const addRecipeToCart = (recipe) => {
    if (!recipe.condiment_ids || recipe.condiment_ids.length === 0) return;
    const item = buildItem(recipe.condiment_ids);
    const w = Number(recipe.cantidad) || 1;
    addItem(
      {
        ...item,
        price: item.price * w,
        options: [...item.options, formatCantidad(w)],
      },
      1
    );
    showFeedback('✓ Receta agregada al carrito');
  };

  const addPresetToCart = (preset) => {
    const ids = condiments
      .filter((c) => preset.condiments.includes(c.name))
      .map((c) => c.id);
    if (ids.length === 0) return;
    addRecipeToCart({ condiment_ids: ids, cantidad: preset.cantidad });
  };

  const editorPrice =
    BASE_PRICE +
    condiments
      .filter((c) => selected[c.id])
      .reduce((sum, c) => sum + Number(c.price), 0);
  const weight = cantidad;
  const editorTotal = editorPrice * weight;

  if (loading)
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <Skeleton width={180} height={26} style={{ marginBottom: 20 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={styles.recipeCard}>
              <div style={styles.recipeInfo}>
                <Skeleton width="55%" height={15} style={{ marginBottom: 8 }} />
                <Skeleton width="85%" height={12} />
              </div>
              <div style={styles.recipeActions}>
                <Skeleton width={32} height={32} borderRadius={8} />
                <Skeleton width={32} height={32} borderRadius={8} />
                <Skeleton width={32} height={32} borderRadius={8} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  if (error)
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

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <h1 style={styles.title}>Coca machucada</h1>
        <p style={styles.subtitle}>Machucadas de coca listas para llevar</p>
      </div>

      <div style={styles.collapsible}>
        <button
          style={styles.collapsibleHeader}
          onClick={() => setOpenPresets((v) => !v)}
          aria-expanded={openPresets}
        >
          <h2 style={styles.sectionTitleCollapsible}>Recetas preestablecidas</h2>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: '#c9a227',
              transform: openPresets ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {openPresets && (
          <div style={styles.collapsibleBody}>
            <p style={styles.recipeHint}>Combinaciones listas para llevar</p>
            {PRESET_RECIPES.map((preset) => {
              const ids = condiments
                .filter((c) => preset.condiments.includes(c.name))
                .map((c) => c.id);
              const hasCondiments = ids.length === preset.condiments.length;
              const w = Number(preset.cantidad) || 1;
              const price = hasCondiments ? buildItem(ids).price : 0;
              return (
                <div key={preset.name} style={styles.recipeCard}>
                  <div style={styles.recipeInfo}>
                    <span style={styles.recipeName}>
                      {preset.name}{' '}
                      <span style={styles.recipeQty}>{formatCantidad(w)}</span>
                    </span>
                    <span style={styles.recipeDetails}>
                      {preset.condiments.join(', ')} · Bs{' '}
                      {(price * w).toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.recipeActions}>
                    <button
                      style={hasCondiments ? styles.actionAdd : styles.actionAddDisabled}
                      disabled={!hasCondiments}
                      aria-label="Agregar al carrito"
                      onClick={() => addPresetToCart(preset)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.collapsible}>
        <button
          style={styles.collapsibleHeader}
          onClick={() => setOpenPersonal((v) => !v)}
          aria-expanded={openPersonal}
        >
          <h2 style={styles.sectionTitleCollapsible}>Recetas personalizadas</h2>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: '#c9a227',
              transform: openPersonal ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {openPersonal && (
          <div style={styles.collapsibleBody}>
            <p style={styles.recipeHint}>Guarda tus combinaciones favoritas</p>

            {feedback && (
              <p style={styles.feedback} role="status" aria-live="polite">
                {feedback}
              </p>
            )}

            {recipes.length === 0 && (
              <p style={styles.noRecipes}>Aún no tienes recetas guardadas</p>
            )}

            {recipes.map((recipe) => {
              const ids = recipe.condiment_ids || [];
              const hasCondiments = ids.length > 0;
              const rWeight = Number(recipe.cantidad) || 1;
              const price = buildItem(ids).price;
              const names = condiments
                .filter((c) => ids.includes(c.id))
                .map((c) => c.name);
              return (
                <div key={recipe.id} style={styles.recipeCard}>
                  <div style={styles.recipeInfo}>
                    <span style={styles.recipeName}>
                      {recipe.name}{' '}
                      <span style={styles.recipeQty}>{formatCantidad(rWeight)}</span>
                    </span>
                    <span style={styles.recipeDetails}>
                      {names.length > 0 ? names.join(', ') : 'Sin condimentos'} · Bs{' '}
                      {(price * rWeight).toFixed(2)}
                    </span>
                  </div>
                  <div style={styles.recipeActions}>
                    <button
                      style={hasCondiments ? styles.actionAdd : styles.actionAddDisabled}
                      disabled={!hasCondiments}
                      aria-label="Agregar al carrito"
                      onClick={() => addRecipeToCart(recipe)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                    </button>
                    <button
                      style={styles.actionDelete}
                      aria-label="Eliminar receta"
                      onClick={() => deleteRecipe(recipe.id, recipe.name)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editor && (
        <div style={styles.overlay} onClick={closeEditor}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editor.id ? 'Editar receta' : 'Nueva receta'}
            </h2>

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
            <div style={styles.chips}>
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

            <label style={styles.label}>Condimentos</label>
            {CATEGORIES.map((category) => {
              const items = condiments.filter((c) => c.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category} style={styles.group}>
                  <h3 style={styles.groupTitle}>{category}</h3>
                  <div style={styles.chips}>
                    {items.map((c) => {
                      const active = !!selected[c.id];
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

            <div style={styles.priceRow}>
              <span style={styles.priceLabel}>
                Bs {editorPrice.toFixed(2)} / libra · {formatCantidad(weight)}
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
    background:
      'radial-gradient(circle at 20% 0%, rgba(201,162,39,0.08), transparent 45%)',
  },
  pageHeader: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#fff' },
  subtitle: { fontSize: 14, color: '#8a8a8a', margin: 0 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#c9a227',
    margin: '0 0 10px',
  },
  recipeHint: { fontSize: 13, color: '#8a8a8a', margin: '-4px 0 14px' },
  card: {
    padding: 20,
    borderRadius: 20,
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  collapsible: {
    marginTop: 20,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    overflow: 'hidden',
  },
  collapsibleHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '16px 18px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  sectionTitleCollapsible: {
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  collapsibleBody: {
    padding: '0 18px 18px',
  },
  feedback: { fontSize: 13, color: '#7ee787', margin: '10px 0 0' },
  noRecipes: { fontSize: 13, color: '#8a8a8a', margin: '16px 0 0' },
  recipeCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  recipeInfo: { flex: 1, minWidth: 0 },
  recipeName: { display: 'block', fontSize: 14, fontWeight: 600, color: '#fff' },
  recipeQty: {
    color: '#c9a227', fontSize: 12, fontWeight: 700, marginLeft: 6,
  },
  recipeDetails: {
    display: 'block', fontSize: 12, color: '#8a8a8a', marginTop: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  recipeActions: { display: 'flex', gap: 6, flexShrink: 0 },
  actionAdd: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, padding: 0,
    background: 'rgba(201,162,39,0.18)', color: '#c9a227',
    border: '1px solid #c9a227', borderRadius: 8, cursor: 'pointer',
  },
  actionAddDisabled: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, padding: 0,
    background: 'rgba(255,255,255,0.05)', color: '#8a8a8a',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    cursor: 'not-allowed', opacity: 0.55,
  },
  actionDelete: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, padding: 0,
    background: 'rgba(255,107,107,0.12)', color: '#ff6b6b',
    border: '1px solid rgba(255,107,107,0.4)', borderRadius: 8, cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 30,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto',
    padding: 24, borderRadius: 20,
    background: 'rgba(18,18,18,0.98)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  modalTitle: { fontSize: 20, fontWeight: 700, margin: '0 0 18px', color: '#fff' },
  label: { display: 'block', fontSize: 13, color: '#cfcfcf', marginBottom: 6 },
  input: {
    width: '100%', marginBottom: 16,
    padding: '12px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff', fontSize: 14, outline: 'none',
  },
  group: { marginTop: 12 },
  groupTitle: {
    fontSize: 12, fontWeight: 600, color: '#c9a227', margin: '0 0 8px',
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: 13,
  },
  chipActive: {
    background: 'rgba(201,162,39,0.18)',
    border: '1px solid #c9a227',
    color: '#c9a227',
    fontWeight: 600,
  },
  chipPrice: { fontSize: 10, opacity: 0.8 },
  priceRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 18, padding: '10px 0', fontSize: 14, color: '#cfcfcf',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  priceLabel: { color: '#cfcfcf' },
  priceValue: { color: '#c9a227', fontWeight: 700, fontSize: 16 },
  editorActions: { display: 'flex', gap: 10, marginTop: 6 },
  cancelButton: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff', cursor: 'pointer',
    padding: 14, borderRadius: 10, flex: 1, fontSize: 15, fontWeight: 600,
  },
  addButton: {
    backgroundColor: '#c9a227', color: '#000', border: 'none',
    padding: 14, borderRadius: 10, flex: 1,
    cursor: 'pointer', fontWeight: 700, fontSize: 15,
  },
  messageError: { fontSize: 13, color: '#ff6b6b', margin: '10px 0 0' },
};
