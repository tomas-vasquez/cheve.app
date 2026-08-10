import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function ProductCard({ item, onOpenDetail, onQuickAdd }) {
  const navigate = useNavigate();
  const { items, addItem, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.id === item.id);
  const qty = cartItem?.quantity || 0;
  const stock = Number(item.stock ?? 1);
  const soldOut = stock <= 0;
  const atLimit = qty >= stock;

  const product = {
    id: item.id,
    name: item.name,
    description: item.description || '',
    price: Number(item.price),
    image_url: item.image_url || '',
    stock,
  };

  const openDetail = () => {
    if (onOpenDetail) onOpenDetail(product);
    else navigate('/producto', { state: { product } });
  };

  return (
    <div style={styles.card} onClick={openDetail} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openDetail()}>
      <div style={styles.imageWrap}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} style={styles.image} />
        ) : (
          <div style={styles.imagePlaceholder}>🍺</div>
        )}
        {onQuickAdd &&
          (soldOut ? (
            <span style={styles.soldOutPill}>Agotado</span>
          ) : (
            <button
              style={styles.quickAdd}
              aria-label={`Agregar ${item.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(product);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </button>
          ))}
      </div>
      <p style={styles.name}>{item.name}</p>
      <p style={styles.price}>Bs {Number(item.price).toFixed(2)}</p>
      {!onQuickAdd &&
        (soldOut ? (
          <button style={{ ...styles.addButton, ...styles.soldOutButton }} disabled>
            Agotado
          </button>
        ) : qty === 0 ? (
          <button
            style={styles.addButton}
            onClick={(e) => {
              e.stopPropagation();
              addItem(item);
            }}
          >
            Agregar
          </button>
        ) : (
          <div style={styles.stepper}>
            <button
              style={styles.stepButton}
              aria-label={`Quitar ${item.name}`}
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(item.id, qty - 1);
              }}
            >
              −
            </button>
            <span style={styles.stepQty}>{qty}</span>
            <button
              style={{ ...styles.stepButton, ...(atLimit ? styles.stepButtonDisabled : {}) }}
              aria-label={`Añadir ${item.name}`}
              disabled={atLimit}
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(item.id, qty + 1);
              }}
            >
              +
            </button>
          </div>
        ))}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderRadius: 16,
    padding: 12,
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    textAlign: 'left',
    transition: 'transform 0.15s ease, border-color 0.15s ease',
    cursor: 'pointer',
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%', height: 140, objectFit: 'cover',
    borderRadius: 10, marginBottom: 8, display: 'block',
  },
  imagePlaceholder: {
    width: '100%', height: 140, borderRadius: 10, marginBottom: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 40, background: 'rgba(255,255,255,0.04)',
  },
  quickAdd: {
    position: 'absolute',
    right: 8,
    bottom: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid #c9a227',
    background: '#c9a227',
    color: '#000000',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
  },
  soldOutPill: {
    position: 'absolute',
    right: 8,
    bottom: 16,
    padding: '4px 10px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.75)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#8a8a8a',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: { fontWeight: 600, fontSize: 14, margin: '4px 0', color: '#fff' },
  price: { color: '#c9a227', fontWeight: 700, margin: '4px 0' },
  addButton: {
    backgroundColor: '#c9a227', color: '#000', border: 'none',
    padding: '10px 12px', borderRadius: 8, width: '100%',
    cursor: 'pointer', fontWeight: 700, fontSize: 14,
  },
  soldOutButton: {
    background: 'rgba(255,255,255,0.08)',
    color: '#8a8a8a',
    cursor: 'not-allowed',
  },
  stepButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 4,
    borderRadius: 8,
    background: 'rgba(201,162,39,0.15)',
    border: '1px solid #c9a227',
  },
  stepButton: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: 6,
    border: 'none',
    background: '#c9a227',
    color: '#000',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1,
  },
  stepQty: {
    minWidth: 20,
    textAlign: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
  },
};
