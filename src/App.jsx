import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { products, imagePools, hexes, fallback, heroImages, money, discount } from './data.js';

const DEFAULT_FILTERS = {
  search: '',
  categories: [],
  minPrice: 799,
  maxPrice: 5000,
  size: '',
  color: '',
  rating: 0,
  sort: 'popularity',
};

function load(k, d) {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? d;
  } catch {
    return d;
  }
}

function parseHash() {
  const hash = (window.location.hash || '').slice(1) || 'home';
  const [name, id] = hash.split('/');
  return { name, id };
}

// Self-observing reveal wrapper (stable top-level identity so remounts re-trigger
// observation instead of losing an imperatively-added class).
function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('visible');
      return undefined;
    }
    const obs = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.disconnect();
          }
        }),
      { threshold: 0.08, rootMargin: '0px 0px 40px 0px' }
    );
    obs.observe(el);
    // Safety net: never leave in-viewport content hidden if the observer stalls
    const t = setTimeout(() => {
      if (el.isConnected) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('visible');
      }
    }, 1200);
    return () => {
      clearTimeout(t);
      obs.disconnect();
    };
  }, []);
  return (
    <Tag ref={ref} className={`reveal${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </Tag>
  );
}

// Top-level so React preserves DOM nodes across App re-renders
// (e.g. the hero autoplay tick). Defined inside App it would unmount/remount
// every render and lose the `visible` class.
function ProductCard({ p, wished, wishPage, onOpen, onToggleWish, onQuickAdd, onMoveToCart, onImgError }) {
  return (
    <Reveal as="article" className="product-card">
      <div className="product-image" onClick={() => onOpen(p.id)}>
        <img src={p.images[0]} className="primary" alt={p.name} loading="lazy" onError={onImgError} />
        <img src={p.images[1]} className="secondary" alt={p.name} loading="lazy" onError={onImgError} />
        <span className="discount">-{discount(p)}%</span>
        <button
          className={`heart ${wished ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWish(p.id);
          }}
          aria-label="Wishlist"
        >
          <i className={`${wished ? 'fa-solid' : 'fa-regular'} fa-heart`}></i>
        </button>
        <button
          className="quick-add"
          onClick={(e) => {
            e.stopPropagation();
            if (wishPage) onMoveToCart(p.id);
            else onQuickAdd(p.id);
          }}
        >
          {wishPage ? 'Move to bag' : 'Quick add'}
        </button>
      </div>
      <div className="product-info">
        <span className="product-brand">{p.brand}</span>
        <span className="rating">
          <i className="fa-solid fa-star"></i> {p.rating}
        </span>
        <div className="product-name" onClick={() => onOpen(p.id)}>
          {p.name}
        </div>
        <div className="price">
          {money(p.price)} <del>{money(p.originalPrice)}</del>
        </div>
      </div>
    </Reveal>
  );
}

let toastId = 0;

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const [cart, setCart] = useState(() => load('trueMenCart', []));
  const [wishlist, setWishlist] = useState(() => load('trueMenWish', []));
  const [appliedPromo, setAppliedPromo] = useState(() => load('trueMenPromo', false));
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [shopLoading, setShopLoading] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [promoInput, setPromoInput] = useState(appliedPromo ? 'TRUE10' : '');
  const [promoMsg, setPromoMsg] = useState(appliedPromo ? 'TRUE10 applied successfully' : '');
  const [contactSuccess, setContactSuccess] = useState('');
  const [detailQty, setDetailQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [detailImage, setDetailImage] = useState(0);

  const shopTimer = useRef(null);
  const heroTimer = useRef(null);

  const currentProduct = useMemo(() => {
    if (route.name === 'product') {
      return products.find((x) => x.id === Number(route.id)) || products[0];
    }
    return products[0];
  }, [route]);

  // Reset detail state when product changes — mirrors renderProduct() defaults
  useEffect(() => {
    if (route.name === 'product') {
      setSelectedSize(currentProduct.sizes[0]);
      setSelectedColor(currentProduct.colors[0].name);
      setDetailQty(1);
      setDetailImage(0);
    }
  }, [route.name, route.id, currentProduct]);

  useEffect(() => {
    setPromoInput(appliedPromo ? 'TRUE10' : '');
    setPromoMsg(appliedPromo ? 'TRUE10 applied successfully' : '');
  }, [appliedPromo]);

  // Hash routing — mirrors route()
  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      setCartOpen(false);
      setMenuOpen(false);
      setFiltersOpen(false);
      setHeroIndex((i) => (parseHash().name === 'home' ? 0 : i));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Persist — mirrors saveState()
  useEffect(() => {
    localStorage.setItem('trueMenCart', JSON.stringify(cart));
    localStorage.setItem('trueMenWish', JSON.stringify(wishlist));
    localStorage.setItem('trueMenPromo', JSON.stringify(appliedPromo));
  }, [cart, wishlist, appliedPromo]);

  // Hero autoplay — mirrors startHero()
  useEffect(() => {
    if (route.name !== 'home' && route.name !== undefined) {
      // keep timer only on home, same as clearInterval(heroTimer) in route()
    }
    if (route.name === 'home' || !window.location.hash || window.location.hash === '#home') {
      clearInterval(heroTimer.current);
      heroTimer.current = setInterval(() => {
        setHeroIndex((i) => (i + 1) % 3);
      }, 5500);
    } else {
      clearInterval(heroTimer.current);
    }
    return () => clearInterval(heroTimer.current);
  }, [route.name]);

  // Escape closes drawers — mirrors keydown listener
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeDrawers();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toast = useCallback((msg) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const closeDrawers = useCallback(() => {
    setCartOpen(false);
    setMenuOpen(false);
    setFiltersOpen(false);
  }, []);

  const toggleDrawer = useCallback(
    (id) => {
      closeDrawers();
      if (id === 'cartDrawer') setCartOpen(true);
      if (id === 'menuDrawer') setMenuOpen(true);
    },
    [closeDrawers]
  );

  const cartCount = cart.reduce((s, x) => s + x.qty, 0);

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((s, x) => {
      const p = products.find((p) => p.id === x.id);
      return s + (p ? p.price * x.qty : 0);
    }, 0);
    const discountAmount = appliedPromo ? subtotal * 0.1 : 0;
    const shipping = subtotal === 0 || subtotal >= 2499 ? 0 : 149;
    return { subtotal, discountAmount, shipping, total: subtotal - discountAmount + shipping };
  }, [cart, appliedPromo]);

  // ---- shop ----
  const queueShop = useCallback((next) => {
    if (next) setFilters(next);
    setShopLoading(true);
    clearTimeout(shopTimer.current);
    shopTimer.current = setTimeout(() => setShopLoading(false), 350);
  }, []);

  const filteredProducts = useMemo(() => {
    const list = products.filter(
      (p) =>
        (!filters.search ||
          `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(filters.search.toLowerCase())) &&
        (!filters.categories.length || filters.categories.includes(p.category)) &&
        p.price >= filters.minPrice &&
        p.price <= filters.maxPrice &&
        (!filters.size || p.sizes.includes(filters.size)) &&
        (!filters.color || p.colors.some((c) => c.name === filters.color)) &&
        p.rating >= filters.rating
    );
    return list.sort((a, b) =>
      filters.sort === 'priceAsc'
        ? a.price - b.price
        : filters.sort === 'priceDesc'
        ? b.price - a.price
        : filters.sort === 'rating'
        ? b.rating - a.rating
        : filters.sort === 'newest'
        ? b.newest - a.newest
        : b.popularity - a.popularity
    );
  }, [filters]);

  const filterCount =
    filters.categories.length +
    (filters.minPrice > 799 || filters.maxPrice < 5000 ? 1 : 0) +
    (filters.size ? 1 : 0) +
    (filters.color ? 1 : 0) +
    (filters.rating > 0 ? 1 : 0) +
    (filters.search ? 1 : 0);

  // ---- cart / wishlist actions (messages identical to original) ----
  const addToCart = useCallback(
    (p, size, color, qty = 1) => {
      const key = `${p.id}-${size}-${color}`;
      setCart((prev) => {
        const existing = prev.find((x) => x.key === key);
        if (existing) return prev.map((x) => (x.key === key ? { ...x, qty: x.qty + qty } : x));
        return [...prev, { key, id: p.id, size, color, qty }];
      });
      toast(`${p.name} added to bag`);
    },
    [toast]
  );

  const quickAdd = useCallback(
    (id) => {
      const p = products.find((x) => x.id === id);
      addToCart(p, p.sizes[0], p.colors[0].name);
    },
    [addToCart]
  );

  const moveWishToCart = useCallback(
    (id) => {
      const p = products.find((x) => x.id === id);
      addToCart(p, p.sizes[0], p.colors[0].name);
      setWishlist((w) => w.filter((x) => x !== id));
    },
    [addToCart]
  );

  const addDetailToCart = useCallback(() => {
    addToCart(currentProduct, selectedSize, selectedColor, detailQty);
    toggleDrawer('cartDrawer');
  }, [addToCart, currentProduct, selectedSize, selectedColor, detailQty, toggleDrawer]);

  const toggleWishlist = useCallback(
    (id) => {
      setWishlist((w) => {
        if (w.includes(id)) {
          toast('Removed from wishlist');
          return w.filter((x) => x !== id);
        }
        toast('Saved to wishlist');
        return [...w, id];
      });
    },
    [toast]
  );

  const removeCart = useCallback((key) => {
    setCart((c) => c.filter((x) => x.key !== key));
  }, []);

  const updateQty = useCallback((key, n) => {
    setCart((c) =>
      c.map((x) => (x.key === key ? { ...x, qty: Math.max(1, x.qty + n) } : x))
    );
  }, []);

  const openProduct = useCallback((id) => {
    window.location.hash = `product/${id}`;
  }, []);

  const shopCategory = useCallback((c) => {
    setFilters((f) => ({ ...f, categories: [c] }));
    window.location.hash = 'shop';
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: '', categories: [], minPrice: 799, maxPrice: 5000, size: '', color: '', rating: 0, sort: 'popularity' });
    setShopLoading(false);
  }, []);

  const applyPromo = useCallback(() => {
    if (promoInput.trim().toUpperCase() === 'TRUE10') {
      setAppliedPromo(true);
      toast('10% discount applied');
    } else {
      setPromoMsg('That code is not valid. Try TRUE10.');
    }
  }, [promoInput, toast]);

  const checkout = useCallback(() => {
    toast('Checkout ready. This is a demo storefront.');
  }, [toast]);

  const newsletter = useCallback(
    (e) => {
      e.preventDefault();
      toast('Welcome to the True Men list');
      e.target.reset();
    },
    [toast]
  );

  const submitContact = useCallback((e) => {
    e.preventDefault();
    setContactSuccess('Thank you. Our team will get back to you within one business day.');
    e.target.reset();
  }, []);

  const focusShopSearch = useCallback(() => {
    window.location.hash = 'shop';
    setTimeout(() => document.querySelector('#shopSearch')?.focus(), 200);
  }, []);

  // ---- shared bits ----
  const onImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallback;
  };

  const setHero = (i) => {
    setHeroIndex(i);
    clearInterval(heroTimer.current);
    heroTimer.current = setInterval(() => {
      setHeroIndex((v) => (v + 1) % 3);
    }, 5500);
  };

  const cats = [
    ['T-Shirts', imagePools['T-Shirts'][0]],
    ['Shirts', imagePools.Shirts[0]],
    ['Jeans', imagePools.Jeans[2]],
    ['Jackets', imagePools.Jackets[1]],
  ];

  const overlayOpen = cartOpen || menuOpen || filtersOpen;

  // Props shared by every product card instance
  const cardProps = (p) => ({
    p,
    wished: wishlist.includes(p.id),
    wishPage: route.name === 'wishlist',
    onOpen: openProduct,
    onToggleWish: toggleWishlist,
    onQuickAdd: quickAdd,
    onMoveToCart: moveWishToCart,
    onImgError,
  });

  return (
    <>
      <div className="topbar">Free shipping on orders above ₹2,499 &nbsp; | &nbsp; Use TRUE10 for 10% off</div>
      <header>
        <div className="container-x nav-wrap">
          <a className="logo" href="#home">
            TRUE <b>MEN</b>
          </a>
          <nav className="nav-links">
            <a href="#home">Home</a>
            <a href="#shop">Shop</a>
            <a href="#about">Our Story</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="header-actions">
            <button className="icon-btn search-head" onClick={focusShopSearch} aria-label="Search">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
            <a className="icon-btn" href="#wishlist" aria-label="Wishlist">
              <i className="fa-regular fa-heart"></i>
              <span className="badge" id="wishBadge">
                {wishlist.length}
              </span>
            </a>
            <button className="icon-btn" onClick={() => toggleDrawer('cartDrawer')} aria-label="Cart">
              <i className="fa-solid fa-bag-shopping"></i>
              <span className="badge" id="cartBadge">
                {cartCount}
              </span>
            </button>
            <button className="icon-btn hamburger" onClick={() => toggleDrawer('menuDrawer')} aria-label="Menu">
              <i className="fa-solid fa-bars"></i>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* HOME */}
        <section id="homePage" className={`page ${route.name === 'home' || route.name === '' ? 'active' : ''}`}>
          {(route.name === 'home' || route.name === '' || !route.name) && (
            <>
              <div className="hero">
                {heroImages.map((x, i) => (
                  <div
                    key={x}
                    className={`hero-slide ${i === heroIndex ? 'active' : ''}`}
                    style={{ backgroundImage: `url('${x}')` }}
                  ></div>
                ))}
                <div className="hero-copy">
                  <div className="hero-brand">
                    TRUE <span>MEN</span>
                  </div>
                  <h1>Style that says everything, without trying too hard.</h1>
                  <p>Curated new-season menswear from the labels you know, priced for the life you live.</p>
                  <a className="btn btn-light" href="#shop">
                    Shop the collection <i className="fa-solid fa-arrow-right"></i>
                  </a>
                </div>
                <div className="hero-dots">
                  {heroImages.map((_, i) => (
                    <button key={i} className={`hero-dot ${i === heroIndex ? 'active' : ''}`} onClick={() => setHero(i)}></button>
                  ))}
                </div>
              </div>
              <section className="section container-x">
                <Reveal className="section-head">
                  <div>
                    <div className="eyebrow">The edit</div>
                    <h2 className="title">Shop by category</h2>
                  </div>
                  <a href="#shop" className="btn-link">
                    View all
                  </a>
                </Reveal>
                <div className="category-grid">
                  {cats.map((c) => (
                    <Reveal key={c[0]} className="category-tile" onClick={() => shopCategory(c[0])}>
                      <img src={c[1]} alt={c[0]} loading="lazy" onError={onImgError} />
                      <div className="category-name">
                        <small>Explore</small>
                        {c[0]}
                      </div>
                    </Reveal>
                  ))}
                </div>
              </section>
              <section className="section container-x bestsellers-section" style={{ paddingTop: '20px' }}>
                <Reveal className="section-head">
                  <div>
                    <div className="eyebrow">Most wanted</div>
                    <h2 className="title">Bestsellers</h2>
                  </div>
                  <a href="#shop" className="btn-link">
                    Shop collection
                  </a>
                </Reveal>
                <div className="product-grid bestsellers-grid">
                  {products.slice(0, 8).map((p) => (
                    <ProductCard key={p.id} {...cardProps(p)} />
                  ))}
                </div>
              </section>
              <div className="brand-marquee">
                <div className="brand-track">
                  {[0, 1].map((dup) =>
                    ['ZARA', 'TOMMY HILFIGER', 'POLO RALPH LAUREN', 'ARMANI EXCHANGE', 'HUGO BOSS'].map((b) => (
                      <span key={`${dup}-${b}`}>{b}</span>
                    ))
                  )}
                </div>
              </div>
              <section className="promo">
                <div className="container-x">
                  <Reveal className="promo-copy">
                    <div className="eyebrow" style={{ color: '#ff8065' }}>
                      The weekend edit
                    </div>
                    <h2>Up to 40% off selected styles.</h2>
                    <p style={{ marginBottom: '28px' }}>Fresh fits. Better prices. Limited time only.</p>
                    <a href="#shop" className="btn btn-light">
                      Shop the offer
                    </a>
                  </Reveal>
                </div>
              </section>
              <section className="section container-x">
                <Reveal className="section-head">
                  <div>
                    <div className="eyebrow">Real reviews</div>
                    <h2 className="title">Worn with confidence</h2>
                  </div>
                </Reveal>
                <div className="quote-grid">
                  <Reveal as="blockquote" className="quote">
                    “The curation is spot on. My order looked exactly like the photos, fit perfectly, and arrived two
                    days early.”<footer>Arjun Mehta · Mumbai</footer>
                  </Reveal>
                  <Reveal as="blockquote" className="quote">
                    “Finally a store where premium brands and sensible pricing meet. The quality has been consistently
                    excellent.”<footer>Rohan Kapoor · Delhi</footer>
                  </Reveal>
                  <Reveal as="blockquote" className="quote">
                    “True Men has become my first stop before any event. Great styles, quick delivery, and easy
                    exchanges.”<footer>Vikram S. · Bengaluru</footer>
                  </Reveal>
                </div>
              </section>
              <section className="section newsletter">
                <Reveal className="container-x">
                  <div className="eyebrow">The inside word</div>
                  <h2 className="title">Good style, delivered.</h2>
                  <p className="muted" style={{ marginTop: '14px' }}>
                    New drops, private sales, and useful style notes. No noise.
                  </p>
                  <form onSubmit={newsletter}>
                    <input type="email" required placeholder="Your email address" />
                    <button>
                      Join now <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </form>
                </Reveal>
              </section>
            </>
          )}
        </section>

        {/* SHOP */}
        <section id="shopPage" className={`page ${route.name === 'shop' ? 'active' : ''}`}>
          {route.name === 'shop' && (
            <>
              <div className="page-hero">
                <div className="container-x">
                  <div className="eyebrow">Curated menswear</div>
                  <h1>THE COLLECTION</h1>
                </div>
              </div>
              <div className="container-x shop-tools">
                <aside className={`filters ${filtersOpen ? 'open' : ''}`} id="filtersPanel">
                  <button className="close-btn" style={{ position: 'absolute', right: '20px', top: '20px' }} onClick={closeDrawers}>
                    &times;
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>
                      FILTERS <span id="filterCount">{filterCount ? `(${filterCount})` : ''}</span>
                    </strong>
                    <button className="btn-link" onClick={clearFilters}>
                      Clear all
                    </button>
                  </div>
                  <div className="filter-block">
                    <h4>Category</h4>
                    {['T-Shirts', 'Shirts', 'Jeans', 'Jackets'].map((c) => (
                      <label key={c} className="check">
                        <input
                          type="checkbox"
                          value={c}
                          checked={filters.categories.includes(c)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...filters.categories, e.target.value]
                              : filters.categories.filter((x) => x !== e.target.value);
                            queueShop({ ...filters, categories: next });
                          }}
                        />{' '}
                        {c}
                      </label>
                    ))}
                  </div>
                  <div className="filter-block">
                    <h4>
                      Price:{' '}
                      <span id="priceLabel">
                        {money(filters.minPrice)} - {money(filters.maxPrice)}
                      </span>
                    </h4>
                    <small className="muted">Minimum</small>
                    <input
                      className="range"
                      type="range"
                      min="799"
                      max="4900"
                      step="100"
                      value={filters.minPrice}
                      onChange={(e) =>
                        queueShop({ ...filters, minPrice: Math.min(+e.target.value, filters.maxPrice - 100) })
                      }
                    />
                    <small className="muted">Maximum</small>
                    <input
                      className="range"
                      type="range"
                      min="899"
                      max="5000"
                      step="100"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        queueShop({ ...filters, maxPrice: Math.max(+e.target.value, filters.minPrice + 100) })
                      }
                    />
                  </div>
                  <div className="filter-block">
                    <h4>Size</h4>
                    <div className="size-list">
                      {['S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36'].map((s) => (
                        <button
                          key={s}
                          className={`size-chip ${filters.size === s ? 'active' : ''}`}
                          onClick={() => queueShop({ ...filters, size: filters.size === s ? '' : s })}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-block">
                    <h4>Color</h4>
                    <div className="swatches">
                      {['Black', 'White', 'Navy', 'Blue', 'Green', 'Beige', 'Grey', 'Brown'].map((c) => (
                        <button
                          key={c}
                          title={c}
                          className={`swatch ${filters.color === c ? 'active' : ''}`}
                          style={{ background: hexes[c] }}
                          onClick={() => queueShop({ ...filters, color: filters.color === c ? '' : c })}
                        ></button>
                      ))}
                    </div>
                  </div>
                  <div className="filter-block">
                    <h4>Minimum rating</h4>
                    <select
                      className="select"
                      style={{ width: '100%' }}
                      value={filters.rating}
                      onChange={(e) => queueShop({ ...filters, rating: +e.target.value })}
                    >
                      <option value="0">All ratings</option>
                      {[4, 4.5].map((r) => (
                        <option key={r} value={r}>
                          {r}+ stars
                        </option>
                      ))}
                    </select>
                  </div>
                </aside>
                <section>
                  <div className="catalog-head">
                    <span id="resultCount" className="muted">
                      {filteredProducts.length} styles
                    </span>
                    <div className="catalog-actions">
                      <button className="btn filter-mobile" onClick={() => setFiltersOpen(true)}>
                        <i className="fa-solid fa-sliders"></i> Filters
                      </button>
                      <div className="search-wrap">
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <input
                          id="shopSearch"
                          className="search-input"
                          placeholder="Search products or brands"
                          value={filters.search}
                          onChange={(e) => queueShop({ ...filters, search: e.target.value })}
                        />
                      </div>
                      <select
                        className="select"
                        value={filters.sort}
                        onChange={(e) => queueShop({ ...filters, sort: e.target.value })}
                      >
                        {[
                          ['popularity', 'Popularity'],
                          ['priceAsc', 'Price: Low to high'],
                          ['priceDesc', 'Price: High to low'],
                          ['newest', 'Newest'],
                          ['rating', 'Rating'],
                        ].map((o) => (
                          <option key={o[0]} value={o[0]}>
                            {o[1]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="product-grid" id="shopGrid">
                    {shopLoading ? (
                      Array(8)
                        .fill(0)
                        .map((_, i) => (
                          <div key={i}>
                            <div className="skeleton"></div>
                            <div style={{ height: '12px', background: '#eee', marginTop: '12px', width: '65%' }}></div>
                          </div>
                        ))
                    ) : filteredProducts.length ? (
                      filteredProducts.map((p) => <ProductCard key={p.id} {...cardProps(p)} />)
                    ) : (
                      <div className="empty">
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <h2>No styles found</h2>
                        <p className="muted" style={{ margin: '10px 0 25px' }}>
                          Try changing your search or filters.
                        </p>
                        <button className="btn btn-dark" onClick={clearFilters}>
                          Clear filters
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </section>

        {/* PRODUCT */}
        <section id="productPage" className={`page ${route.name === 'product' ? 'active' : ''}`}>
          {route.name === 'product' && (
            <>
              <div className="container-x detail">
                <div className="gallery">
                  <div className="thumbs">
                    {currentProduct.images.map((im, i) => (
                      <button
                        key={i}
                        className={`thumb ${i === detailImage ? 'active' : ''}`}
                        onClick={() => setDetailImage(i)}
                      >
                        <img src={im} alt={currentProduct.name} loading="lazy" onError={onImgError} />
                      </button>
                    ))}
                  </div>
                  <div
                    className="main-image"
                    onMouseMove={(e) => {
                      const img = e.currentTarget.querySelector('img');
                      const r = e.currentTarget.getBoundingClientRect();
                      img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${
                        ((e.clientY - r.top) / r.height) * 100
                      }%`;
                      img.style.transform = 'scale(1.7)';
                    }}
                    onMouseLeave={(e) => {
                      const img = e.currentTarget.querySelector('img');
                      if (img) img.style.transform = 'scale(1)';
                    }}
                  >
                    <img src={currentProduct.images[detailImage]} alt={currentProduct.name} onError={onImgError} />
                  </div>
                </div>
                <div className="detail-info">
                  <div className="product-brand">{currentProduct.brand}</div>
                  <h1>{currentProduct.name}</h1>
                  <div style={{ fontSize: '12px', color: '#8d6a16' }}>
                    {Array(Math.round(currentProduct.rating))
                      .fill(0)
                      .map((_, i) => (
                        <i key={i} className="fa-solid fa-star"></i>
                      ))}{' '}
                    <span className="muted">
                      {currentProduct.rating} · {48 + currentProduct.id * 7} reviews
                    </span>
                  </div>
                  <div className="detail-price">
                    {money(currentProduct.price)}{' '}
                    <del style={{ color: '#999', fontSize: '15px', fontWeight: 400 }}>
                      {money(currentProduct.originalPrice)}
                    </del>{' '}
                    <span style={{ color: 'var(--accent)', fontSize: '13px' }}>{discount(currentProduct)}% off</span>
                  </div>
                  <div className="tax-note">Inclusive of all taxes</div>
                  <div className="option">
                    <div className="option-head">
                      <span>
                        Color: <span id="colorName">{selectedColor}</span>
                      </span>
                    </div>
                    <div className="swatches">
                      {currentProduct.colors.map((c, i) => (
                        <button
                          key={c.name}
                          className={`swatch ${selectedColor === c.name ? 'active' : ''}`}
                          style={{ background: c.hex }}
                          title={c.name}
                          onClick={() => {
                            setSelectedColor(c.name);
                            setDetailImage(i % currentProduct.images.length);
                          }}
                        ></button>
                      ))}
                    </div>
                  </div>
                  <div className="option">
                    <div className="option-head">
                      <span>Select size</span>
                      <button className="btn-link" onClick={() => toast('Size guide: choose your usual size')}>
                        Size guide
                      </button>
                    </div>
                    <div className="size-list">
                      {currentProduct.sizes.map((s) => (
                        <button
                          key={s}
                          className={`size-chip ${selectedSize === s ? 'active' : ''}`}
                          onClick={() => setSelectedSize(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="detail-actions">
                    <div className="qty">
                      <button onClick={() => setDetailQty((q) => Math.max(1, q - 1))}>−</button>
                      <span id="detailQty">{detailQty}</span>
                      <button onClick={() => setDetailQty((q) => q + 1)}>+</button>
                    </div>
                    <button className="btn btn-dark" onClick={addDetailToCart}>
                      Add to bag
                    </button>
                    <button
                      className={`heart wish-detail ${wishlist.includes(currentProduct.id) ? 'active' : ''}`}
                      onClick={() => toggleWishlist(currentProduct.id)}
                      aria-label="Wishlist"
                    >
                      <i
                        className={`${wishlist.includes(currentProduct.id) ? 'fa-solid' : 'fa-regular'} fa-heart`}
                      ></i>
                    </button>
                  </div>
                  <p className="detail-desc">{currentProduct.description}</p>
                  <div style={{ display: 'flex', gap: '25px', marginTop: '23px', fontSize: '12px' }}>
                    <span>
                      <i className="fa-solid fa-truck-fast"></i> Free shipping over ₹2,499
                    </span>
                    <span>
                      <i className="fa-solid fa-rotate-left"></i> 14-day returns
                    </span>
                  </div>
                </div>
              </div>
              <section className="section container-x" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">You may also like</div>
                    <h2 className="title">Related products</h2>
                  </div>
                </div>
                <div className="product-grid">
                  {products
                    .filter((x) => x.category === currentProduct.category && x.id !== currentProduct.id)
                    .slice(0, 4)
                    .map((p) => (
                      <ProductCard key={p.id} {...cardProps(p)} />
                    ))}
                </div>
              </section>
            </>
          )}
        </section>

        {/* CART */}
        <section id="cartPage" className={`page ${route.name === 'cart' ? 'active' : ''}`}>
          {route.name === 'cart' && (
            <>
              <div className="page-hero">
                <div className="container-x">
                  <div className="eyebrow">Your selection</div>
                  <h1>SHOPPING BAG</h1>
                </div>
              </div>
              <div className="container-x">
                {cart.length ? (
                  <div className="cart-layout">
                    <div>
                      {cart.map((x) => {
                        const p = products.find((y) => y.id === x.id);
                        return (
                          <div key={x.key} className="line-item">
                            <img src={p.images[0]} alt={p.name} loading="lazy" onError={onImgError} />
                            <div>
                              <div className="product-brand">{p.brand}</div>
                              <h3>{p.name}</h3>
                              <div className="line-meta">
                                Color: {x.color} &nbsp; Size: {x.size}
                              </div>
                              <div className="mini-qty">
                                <button onClick={() => updateQty(x.key, -1)}>−</button>
                                <span>{x.qty}</span>
                                <button onClick={() => updateQty(x.key, 1)}>+</button>
                              </div>{' '}
                              <button
                                className="btn-link"
                                style={{ marginLeft: '14px', color: '#777', fontSize: '11px' }}
                                onClick={() => removeCart(x.key)}
                              >
                                Remove
                              </button>
                            </div>
                            <strong className="line-price">{money(p.price * x.qty)}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <aside className="summary">
                      <h2>Order summary</h2>
                      <div className="summary-row">
                        <span>Subtotal</span>
                        <span>{money(cartTotals.subtotal)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Shipping</span>
                        <span>{cartTotals.shipping ? money(cartTotals.shipping) : 'FREE'}</span>
                      </div>
                      {appliedPromo && (
                        <div className="summary-row" style={{ color: 'var(--accent)' }}>
                          <span>TRUE10 discount</span>
                          <span>−{money(cartTotals.discountAmount)}</span>
                        </div>
                      )}
                      <div className="summary-row summary-total">
                        <span>Total</span>
                        <span>{money(cartTotals.total)}</span>
                      </div>
                      <div className="promo-field">
                        <input
                          id="promoInput"
                          placeholder="Promo code"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                        />
                        <button onClick={applyPromo}>Apply</button>
                      </div>
                      <div id="promoMsg" style={{ fontSize: '11px', color: appliedPromo ? 'green' : '#777' }}>
                        {promoMsg}
                      </div>
                      <button className="btn btn-dark" style={{ width: '100%', marginTop: '22px' }} onClick={checkout}>
                        Secure checkout
                      </button>
                    </aside>
                  </div>
                ) : (
                  <div className="empty">
                    <i className="fa-solid fa-bag-shopping"></i>
                    <h2>Your bag is empty</h2>
                    <p className="muted" style={{ margin: '10px 0 25px' }}>
                      Add a few great pieces and come back here.
                    </p>
                    <a href="#shop" className="btn btn-dark">
                      Explore the collection
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* WISHLIST */}
        <section id="wishlistPage" className={`page ${route.name === 'wishlist' ? 'active' : ''}`}>
          {route.name === 'wishlist' && (
            <>
              <div className="page-hero">
                <div className="container-x">
                  <div className="eyebrow">Saved for later</div>
                  <h1>WISHLIST</h1>
                </div>
              </div>
              <div className="container-x">
                {wishlist.length ? (
                  <div className="wishlist-grid">
                    {products
                      .filter((p) => wishlist.includes(p.id))
                      .map((p) => (
                        <ProductCard key={p.id} {...cardProps(p)} />
                      ))}
                  </div>
                ) : (
                  <div className="empty">
                    <i className="fa-regular fa-heart"></i>
                    <h2>Your wishlist is waiting</h2>
                    <p className="muted" style={{ margin: '10px 0 25px' }}>
                      Save the pieces you love and find them here.
                    </p>
                    <a href="#shop" className="btn btn-dark">
                      Discover styles
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* ABOUT */}
        <section id="aboutPage" className={`page ${route.name === 'about' ? 'active' : ''}`}>
          {route.name === 'about' && (
            <>
              <div className="page-hero">
                <div className="container-x">
                  <div className="eyebrow">Since 2018</div>
                  <h1>DRESS TRUE.</h1>
                </div>
              </div>
              <section className="story">
                <div className="story-image"></div>
                <Reveal className="story-copy">
                  <div className="eyebrow">Our story</div>
                  <h2>Good clothes. No guesswork.</h2>
                  <p className="muted" style={{ lineHeight: 1.8 }}>
                    True Men began with a simple frustration: finding current, quality menswear should not mean choosing
                    between inflated prices and disposable trends. We bring together the labels men trust, edit every
                    collection with purpose, and price it honestly.
                  </p>
                  <p className="muted" style={{ lineHeight: 1.8, marginTop: '18px' }}>
                    From a single store in Mumbai to wardrobes across India, our promise has stayed the same: help every
                    man look considered, comfortable, and completely himself.
                  </p>
                </Reveal>
              </section>
              <div className="stats">
                <div className="stat">
                  <strong>18K+</strong>
                  <span className="muted">Happy customers</span>
                </div>
                <div className="stat">
                  <strong>5</strong>
                  <span className="muted">Global brands</span>
                </div>
                <div className="stat">
                  <strong>28</strong>
                  <span className="muted">Cities delivered</span>
                </div>
                <div className="stat">
                  <strong>4.8</strong>
                  <span className="muted">Average rating</span>
                </div>
              </div>
              <section className="section container-x">
                <div className="section-head">
                  <div>
                    <div className="eyebrow">The True Men standard</div>
                    <h2 className="title">Why choose us</h2>
                  </div>
                </div>
                <div className="why-grid">
                  <Reveal className="why-item">
                    <i className="fa-solid fa-gem"></i>
                    <h3>Curated quality</h3>
                    <p className="muted">Every piece is selected for fabric, fit, finish, and lasting relevance.</p>
                  </Reveal>
                  <Reveal className="why-item">
                    <i className="fa-solid fa-tags"></i>
                    <h3>Honest value</h3>
                    <p className="muted">Premium global labels at fair prices, without compromising authenticity.</p>
                  </Reveal>
                  <Reveal className="why-item">
                    <i className="fa-solid fa-arrows-rotate"></i>
                    <h3>Easy always</h3>
                    <p className="muted">Fast delivery, helpful support, and a simple 14-day return process.</p>
                  </Reveal>
                </div>
              </section>
            </>
          )}
        </section>

        {/* CONTACT */}
        <section id="contactPage" className={`page ${route.name === 'contact' ? 'active' : ''}`}>
          {route.name === 'contact' && (
            <>
              <div className="page-hero">
                <div className="container-x">
                  <div className="eyebrow">We are here to help</div>
                  <h1>LET&apos;S TALK.</h1>
                </div>
              </div>
              <div className="container-x contact-layout">
                <div className="contact-details">
                  <h2 className="title" style={{ fontSize: '40px' }}>
                    Visit or reach out
                  </h2>
                  <p className="muted">Questions about fit, orders, returns, or a look you are building? Our style team is ready.</p>
                  <p>
                    <strong>True Men Store, Navsari</strong>
                    <br />
                    <span className="muted">
                      Dudhia Talav Shopping Center Road,
                      <br />
                      Beside Ramanand Restaurant,
                      <br />
                      Navsari, Gujarat, India 396445
                    </span>
                  </p>
                  <p>
                    <strong>+91 22 4850 2020</strong>
                    <br />
                    <span className="muted">
                      hello@truemen.in
                      <br />
                      Mon-Sat, 10 AM-8 PM
                    </span>
                  </p>
                  <div className="map" style={{ padding: 0, overflow: 'hidden', display: 'block' }}>
                    <iframe
                      title="True Men Store — Navsari"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3371.857785081788!2d72.92693109999999!3d20.951545599999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be0f7f644cae5bb%3A0x98e2755987fa30f6!2sTrue%20Men!5e1!3m2!1sen!2sin!4v1790158740104!5m2!1sen!2sin"
                      style={{ border: 0, width: '100%', height: '100%', minHeight: '280px', display: 'block' }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    ></iframe>
                  </div>
                </div>
                <form className="form-grid" onSubmit={submitContact}>
                  <input className="field" required placeholder="First name" />
                  <input className="field" required placeholder="Last name" />
                  <input className="field" type="email" required placeholder="Email address" />
                  <input className="field" type="tel" placeholder="Phone (optional)" />
                  <select className="field">
                    <option>Order support</option>
                    <option>Product &amp; fit advice</option>
                    <option>Returns &amp; exchanges</option>
                    <option>Other</option>
                  </select>
                  <input className="field" placeholder="Order number (optional)" />
                  <textarea className="field" required placeholder="How can we help?"></textarea>
                  <button className="btn btn-dark" style={{ marginTop: '15px' }}>
                    Send message
                  </button>
                  <p id="contactSuccess" style={{ gridColumn: '1/-1', color: 'green' }}>
                    {contactSuccess}
                  </p>
                </form>
              </div>
            </>
          )}
        </section>
      </main>

      <div className={`overlay ${overlayOpen ? 'open' : ''}`} id="overlay" onClick={closeDrawers}></div>
      <aside className={`drawer ${cartOpen ? 'open' : ''}`} id="cartDrawer">
        <div className="drawer-head">
          <strong>
            YOUR BAG (<span id="drawerCount">{cartCount}</span>)
          </strong>
          <button className="close-btn" onClick={closeDrawers}>
            &times;
          </button>
        </div>
        <div className="drawer-body" id="miniCart">
          {cart.length ? (
            cart.map((x) => {
              const p = products.find((y) => y.id === x.id);
              return (
                <div key={x.key} className="mini-item">
                  <img src={p.images[0]} alt={p.name} loading="lazy" onError={onImgError} />
                  <div>
                    <strong style={{ fontSize: '13px' }}>{p.name}</strong>
                    <div className="line-meta">
                      {x.color} / {x.size} · Qty {x.qty}
                    </div>
                    <span className="price">{money(p.price * x.qty)}</span>
                  </div>
                  <button className="close-btn" style={{ fontSize: '15px' }} onClick={() => removeCart(x.key)}>
                    &times;
                  </button>
                </div>
              );
            })
          ) : (
            <div className="empty">
              <i className="fa-solid fa-bag-shopping"></i>
              <h3>Your bag is empty</h3>
              <p className="muted">Good style is only a click away.</p>
            </div>
          )}
        </div>
        <div className="drawer-foot" id="miniCartFoot">
          {cart.length ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <strong>Subtotal</strong>
                <strong>{money(cartTotals.subtotal)}</strong>
              </div>
              <a href="#cart" className="btn btn-dark" style={{ width: '100%' }} onClick={closeDrawers}>
                View bag &amp; checkout
              </a>
            </>
          ) : (
            <a href="#shop" className="btn btn-dark" style={{ width: '100%' }} onClick={closeDrawers}>
              Start shopping
            </a>
          )}
        </div>
      </aside>
      <aside className={`drawer mobile-menu ${menuOpen ? 'open' : ''}`} id="menuDrawer">
        <div className="drawer-head">
          <span className="logo">
            TRUE <b>MEN</b>
          </span>
          <button className="close-btn" onClick={closeDrawers}>
            &times;
          </button>
        </div>
        <div className="drawer-body">
          <a href="#home">Home</a>
          <a href="#shop">Shop</a>
          <a href="#wishlist">Wishlist</a>
          <a href="#about">Our Story</a>
          <a href="#contact">Contact</a>
        </div>
      </aside>
      <div className="toast-wrap" id="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>

      <footer className="site-footer">
        <div className="container-x">
          <div className="footer-grid">
            <div>
              <div className="logo footer-logo">
                TRUE <b>MEN</b>
              </div>
              <p style={{ color: '#92928b', maxWidth: '300px', lineHeight: 1.7, fontSize: '13px' }}>
                Curated global menswear for men who know that style is less about trying and more about choosing well.
              </p>
            </div>
            <div className="footer-col">
              <h4>Shop</h4>
              <a href="#shop">New Arrivals</a>
              <a href="#shop">T-Shirts</a>
              <a href="#shop">Shirts</a>
              <a href="#shop">Jackets</a>
            </div>
            <div className="footer-col">
              <h4>Help</h4>
              <a href="#contact">Contact</a>
              <a href="#contact">Shipping</a>
              <a href="#contact">Returns</a>
              <a href="#contact">Size Guide</a>
            </div>
            <div className="footer-col">
              <h4>Follow</h4>
              <a
                href="https://www.instagram.com/true_men_____?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
              <a href="https://wa.me/message/7GRGQAAWQ6V4P1" target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </div>
          </div>
          <div className="copyright">
            <span>© 2026 True Men. All rights reserved.</span>
            <span>Secure payments · Easy returns</span>
          </div>
        </div>
      </footer>
    </>
  );
}
