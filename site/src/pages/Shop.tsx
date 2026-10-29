import { useMemo } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { categories, getCategory, img, lowestPrice, products, productsIn, searchProducts, type CategoryId } from "../data/catalog";
import { usePageMeta } from "../lib/meta";
import { useReveal } from "../lib/motion";

type Sort = "featured" | "price-asc" | "price-desc" | "name";
const SORTS: { id: Sort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name A–Z" },
];

export default function Shop({ category }: { category?: CategoryId }) {
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const sort = (params.get("sort") as Sort) || "featured";
  const cat = category ? getCategory(category) : undefined;

  const list = useMemo(() => {
    let items = q ? searchProducts(q) : category ? productsIn(category) : products;
    if (q && category) items = items.filter((p) => p.categories.includes(category));
    const sorted = [...items];
    if (sort === "price-asc") sorted.sort((a, b) => lowestPrice(a) - lowestPrice(b));
    if (sort === "price-desc") sorted.sort((a, b) => lowestPrice(b) - lowestPrice(a));
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [q, category, sort]);

  usePageMeta(
    cat ? `${cat.label} — 100% natural ${cat.label.toLowerCase()} products by Alba` : q ? `Search: ${q} — Alba` : "Shop all — Alba",
    cat ? cat.lede : undefined,
  );

  const ref = useReveal<HTMLDivElement>([category, q, sort]);
  const fan = (category ? productsIn(category) : products).slice(0, 3);

  const setSort = (s: Sort) => {
    const next = new URLSearchParams(params);
    if (s === "featured") next.delete("sort");
    else next.set("sort", s);
    setParams(next, { replace: true });
  };

  return (
    <div className="shop" ref={ref}>
      <header className="shop-head">
        <div className="wrap shop-head__grid">
          <div>
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span aria-hidden>/</span>
              {cat ? <Link to="/shop">Shop</Link> : <span aria-current="page">Shop</span>}
              {cat && (
                <>
                  <span aria-hidden>/</span>
                  <span aria-current="page">{cat.label}</span>
                </>
              )}
            </nav>
            <p className="eyebrow shop-head__eyebrow">{cat ? cat.label : q ? "Search" : "All products"}</p>
            <h1 className="h1 shop-head__title">
              {q ? (
                <>
                  Results for <span className="accent">“{q}”</span>
                </>
              ) : cat ? (
                cat.headline
              ) : (
                <>
                  Everything we <span className="accent">grow, grind</span> &amp; pack.
                </>
              )}
            </h1>
            {cat && <p className="lead">{cat.lede}.</p>}
          </div>
          {!q && (
            <div className="pack-fan" aria-hidden>
              {fan.map((p, i) => (
                <img key={p.id} src={img(p.images[0], 480)} alt="" width={480} height={480} style={{ "--i": i } as React.CSSProperties} />
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="wrap">
        <div className="toolbar">
          <nav className="chips" aria-label="Categories">
            <NavLink to="/shop" end className="chip">
              All
            </NavLink>
            {categories.map((c) => (
              <NavLink key={c.id} to={`/${c.id}`} className="chip">
                {c.label}
              </NavLink>
            ))}
          </nav>
          <div className="toolbar__right">
            <p className="meta" aria-live="polite">
              {list.length} product{list.length === 1 ? "" : "s"}
            </p>
            <label className="select">
              <span className="visually-hidden">Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {q && (
          <p className="search-note">
            <button
              className="inline-link"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete("q");
                setParams(next);
              }}
            >
              Clear search
            </button>
          </p>
        )}

        {list.length ? (
          <div className="grid grid--shop">
            {list.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} priority={i < 4} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p className="h3">Nothing matches that yet.</p>
            <p className="meta">Try an ingredient — amla, neem, henna, tulsi — or browse everything.</p>
            <Link to="/shop" className="btn btn--primary">
              Shop all products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
