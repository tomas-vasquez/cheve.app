import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (!error && data) setProducts(data);
    };
    fetchProducts();
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

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
          {q ? `Sin resultados para "${query}"` : 'Escribe para buscar productos'}
        </p>
      ) : (
        <div className="products-grid" style={styles.grid}>
          {results.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
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
  },
  empty: { textAlign: 'center', marginTop: 60, color: '#999' },
};
