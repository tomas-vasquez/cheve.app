import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';

export default function AdminStock() {
  const { branchId } = useAuth();
  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState({});
  const [dirty, setDirty] = useState({});
  const [loading, setLoading] = useState(true);
  const [onlyOut, setOnlyOut] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [savingId, setSavingId] = useState(null);
  const feedbackTimer = useRef(null);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const showFeedback = (text) => {
    setFeedback(text);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 2200);
  };

  const fetchStock = useCallback(async () => {
    setLoading(true);
    if (!branchId) {
      setProducts([]);
      setStocks({});
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('branch_products')
      .select('product_id, name, category, price, stock, pack_of, units_per_pack')
      .eq('branch_id', branchId)
      .order('name');
    const rows = data || [];
    setProducts(rows);
    const map = {};
    rows.forEach((r) => {
      map[r.product_id] = Number(r.stock ?? 0);
    });
    setStocks(map);
    setDirty({});
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const setStock = (id, value) => {
    const next = Math.max(0, Math.floor(value || 0));
    setStocks((prev) => ({ ...prev, [id]: next }));
    setDirty((prev) => ({ ...prev, [id]: true }));
  };

  const save = async (id, value) => {
    const product = products.find((r) => r.product_id === id);
    const packs = Math.max(0, Math.floor(value ?? 0));
    const isPack = !!product?.pack_of;
    const targetId = isPack ? product.pack_of : id;
    const stockUnits = isPack ? packs * (product.units_per_pack || 1) : packs;
    setSavingId(id);
    const { error } = await supabase.from('branch_stock').upsert(
      { branch_id: branchId, product_id: targetId, stock: stockUnits },
      { onConflict: 'branch_id,product_id' }
    );
    setSavingId(null);
    if (error) {
      showFeedback(`Error: ${error.message}`);
      return;
    }
    setStocks((prev) => ({ ...prev, [id]: packs }));
    setDirty((prev) => ({ ...prev, [id]: false }));
    showFeedback('✓ Stock guardado');
  };

  const adjust = (id, delta) => {
    const next = Math.max(0, (stocks[id] ?? 0) + delta);
    setStocks((prev) => ({ ...prev, [id]: next }));
    setDirty((prev) => ({ ...prev, [id]: true }));
    save(id, next);
  };

  if (loading) {
    return (
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={styles.card}>
            <Skeleton width="50%" height={15} style={{ marginBottom: 8 }} />
            <Skeleton width="30%" height={13} />
          </div>
        ))}
      </div>
    );
  }

  const outIds = products.filter((p) => (stocks[p.product_id] ?? 0) <= 0).map((p) => p.product_id);
  const visible = onlyOut
    ? products.filter((p) => outIds.includes(p.product_id))
    : products;

  return (
    <div>
      <div style={styles.head}>
        <h2 style={styles.title}>Stock</h2>
        <button
          style={{ ...styles.filterButton, ...(onlyOut ? styles.filterButtonActive : {}) }}
          onClick={() => setOnlyOut((v) => !v)}
        >
          Solo agotados ({outIds.length})
        </button>
      </div>

      {!branchId && (
        <p style={styles.warning}>
          Tu cuenta no tiene una sucursal asignada. Pídele al encargado de la BD que
          asigne tu sucursal para gestionar stock.
        </p>
      )}

      {feedback && (
        <p style={styles.feedback} role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      {visible.length === 0 && (
        <p style={styles.empty}>
          {branchId
            ? onlyOut
              ? 'No hay productos agotados 🎉'
              : 'No hay productos'
            : 'Sin sucursal asignada'}
        </p>
      )}

      {visible.map((p) => {
        const stock = stocks[p.product_id] ?? 0;
        const agotado = stock <= 0;
        const isDirty = !!dirty[p.product_id];
        const isPack = !!p.pack_of;
        const baseName = products.find((x) => x.product_id === p.pack_of)?.name;
        return (
          <div key={p.product_id} style={styles.card}>
            <div style={styles.cardInfo}>
              <span style={styles.name}>{p.name}</span>
              <span style={styles.details}>
                {p.category || 'Sin categoría'} · Bs {Number(p.price).toFixed(2)}
                {agotado && <span style={styles.outBadge}> · Agotado</span>}
                {isPack && (
                  <span style={styles.packInfo}>
                    {' '}
                    · {stock} {stock === 1 ? 'pack' : 'packs'} ={' '}
                    {stock * (p.units_per_pack || 1)} unidades de {baseName || '?'}
                  </span>
                )}
              </span>
            </div>
            <div style={styles.stepper}>
              <button
                style={styles.stepButton}
                aria-label={`Quitar ${p.name}`}
                disabled={savingId === p.product_id}
                onClick={() => adjust(p.product_id, -1)}
              >
                −
              </button>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(p.product_id, e.target.value)}
                onBlur={() => isDirty && save(p.product_id, stock)}
                style={{ ...styles.stepInput, color: agotado ? '#ff6b6b' : '#fff' }}
                aria-label={`Stock de ${p.name}`}
              />
              <button
                style={styles.stepButton}
                aria-label={`Añadir ${p.name}`}
                disabled={savingId === p.product_id}
                onClick={() => adjust(p.product_id, 1)}
              >
                +
              </button>
              {isDirty && (
                <button
                  style={styles.saveButton}
                  disabled={savingId === p.product_id}
                  onClick={() => save(p.product_id, stock)}
                >
                  {savingId === p.product_id ? '...' : 'Guardar'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' },
  filterButton: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#cfcfcf',
    padding: '9px 12px',
    borderRadius: 500,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  filterButtonActive: {
    background: 'rgba(255,107,107,0.15)',
    border: '1px solid rgba(255,107,107,0.5)',
    color: '#ff6b6b',
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
    flexWrap: 'wrap',
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
  outBadge: { color: '#ff6b6b', fontWeight: 700 },
  packInfo: { color: '#1DB954' },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  stepButton: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: 6,
    border: 'none',
    background: '#1DB954',
    color: '#000',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1,
  },
  stepInput: {
    width: 56,
    height: 34,
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    textAlign: 'center',
    outline: 'none',
  },
  saveButton: {
    height: 34,
    padding: '0 12px',
    borderRadius: 6,
    border: 'none',
    background: '#1DB954',
    color: '#000',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
