import { Link, useNavigate } from "react-router-dom";
import { img } from "../data/catalog";
import { FREE_DELIVERY_THRESHOLD } from "../data/site";
import { useCart } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { useOverlay } from "../lib/useOverlay";
import { ArrowRight, Close } from "./Icons";
import { QtyStepper } from "./QtyStepper";

export function CartDrawer() {
  const { lines, isOpen, close, subtotal, savings, setQty, remove, count } = useCart();
  const ref = useOverlay<HTMLDivElement>(isOpen, close);
  const navigate = useNavigate();
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const progress = Math.min(1, subtotal / FREE_DELIVERY_THRESHOLD);

  return (
    <div className="drawer" data-open={isOpen} inert={!isOpen}>
      <div className="drawer__scrim" onClick={close} aria-hidden />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="bag-title" ref={ref} tabIndex={-1}>
        <div className="drawer__head">
          <h2 id="bag-title" className="h3">
            Your bag <span className="drawer__count">{count}</span>
          </h2>
          <button className="icon-btn" onClick={close} aria-label="Close bag">
            <Close />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="drawer__empty">
            <p className="h3">Your bag is empty.</p>
            <p className="meta">Herbal powders for skin, hair and wellness start at {formatPrice(40)}.</p>
            <Link to="/shop" className="btn btn--primary" onClick={close}>
              Shop all products <ArrowRight />
            </Link>
          </div>
        ) : (
          <>
            <div className="ship-meter" aria-live="polite">
              <p>
                {remaining > 0 ? (
                  <>
                    Add <strong>{formatPrice(remaining)}</strong> more for free delivery
                  </>
                ) : (
                  <>You’ve unlocked free delivery</>
                )}
              </p>
              <div className="ship-meter__track" aria-hidden>
                <span style={{ transform: `scaleX(${progress})` }} />
              </div>
            </div>

            <ul className="drawer__lines" role="list">
              {lines.map((l) => (
                <li key={l.variantId} className="line">
                  <Link to={`/product/${l.product.id}`} onClick={close} className="line__img">
                    <img src={img(l.product.images[0], 480)} alt="" width={96} height={96} loading="lazy" />
                  </Link>
                  <div className="line__info">
                    <Link to={`/product/${l.product.id}`} onClick={close} className="line__name">
                      {l.product.name}
                    </Link>
                    <p className="meta">
                      {l.variant.label ?? l.product.type} · {formatPrice(l.variant.price)}
                    </p>
                    <div className="line__row">
                      <QtyStepper size="s" value={l.qty} label={l.product.name} onChange={(n) => setQty(l.variantId, n)} />
                      <button className="line__remove" onClick={() => remove(l.variantId)}>
                        Remove<span className="visually-hidden"> {l.product.name}</span>
                      </button>
                    </div>
                  </div>
                  <p className="line__total">{formatPrice(l.lineTotal)}</p>
                </li>
              ))}
            </ul>

            <div className="drawer__foot">
              {savings > 0 && (
                <p className="drawer__row meta">
                  <span>You save</span>
                  <span>{formatPrice(savings)}</span>
                </p>
              )}
              <p className="drawer__row drawer__subtotal">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </p>
              <p className="meta">Delivery charges are confirmed with your order.</p>
              <button
                className="btn btn--primary btn--block"
                onClick={() => {
                  close();
                  navigate("/checkout");
                }}
              >
                Review order <ArrowRight />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
