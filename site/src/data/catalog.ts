import raw from "./catalog.json";

export type DescriptionBlock = { p: string } | { ul: string[] };

export interface Variant {
  /** Source product-page slug on albaveda.com — also the cart SKU. */
  id: string;
  label: string | null;
  price: number;
  compareAt: number | null;
  inStock: boolean;
  sourceUrl: string;
}

export interface Product {
  id: string;
  name: string;
  brand: "Alba" | "Diva";
  type: string;
  categories: CategoryId[];
  ingredient: string;
  summary: string;
  description: DescriptionBlock[];
  /** Base paths; append "-480.webp" or "-1000.webp". */
  images: string[];
  variants: Variant[];
}

export type CategoryId = "skin-care" | "hair-care" | "beauty" | "wellness" | "devotional";

export interface Category {
  id: CategoryId;
  label: string;
  headline: string;
  lede: string;
  image: string;
}

const data = raw as unknown as {
  categories: Category[];
  products: Product[];
  lifestyle: Record<string, string>;
};

export const categories = data.categories;
export const products = data.products;
export const lifestyle = data.lifestyle;

const byId = new Map(products.map((p) => [p.id, p]));
const byVariant = new Map<string, { product: Product; variant: Variant }>();
for (const product of products) {
  for (const variant of product.variants) byVariant.set(variant.id, { product, variant });
}

export const getProduct = (id: string) => byId.get(id);
export const getCategory = (id: string) => categories.find((c) => c.id === id);
export const findVariant = (variantId: string) => byVariant.get(variantId);

export const productsIn = (cat: CategoryId) => products.filter((p) => p.categories.includes(cat));

export const img = (base: string, size: 480 | 1000) => `${base}-${size}.webp`;
export const imgSet = (base: string) => `${base}-480.webp 480w, ${base}-1000.webp 1000w`;
export const lifeImg = (key: string, size: 900 | 1800) => `${lifestyle[key]}-${size}.webp`;

/** Cheapest variant first — used for "from ₹x" on cards. */
export const lowestPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price));

export function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return products
    .map((p) => {
      const hay = `${p.name} ${p.ingredient} ${p.type} ${p.brand} ${p.categories.join(" ")}`.toLowerCase();
      const score = terms.reduce((s, t) => (hay.includes(t) ? s + (p.name.toLowerCase().includes(t) ? 2 : 1) : s - 10), 0);
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.p);
}
