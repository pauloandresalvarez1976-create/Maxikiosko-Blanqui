import { useEffect, useMemo, useRef, useState } from "react";
import ProductImage from "./components/ProductImage";
import RAW_PRODUCTS from "./products.json";
import EMOJI_MAP from "./emojis.json";
import { DEFAULT_CONTACT_CONTENT } from "./contactContent.js";
import FeatureCarousel from "./components/FeatureCarousel.jsx";
import BusinessHoursCarousel from "./components/BusinessHoursCarousel.jsx";
import FlyerCarousel from "./components/FlyerCarousel.jsx";
import { buildArrivalItems, buildPromotionItems, loadCatalogFeed, millisecondsUntilArgentinaMidnight } from "./catalogFeatures.js";
import MarketingOptIn from "./components/MarketingOptIn.jsx";

const CATALOG_URL = ""; // Desactivado en esta copia temporal
const CATALOG_TOKEN = ""; // Sin credenciales en la vista previa
const VIEWS = ["home", "shop", "promotions", "cart", "contact", "shipping", "payments", "supplies"];
const PRODUCTS_PER_PAGE = 20;
const money = (value) => `$${Number(value || 0).toLocaleString("es-AR")}`;
const formatProductDiscount = (value) => {
  const label = String(value ?? "").trim();
  if (!label) return null;
  if (/2\s*x\s*1/i.test(label)) return "2x1";
  const amount = Number(label.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) && amount !== 0 ? `−${Math.abs(amount)}%` : label;
};
const discountPercent = (value) => {
  if (value === null || value === undefined || /2\s*x\s*1/i.test(String(value))) return null;
  const amount = Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) && amount > 0 && amount < 100 ? amount : null;
};
const discountedUnitPrice = (product) => {
  const percent = discountPercent(product?.offerDiscount);
  return percent ? Math.round(Number(product.price || 0) * (1 - percent / 100)) : Number(product.price || 0);
};
const promotionLabel = (value) => {
  if (/2\s*x\s*1/i.test(String(value ?? ""))) return "2x1";
  const percent = discountPercent(value);
  return percent ? `${percent}% OFF` : formatProductDiscount(value);
};

const SHIPPING_BRANDS = [
  { name: "Mercado Libre", logo: "/brand-logos/mercado-libre.png", variant: "mercado-libre" },
  { name: "Adidas", logo: "/brand-logos/adidas.svg", variant: "adidas", caption: true },
  { name: "Dexter", logo: "/brand-logos/dexter.png", variant: "dexter" },
  { name: "Pickit", logo: "/brand-logos/pickit.png", variant: "pickit" },
  { name: "Nike", logo: "/brand-logos/nike.svg", variant: "nike", caption: true },
  { name: "Farmacity", logo: null, variant: "farmacity" },
  { name: "Temu", logo: "/brand-logos/temu.png", variant: "temu" },
  { name: "Topper", logo: "/brand-logos/topper.svg", variant: "topper" },
  { name: "Ocasa", logo: "/brand-logos/ocasa.png", variant: "ocasa" },
];

const lineTotal = (product, quantity) => {
  const offer = product.offerDiscount;
  if (typeof offer === "number" && offer > 0 && offer < 100) {
    return Math.round(product.price * (1 - offer / 100)) * quantity;
  }
  if (String(offer).toLowerCase() === "2x1") {
    return (Math.floor(quantity / 2) + (quantity % 2)) * product.price;
  }
  return product.price * quantity;
};

const normalizeProduct = (product) => ({
  id: product.id,
  name: product.name ?? product.n ?? "Producto sin nombre",
  category: product.category ?? product.c ?? "Otros",
  price: Math.round(Number(product.price ?? product.p ?? 0)),
  stock: Math.round(Number(product.stock ?? product.s ?? 0)),
  enabled: product.enabled ?? product.e ?? true,
  lowStock: product.lowStock ?? product.ls ?? false,
  offerDiscount: product.offerDiscount ?? product.offer ?? null,
  customPhoto: product.customPhoto ?? null,
  photoVersion: product.photoVersion ?? null,
  photoUrl: product.photoUrl ?? product.imageUrl ?? null,
  code: product.code ?? product.barcode ?? null,
  barcode: product.barcode ?? null,
  emoji: product.emoji || EMOJI_MAP[product.category ?? product.c] || "🛒",
});

const initialProducts = RAW_PRODUCTS.map(normalizeProduct);

async function loadCatalog() {
  try {
    return await loadCatalogFeed();
  } catch (error) {
    console.warn("No se pudo leer el catálogo de solo lectura:", error.message);
    return null;
  }
}

function App() {
  const [products, setProducts] = useState(initialProducts);
  const [catalogState, setCatalogState] = useState("cargando");
  const [catalogPromotions, setCatalogPromotions] = useState(null);
  const [catalogArrivals, setCatalogArrivals] = useState([]);
  const [categories, setCategories] = useState(["Todas"]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState(() => {
    const initial = window.location.hash.replace(/^#/, "");
    return VIEWS.includes(initial) ? initial : "home";
  });
  const [checkout, setCheckout] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [client, setClient] = useState({ name: "", phone: "", note: "" });
  const [whatsapp] = useState({ numero: String(import.meta.env.VITE_WHATSAPP_NUMBER || "5492645461073").replace(/\D/g, ""), enabled: true, mensajeExtra: "" });
  const [contact] = useState(DEFAULT_CONTACT_CONTENT);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    let alive = true;
    const refreshCatalog = () => loadCatalog().then((catalog) => {
      if (!alive) return;
      if (catalog?.products?.length) {
        setProducts(catalog.products.map(normalizeProduct));
        setCatalogPromotions(Array.isArray(catalog.promotions) ? catalog.promotions : null);
        setCatalogArrivals(catalog.arrivals || []);
        setCatalogState("actualizado");
      } else {
        setCatalogState("respaldo");
      }
    });
    refreshCatalog();
    const refreshTimer = window.setInterval(refreshCatalog, 30000);
    let midnightTimer;
    const scheduleMidnightRefresh = () => {
      midnightTimer = window.setTimeout(() => {
        refreshCatalog();
        scheduleMidnightRefresh();
      }, millisecondsUntilArgentinaMidnight() + 250);
    };
    scheduleMidnightRefresh();
    return () => { alive = false; window.clearInterval(refreshTimer); window.clearTimeout(midnightTimer); };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const next = window.location.hash.replace(/^#/, "");
      setView(VIEWS.includes(next) ? next : "home");
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (next) => {
    if (!VIEWS.includes(next)) return;
    if (next !== view) window.history.pushState({ view: next }, "", `#${next}`);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToShop = () => {
    setSearch("");
    setCurrentPage(1);
    setCategories(["Todas"]);
    setCategorySearch("");
    setCategoryOpen(false);
    navigateTo("shop");
  };

  const availableProducts = useMemo(
    () => products.filter((product) => product.enabled !== false),
    [products]
  );
  const promotionCarouselItems = useMemo(
    () => Array.isArray(catalogPromotions)
      ? catalogPromotions
      : buildPromotionItems(availableProducts, []),
    [availableProducts, catalogPromotions]
  );
  const allPromotionItems = useMemo(
    () => {
      if (Array.isArray(catalogPromotions) && catalogPromotions.length && catalogPromotions[0]?.name && Object.hasOwn(catalogPromotions[0], "price")) {
        return catalogPromotions;
      }
      return buildPromotionItems(availableProducts, Array.isArray(catalogPromotions) ? catalogPromotions : [], new Date(), 1000);
    },
    [availableProducts, catalogPromotions]
  );
  const arrivalCarouselItems = useMemo(
    () => buildArrivalItems(catalogArrivals, availableProducts),
    [catalogArrivals, availableProducts]
  );
  const showArrivalCarousel = arrivalCarouselItems.length > 0;
  const showPromotionCarousel = promotionCarouselItems.length > 0;
  const showSingleFeaturedCarousel = showArrivalCarousel !== showPromotionCarousel;
  const categoryList = useMemo(
    () => ["Todas", ...Array.from(new Set(availableProducts.map((product) => product.category))).sort((a, b) => a.localeCompare(b, "es"))],
    [availableProducts]
  );
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return availableProducts.filter((product) => {
      const matchesCategory = categories.includes("Todas") || categories.includes(product.category);
      const matchesSearch = !query || `${product.name} ${product.category}`.toLocaleLowerCase("es").includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [availableProducts, categories, search]);
  const visibleCategories = categoryList.slice(1).filter((category) => category.toLocaleLowerCase("es").includes(categorySearch.trim().toLocaleLowerCase("es")));
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const pageProducts = filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
  useEffect(() => { setCurrentPage(1); }, [search, categories]);
  const selectCategory = (category) => {
    if (category === "Todas") {
      setCategories(["Todas"]);
      return;
    }
    setCategories((current) => {
      const selected = current.includes("Todas") ? [] : current.filter((item) => item !== "Todas");
      const next = selected.includes(category) ? selected.filter((item) => item !== category) : [...selected, category];
      return next.length ? next : ["Todas"];
    });
  };
  const cartTotal = cart.reduce((sum, item) => sum + lineTotal(item, item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const toast = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const addToCart = (product) => {
    const stock = Math.max(0, Math.floor(Number(product.stock || 0)));
    if (stock < 1) return toast(`${product.name}: sin stock disponible`);
    const inCart = cart.find((item) => item.id === product.id);
    if (inCart && inCart.quantity >= stock) return toast(`Solo hay ${stock} unidades disponibles de ${product.name}`);
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    toast(`${product.name} agregado al carrito`);
  };

  const changeQuantity = (id, delta) => {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item];
      const quantity = item.quantity + delta;
      if (quantity > Number(item.stock || 0)) {
        toast(`Solo hay ${item.stock} unidades disponibles de ${item.name}`);
        return [item];
      }
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  };

  const messageForWhatsApp = (order) => [
    `*NUEVO PEDIDO - ${contact.name || "Maxikiosko Blanqui"}*`,
    String(order.id).startsWith("PREVIEW-") ? null : `*Pedido:* ${order.id}`,
    "",
    `*Cliente:* ${order.client.name}`,
    `*Teléfono:* ${order.client.phone}`,
    "*Modalidad:* Retiro en el local",
    "",
    "*--- PRODUCTOS ---*",
    ...order.items.map((item) => `- ${item.name} x${item.qty} - ${money(item.price)} c/u - ${money(item.subtotal)}${item.promotion ? ` (${item.promotion})` : ""}`),
    "",
    `*TOTAL ESTIMADO: ${money(order.total)}*`,
    order.client.note ? `*Observación:* ${order.client.note}` : null,
    whatsapp.mensajeExtra || null,
  ].filter(Boolean).join("\n");

  const submitOrder = async (event) => {
    event.preventDefault();
    if (submitLock.current) return;
    if (!client.name.trim() || !client.phone.trim()) return toast("Completá tu nombre y teléfono para enviar el pedido");
    if (!cart.length) return;
    if (!whatsapp.numero || whatsapp.enabled === false) return toast("El WhatsApp del local todavía no está configurado");
    submitLock.current = true;
    setSending(true);
    try {
      const order = {
        id: `WA-${Date.now()}`,
        client: { name: client.name.trim(), phone: client.phone.trim(), note: client.note.trim() },
        items: cart.map((item) => ({
          name: item.name,
          qty: item.quantity,
          price: discountedUnitPrice(item),
          subtotal: lineTotal(item, item.quantity),
          promotion: item.offerDiscount ? promotionLabel(item.offerDiscount) : "",
        })),
        total: cartTotal,
      };
      const whatsappUrl = `https://wa.me/${whatsapp.numero}?text=${encodeURIComponent(messageForWhatsApp(order))}`;
      setConfirmation({ id: order.id, total: order.total, whatsappUrl });
      setCart([]);
      setCheckout(false);
      setClient({ name: "", phone: "", note: "" });
    } catch (error) {
      console.error(error);
      toast(error?.message || "No se pudo preparar el mensaje. Intentá nuevamente");
      submitLock.current = false;
    } finally {
      submitLock.current = false;
      setSending(false);
    }
  };

  const portalHeader = (
    <header className="site-header">
      <button type="button" className="brand logo-brand" onClick={() => navigateTo("home")} aria-label={`Volver al inicio de ${contact.name}`}>
        <img className="brand-logo" src="/logo-maxikiosko-blanqui.jpg" alt="" width={840} height={169} />
      </button>
      <nav className="premium-nav" aria-label="Navegación principal">
        <button type="button" className={`premium-portal premium-portal-store ${view === "shop" ? "is-active" : ""}`} onClick={goToShop}>
          <span className="premium-portal-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 10 5 4.5h14L20.5 10"/><path d="M4.5 10v9.5h15V10M3.5 10c0 1.4 1 2.5 2.3 2.5S8 11.4 8 10c0 1.4 1 2.5 2.3 2.5s2.3-1.1 2.3-2.5c0 1.4 1 2.5 2.3 2.5s2.3-1.1 2.3-2.5c0 1.4 1 2.5 2.3 2.5s2.3-1.1 2.3-2.5"/><path d="M9 19.5v-5h6v5"/></svg></span>
          <span className="premium-portal-copy"><b>Tienda</b><small>Catálogo completo</small></span>
        </button>
        <button type="button" className={`premium-portal premium-portal-cart ${cartCount ? "has-items" : ""} ${view === "cart" ? "is-active" : ""}`} onClick={() => navigateTo("cart")}>
          <span className="premium-portal-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 4.5h2l2.1 10.2h10.7l2.2-7.2H6.2"/><path d="M8.3 18.5h.1M17.3 18.5h.1"/><circle cx="8.5" cy="18.5" r="1.3"/><circle cx="17.5" cy="18.5" r="1.3"/></svg></span>
          <span className="premium-portal-copy"><b>Mi carrito</b><small>{cartCount ? `${cartCount} productos` : "Todavía vacío"}</small></span>
        </button>
        <button type="button" className={`premium-portal premium-portal-contact ${view === "contact" ? "is-active" : ""}`} onClick={() => navigateTo("contact")}>
          <span className="premium-portal-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5h16v11H9l-5 3v-14Z"/><path d="M8 10h8M8 13.5h5"/></svg></span>
          <span className="premium-portal-copy"><b>Contacto</b><small>Estamos cerca</small></span>
        </button>
      </nav>
      {view !== "home" && <button className="home-return" onClick={() => navigateTo("home")}><span className="home-return-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7 7-7-7 7-7"/></svg></span><span className="home-return-text">Volver al inicio</span></button>}
    </header>
  );

  const productGrid = (
    <div className="product-grid">
      {pageProducts.map((product) => (
        <article className="product-card" key={product.id}>
          <div className="product-image-shell">
            <ProductImage product={product} size={118} className="product-photo" showPhoto />
            {product.offerDiscount && <span className="product-discount-badge">{formatProductDiscount(product.offerDiscount)}</span>}
          </div>
          <div className="product-info">
            <small>{product.category}</small>
            <h3>{product.name}</h3>
            <span className="stock-label">{product.stock > 0 ? `${product.stock} disponibles` : "0 disponibles"}</span>
            <div className="product-footer"><strong>{money(product.price)}</strong><button className={product.stock < 1 ? "is-out-of-stock" : ""} disabled={product.stock < 1} onClick={() => addToCart(product)}>{product.stock > 0 ? "Agregar" : "Sin stock"}</button></div>
          </div>
        </article>
      ))}
      {!filteredProducts.length && <div className="empty-state">No encontramos productos con esa búsqueda.</div>}
    </div>
  );

  const cartContents = cart.length ? (
    <>
      <div className="cart-items">
        {cart.map((item) => (
          <div className="cart-item" key={item.id}>
            <ProductImage product={item} size={72} className="cart-item-image" showPhoto />
            <div className="cart-item-details"><div className="cart-item-heading"><strong>{item.name}</strong></div><div className={`cart-item-price${discountPercent(item.offerDiscount) ? " has-discount" : ""}`}>{discountPercent(item.offerDiscount) ? <><del>{money(item.price)}</del><strong>{money(discountedUnitPrice(item))}</strong><small>c/u</small></> : <><strong>{money(item.price)}</strong><small>c/u</small></>}{item.offerDiscount && <span className="cart-item-promo">{promotionLabel(item.offerDiscount)}</span>}</div><div className="quantity"><button onClick={() => changeQuantity(item.id, -1)} aria-label={`Quitar una unidad de ${item.name}`}>−</button><b>{item.quantity}</b><button onClick={() => changeQuantity(item.id, 1)} aria-label={`Agregar una unidad de ${item.name}`}>+</button></div></div>
            <strong>{money(lineTotal(item, item.quantity))}</strong>
          </div>
        ))}
      </div>
      <div className="cart-total"><span>Total estimado</span><strong>{money(cartTotal)}</strong></div>
      <button className="primary-button full cart-checkout-button" onClick={() => setCheckout(true)}>Continuar con el pedido <span className="cart-checkout-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 5l7 7-7 7" /></svg></span></button>
    </>
  ) : (
    <div className="empty-cart"><span>🛒</span><p>Tu carrito está vacío.</p><button className="primary-button" onClick={goToShop}>Ir a la tienda <span className="cart-empty-store-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 5l7 7-7 7" /></svg></span></button></div>
  );

  let pageContent;
  if (view === "home") {
    pageContent = (
      <main className="hub-home">
        <section className="premium-hero">
          <div className="premium-hero-copy">
            <p className="eyebrow hero-kicker">● LOCAL CERCANO · EXPERIENCIA SIMPLE</p>
            <h1>Comprá fácil.<br /><em>Resolvé rápido.</em><br />Viví más cerca.</h1>
            <p className="hero-copy">Productos, servicios y soluciones para todos los días. Entrá, elegí lo que necesitás y seguí con tu día.</p>
            <div className="premium-hero-actions"><button className="primary-button hero-shop-button" onClick={goToShop}>Explorar la tienda <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 5l7 7-7 7" /></svg></span></button><button className="premium-text-link hero-services-button" onClick={() => document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth" })}>Conocé nuestros servicios <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></span></button></div>
            <div className="premium-hero-proof"><span className="hero-proof-check" aria-hidden="true">✓</span><strong>Atención cercana</strong><i aria-hidden="true">·</i><strong>Servicios para tu día a día</strong></div>
          </div>
          <div className="premium-hero-stage hub-hero-stage" aria-label="Servicios de Maxikiosko Blanqui">
            <div className="premium-stage-glow" />
            <BusinessHoursCarousel hours={contact.horarios} logoSrc="/logo-candy-maxikiosko-blanqui.jpg" />
          </div>
        </section>

        {(showArrivalCarousel || showPromotionCarousel) && (
          <section className={`home-featured-carousels${showSingleFeaturedCarousel ? " is-single" : ""}`} aria-label="Novedades y promociones">
            {showArrivalCarousel && <FeatureCarousel
              title="Lo que llegó al Blanqui"
              eyebrow="NOVEDADES DEL LOCAL"
              description="Productos recibidos hoy, sincronizados desde MiPOS."
              items={arrivalCarouselItems}
              variant="arrivals"
              emptyMessage="Cuando registres una compra de hoy en MiPOS, va a aparecer acá con su foto y precio de venta."
            />}
            {showPromotionCarousel && <FeatureCarousel
              title="Promociones"
              eyebrow="OPORTUNIDADES PARA VOS"
              description="Las mismas ofertas vigentes del carrusel de MiPOS."
              items={promotionCarouselItems}
              variant="promotions"
              actionLabel="Ver todas las promociones"
              onAction={() => navigateTo("promotions")}
              emptyMessage="Las promociones activas de MiPOS van a aparecer acá al sincronizarse."
            />}
          </section>
        )}

        <section className="premium-trust hub-trust" aria-label="Acerca del local">
          <div className="trust-feature trust-feature-near">
            <span className="trust-feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg></span>
            <span className="trust-feature-copy"><strong>Un solo lugar</strong><small>Todo más cerca</small></span>
          </div>
          <div className="trust-feature trust-feature-care">
            <span className="trust-feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-5 3v-10.5A7.5 7.5 0 0 1 10.5 4h2A7.5 7.5 0 0 1 20 11.5Z"/><path d="M8 11h8M8 14.5h5"/></svg></span>
            <span className="trust-feature-copy"><strong>Atención cercana</strong><small>Estamos para ayudarte</small></span>
          </div>
          <div className="trust-feature trust-feature-location">
            <span className="trust-feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>
            <span className="trust-feature-copy"><strong>En San Juan</strong><small>Acercate al local</small></span>
          </div>
          <div className="premium-trust-note trust-logo-card"><span className="trust-logo-frame"><img src="/logo-candy-maxikiosko-blanqui.jpg" alt="Maxikiosko Blanqui" width="640" height="640" loading="lazy" /></span></div>
        </section>
        <FlyerCarousel />

        <section id="servicios" className="premium-services"><div className="premium-section-heading"><div className="services-heading-title"><p className="eyebrow services-eyebrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.3 7.2 7.2 2.3-7.2 2.3-2.3 7.2-2.3-7.2-7.2-2.3 7.2-2.3L12 2.5Z" /></svg>MUCHO MÁS QUE UNA TIENDA</p><h2>Todo resuelto,<br /><em>en un mismo lugar.</em></h2></div><p className="services-intro-copy">Además de comprar, podés venir a resolver eso que necesitás en el momento. Conocé nuestros servicios.</p></div>
          <div className="premium-service-grid">
            <button className="premium-service premium-service-store" onClick={goToShop}><small>01</small><b className="premium-service-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18l-1.2 11H4.2L3 9Z"/><path d="M8 9a4 4 0 0 1 8 0"/></svg></b><h3>Tienda</h3><p>Explorá el catálogo, encontrá lo que necesitás y armá tu pedido de forma simple.</p><span className="premium-service-cta"><span>Explorar tienda</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></button>
            <button className="premium-service premium-service-mint" onClick={() => navigateTo("shipping")}><small>02</small><b className="premium-service-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12v9"/></svg></b><h3>Paquetería &amp;<br />Mercado Libre</h3><p>Recibí, despachá y gestioná tus paquetes con la tranquilidad de tener un punto cercano.</p><span className="premium-service-cta"><span>Conocer más</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></button>
            <button className="premium-service premium-service-violet" onClick={() => navigateTo("payments")}><small>03</small><b className="premium-service-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/></svg></b><h3>Medios de pago</h3><p>Conocé las opciones disponibles para compras y consultas en el local.</p><span className="premium-service-cta"><span>Conocer más</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></button>
            <button className="premium-service premium-service-amber" onClick={() => navigateTo("supplies")}><small>04</small><b className="premium-service-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18m-11 0v2h4v-2"/></svg></b><h3>Insumos &amp; soluciones</h3><p>Paquetería, cobros y soluciones para tu negocio en San Juan.</p><span className="premium-service-cta"><span>Conocer más</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></button>
          </div>
        </section>

        <section className="premium-contact-band contact-band-premium"><div><p className="eyebrow contact-band-eyebrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>ESTAMOS CERCA</p><h2>¿Necesitás ayuda?<br /><em>Estamos para vos.</em></h2><p className="contact-band-copy">Escribinos o acercate al local. Te ayudamos a encontrar la sección que buscás.</p></div><button className="secondary-button contact-cta" onClick={() => navigateTo("contact")}>Contactanos<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button></section>
      </main>
    );
  } else if (view === "promotions") {
    pageContent = (
      <main className="subpage-main promotions-page">
        <section className="subpage-intro promotions-page-intro">
          <div className="promotions-intro-badges">
            <button className="promotions-back-button" type="button" onClick={() => navigateTo("home")}>
              <span className="promotions-arrow-chip promotions-intro-arrow is-back" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg></span>
              <span>Volver al inicio</span>
            </button>
            <p className="eyebrow promotions-page-eyebrow"><span className="promotions-eyebrow-sparkle" aria-hidden="true">✦</span>OFERTAS PARA VOS</p>
          </div>
          <h1>Todas las <em>promociones.</em></h1>
          <p>Descubrí las ofertas vigentes del Blanqui y elegí tus favoritas en un solo lugar.</p>
        </section>
        <section className="promotions-page-grid" aria-label="Todas las promociones">
          {allPromotionItems.length ? allPromotionItems.map((item) => (
            <article className="promotion-offer-card" key={item.id}>
              <div className="promotion-offer-image">
                {item.photo ? <img src={item.photo} alt={item.name} loading="lazy" /> : <span aria-hidden="true">{item.emoji || "✦"}</span>}
                <b>{item.badge || "OFERTA"}</b>
              </div>
              <div className="promotion-offer-copy">
                <span>{item.kicker || "PROMOCIÓN VIGENTE"}</span>
                <h2>{item.name}</h2>
                <p>{item.subtitle || "Promoción disponible en el local"}</p>
                <div className="promotion-offer-price">{item.originalPrice > item.price && <del>{money(item.originalPrice)}</del>}<strong>{money(item.price)}</strong></div>
              </div>
            </article>
          )) : <div className="promotions-empty"><span aria-hidden="true">✦</span><h2>No hay promociones activas</h2><p>Las próximas oportunidades van a aparecer acá cuando se sincronicen desde MiPOS.</p></div>}
        </section>
        <div className="promotions-page-footer">
          <button className="primary-button promotions-footer-button" type="button" onClick={() => navigateTo("home")}>
            <span className="promotions-arrow-chip promotions-footer-arrow is-back" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg></span>
            <span>Volver al inicio</span>
          </button>
          <button className="secondary-button promotions-footer-button" type="button" onClick={goToShop}>
            <span>Explorar la tienda</span>
            <span className="promotions-arrow-chip promotions-footer-arrow is-forward" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg></span>
          </button>
        </div>
      </main>
    );
  } else if (view === "shop") {
    pageContent = (
      <main className="subpage-main shop-page">
        <section className="subpage-intro shop-page-intro"><div className="shop-intro-heading"><h1>Encontrá lo que <em>necesitás.</em></h1><p className="eyebrow shop-page-eyebrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9h18l-1.2 11H4.2L3 9Z"/><path d="M8 9a4 4 0 0 1 8 0"/></svg>TIENDA · CATÁLOGO COMPLETO</p></div><p className="shop-intro-copy">Explorá los productos, revisá sus precios y disponibilidad, y armá tu pedido.</p><div className="shop-status-row"><span className={`catalog-status ${catalogState}`}>{catalogState === "actualizado" ? "Catálogo actualizado" : catalogState === "respaldo" ? "Vista de respaldo: el catálogo de Cloudflare aún no está disponible" : "Conectando con el catálogo…"}</span><div className="shop-delivery-platforms" aria-label="También nos podés encontrar en PedidosYa y Rappi"><span className="shop-delivery-copy">También nos podés encontrar en</span><span className="shop-delivery-pointer" aria-hidden="true">👉</span><div className="shop-delivery-logos"><a className="shop-delivery-logo" href="https://www.pedidosya.com.ar/restaurantes/san-juan/maxikiosko-blanqui-c7005b61-a385-41a6-9fd5-41d08dec5c73-menu?origin=shop_list" target="_blank" rel="noreferrer" aria-label="Abrir tienda de Maxikiosko Blanqui en PedidosYa"><img src="/brand-logos/delivery/pedidosya.png" alt="PedidosYa" /></a><a className="shop-delivery-logo" href="https://www.rappi.com.ar/tiendas/265590-maxikioskoblanquii-mt-nc" target="_blank" rel="noreferrer" aria-label="Abrir tienda de Maxikiosko Blanqui en Rappi"><img src="/brand-logos/delivery/rappi.png" alt="Rappi" /></a></div></div></div></section>
        <section className="catalog-section shop-catalog" id="catalogo">
          <div className="section-heading shop-catalog-heading"><div><p className="eyebrow">CATÁLOGO</p><h2>Elegí lo que necesitás</h2></div><span>{filteredProducts.length} productos</span></div>
          <div className="catalog-tools">
            <label className="search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar productos..." /></label>
            <div className="category-picker">
              <button className={`category-trigger ${categoryOpen ? "is-open" : ""}`} type="button" aria-expanded={categoryOpen} onClick={() => setCategoryOpen((open) => !open)}>
                <span><small>CATEGORÍAS</small><strong>{categories.includes("Todas") ? "Todas las categorías" : `${categories.length} seleccionada${categories.length === 1 ? "" : "s"}`}</strong></span>
                <span className={`category-chevron${categoryOpen ? " is-open" : ""}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
              </button>
              {categoryOpen && <div className="category-menu">
                <label className="category-search">⌕<input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Buscar categorías..." /></label>
                <button type="button" className={`category-option category-option-all ${categories.includes("Todas") ? "is-selected" : ""}`} onClick={() => selectCategory("Todas")}><span className="category-check">{categories.includes("Todas") ? "✓" : ""}</span><span>Todas las categorías</span></button>
                <div className="category-options">{visibleCategories.map((category) => <button type="button" key={category} className={`category-option ${categories.includes(category) ? "is-selected" : ""}`} onClick={() => selectCategory(category)}><span className="category-check">{categories.includes(category) ? "✓" : ""}</span><span>{category}</span></button>)}
                  {!visibleCategories.length && <p className="category-empty">No hay categorías con ese nombre.</p>}
                </div>
                <div className="category-menu-footer"><span>{categories.includes("Todas") ? "Mostrando todo el catálogo" : `Mostrando ${categories.length} categoría${categories.length === 1 ? "" : "s"}`}</span><button type="button" onClick={() => { setCategories(["Todas"]); setCategorySearch(""); }}>Limpiar</button></div>
              </div>}
            </div>
          </div>
          {productGrid}
          {filteredProducts.length > 0 && <nav className="catalog-pagination" aria-label="Paginación de productos">
            <span>Mostrando {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1}–{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length}</span>
            <div><button type="button" onClick={() => { setCurrentPage((page) => Math.max(1, page - 1)); document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} disabled={currentPage === 1}>← Anterior</button>
              <strong>Página {currentPage} de {pageCount}</strong>
              <button type="button" onClick={() => { setCurrentPage((page) => Math.min(pageCount, page + 1)); document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} disabled={currentPage === pageCount}>Siguiente →</button></div>
          </nav>}
        </section>
      </main>
    );
  } else if (view === "cart") {
    pageContent = (
      <main className="subpage-main cart-page">
        <section className="subpage-intro"><p className="eyebrow">● TU PEDIDO</p><h1>Mi <em>carrito.</em></h1><p>Revisá los productos y las cantidades antes de continuar.</p></section>
        <section className="cart-page-card">{cartContents}</section>
      </main>
    );
  } else if (view === "shipping") {
    pageContent = (
      <main className="subpage-main shipping-page">
        <section className="shipping-panel"><div className="shipping-intro"><p className="eyebrow">● PAQUETERÍA · RETIROS · DESPACHOS</p><h1>Tu paquete,<br /><em>más cerca.</em></h1><p>En Maxikiosko Blanqui recibimos y entregamos paquetería de distintas marcas y operadores. Retirá tus compras o consultá por el despacho de tus envíos en un punto cercano.</p></div>
          <div className="shipping-brands-heading"><span>UNA RED DE MARCAS Y OPERADORES</span><small>Todo más a mano, con la atención de siempre.</small></div>
          <div className="shipping-brand-grid">{SHIPPING_BRANDS.map((brand) => <div className={`shipping-brand shipping-brand--${brand.variant}`} key={brand.name}><div className="shipping-brand-logo">{brand.logo ? <img src={brand.logo} alt={brand.name} loading="lazy" decoding="async" /> : <div className="shipping-farmacity-logo" role="img" aria-label="Farmacity"><i>+</i><b>farmacity</b></div>}</div>{brand.caption && <span className="shipping-brand-label">{brand.name}</span>}</div>)}</div>
          <div className="shipping-footer"><div><strong>¿Tenés un paquete pendiente?</strong><small>Consultanos y te orientamos para retirar o despachar tu envío.</small></div><button className="primary-button" onClick={() => navigateTo("contact")}>Contactanos →</button></div>
          <p className="shipping-disclaimer">La disponibilidad de retiros y despachos puede variar según las condiciones de cada operador.</p>
        </section>
      </main>
    );
  } else if (view === "payments") {
    pageContent = (
      <main className="subpage-main information-page payments-page">
        <section className="subpage-intro payments-intro"><p className="eyebrow">✧ PAGÁ COMO MÁS TE CONVIENE</p><h1>Todos tus medios<br /><em>de pago, bienvenidos.</em></h1><p>En Maxikiosko Blanqui queremos que comprar sea simple y cómodo. Elegí la forma de pago que mejor se adapte a vos.</p></section>
        <section className="payment-showcase" aria-label="Medios de pago aceptados">
          <div className="payment-showcase-glow" aria-hidden="true" />
          <div className="payment-showcase-heading"><span className="payment-kicker">✦ OPCIONES PARA CADA MOMENTO</span><h2>Pagá a tu manera,<br /><em>con total tranquilidad.</em></h2><p>Aceptamos distintos medios de pago para que puedas resolver tu compra fácil, rápido y de la forma que preferís.</p></div>
          <div className="payment-options">
            <article className="payment-option"><span className="payment-option-icon payment-cash" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M6 7h2m8 10h2"/><circle cx="12" cy="13" r="2.5"/></svg></span><span><strong>Efectivo</strong><small>Pagá directamente en el local</small></span></article>
            <article className="payment-option"><span className="payment-option-icon payment-transfer" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8h15m0 0-4-4m4 4-4 4M20 16H5m0 0 4 4m-4-4 4-4"/></svg></span><span><strong>Transferencia</strong><small>Desde tu banco o billetera</small></span></article>
            <article className="payment-option"><span className="payment-option-icon payment-mp" aria-hidden="true"><img src="/brand-logos/payments/mercado-pago-vertical.svg" alt="" /></span><span><strong>Mercado Pago</strong><small>Con tu billetera digital</small></span></article>
            <article className="payment-option"><span className="payment-option-icon payment-debit" aria-hidden="true"><img src="/brand-logos/payments/visa-card.svg" alt="" /></span><span><strong>Tarjeta de débito</strong><small>Pagá con tu tarjeta habitual</small></span></article>
            <article className="payment-option"><span className="payment-option-icon payment-credit" aria-hidden="true"><img src="/brand-logos/payments/mastercard-card.svg" alt="" /></span><span><strong>Tarjeta de crédito</strong><small>Consultá opciones en el local</small></span></article>
            <article className="payment-option"><span className="payment-option-icon payment-qr" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2v2h-2zm4 0h2m-4 4h2m2 0v2m-5-1v1"/></svg></span><span><strong>Pago con QR</strong><small>Escaneá desde tu aplicación</small></span></article>
          </div>
          <div className="payment-brands" aria-label="Marcas y formas de pago">
            <div className="payment-logo-brand payment-brand-mp"><img src="/brand-logos/payments/mercado-pago-horizontal.svg" alt="Mercado Pago" /></div>
            <div className="payment-logo-brand payment-brand-visa"><img src="/brand-logos/payments/visa-card.svg" alt="Visa" /></div>
            <div className="payment-logo-brand payment-brand-master"><img src="/brand-logos/payments/mastercard-card.svg" alt="" /><strong>Mastercard</strong></div>
            <div className="payment-method-brand"><img src="/brand-logos/payments/efectivo.svg" alt="" /><strong>Efectivo</strong></div>
            <div className="payment-method-brand"><img src="/brand-logos/payments/transferencia.svg" alt="" /><strong>Transferencia</strong></div>
            <div className="payment-method-brand"><img src="/brand-logos/payments/qr.svg" alt="" /><strong>QR</strong></div>
          </div>
          <div className="payment-footnote"><span aria-hidden="true">✓</span> Elegí tu medio de pago preferido. ¡Te esperamos!</div>
          <p className="payment-safety-note">Los pagos se realizan en el local. Este sitio no solicita datos de tarjetas ni procesa pagos online.</p>
        </section>
      </main>
    );
  } else if (view === "supplies") {
    pageContent = (
      <main className="subpage-main information-page supplies-page">
        <section className="subpage-intro"><p className="eyebrow">● SOLUCIONES PARA TU DÍA A DÍA</p><h1>Más servicios,<br /><em>más cerca de vos.</em></h1><p>En Maxikiosco Blanqui te acercamos herramientas para enviar, recibir y cobrar, con atención cercana y distribución en toda la provincia de San Juan.</p></section>
        <section className="supplies-showcase" aria-label="Insumos y soluciones para comercios">
          <div className="supplies-showcase-glow" aria-hidden="true" />
          <div className="supplies-showcase-heading"><span className="supplies-kicker">MAXIKIOSKO BLANQUI · MERCADO LIBRE · MERCADO PAGO</span><h2>Soluciones que mueven<br /><em>tu negocio y tus compras.</em></h2><p>Somos representantes de Mercado Libre y Mercado Pago. Te ayudamos a resolver la logística de tus paquetes y a sumar opciones prácticas para cobrar y trabajar.</p></div>
          <div className="supplies-offer-grid">
            <article className="supplies-offer"><span className="supplies-offer-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 5 9-5M12 12v9m-4-17 9 5"/></svg></span><div><h3>Paquetería</h3><p>Recibí y entregá tus paquetes de Mercado Libre en un punto cercano, con una gestión simple y confiable.</p></div></article>
            <article className="supplies-offer"><span className="supplies-offer-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-14 5h5m4 0h1"/></svg></span><div><h3>Tarjetas Mercado Pago</h3><p>Tarjetas de crédito y débito de Mercado Pago para que tengas más alternativas de pago.</p></div></article>
            <article className="supplies-offer"><span className="supplies-offer-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 6h4m-4 10h4m-2 3h.01"/><path d="M3 8v8m18-8v8"/></svg></span><div><h3>Point, Posnet y cobros</h3><p>Equipos Posnet y soluciones de cobro para acompañar las ventas de tu comercio.</p></div></article>
            <article className="supplies-offer"><span className="supplies-offer-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3z"/><path d="M14 14h2v2h-2zm5 0h2m-7 4h3m2 0v3m-5-1v1"/></svg></span><div><h3>Kits QR e insumos</h3><p>Kits para cobrar con QR e insumos para Posnet: lo necesario para que tu negocio siga en marcha.</p></div></article>
          </div>
          <div className="supplies-coverage"><span aria-hidden="true">⌖</span><div><strong>Distribuimos en toda la provincia de San Juan</strong><p>Acercamos estas soluciones a comercios y personas de distintos puntos de la provincia.</p></div><b>SAN JUAN</b></div>
        </section>
      </main>
    );
  } else {
    pageContent = (
      <main className="subpage-main contact-page">
        <section className="subpage-intro"><p className="eyebrow">● ESTAMOS CERCA</p><h1>Contactanos<br /><em>cuando quieras.</em></h1><p>Escribinos o acercate al local. Estamos para ayudarte con tu compra y con nuestros servicios.</p></section>
        <section className="contact-detail-grid">
          <article className="contact-card contact-address-card"><span className="contact-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><small>DIRECCIÓN</small><h2>{contact.direccion}</h2><p>{contact.direccionExtra}</p><a className="secondary-button" href={contact.mapsUrl} target="_blank" rel="noreferrer">Ver en el mapa →</a></article>
          <article className="contact-card contact-attention-card"><span className="contact-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.6.3.7.1 1.5-.4 2L9 10.6a16 16 0 0 0 4.3 4.3l1.3-1.2a2 2 0 0 1 2-.4c.8.4 1.7.6 2.6.7a2 2 0 0 1 1.8 1.9Z"/></svg></span><small>ATENCIÓN</small><h2>Atención cercana</h2><p>Podés llamarnos al <strong>{contact.telefono.display}</strong> o acercarte al local. Estamos para ayudarte con tu compra y nuestros servicios.</p><a className="primary-button" href={`tel:${contact.telefono.dial}`}>Llamar al local →</a></article>
        </section>
        <section className="contact-hours-card" aria-label="Horarios del kiosco y de paquetería">
          <div className="contact-hours-heading"><span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><div><small>ORGANIZÁ TU VISITA</small><h2>Horarios de atención</h2></div></div>
          <div className="contact-hours-grid">
            <article className="contact-hours-service contact-hours-kiosk"><div className="contact-hours-service-title"><h3>Horario de kiosco</h3><span>ATENCIÓN GENERAL</span></div>{contact.horarios.kiosco.map((item) => <div className="contact-hours-row" key={item.dias}><span>{item.dias}</span><strong>{item.periodos.join(" · ")}</strong></div>)}</article>
            <article className="contact-hours-service contact-hours-parcels"><div className="contact-hours-service-title"><h3>Horario de paquetería</h3><span>HORARIO DIFERENCIADO</span></div>{contact.horarios.paqueteria.map((item) => <div className="contact-hours-row" key={item.dias}><span>{item.dias}</span><strong>{item.periodos.join(" · ")}</strong></div>)}</article>
          </div>
          <p className="contact-holiday-note"><span aria-hidden="true">✦</span><strong>Feriados:</strong> {contact.horarios.feriados}</p>
        </section>
      </main>
    );
  }

  return (
    <div className="store-shell premium-shell">
      {notice && <div className="toast">{notice}</div>}
      {portalHeader}
      {pageContent}
      <footer><span>© {new Date().getFullYear()} {contact.name}</span><span>Atendido por su propio dueño · San Juan</span></footer>

      <MarketingOptIn />

      {checkout && <div className="modal-backdrop"><div className="checkout-modal"><button className="close-button" onClick={() => setCheckout(false)}>×</button><p className="eyebrow">ÚLTIMO PASO</p><h2>Enviá tu pedido</h2><p className="modal-copy">Completá tus datos y prepararemos el mensaje para que lo revises y lo envíes por WhatsApp.</p><form onSubmit={submitOrder}><label>Nombre<input required value={client.name} onChange={(event) => setClient({ ...client, name: event.target.value })} placeholder="Tu nombre" /></label><label>Teléfono<input required type="tel" value={client.phone} onChange={(event) => setClient({ ...client, phone: event.target.value })} placeholder="Tu teléfono" /></label><label>Observaciones <span>(opcional)</span><textarea value={client.note} onChange={(event) => setClient({ ...client, note: event.target.value })} placeholder="Ej.: lo retiro por la tarde" rows="3" /></label><div className="checkout-summary"><span>{cartCount} productos</span><strong>{money(cartTotal)}</strong></div><button className="primary-button full checkout-submit-button" disabled={sending}>{sending ? "Preparando mensaje..." : <>Preparar mensaje de WhatsApp <span className="checkout-submit-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 5l7 7-7 7" /></svg></span></>}</button></form></div></div>}
      {confirmation && <div className="modal-backdrop"><div className="checkout-modal confirmation-modal"><p className="eyebrow">LISTO PARA ENVIAR</p><h2>Tu pedido está preparado</h2><p className="modal-copy">El total estimado es <strong>{money(confirmation.total)}</strong>. Abrí WhatsApp, revisá el mensaje y tocá enviar para que llegue al local.</p><a className="primary-button full" href={confirmation.whatsappUrl} target="_blank" rel="noreferrer">Abrir WhatsApp →</a><button className="secondary-button full" onClick={() => setConfirmation(null)}>Volver a la tienda</button></div></div>}
    </div>
  );
}

export default App;
