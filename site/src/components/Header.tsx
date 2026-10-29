import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { categories } from "../data/catalog";
import { useCart } from "../lib/cart";
import { Bag, Close, Menu, Search } from "./Icons";
import { Logo } from "./Logo";

/**
 * Header adapts to the surface beneath it: any section marked
 * data-header="dark" flips it to ivory text. It turns solid once the page
 * scrolls so it never sits transparently over busy product imagery.
 */
export function Header({ onSearch }: { onSearch: () => void }) {
  const { count, open, pulse } = useCart();
  const location = useLocation();
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Which surface is under the header's midline?
  useEffect(() => {
    const targets = document.querySelectorAll("[data-header='dark']");
    if (!targets.length) {
      setDark(false);
      return;
    }
    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
        setDark(visible.size > 0);
      },
      { rootMargin: "-30px 0px -95% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    if (!pulse) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(t);
  }, [pulse]);

  useEffect(() => {
    if (!menuOpen) return;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const theme = dark && !menuOpen ? "dark" : "light";

  return (
    <header className="site-header" data-theme={theme} data-scrolled={scrolled || menuOpen}>
      <div className="site-header__bar wrap">
        <Link to="/" className="site-header__logo" aria-label="Alba home">
          <Logo width={96} className="site-header__mark" />
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <NavLink to="/shop" end>
            Shop all
          </NavLink>
          {categories.map((c) => (
            <NavLink key={c.id} to={`/${c.id}`}>
              {c.label}
            </NavLink>
          ))}
          <span className="site-nav__sep" aria-hidden />
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>

        <div className="site-header__actions">
          <button className="icon-btn" onClick={onSearch} aria-label="Search products">
            <Search />
          </button>
          <button className="icon-btn icon-btn--bag" onClick={open} aria-label={`Open bag, ${count} item${count === 1 ? "" : "s"}`}>
            <Bag />
            {count > 0 && (
              <span className="bag-count" data-bump={bump}>
                {count}
              </span>
            )}
          </button>
          <button
            className="icon-btn menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <Close /> : <Menu />}
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="mobile-menu" data-open={menuOpen} ref={menuRef} inert={!menuOpen}>
        <nav className="mobile-menu__nav wrap" aria-label="Mobile">
          <p className="eyebrow mobile-menu__label">Shop</p>
          <Link to="/shop" style={{ "--i": 0 } as React.CSSProperties}>
            All products
          </Link>
          {categories.map((c, i) => (
            <Link key={c.id} to={`/${c.id}`} style={{ "--i": i + 1 } as React.CSSProperties}>
              {c.label}
            </Link>
          ))}
          <p className="eyebrow mobile-menu__label">Alba</p>
          <div className="mobile-menu__minor">
            <Link to="/about">About us</Link>
            <Link to="/brands">Our brands</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
