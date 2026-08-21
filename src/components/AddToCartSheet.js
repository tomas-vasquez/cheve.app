import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ProductImage from './ProductImage';

const MAX_WIDTH = 600;

const OPTIONS = [2, 4, 6];

const formatBs = (value) =>
  `Bs ${Number(value).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function AddToCartSheet({ product, onClose }) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const price = Number(product.price) || 0;
  const oldPrice = Number(product.old_price) || price;
  const stock = Number(product.stock) || 0;
  const soldOut = stock <= 0;
  const maxQty = soldOut ? 1 : stock;
  const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;

  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState(null);

  const cleanName = (product.name || '').replace(/\n/g, ' ');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const changeQuantity = (delta) => {
    if (soldOut) return;
    const next = Math.max(1, Math.min(maxQty, quantity + delta));
    setQuantity(next);
    if (option !== null && option !== next) setOption(null);
  };

  const selectOption = (opt) => {
    if (soldOut || opt > maxQty) return;
    setOption(opt);
    setQuantity(opt);
  };

  const handleAddToCart = () => {
    if (soldOut) return;
    addItem({ ...product, name: cleanName, stock }, quantity);
    showToast(
      `✓ ${quantity} ${quantity === 1 ? 'unidad agregada' : 'unidades agregadas'} al carrito`,
      { tone: 'success' }
    );
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`Agregar ${cleanName} al carrito`}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.handle} />

        <div style={styles.body}>
          <div style={styles.top}>
            <div style={styles.thumb}>
              <ProductImage
                src={product.image_url}
                alt={cleanName}
                style={styles.thumbWrap}
                imgStyle={styles.thumbImg}
                glyphColor="rgba(255,255,255,0.16)"
              />
            </div>
            <p style={styles.name}>{cleanName}</p>
            <button
              className="tap"
              style={styles.close}
              aria-label="Cerrar"
              onClick={onClose}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div style={styles.priceRow}>
            {discount > 0 && <span style={styles.badge}>-{discount}%</span>}
            <span style={styles.price}>{formatBs(price)}</span>
            {oldPrice > price && <span style={styles.oldPrice}>{formatBs(oldPrice)}</span>}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Cantidad</h3>
            <div style={styles.stepper}>
              <button
                className="tap press"
                style={{ ...styles.stepButton, ...(quantity <= 1 ? styles.stepButtonDisabled : {}) }}
                aria-label="Disminuir cantidad"
                disabled={soldOut || quantity <= 1}
                onClick={() => changeQuantity(-1)}
              >
                −
              </button>
              <span style={styles.stepValue} aria-live="polite">
                {quantity}
              </span>
              <button
                className="tap press"
                style={{
                  ...styles.stepButton,
                  ...(soldOut || quantity >= maxQty ? styles.stepButtonDisabled : {}),
                }}
                aria-label="Aumentar cantidad"
                disabled={soldOut || quantity >= maxQty}
                onClick={() => changeQuantity(1)}
              >
                +
              </button>
            </div>

            <div style={styles.options}>
              {OPTIONS.map((opt) => {
                const active = option === opt;
                const disabled = soldOut || opt > maxQty;
                return (
                  <button
                    key={opt}
                    className="tap press"
                    style={{
                      ...styles.option,
                      ...(active ? styles.optionActive : {}),
                      ...(disabled ? styles.optionDisabled : {}),
                    }}
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={() => selectOption(opt)}
                  >
                    <span style={{ ...styles.radio, ...(active ? styles.radioActive : {}) }}>
                      {active && <span style={styles.radioDot} />}
                    </span>
                    <span style={{ ...styles.optionLabel, ...(active ? styles.optionLabelActive : {}) }}>
                      {opt} unid
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.footer}>
            <div style={styles.totalBlock} aria-live="polite">
              <span style={styles.totalLabel}>Total / {quantity} unid</span>
              <span style={styles.totalPrice}>{formatBs(quantity * price)}</span>
            </div>
            <button
              className="tap press"
              style={{ ...styles.addButton, ...(soldOut ? styles.addButtonDisabled : {}) }}
              onClick={handleAddToCart}
              disabled={soldOut}
            >
              {soldOut ? 'Agotado' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 45,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    background: 'rgba(18,18,18,0.97)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTop: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 -12px 48px rgba(0,0,0,0.6)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.2)',
    margin: '10px auto 4px',
  },
  body: {
    padding: '8px 16px 16px',
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: 500,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  thumbWrap: {
    width: '100%',
    height: '100%',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  name: {
    flex: 1,
    minWidth: 0,
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.3,
    color: '#ffffff',
  },
  close: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 500,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#ffffff',
    cursor: 'pointer',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badge: {
    background: '#1DB954',
    color: '#000000',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 500,
    padding: '3px 7px',
  },
  price: {
    color: '#1DB954',
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  oldPrice: {
    color: '#8a8a8a',
    fontSize: 13,
    textDecoration: 'line-through',
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    padding: '8px 10px',
    borderRadius: 28,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
  },
  stepButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: '50%',
    border: '1px solid #1DB954',
    background: 'rgba(29, 185, 84,0.18)',
    color: '#1DB954',
    fontSize: 20,
    lineHeight: 1,
    padding: 0,
    cursor: 'pointer',
  },
  stepButtonDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  stepValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 800,
    color: '#ffffff',
  },
  section: {
    marginTop: 18,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    margin: '0 0 10px',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#1DB954',
  },
  options: {
    display: 'flex',
    gap: 12,
    marginTop: 14,
  },
  option: {
    flex: 1,
    minWidth: 0,
    height: 64,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 500,
    border: '2px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
  },
  optionActive: {
    border: '2px solid #1DB954',
    background: 'rgba(29, 185, 84,0.12)',
  },
  optionDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  radio: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 15,
    height: 15,
    borderRadius: '50%',
    border: '1.5px solid rgba(255,255,255,0.3)',
  },
  radioActive: {
    borderColor: '#1DB954',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#1DB954',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#ffffff',
  },
  optionLabelActive: {
    color: '#1DB954',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  totalBlock: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  totalLabel: {
    fontSize: 12,
    color: '#8a8a8a',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1DB954',
    lineHeight: 1.1,
  },
  addButton: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 500,
    border: 'none',
    background: '#1DB954',
    color: '#000000',
    fontSize: 15,
    fontWeight: 700,
    padding: '0 20px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  addButtonDisabled: {
    background: 'rgba(255,255,255,0.08)',
    color: '#8a8a8a',
    cursor: 'not-allowed',
  },
};
