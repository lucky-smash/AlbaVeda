import { useState } from "react";
import { Link } from "react-router-dom";
import { AddToBag } from "../components/AddToBag";
import { ArrowRight, External, Sprig } from "../components/Icons";
import { Price } from "../components/Price";
import { ProductCard } from "../components/ProductCard";
import { StoryStage } from "../components/StoryStage";
import { getProduct, img, lifeImg, products } from "../data/catalog";
import { aboutCopy, brands, certifications, company, FREE_DELIVERY_THRESHOLD, featuredIds, herbs, marketplaces, social } from "../data/site";
import { formatPrice } from "../lib/format";
import { useReveal } from "../lib/motion";
import { usePageMeta } from "../lib/meta";

export default function Home() {
  usePageMeta(
    "Alba — Ayurvedic, Herbal & Natural Personal Care",
    "Alba offers 100% natural Ayurvedic beauty and personal care products — herbal powders for skin, hair and wellness — and Diva devotional products. By Albatross Herbals, since 1991.",
  );
  const ref = useReveal<HTMLDivElement>();
  return (
    <>
      <StoryStage />
      <div ref={ref}>
        <BrandIntro />
        <Featured />
        <HerbIndex />
        <Heritage />
        <Devotion />
        <Offers />
      </div>
    </>
  );
}

function BrandIntro() {
  return (
    <section className="intro section" aria-labelledby="intro-title">
      <div className="wrap intro__grid">
        <p className="eyebrow intro__label" data-reveal>
          Albatross Herbals
          <br />
          est. {company.founded}
        </p>
        <div>
          <h2 id="intro-title" className="h2 intro__statement" data-reveal>
            A leading manufacturer of{" "}
            <span className="intro__inline">
              <img src={img(getProduct("amla-powder")!.images[0], 480)} alt="" width={80} height={80} loading="lazy" />
            </span>{" "}
            Ayurvedic, herbal, organic <span className="accent">&amp;</span> devotional{" "}
            <span className="intro__inline">
              <img src={img(getProduct("hawan-samagri")!.images[0], 480)} alt="" width={80} height={80} loading="lazy" />
            </span>{" "}
            product lines.
          </h2>
          <div className="intro__cols">
            <p data-reveal style={{ "--i": 1 } as React.CSSProperties}>
              {aboutCopy.intro}
            </p>
            <p data-reveal style={{ "--i": 2 } as React.CSSProperties}>
              {aboutCopy.mission} {aboutCopy.vedas.split(". ")[1]}
            </p>
          </div>
          <Link to="/about" className="link-arrow" data-reveal>
            Our story <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Featured() {
  const items = featuredIds.map((id) => getProduct(id)!).filter(Boolean);
  return (
    <section className="featured section" aria-labelledby="featured-title">
      <div className="wrap">
        <div className="section-head section-head--row">
          <h2 id="featured-title" className="h2" data-reveal>
            From the <span className="accent">apothecary</span> shelf
          </h2>
          <Link to="/shop" className="link-arrow" data-reveal>
            View all {products.length} products <ArrowRight />
          </Link>
        </div>
        <div className="grid">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HerbIndex() {
  const [hover, setHover] = useState(herbs[0].productId);
  const p = getProduct(hover)!;
  const v = p.variants[0];
  return (
    <section className="herbs section grain" aria-labelledby="herbs-title" data-header="dark">
      <div className="wrap herbs__grid">
        <div className="herbs__head">
          <p className="eyebrow" data-reveal>
            Ingredient index
          </p>
          <h2 id="herbs-title" className="h2" data-reveal>
            Know your <span className="accent">herbs.</span>
          </h2>
          <p className="herbs__lede" data-reveal>
            Each name below is a real Alba powder. Pick one to see the pack.
          </p>
          <figure className="herbs__preview" data-reveal aria-live="polite">
            <Link to={`/product/${p.id}`} className="herbs__img" tabIndex={-1} aria-hidden>
              <img key={p.id} src={img(p.images[0], 480)} alt="" width={480} height={480} />
            </Link>
            <figcaption>
              <Link to={`/product/${p.id}`} className="herbs__pname">
                {p.name}
              </Link>
              <Price price={v.price} compareAt={v.compareAt} size="s" />
            </figcaption>
          </figure>
        </div>
        <ul className="herbs__list" role="list">
          {herbs.map((h, i) => (
            <li key={h.name} data-reveal style={{ "--i": i % 6 } as React.CSSProperties}>
              <Link
                to={`/product/${h.productId}`}
                className="herbs__item"
                data-active={hover === h.productId}
                onPointerEnter={() => setHover(h.productId)}
                onFocus={() => setHover(h.productId)}
              >
                <span className="herbs__name">{h.name}</span>
                <span className="deva herbs__deva" lang="hi">
                  {h.deva}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Heritage() {
  return (
    <section className="heritage section" aria-labelledby="heritage-title">
      <div className="wrap">
        <div className="heritage__top">
          <p className="heritage__year" aria-hidden data-reveal>
            1991
          </p>
          <div className="heritage__copy">
            <h2 id="heritage-title" className="h2" data-reveal>
              Three brands, <span className="accent">one</span> herbal house.
            </h2>
            <p className="lead" data-reveal>
              {aboutCopy.company}
            </p>
            <ul className="certs certs--light" role="list" data-reveal>
              {certifications.map((c) => (
                <li key={c.src}>
                  <img src={c.src} alt={c.alt} width={c.w} height={c.h} loading="lazy" />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="brands" role="list">
          {brands.map((b, i) => (
            <li key={b.id} className="brand" data-brand={b.id} data-reveal style={{ "--i": i } as React.CSSProperties}>
              <div className="brand__plate">
                <img src={b.logo} alt={`${b.name} logo`} loading="lazy" />
              </div>
              <p className="eyebrow">{b.role}</p>
              <p className="brand__body">{b.body}</p>
              {b.href ? (
                <Link to={b.href} className="link-arrow">
                  {b.cta} <ArrowRight />
                </Link>
              ) : (
                <span className="brand__soon">{b.cta}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Devotion() {
  const kit = getProduct("pooja-kit")!;
  const hawan = getProduct("hawan-samagri")!;
  const hv = hawan.variants[0];
  return (
    <section className="devotion" aria-labelledby="devotion-title" data-header="dark">
      <img className="devotion__bg" src={lifeImg("devotional", 1800)} alt="" loading="lazy" width={1800} height={1200} />
      <div className="wrap devotion__inner">
        <div className="devotion__copy">
          <img className="devotion__logo" src="/brand/diva-logo-trim.webp" alt="Diva" width={700} height={562} loading="lazy" data-reveal />
          <h2 id="devotion-title" className="h1" data-reveal>
            Divine <span className="accent">devotion</span>
          </h2>
          <p className="lead" data-reveal>
            {aboutCopy.devotion}.
          </p>
          <Link to="/devotional" className="btn btn--ghost" data-reveal>
            Shop Diva <ArrowRight />
          </Link>
        </div>
        <div className="devotion__items">
          {[kit, hawan].map((p, i) => (
            <Link key={p.id} to={`/product/${p.id}`} className="devotion__item" data-reveal style={{ "--i": i + 1 } as React.CSSProperties}>
              <img src={img(p.images[0], 480)} alt="" width={480} height={480} loading="lazy" />
              <span className="devotion__name">{p.name}</span>
              <span className="devotion__price">
                {p.variants.length > 1 ? `from ${formatPrice(Math.min(...p.variants.map((x) => x.price)))}` : formatPrice(p.variants[0].price)}
              </span>
            </Link>
          ))}
          <div className="devotion__quick" data-reveal style={{ "--i": 3 } as React.CSSProperties}>
            <p className="meta-dark">{hawan.ingredient}</p>
            <AddToBag variantId={hv.id} name={hawan.name} className="btn btn--primary" label={`Add Hawan Samagri · ${formatPrice(hv.price)}`} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Offers() {
  return (
    <section className="offers section" aria-labelledby="offers-title">
      <div className="wrap offers__grid">
        <div className="offers__main">
          <Sprig className="offers__sprig" />
          <h2 id="offers-title" className="h1" data-reveal>
            Free delivery over <span className="accent">{formatPrice(FREE_DELIVERY_THRESHOLD)}</span>
          </h2>
          <p className="lead" data-reveal>
            Shipped across India, usually in 3 to 5 business days.
          </p>
          <Link to="/shop" className="btn btn--primary" data-reveal>
            Start your order <ArrowRight />
          </Link>
        </div>
        <div className="offers__side">
          <div className="offers__card" data-reveal style={{ "--i": 1 } as React.CSSProperties}>
            <p className="eyebrow">Also available on</p>
            <div className="offers__links">
              {marketplaces.map((m) => (
                <a key={m.label} href={m.href} target="_blank" rel="noreferrer" className="link-arrow">
                  {m.label} <External />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          </div>
          <div className="offers__card" data-reveal style={{ "--i": 2 } as React.CSSProperties}>
            <p className="eyebrow">Hear about offers first</p>
            <p>Follow us and say hi with your contact details on Instagram or Facebook chat — we’ll notify you of the latest offers.</p>
            <div className="offers__links">
              {social.slice(0, 2).map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="link-arrow">
                  {s.label} {s.handle} <External />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
