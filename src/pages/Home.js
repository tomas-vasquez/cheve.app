import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import HomeSkeleton from '../components/HomeSkeleton';
import BannerCarousel from '../components/BannerCarousel';
import ProductCard from '../components/ProductCard';
import ProductDetail from './ProductDetail';
import AddToCartSheet from '../components/AddToCartSheet';

const PAGE_SIZE = 6;

export default function Home({ headerHidden = false }) {
  const { branchId } = useBranch();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todas']);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState('Todas');
  const [chipsTop, setChipsTop] = useState(0);
  const [detailProduct, setDetailProduct] = useState(null);
  const [quickAdd, setQuickAdd] = useState(null);
  const firstRun = useRef(true);
  const barRef = useRef(null);

  useEffect(() => {
    const measure = () => {
      const h = document.querySelector('header')?.getBoundingClientRect().height;
      if (h) setChipsTop(h);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const fetchPage = useCallback(
    async (cat, start) => {
      if (!branchId) return [];
      let query = supabase
        .from('branch_products')
        .select('*')
        .eq('branch_id', branchId)
        .order('name')
        .range(start, start + PAGE_SIZE - 1);
      if (cat !== 'Todas') query = query.eq('category', cat);
      const { data } = await query;
      return (data || []).map((r) => ({ ...r, id: r.product_id }));
    },
    [branchId]
  );

  const MIN_LOADING_MS = 250;

  const loadPage = useCallback(
    async (cat, mode) => {
      setHasMore(true);
      if (mode === 'initial') setLoading(true);
      else setProductsLoading(true);
      const started = Date.now();
      const data = await fetchPage(cat, 0);
      const elapsed = Date.now() - started;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
      }
      setProducts(data);
      setHasMore(data.length === PAGE_SIZE);
      if (mode === 'initial') setLoading(false);
      else setProductsLoading(false);
    },
    [fetchPage]
  );

  const ensureCatsAtTop = () => {
    const bar = barRef.current;
    if (!bar) return;
    const headerEl = document.querySelector('header');
    const target = Math.max(0, headerEl?.getBoundingClientRect().bottom || 0);
    const rect = bar.getBoundingClientRect();
    if (rect.top > target + 2) {
      window.scrollTo({ top: window.scrollY + (rect.top - target), behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      loadPage(category, 'initial');
    } else {
      loadPage(category, 'switch');
      ensureCatsAtTop();
    }
  }, [category, loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || productsLoading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const data = await fetchPage(category, products.length);
    setProducts((prev) => [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [category, products.length, loading, productsLoading, loadingMore, hasMore, fetchPage]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!branchId) {
        setCategories(['Todas']);
        return;
      }
      const { data } = await supabase
        .from('branch_products')
        .select('category')
        .eq('branch_id', branchId)
        .not('category', 'is', null);
      if (data) {
        setCategories(['Todas', ...new Set(data.map((c) => c.category))]);
      }
    };
    fetchCategories();
  }, [branchId]);

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

      <div ref={barRef} style={{ ...styles.stickyCats, top: headerHidden ? 0 : chipsTop }}>
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

      <div style={styles.productsArea}>
        {productsLoading ? (
          <div className="products-grid">
            <HomeSkeleton count={6} bare />
          </div>
        ) : products.length === 0 ? (
          <p style={styles.empty}>
            {branchId
              ? 'No hay productos en esta categoría'
              : 'Elige una sucursal para ver el catálogo'}
          </p>
        ) : (
          <div className="products-grid">
            {products.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onOpenDetail={setDetailProduct}
                onQuickAdd={setQuickAdd}
              />
            ))}
            {loadingMore && <HomeSkeleton count={3} bare />}
          </div>
        )}

        {!hasMore && products.length > 0 && !productsLoading && (
          <p style={styles.end}>Has visto todos los productos</p>
        )}
      </div>

      {detailProduct && (
        <ProductDetail product={detailProduct} onClose={() => setDetailProduct(null)} />
      )}

      {quickAdd && (
        <AddToCartSheet product={quickAdd} onClose={() => setQuickAdd(null)} />
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
  stickyCats: {
    position: 'sticky',
    zIndex: 5,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: '14px 0 12px',
    marginTop: 20,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  productsArea: {
    marginTop: 20,
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
    borderRadius: 500,
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    fontSize: 14,
  },
  chipActive: {
    background: 'rgba(29, 185, 84,0.18)',
    border: '1px solid #1DB954',
    color: '#1DB954',
    fontWeight: 600,
  },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  end: { textAlign: 'center', marginTop: 24, color: '#555', fontSize: 13 },
};
