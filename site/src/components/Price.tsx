import { formatPrice, percentOff } from "../lib/format";

export function Price({ price, compareAt, size = "m" }: { price: number; compareAt: number | null; size?: "s" | "m" | "l" }) {
  const off = percentOff(price, compareAt);
  return (
    <span className={`price price--${size}`}>
      <span className="price__now">
        {off > 0 && <span className="visually-hidden">Sale price </span>}
        {formatPrice(price)}
      </span>
      {off > 0 && compareAt && (
        <>
          <s className="price__was">
            <span className="visually-hidden">Regular price </span>
            {formatPrice(compareAt)}
          </s>
          <span className="price__off">−{off}%</span>
        </>
      )}
    </span>
  );
}
