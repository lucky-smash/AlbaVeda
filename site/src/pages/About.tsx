import { Link } from "react-router-dom";
import { ArrowRight } from "../components/Icons";
import { img, getProduct } from "../data/catalog";
import { aboutCopy, brands, certifications, company } from "../data/site";
import { usePageMeta } from "../lib/meta";
import { useReveal } from "../lib/motion";

export default function About() {
  usePageMeta(
    "About us — Alba",
    "Albatross Herbals is a company established in 1991. A leading manufacturer, exporter & marketer of Personal care, Aroma & Devotional products.",
  );
  const ref = useReveal<HTMLDivElement>();
  const packs = ["shikakai-amla-reetha", "moringa-powder", "herbal-henna", "multani-mitti-carton"].map((id) => getProduct(id)!);
  return (
    <div className="about" ref={ref}>
      <header className="about__head wrap">
        <p className="eyebrow">About us</p>
        <h1 className="display">
          Goodness of the <span className="accent">vedas,</span> since {company.founded}.
        </h1>
      </header>

      <section className="wrap about__grid">
        <p className="about__big" data-reveal>
          {aboutCopy.company}
        </p>
        <div className="about__side prose">
          <p data-reveal>{aboutCopy.vedas}</p>
          <p data-reveal>
            {aboutCopy.intro} {aboutCopy.mission}
          </p>
          <ul className="certs" role="list" data-reveal>
            {certifications.map((c) => (
              <li key={c.src}>
                <img src={c.src} alt={c.alt} width={c.w} height={c.h} loading="lazy" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="about__strip" aria-label="Some of our products">
        {packs.map((p, i) => (
          <Link key={p.id} to={`/product/${p.id}`} data-reveal style={{ "--i": i } as React.CSSProperties}>
            <img src={img(p.images[0], 480)} alt={p.name} width={480} height={480} loading="lazy" />
          </Link>
        ))}
      </section>

      <section className="wrap section about__ayurveda">
        <h2 className="h2" data-reveal>
          Ayurveda — <span className="accent">the science of life.</span>
        </h2>
        <p className="lead" data-reveal>
          {aboutCopy.ayurveda}.
        </p>
        <div className="about__brands">
          {brands.map((b) => (
            <div key={b.id} className="about__brand" data-reveal>
              <img src={b.logo} alt={`${b.name} logo`} loading="lazy" />
              <p className="meta">{b.role}</p>
            </div>
          ))}
        </div>
        <p className="about__cta" data-reveal>
          We would love to work with you or work for you.{" "}
          <Link to="/contact" className="link-arrow">
            Contact us <ArrowRight />
          </Link>
        </p>
      </section>
    </div>
  );
}
