import { Link } from "react-router-dom";
import { img, imgSet, lowestPrice, type Product } from "../data/catalog";
import { formatPrice } from "../lib/format";
import { AddToBag } from "./AddToBag";
import { ArrowRight } from "./Icons";
import { Price } from "./Price";

export function ProductCard({ product, priority = false, index = 0 }: { product: Product; priority?: boolean; index?: number }) {
  const multi = product.variants.length > 1;
  const v = product.variants[0];
  const href = `/product/${product.id}`;
  const [first, second] = product.images;

  return (
    <article className="card" data-reveal style={{ "--i": index % 4 } as React.CSSProperties}>
      <Link to={href} className="card__media" tabIndex={-1} aria-hidden>
        <img
          src={img(first, 480)}
          srcSet={imgSet(first)}
          sizes="(max-width: 700px) 50vw, (max-width: 1200px) 33vw, 25vw"
          alt=""
          width={480}
          height={480}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
        {second && (
          <img className="card__alt" src={img(second, 480)} alt="" width={480} height={480} loading="lazy" decoding="async" />
        )}
      </Link>
      <div className="card__body">
        <p className="card__type eyebrow">
          {product.brand === "Diva" ? "Diva · " : ""}
          {product.type}
        </p>
        <h3 className="card__name">
          <Link to={href}>{product.name}</Link>
        </h3>
        <div className="card__foot">
          {multi ? (
            <span className="price price--s">
              <span className="price__from">from</span> <span className="price__now">{formatPrice(lowestPrice(product))}</span>
            </span>
          ) : (
            <Price price={v.price} compareAt={v.compareAt} size="s" />
          )}
          {multi ? (
            <Link to={href} className="card__action" aria-label={`Choose size: ${product.name}`}>
              {product.variants.length} sizes <ArrowRight />
            </Link>
          ) : (
            <AddToBag variantId={v.id} name={product.name} className="card__action card__action--add" label="Add" disabled={!v.inStock} />
          )}
        </div>
      </div>
    </article>
  );
}
