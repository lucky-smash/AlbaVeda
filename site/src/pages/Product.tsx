import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AddToBag } from "../components/AddToBag";
import { ArrowRight, External } from "../components/Icons";
import { Price } from "../components/Price";
import { ProductCard } from "../components/ProductCard";
import { QtyStepper } from "../components/QtyStepper";
import { getCategory, getProduct, img, imgSet, products } from "../data/catalog";
import { delivery, marketplaces } from "../data/site";
import { usePageMeta } from "../lib/meta";
import { useReveal } from "../lib/motion";
import NotFound from "./NotFound";

/** ?size=<variant slug> wins; otherwise the last-listed size, which is the one on the live listings. */
function initialVariant(product: ReturnType<typeof getProduct>, size: string | null) {
  if (!product) return 0;
  const requested = size ? product.variants.findIndex((v) => v.id === size) : -1;
  return requested >= 0 ? requested : product.variants.length - 1;
}

export default function ProductPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const size = params.get("size");
  const product = getProduct(id);
  const [variantIdx, setVariantIdx] = useState(() => initialVariant(product, size));
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const ref = useReveal<HTMLDivElement>([id]);

  useEffect(() => {
    setVariantIdx(initialVariant(product, size));
    setImgIdx(0);
    setQty(1);
  }, [id, product, size]);

  usePageMeta(product ? `${product.name} — Alba` : "Product not found — Alba", product?.summary || undefined);

  if (!product) return <NotFound />;

  const v = product.variants[Math.min(variantIdx, product.variants.length - 1)];
  const primaryCat = getCategory(product.categories[0]);
  const related = products
    .filter((p) => p.id !== product.id && p.categories.some((c) => product.categories.includes(c)))
    .slice(0, 4);

  return (
    <div className="pdp" ref={ref}>
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden>/</span>
          {primaryCat && <Link to={`/${primaryCat.id}`}>{primaryCat.label}</Link>}
          <span aria-hidden>/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="pdp__grid">
          <section className="gallery" aria-label="Product images">
            <div className="gallery__main">
              <img
                key={product.images[imgIdx]}
                src={img(product.images[imgIdx], 1000)}
                srcSet={imgSet(product.images[imgIdx])}
                sizes="(max-width: 900px) 100vw, 50vw"
                alt={`${product.name}${imgIdx ? ` — view ${imgIdx + 1}` : ""}`}
                width={1000}
                height={1000}
                fetchPriority="high"
              />
            </div>
            {product.images.length > 1 && (
              <div className="gallery__thumbs" role="tablist" aria-label="Choose image">
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    role="tab"
                    aria-selected={i === imgIdx}
                    aria-label={`Image ${i + 1} of ${product.images.length}`}
                    onClick={() => setImgIdx(i)}
                  >
                    <img src={img(src, 480)} alt="" width={96} height={96} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="buy" aria-labelledby="pdp-title">
            <p className="eyebrow buy__type">
              {product.brand} · {product.type}
            </p>
            <h1 id="pdp-title" className="h1 buy__title">
              {product.name}
            </h1>
            <p className="buy__ingredient">
              <span className="meta">Made with</span> {product.ingredient}
            </p>
            <div className="buy__price">
              <Price price={v.price} compareAt={v.compareAt} size="l" />
              {!v.inStock && <span className="badge">Out of stock</span>}
            </div>
            {product.summary && <p className="buy__summary">{product.summary}</p>}

            {product.variants.length > 1 && (
              <fieldset className="sizes">
                <legend className="eyebrow">Size</legend>
                <div className="sizes__opts">
                  {product.variants.map((opt, i) => (
                    <label key={opt.id} className="size" data-checked={i === variantIdx}>
                      <input
                        type="radio"
                        name="size"
                        value={opt.id}
                        checked={i === variantIdx}
                        onChange={() => setVariantIdx(i)}
                      />
                      <span className="size__label">{opt.label}</span>
                      <span className="size__price">
                        <Price price={opt.price} compareAt={null} size="s" />
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="buy__actions">
              <QtyStepper value={qty} onChange={setQty} label={product.name} />
              <AddToBag
                variantId={v.id}
                qty={qty}
                name={`${product.name}${v.label ? ` (${v.label})` : ""}`}
                disabled={!v.inStock}
                openAfter
                className="btn btn--primary buy__add"
              />
            </div>

            <ul className="buy__facts" role="list">
              <li>{delivery.processing}; delivery {delivery.eta.toLowerCase()}.</li>
              <li>{delivery.coverage}.</li>
              <li>
                {delivery.returns}. <Link to="/policies/refunds">Refund policy</Link>
              </li>
            </ul>

            <p className="buy__market meta">
              Also on{" "}
              {marketplaces.map((m, i) => (
                <span key={m.label}>
                  {i > 0 && " · "}
                  <a href={m.href} target="_blank" rel="noreferrer">
                    {m.label}
                    <External width={13} height={13} />
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </span>
              ))}
            </p>
          </section>
        </div>

        {product.description.length > 0 && (
          <section className="details" aria-labelledby="details-title">
            <h2 id="details-title" className="h2" data-reveal>
              About this <span className="accent">product</span>
            </h2>
            <div className="prose details__body" data-reveal>
              {product.description.map((b, i) =>
                "p" in b ? (
                  <p key={i}>{b.p}</p>
                ) : (
                  <ul key={i}>
                    {b.ul.map((li, j) => (
                      <li key={j}>{li}</li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="related" aria-labelledby="related-title">
            <div className="section-head section-head--row">
              <h2 id="related-title" className="h2">
                You may also <span className="accent">like</span>
              </h2>
              {primaryCat && (
                <Link to={`/${primaryCat.id}`} className="link-arrow">
                  More {primaryCat.label.toLowerCase()} <ArrowRight />
                </Link>
              )}
            </div>
            <div className="grid">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
