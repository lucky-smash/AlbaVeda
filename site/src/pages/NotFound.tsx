import { Link } from "react-router-dom";
import { ArrowRight, Sprig } from "../components/Icons";
import { usePageMeta } from "../lib/meta";

export default function NotFound() {
  usePageMeta("Page not found — Alba");
  return (
    <div className="wrap notfound">
      <Sprig className="notfound__sprig" />
      <p className="eyebrow">404</p>
      <h1 className="h1">
        This page has <span className="accent">gone back to the earth.</span>
      </h1>
      <p className="lead">The link may be from the old site. Everything we make is still in the shop.</p>
      <div className="notfound__ctas">
        <Link to="/shop" className="btn btn--primary">
          Shop all products <ArrowRight />
        </Link>
        <Link to="/" className="btn btn--ghost">
          Home
        </Link>
      </div>
    </div>
  );
}
