import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync, useDebounced } from '../lib/useAsync';
import ProductCard from '../components/ProductCard';
import { Empty, ErrorBox, ProductGridSkeleton } from '../components/States';
import { SearchIcon } from '../components/Icons';
import type { ProductQuery } from '../lib/types';
import type { CSSProperties } from 'react';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
] as const;

/** Keeps the size chips in a sensible order rather than alphabetical. */
/** How recent a product must be to count as "New in". */
const NEW_WINDOW_DAYS = 30;

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s);
  return i === -1 ? SIZE_ORDER.length : i;
};

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // The URL is the source of truth, so filters survive refresh and sharing.
  const categoryId = params.get('categoryId') ?? '';
  const size = params.get('size') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const urlSearch = params.get('search') ?? '';
  const onlyNew = params.has('new');

  // The search box stays local and feeds the URL after a pause.
  const [searchBox, setSearchBox] = useState(urlSearch);
  const debouncedSearch = useDebounced(searchBox);

  useEffect(() => {
    if (debouncedSearch === urlSearch) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('search', debouncedSearch);
        else next.delete('search');
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, urlSearch, setParams]);

  const patch = (key: string, value: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const clearAll = () => {
    setSearchBox('');
    setParams(new URLSearchParams());
  };

  const query = useMemo<ProductQuery>(
    () => ({
      search: urlSearch || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      size: size || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort: sort as ProductQuery['sort'],
    }),
    [urlSearch, categoryId, size, minPrice, maxPrice, sort],
  );

  const products = useAsync(() => api.products(query), [query]);
  const categories = useAsync(() => api.categories(), []);
  // Unfiltered fetch purely to build the facet lists, so narrowing the
  // results never makes the other filter options disappear.
  const facets = useAsync(() => api.products({}), []);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of facets.data ?? []) for (const v of p.variants ?? []) set.add(v.size);
    return [...set].sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b));
  }, [facets.data]);

  const activeCount =
    [categoryId, size, minPrice, maxPrice, urlSearch].filter(Boolean).length +
    (onlyNew ? 1 : 0);

  // The API has no "recently added" filter, so this one is applied here.
  const list = useMemo(() => {
    const all = products.data ?? [];
    if (!onlyNew) return all;
    const cutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return all.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
  }, [products.data, onlyNew]);

  return (
    <div className="wrap page">
      <div className="page-head">
        <span className="eyebrow">{onlyNew ? 'Just landed' : 'Collection'}</span>
        <h1>{onlyNew ? 'New in' : 'Shop all'}</h1>
        <p className="lede">
          {facets.data ? `${facets.data.length} pieces in the current season.` : ' '}
        </p>
      </div>

      <div className="catalog">
        <aside className={`filters${showFilters ? ' filters-open' : ''}`}>
          <div className="row row-between" style={{ marginBottom: 16 }}>
            <strong className="small">Filters</strong>
            {activeCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          <div className="filter-group">
            <h4>Availability</h4>
            <label className="filter-opt">
              <input
                type="checkbox"
                checked={onlyNew}
                onChange={(e) => patch('new', e.target.checked ? '1' : '')}
              />
              New in — last {NEW_WINDOW_DAYS} days
            </label>
          </div>

          <div className="filter-group">
            <h4>Category</h4>
            <label className="filter-opt">
              <input
                type="radio"
                name="category"
                checked={categoryId === ''}
                onChange={() => patch('categoryId', '')}
              />
              All categories
            </label>
            {(categories.data ?? []).map((c) => (
              <label key={c.id} className="filter-opt">
                <input
                  type="radio"
                  name="category"
                  checked={categoryId === String(c.id)}
                  onChange={() => patch('categoryId', String(c.id))}
                />
                {c.name}
              </label>
            ))}
          </div>

          {sizes.length > 0 && (
            <div className="filter-group">
              <h4>Size</h4>
              <div className="chip-row">
                {sizes.map((s) => (
                  <button
                    key={s}
                    className={`chip${size === s ? ' chip-on' : ''}`}
                    onClick={() => patch('size', size === s ? '' : s)}
                    aria-pressed={size === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="hint">Only shows pieces with that size in stock.</p>
            </div>
          )}

          <div className="filter-group">
            <h4>Price (LKR)</h4>
            <div className="row" style={{ '--row-gap': '8px' } as CSSProperties}>
              <input
                className="input"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => patch('minPrice', e.target.value)}
                aria-label="Minimum price"
              />
              <span className="faint">–</span>
              <input
                className="input"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => patch('maxPrice', e.target.value)}
                aria-label="Maximum price"
              />
            </div>
          </div>
        </aside>

        <div>
          <div className="catalog-bar">
            <div className="search">
              <SearchIcon />
              <input
                className="input"
                type="search"
                placeholder="Search products…"
                value={searchBox}
                onChange={(e) => setSearchBox(e.target.value)}
                aria-label="Search products"
              />
            </div>

            <div className="row">
              <button
                className="btn btn-sm btn-outline filter-toggle"
                onClick={() => setShowFilters((v) => !v)}
              >
                Filters{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>

              <label className="sr-only" htmlFor="sort">
                Sort by
              </label>
              <select
                id="sort"
                className="select"
                style={{ width: 'auto' }}
                value={sort}
                onChange={(e) => patch('sort', e.target.value)}
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {products.loading && <ProductGridSkeleton />}

          {products.error && <ErrorBox message={products.error} onRetry={products.reload} />}

          {!products.loading && !products.error && list.length === 0 && (
            <Empty
              title="Nothing matches those filters"
              message="Try widening the price range or clearing a filter."
              action={
                <button className="btn btn-outline" onClick={clearAll}>
                  Clear filters
                </button>
              }
            />
          )}

          {!products.loading && !products.error && list.length > 0 && (
            <>
              <p className="small muted" style={{ marginBottom: 18 }}>
                {list.length} {list.length === 1 ? 'product' : 'products'}
              </p>
              <div className="product-grid">
                {list.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
