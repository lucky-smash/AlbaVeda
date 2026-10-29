import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { img, lowestPrice, searchProducts } from "../data/catalog";
import { formatPrice } from "../lib/format";
import { useOverlay } from "../lib/useOverlay";
import { ArrowRight, Close, Search } from "./Icons";

const SUGGESTIONS = ["Amla", "Henna", "Multani Mitti", "Neem", "Ubtan", "Pooja kit"];

export function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const ref = useOverlay<HTMLDivElement>(open, onClose, "input");
  const navigate = useNavigate();
  const results = useMemo(() => searchProducts(q).slice(0, 6), [q]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    onClose();
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="search" data-open={open} inert={!open}>
      <div className="search__scrim" onClick={onClose} aria-hidden />
      <div className="search__panel" role="dialog" aria-modal="true" aria-label="Search products" ref={ref}>
        <form className="search__form wrap" onSubmit={submit} role="search">
          <Search />
          <label htmlFor="site-search" className="visually-hidden">
            Search products
          </label>
          <input
            id="site-search"
            type="search"
            placeholder="Search herbs, powders, henna…"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close search">
            <Close />
          </button>
        </form>
        <div className="search__body wrap">
          {!q.trim() ? (
            <div className="search__suggest">
              <p className="eyebrow">Popular</p>
              <div className="chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => setQ(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <p className="search__none">
              Nothing matches “{q}”. Try an ingredient like <button className="inline-link" onClick={() => setQ("Amla")}>Amla</button> or{" "}
              <button className="inline-link" onClick={() => setQ("Neem")}>Neem</button>.
            </p>
          ) : (
            <ul className="search__results" role="list">
              {results.map((p) => (
                <li key={p.id}>
                  <Link to={`/product/${p.id}`} onClick={onClose} className="search__hit">
                    <img src={img(p.images[0], 480)} alt="" width={56} height={56} />
                    <span>
                      <span className="search__name">{p.name}</span>
                      <span className="meta">{p.type}</span>
                    </span>
                    <span className="search__price">{formatPrice(lowestPrice(p))}</span>
                  </Link>
                </li>
              ))}
              <li>
                <button className="link-arrow search__all" onClick={submit}>
                  See all results for “{q}” <ArrowRight />
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
