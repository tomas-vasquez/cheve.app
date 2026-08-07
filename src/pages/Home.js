import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import HomeSkeleton from '../components/HomeSkeleton';
import BannerCarousel from '../components/BannerCarousel';
import ProductCard from '../components/ProductCard';

const PAGE_SIZE = 6;

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todas']);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState('Todas');

  const fetchPage = useCallback(async (cat, start) => {
    let query = supabase
      .from('products')
      .select('*')
      .order('name')
      .range(start, start + PAGE_SIZE - 1);
    if (cat !== 'Todas') query = query.eq('category', cat);
    const { data } = await query;
    return data || [];
  }, []);

  const MIN_LOADING_MS = 500;

  const loadInitial = useCallback(
    async (cat) => {
      setLoading(true);
      setHasMore(true);
      const started = Date.now();
      const data = await fetchPage(cat, 0);
      const elapsed = Date.now() - started;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
      }
      setProducts(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    },
    [fetchPage]
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const data = await fetchPage(category, products.length);
    setProducts((prev) => [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [category, products.length, loading, loadingMore, hasMore, fetchPage]);

  useEffect(() => {
    loadInitial(category);
  }, [category, loadInitial]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);
      if (data) {
        setCategories(['Todas', ...new Set(data.map((c) => c.category))]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 200
      ) {
        loadMore();
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.carouselWrap}>
        <BannerCarousel />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Categorías</h2>
        <div style={styles.chips} className="chips-scroll">
          {categories.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  ...styles.chip,
                  ...(active ? styles.chipActive : {}),
                  whiteSpace: 'nowrap',
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {products.length === 0 ? (
        <p style={styles.empty}>No hay productos en esta categoría</p>
      ) : (
        <div className="products-grid">
          {products.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
          {loadingMore && <HomeSkeleton count={3} bare />}
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <p style={styles.end}>Has visto todos los productos</p>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '12px 12px 0',
  },
  carouselWrap: {
    maxWidth: 600,
    margin: '0 auto',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#c9a227',
    margin: '0 0 10px',
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
    borderRadius: 10,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: 14,
  },
  chipActive: {
    background: 'rgba(201,162,39,0.18)',
    border: '1px solid #c9a227',
    color: '#c9a227',
    fontWeight: 600,
  },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  end: { textAlign: 'center', marginTop: 24, color: '#555', fontSize: 13 },
};
