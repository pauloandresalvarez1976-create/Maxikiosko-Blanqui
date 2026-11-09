import { publicFirebaseConfig } from "./firebase.js";

const STORE_ID = "maxikioskoblanqui";

function promoId(value) {
  return String(value && typeof value === "object"
    ? (value.id ?? value.productId ?? value.prodId ?? value.code ?? value.barcode ?? "")
    : (value ?? "")).trim();
}

function decodeFirestoreValue(value = {}) {
  if (Object.hasOwn(value, "stringValue")) return value.stringValue;
  if (Object.hasOwn(value, "integerValue")) return Number(value.integerValue);
  if (Object.hasOwn(value, "doubleValue")) return Number(value.doubleValue);
  if (Object.hasOwn(value, "booleanValue")) return value.booleanValue;
  if (Object.hasOwn(value, "nullValue")) return null;
  if (Object.hasOwn(value, "timestampValue")) return value.timestampValue;
  if (Object.hasOwn(value, "arrayValue")) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if (Object.hasOwn(value, "mapValue")) return Object.fromEntries(
    Object.entries(value.mapValue.fields || {}).map(([key, entry]) => [key, decodeFirestoreValue(entry)])
  );
  return null;
}

function dateKey(value) {
  if (!value) return "";
  const text = String(value).trim();
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

function argentinaTodayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/San_Juan", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const date = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${date.year}-${date.month}-${date.day}`;
}

export function millisecondsUntilArgentinaMidnight(now = new Date()) {
  const today = argentinaTodayKey(now);
  let low = now.getTime();
  let high = low + 36 * 60 * 60 * 1000;
  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);
    if (argentinaTodayKey(new Date(middle)) === today) low = middle;
    else high = middle;
  }
  return Math.max(1000, high - now.getTime());
}

function promotionIsActive(promo, now = new Date()) {
  if (!promo || promo.activo === false) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const start = dateKey(promo.fechaIni);
  const end = dateKey(promo.fechaFin);
  if (start && today < start) return false;
  if (end && today > end) return false;
  const dayCodes = ["D", "L", "M", "X", "J", "V", "S"];
  const days = String(promo.dias || "Todos").split(",").map((day) => day.trim().toUpperCase());
  return days.includes("TODOS") || days.includes(dayCodes[now.getDay()]);
}

function productMatchesPromo(product, promo) {
  if (promo.todosProductos) return true;
  const productIds = [product.id, product.code, product.barcode].map(promoId).filter(Boolean);
  const declared = [
    ...(Array.isArray(promo.productos) ? promo.productos : []),
    ...(Array.isArray(promo.productosPromo) ? promo.productosPromo : []),
  ].map(promoId).filter(Boolean);
  return declared.some((id) => productIds.includes(id));
}

function promoConfigForProduct(promo, product) {
  const productIds = [product.id, product.code, product.barcode].map(promoId).filter(Boolean);
  const configs = Array.isArray(promo.productosPromo) ? promo.productosPromo : [];
  return configs.find((config) => [config.id, config.productId, config.prodId, config.code, config.barcode]
    .map(promoId).some((id) => productIds.includes(id))) || promo;
}

function calculateOffer(product, promo = null) {
  const config = promo ? promoConfigForProduct(promo, product) : null;
  const type = String(config?.tipo || "").toLowerCase();
  const raw = config?.val ?? product.offerDiscount ?? product.offer ?? null;
  const text = String(raw ?? "").trim();
  if (!text) return null;
  if (type.includes("2x1") || text.toLowerCase().includes("2x1")) {
    return { badge: "2x1", price: Number(product.price) || 0, originalPrice: Number(product.price) || 0 };
  }
  const amount = Number.parseFloat(text.replace(/[^\d,.-]/g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (type.includes("descuento $") || text.startsWith("-$")) {
    const originalPrice = Number(product.price) || 0;
    return { badge: `−$${amount.toLocaleString("es-AR")}`, price: Math.max(0, originalPrice - amount), originalPrice };
  }
  const percent = Math.min(100, amount);
  const originalPrice = Number(product.price) || 0;
  return { badge: `−${percent}%`, price: Math.round(originalPrice * (1 - percent / 100)), originalPrice };
}

export async function loadCatalogFeed() {
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${publicFirebaseConfig.projectId}/databases/(default)/documents/store/${STORE_ID}`
  );
  url.searchParams.set("key", publicFirebaseConfig.apiKey);
  // Field mask explícita: esta vista nunca descarga pedidos, clientes, chats ni configuración administrativa.
  url.searchParams.append("mask.fieldPaths", "products");
  url.searchParams.append("mask.fieldPaths", "publicArrivals");
  url.searchParams.append("mask.fieldPaths", "publicPromotions");
  url.searchParams.append("mask.fieldPaths", "publicArrivalsDate");
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudo leer el catálogo (${response.status})`);
  const document = await response.json();
  const fields = document?.fields || {};
  const products = decodeFirestoreValue(fields.products) || [];
  const arrivals = decodeFirestoreValue(fields.publicArrivals) || [];
  const arrivalsDate = decodeFirestoreValue(fields.publicArrivalsDate);
  const hasPublishedPromotions = Object.hasOwn(fields, "publicPromotions");
  const publishedPromotions = hasPublishedPromotions ? decodeFirestoreValue(fields.publicPromotions) : null;
  return {
    products: Array.isArray(products) ? products : [],
    // null significa que el MiPOS instalado todavía no publica el feed; [] significa que
    // el carrusel oficial se sincronizó y no hay promociones activas para mostrar.
    promotions: hasPublishedPromotions ? (Array.isArray(publishedPromotions) ? publishedPromotions : []) : null,
    // El día de vigencia permite ocultar el feed a las 00:00 locales aunque MiPOS esté cerrado.
    arrivals: arrivalsDate === argentinaTodayKey() && Array.isArray(arrivals) ? arrivals : [],
    updatedAt: document.updateTime || null,
  };
}

export function buildPromotionItems(products, promotions, now = new Date(), maxItems = 12) {
  const available = products.filter((product) => product.enabled !== false && Number(product.price) > 0);
  const activePromos = promotions.filter((promo) => promotionIsActive(promo, now));
  const seen = new Set();
  const slides = [];
  for (const promo of activePromos) {
    for (const product of available.filter((candidate) => productMatchesPromo(candidate, promo))) {
      const offer = calculateOffer(product, promo);
      if (!offer) continue;
      const key = `${promoId(product.id)}:${promo.nombre || promo.tipo || offer.badge}`;
      if (seen.has(key)) continue;
      seen.add(key);
      slides.push({
        id: key, name: product.name, emoji: product.emoji,
        photo: product.customPhoto || product.photoUrl || product.imageUrl || "",
        price: offer.price, originalPrice: offer.originalPrice, badge: offer.badge,
        subtitle: promo.nombre || "Promoción disponible en el local", kicker: "PROMOCIÓN VIGENTE",
      });
    }
  }
  if (slides.length) return slides.slice(0, maxItems);
  return available.flatMap((product) => {
    const offer = calculateOffer(product);
    if (!offer) return [];
    return [{
      id: promoId(product.id), name: product.name, emoji: product.emoji,
      photo: product.customPhoto || product.photoUrl || product.imageUrl || "",
      price: offer.price, originalPrice: offer.originalPrice, badge: offer.badge,
      subtitle: "Promoción del catálogo sincronizado", kicker: "PROMOCIÓN VIGENTE",
    }];
  }).slice(0, maxItems);
}

export function buildArrivalItems(arrivals, products) {
  const byId = new Map(products.flatMap((product) => [
    [promoId(product.id), product], [promoId(product.code), product], [promoId(product.barcode), product],
  ]).filter(([key]) => key));
  return arrivals.filter((item) => item && typeof item === "object").slice(0, 12).map((item, index) => {
    const product = byId.get(promoId(item.productId ?? item.id ?? item.prodId)) || {};
    const name = String(item.name || product.name || "Producto").trim();
    return {
      id: promoId(item.productId ?? item.id ?? item.prodId) || `${name}-${index}`,
      name, emoji: product.emoji || "📦",
      photo: item.photo || item.customPhoto || product.customPhoto || product.photoUrl || product.imageUrl || "",
      price: Number(item.salePrice ?? item.price ?? product.price) || 0,
      subtitle: "Recién llegado al Blanqui", kicker: "LO QUE LLEGÓ AL BLANQUI",
    };
  });
}
