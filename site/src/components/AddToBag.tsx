import { useEffect, useRef, useState } from "react";
import { useCart } from "../lib/cart";
import { Bag, Check } from "./Icons";

/**
 * Add-to-bag button with an inline acknowledgement. The label swap is the
 * feedback; the header badge bumps too. It does not open the drawer — that
 * would interrupt browsing — unless `openAfter` is set (product page).
 */
export function AddToBag({
  variantId,
  qty = 1,
  disabled,
  openAfter = false,
  className = "btn btn--primary",
  label = "Add to bag",
  name,
}: {
  variantId: string;
  qty?: number;
  disabled?: boolean;
  openAfter?: boolean;
  className?: string;
  label?: string;
  name: string;
}) {
  const { add, open } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={className}
      data-added={added}
      disabled={disabled}
      aria-label={`${label}: ${name}`}
      onClick={() => {
        add(variantId, qty);
        setAdded(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), 1600);
        if (openAfter) open();
      }}
    >
      <span className="atb__face" aria-hidden={added}>
        <Bag />
        {label}
      </span>
      <span className="atb__face atb__face--done" aria-hidden={!added}>
        <Check />
        Added
      </span>
      <span className="visually-hidden" role="status">
        {added ? `${name} added to bag` : ""}
      </span>
    </button>
  );
}
