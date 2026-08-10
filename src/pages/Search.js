import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import ProductCard from '../components/ProductCard';
import ProductDetail from './ProductDetail';

export default function Search() {
  const navigate = useNavigate();
  const { branchId } = useBranch();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [detailProduct, setDetailProduct] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!branchId) {
        setProducts([]);
        return;
      }
      const { data, error } = await supabase
        .from('branch_products')
        .select('*')
        .eq('branch_id', branchId)
        .order('name');
      if (!error && data) setProducts(data.map((r) => ({ ...r, id: r.product_id })));
    };
    fetchProducts();
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [branchId]);

  const q = query.trim().toLowerCase();
  const results = products.filter((p) =>
    `${p.name} ${p.category || ''}`.toLowerCase().includes(q)
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.backButton} aria-label="Volver" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar productos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
        />
      </header>

      {results.length === 0 ? (
        <p style={styles.empty}>
          {!branchId
            ? 'Elige una sucursal para ver el catálogo'
            : q
              ? `Sin resultados para "${query}"`
              : 'Escribe para buscar productos'}
        </p>
      ) : (
        <div className="products-grid" style={styles.grid}>
          {results.map((item) => (
            <ProductCard key={item.id} item={item} onOpenDetail={setDetailProduct} />
          ))}
        </div>
      )}

      {detailProduct && (
        <ProductDetail product={detailProduct} onClose={() => setDetailProduct(null)} />
      )}
    </div>
  );
}

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#000',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 15,
    outline: 'none',
  },
  grid: {
    flex: 1,
    overflowY: 'auto',
    alignContent: 'start',
  },
  empty: { textAlign: 'center', marginTop: 60, color: '#999' },
};
