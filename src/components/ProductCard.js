import React from 'react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ item }) {
  const { items, addItem, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.id === item.id);
  const qty = cartItem?.quantity || 0;

  return (
    <div style={styles.card}>
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} style={styles.image} />
      ) : (
        <div style={styles.imagePlaceholder}>🍺</div>
      )}
      <p style={styles.name}>{item.name}</p>
      <p style={styles.price}>Bs {Number(item.price).toFixed(2)}</p>
      {qty === 0 ? (
        <button style={styles.addButton} onClick={() => addItem(item)}>
          Agregar
        </button>
      ) : (
        <div style={styles.stepper}>
          <button
            style={styles.stepButton}
            aria-label={`Quitar ${item.name}`}
            onClick={() => updateQuantity(item.id, qty - 1)}
          >
            −
          </button>
          <span style={styles.stepQty}>{qty}</span>
          <button
            style={styles.stepButton}
            aria-label={`Añadir ${item.name}`}
            onClick={() => updateQuantity(item.id, qty + 1)}
          >
            +
          </button>
        </div>
      )}
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
  name: { fontWeight: 600, fontSize: 14, margin: '4px 0', color: '#fff' },
  price: { color: '#c9a227', fontWeight: 700, margin: '4px 0' },
  addButton: {
    backgroundColor: '#c9a227', color: '#000', border: 'none',
    padding: '10px 12px', borderRadius: 8, width: '100%',
    cursor: 'pointer', fontWeight: 700, fontSize: 14,
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
