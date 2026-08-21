import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import CheckoutModal from '../components/CheckoutModal';

export default function Cart() {
  const { items, updateQuantity, total } = useCart();
  const [checkout, setCheckout] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        {items.length === 0 && <p style={styles.empty}>Tu carrito está vacío</p>}
        {items.map((item) => (
          <div key={item.id} style={styles.row}>
            <span style={styles.name}>
              {item.name}
              {item.options && item.options.length > 0 && (
                <span style={styles.options}>{item.options.join(', ')}</span>
              )}
            </span>
            <div style={styles.qtyControls}>
              <button style={styles.qtyButton} onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
              <span style={styles.qty}>{item.quantity}</span>
              <button
                style={styles.qtyButton}
                disabled={item.quantity >= Number(item.stock ?? Infinity)}
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
              >
                +
              </button>
            </div>
            <span style={styles.subtotal}>Bs {(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div style={styles.footer}>
          <p style={styles.total}>Total: Bs {total.toFixed(2)}</p>
          <button
            style={styles.checkoutButton}
            disabled={items.length === 0}
            onClick={() => setCheckout(true)}
          >
            Ir a pagar
          </button>
        </div>
      </div>

      {checkout && items.length > 0 && (
        <CheckoutModal total={total} onClose={() => setCheckout(false)} />
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    maxWidth: 600,
    margin: '0 auto',
    background:
      'radial-gradient(circle at 20% 0%, rgba(29,185,84,0.08), transparent 40%)',
  },
  panel: {
    padding: 20,
    borderRadius: 16,
    background: '#181818',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  name: { flex: 2, color: '#fff', fontSize: 15 },
  options: { display: 'block', fontSize: 12, color: '#B3B3B3', marginTop: 2 },
  qtyControls: { display: 'flex', alignItems: 'center', gap: 10 },
  qtyButton: {
    width: 30, height: 30, borderRadius: 500, cursor: 'pointer',
    background: 'rgba(255,255,255,0.08)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)', fontSize: 16, lineHeight: 1,
  },
  qty: { minWidth: 20, textAlign: 'center', color: '#fff' },
  subtotal: { flex: 1, textAlign: 'right', color: '#1DB954', fontWeight: 600 },
  empty: { textAlign: 'center', marginTop: 40, marginBottom: 40, color: '#B3B3B3' },
  footer: { borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginTop: 8 },
  total: { fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#fff' },
  checkoutButton: {
    backgroundColor: '#1DB954', color: '#000', border: 'none',
    padding: 14, borderRadius: 500, width: '100%',
    cursor: 'pointer', fontWeight: 700, fontSize: 15,
    transition: 'transform 0.1s ease, background-color 0.2s ease',
  },
};
