import { Link } from "react-router-dom";
import { ArrowRight } from "../components/Icons";
import { categories } from "../data/catalog";
import { brands } from "../data/site";
import { usePageMeta } from "../lib/meta";
import { useReveal } from "../lib/motion";

export default function Brands() {
  usePageMeta(
    "Our brands — Alba | Diva | Saar",
    "Alba products are made from natural herbs, Diva offers devotional products for Pooja & Saar showcases luxurious ayurveda and Essential Oils",
  );
  const ref = useReveal<HTMLDivElement>();
  return (
    <div className="wrap brands-page" ref={ref}>
      <header className="brands-page__head">
        <p className="eyebrow">Our brands</p>
        <h1 className="display">
          Alba, Diva <span className="accent">&amp;</span> Saar.
        </h1>
      </header>
      <div className="brands-page__list">
        {brands.map((b, i) => (
          <section key={b.id} id={b.id} className="brand-row" data-reveal style={{ "--i": i } as React.CSSProperties}>
            <div className="brand__plate brand__plate--lg">
              <img src={b.logo} alt={`${b.name} logo`} loading="lazy" />
            </div>
            <div>
              <p className="eyebrow">{b.role}</p>
              <h2 className="h2">{b.name}</h2>
              <p className="lead">{b.body}</p>
              {b.id === "alba" && (
                <p className="brand-row__cats">
                  {categories
                    .filter((c) => c.id !== "devotional")
                    .map((c) => (
                      <Link key={c.id} to={`/${c.id}`} className="chip">
                        {c.label}
                      </Link>
                    ))}
                </p>
              )}
              {b.href ? (
                <Link to={b.href} className="btn btn--primary">
                  {b.cta} <ArrowRight />
                </Link>
              ) : (
                <p className="brand__soon">Coming soon</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
