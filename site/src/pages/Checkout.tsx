import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "../components/Icons";
import { QtyStepper } from "../components/QtyStepper";
import { img } from "../data/catalog";
import { company, FREE_DELIVERY_THRESHOLD } from "../data/site";
import { useCart } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { usePageMeta } from "../lib/meta";

/**
 * There is no payment backend in this project. Rather than simulate a
 * checkout, the order is composed into an email to the AlbaVeda team (who
 * confirm stock, delivery charge and payment), or the customer can call.
 * Replace this page with a real gateway (Paytm / Razorpay etc.) when available.
 */
export default function Checkout() {
  usePageMeta("Review your order — Alba");
  const { lines, subtotal, savings, setQty, remove } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", address: "", pincode: "", note: "" });
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  const valid = form.name.trim() && /^[+\d\s-]{10,}$/.test(form.phone.trim()) && form.address.trim() && /^\d{6}$/.test(form.pincode.trim());

  const body = [
    "Hello Alba team, I would like to place this order:",
    "",
    ...lines.map((l) => `• ${l.product.name}${l.variant.label ? ` (${l.variant.label})` : ""} × ${l.qty} — ${formatPrice(l.lineTotal)}`),
    "",
    `Subtotal: ${formatPrice(subtotal)} (delivery charges to be confirmed)`,
    "",
    `Name: ${form.name}`,
    `Phone: ${form.phone}`,
    `Address: ${form.address}`,
    `PIN code: ${form.pincode}`,
    form.note ? `Note: ${form.note}` : "",
  ]
    .filter((x, i, a) => !(x === "" && a[i - 1] === ""))
    .join("\n");
  const mailto = `mailto:${company.email}?subject=${encodeURIComponent(`Order request — ${form.name || "website"}`)}&body=${encodeURIComponent(body)}`;

  if (!lines.length) {
    return (
      <div className="wrap checkout checkout--empty">
        <h1 className="h1">Your bag is empty.</h1>
        <p className="lead">Add a few herbs and come back to review your order.</p>
        <Link to="/shop" className="btn btn--primary">
          Shop all products <ArrowRight />
        </Link>
      </div>
    );
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="wrap checkout">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">Review order</span>
      </nav>
      <h1 className="h1">
        Review your <span className="accent">order</span>
      </h1>

      <div className="notice" role="note">
        <p>
          <strong>Online payment isn’t connected on this site yet.</strong> Send your order request below and the Alba team will confirm
          availability, delivery charges and payment (Paytm, UPI, net banking or cards) with you directly — or call{" "}
          <a href={`tel:${company.phones[0].number.replace(/[^+\d]/g, "")}`}>{company.phones[0].number}</a>, {company.hours}.
        </p>
      </div>

      <div className="checkout__grid">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!valid) return;
            window.location.href = mailto;
            setSent(true);
          }}
          noValidate
        >
          <h2 className="h3">Delivery details</h2>
          <label className="field">
            <span>Full name</span>
            <input autoComplete="name" required {...field("name")} aria-invalid={touched && !form.name.trim()} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              {...field("phone")}
              aria-invalid={touched && !/^[+\d\s-]{10,}$/.test(form.phone.trim())}
            />
            {touched && !/^[+\d\s-]{10,}$/.test(form.phone.trim()) && <em className="field__err">Enter a 10-digit phone number.</em>}
          </label>
          <label className="field">
            <span>Address</span>
            <textarea rows={3} autoComplete="street-address" required {...field("address")} aria-invalid={touched && !form.address.trim()} />
          </label>
          <label className="field field--short">
            <span>PIN code</span>
            <input
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              required
              {...field("pincode")}
              aria-invalid={touched && !/^\d{6}$/.test(form.pincode.trim())}
            />
            {touched && !/^\d{6}$/.test(form.pincode.trim()) && <em className="field__err">PIN codes have 6 digits.</em>}
          </label>
          <label className="field">
            <span>
              Note <span className="meta">(optional)</span>
            </span>
            <textarea rows={2} {...field("note")} />
          </label>
          {touched && !valid && (
            <p className="field__err" role="alert">
              Please complete the highlighted fields.
            </p>
          )}
          <button className="btn btn--primary btn--block" type="submit">
            Send order request by email <ArrowRight />
          </button>
          {sent && (
            <p className="form__sent" role="status">
              Your email app should open with the order filled in — press send there. Nothing is charged until the Alba team confirms. If
              nothing opened, email <a href={mailto}>{company.email}</a>.
            </p>
          )}
        </form>

        <aside className="summary" aria-labelledby="summary-title">
          <h2 id="summary-title" className="h3">
            Order summary
          </h2>
          <ul role="list" className="summary__lines">
            {lines.map((l) => (
              <li key={l.variantId} className="line">
                <img className="line__img" src={img(l.product.images[0], 480)} alt="" width={72} height={72} />
                <div className="line__info">
                  <Link to={`/product/${l.product.id}`} className="line__name">
                    {l.product.name}
                  </Link>
                  <p className="meta">{l.variant.label ?? l.product.type}</p>
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
          <p className="meta">
            {subtotal >= FREE_DELIVERY_THRESHOLD
              ? "This order qualifies for free delivery."
              : `Free delivery over ${formatPrice(FREE_DELIVERY_THRESHOLD)}. Delivery charges are confirmed with your order.`}
          </p>
        </aside>
      </div>
    </div>
  );
}
