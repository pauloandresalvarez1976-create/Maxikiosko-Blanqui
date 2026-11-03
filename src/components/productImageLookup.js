function cleanProductName(name) {
  return String(name || "")
    .replace(/X\s*[\d.,]+\s*(ml|l|g|kg|cc|cm|cm3|cl|u|k)\b/gi, "")
    .replace(/\b(x\d+|pack|unid|unidades?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function searchOpenFoodFacts(productName) {
  const query = encodeURIComponent(cleanProductName(productName));
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_url,image_front_url`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  for (const item of data.products || []) {
    const image = item.image_front_url || item.image_url;
    if (image && image.startsWith("http")) return image;
  }
  return null;
}
