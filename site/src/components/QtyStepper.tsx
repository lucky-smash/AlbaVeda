import { MAX_QTY } from "../lib/cart";
import { Minus, Plus } from "./Icons";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  label,
  size = "m",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  label: string;
  size?: "s" | "m";
}) {
  return (
    <div className={`qty qty--${size}`} role="group" aria-label={`Quantity, ${label}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= MAX_QTY} aria-label="Increase quantity">
        <Plus />
      </button>
    </div>
  );
}
