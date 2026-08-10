import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';

const OPTIONS = [2, 4, 6];
const MAX_WIDTH = 600;

const DEFAULT_PRODUCT = {
  id: 'golden-pack-12',
  name: '12 Pack Cerveza Golden 440 Ml\n(Lata Grande)',
  description: '1x12 Unidades - 440ml LATA',
  price: 105,
  oldPrice: 120,
  imageUrl: '',
  stock: Infinity,
};

const formatBs = (value) =>
  `Bs ${Number(value).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ProductDetail({ product: productProp, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const stateProduct = productProp || location.state?.product || {};

  const price = Number(stateProduct.price) || DEFAULT_PRODUCT.price;
  const oldPrice = Number(stateProduct.old_price) || DEFAULT_PRODUCT.oldPrice;
  const product = {
    id: stateProduct.id || DEFAULT_PRODUCT.id,
    name: stateProduct.name || DEFAULT_PRODUCT.name,
    description: stateProduct.description || DEFAULT_PRODUCT.description,
    price,
    oldPrice,
    imageUrl: stateProduct.image_url || DEFAULT_PRODUCT.imageUrl,
    stock: stateProduct.stock != null ? Number(stateProduct.stock) : DEFAULT_PRODUCT.stock,
  };
  const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;

  const stock = Number(product.stock) || 0;
  const soldOut = stock <= 0;
  const maxQty = soldOut ? 1 : stock;

  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState(null);

  const total = quantity * price;
  const totalOld = quantity * oldPrice;
  const cleanName = product.name.replace(/\n/g, ' ');

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!onCloseRef.current) return;
    window.history.pushState({ productDetail: true }, '');
    const onPop = () => onCloseRef.current && onCloseRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const close = () => {
    if (onClose) window.history.back();
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

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
    console.log('handleAddToCart', { product: { ...product, name: cleanName }, quantity });
    addItem({ ...product, name: cleanName, stock }, quantity);
    showToast(
      `✓ ${quantity} ${quantity === 1 ? 'unidad agregada' : 'unidades agregadas'} al carrito`,
      { tone: 'success' }
    );
  };

  return (
    <div style={styles.root} role="dialog" aria-modal="true" aria-label="Detalles del producto">
      <div style={styles.inner}>
        <header style={styles.header}>
          <button
            className="tap"
            style={styles.backButton}
            aria-label="Volver"
            onClick={close}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>
          <h1 style={styles.headerTitle}>Detalles del producto</h1>
        </header>

        <div style={styles.content}>
          <div style={styles.imageArea}>
            <div style={styles.imagePanel}>
              <ProductImage
                src={product.imageUrl}
                alt={cleanName}
                style={styles.imageWrap}
                imgStyle={styles.image}
                glyphColor="rgba(255,255,255,0.16)"
              />
            </div>
          </div>

          <div style={styles.body}>
            {discount > 0 && <span style={styles.badge}>-{discount}%</span>}

            <div style={styles.priceRow}>
              <span style={styles.price}>{formatBs(price)}</span>
              {oldPrice > price && (
                <span style={styles.oldPrice}>{formatBs(oldPrice)}</span>
              )}
            </div>

            <h2 style={styles.name}>{product.name}</h2>
            <p style={styles.description}>{product.description}</p>

            <section style={styles.section}>
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
                    ...(!soldOut && quantity >= maxQty ? styles.stepButtonDisabled : {}),
                    ...(soldOut ? styles.stepButtonDisabled : {}),
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
            </section>
          </div>
        </div>
      </div>

      <div style={styles.bottomBar}>
        <div style={styles.bottomBarInner}>
          <div style={styles.totalBlock} aria-live="polite">
            <span style={styles.totalLabel}>Total / {quantity} unid</span>
            <span style={styles.totalPrices}>
              <span style={styles.totalPrice}>{formatBs(total)}</span>
              {oldPrice > price && (
                <span style={styles.totalOld}>{formatBs(totalOld)}</span>
              )}
            </span>
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
  );
}

const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    background: '#000000',
    color: '#ffffff',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  inner: {
    maxWidth: MAX_WIDTH,
    margin: '0 auto',
    minHeight: '100%',
    paddingBottom: 110,
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  backButton: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#ffffff',
    cursor: 'pointer',
  },
  headerTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
    color: '#ffffff',
  },
  content: {
    paddingBottom: 0,
  },
  imageArea: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 16px 0',
  },
  imagePanel: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
  },
  imageWrap: {
    width: '100%',
    height: 320,
  },
  image: {
    width: '75%',
    maxWidth: '75%',
    height: '100%',
    maxHeight: '100%',
  },
  body: {
    padding: '16px 16px 24px',
  },
  badge: {
    display: 'inline-block',
    background: '#c9a227',
    color: '#000000',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 10,
    padding: '5px 10px',
    marginBottom: 10,
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 10,
  },
  price: {
    color: '#c9a227',
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  oldPrice: {
    color: '#8a8a8a',
    fontSize: 14,
    textDecoration: 'line-through',
  },
  name: {
    margin: '10px 0 0',
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.3,
    color: '#ffffff',
    whiteSpace: 'pre-line',
  },
  description: {
    margin: '8px 0 0',
    fontSize: 14,
    color: '#8a8a8a',
  },
  section: {
    marginTop: 24,
    paddingTop: 20,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    margin: '0 0 10px',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#c9a227',
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    padding: '8px 10px',
    borderRadius: 30,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
  },
  stepButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: '50%',
    border: '1px solid #c9a227',
    background: 'rgba(201,162,39,0.18)',
    color: '#c9a227',
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
  options: {
    display: 'flex',
    gap: 12,
    marginTop: 14,
  },
  option: {
    flex: 1,
    minWidth: 0,
    height: 76,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    border: '2px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
  },
  optionActive: {
    border: '2px solid #c9a227',
    background: 'rgba(201,162,39,0.12)',
  },
  optionDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  radio: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '1.5px solid rgba(255,255,255,0.3)',
  },
  radioActive: {
    borderColor: '#c9a227',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#c9a227',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#ffffff',
  },
  optionLabelActive: {
    color: '#c9a227',
  },
  bottomBar: {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: MAX_WIDTH,
    bottom: 0,
    zIndex: 20,
    background: 'rgba(18,18,18,0.95)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  bottomBarInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 16px',
  },
  totalBlock: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  totalLabel: {
    fontSize: 13,
    color: '#8a8a8a',
  },
  totalPrices: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 700,
    color: '#c9a227',
    lineHeight: 1.1,
  },
  totalOld: {
    fontSize: 14,
    color: '#8a8a8a',
    textDecoration: 'line-through',
  },
  addButton: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 10,
    border: 'none',
    background: '#c9a227',
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
