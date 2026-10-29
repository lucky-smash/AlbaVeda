import { Link } from "react-router-dom";
import { categories } from "../data/catalog";
import { certifications, company, marketplaces, social } from "../data/site";
import { External } from "./Icons";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer grain" data-header="dark">
      <div className="wrap">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Logo width={120} />
            <p className="site-footer__line">
              Ayurvedic, herbal &amp; devotional products by {company.legalName}, since {company.founded}.
            </p>
            <ul className="certs" role="list">
              {certifications.map((c) => (
                <li key={c.src}>
                  <img src={c.src} alt={c.alt} width={c.w} height={c.h} loading="lazy" />
                </li>
              ))}
            </ul>
          </div>

          <nav className="site-footer__col" aria-label="Shop">
            <h2 className="eyebrow">Shop</h2>
            <ul role="list">
              <li>
                <Link to="/shop">All products</Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link to={`/${c.id}`}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="site-footer__col" aria-label="Company">
            <h2 className="eyebrow">Alba</h2>
            <ul role="list">
              <li>
                <Link to="/about">About us</Link>
              </li>
              <li>
                <Link to="/brands">Our brands</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
              <li>
                <Link to="/policies/shipping">Delivery &amp; shipping</Link>
              </li>
              <li>
                <Link to="/policies/refunds">Refunds &amp; cancellation</Link>
              </li>
            </ul>
          </nav>

          <div className="site-footer__col">
            <h2 className="eyebrow">Talk to us</h2>
            <address>
              <a href={`mailto:${company.email}`}>{company.email}</a>
              <a href={`tel:${company.phones[0].number.replace(/[^+\d]/g, "")}`}>{company.phones[0].number}</a>
              <span className="meta-dark">{company.hours}</span>
            </address>
            <h2 className="eyebrow site-footer__sub">Follow</h2>
            <ul role="list" className="site-footer__social">
              {social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer">
                    {s.label}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="site-footer__market">
          <span className="eyebrow">Also available on</span>
          {marketplaces.map((m) => (
            <a key={m.label} href={m.href} target="_blank" rel="noreferrer" className="link-arrow">
              {m.label} <External />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ))}
        </div>

        <div className="site-footer__base">
          <p>
            © {new Date().getFullYear()} {company.legalName}
          </p>
          <nav aria-label="Legal" className="site-footer__legal">
            <Link to="/policies/privacy">Privacy</Link>
            <Link to="/policies/terms">Terms</Link>
          </nav>
        </div>
      </div>
      <p className="site-footer__word" aria-hidden>
        alba
      </p>
    </footer>
  );
}
