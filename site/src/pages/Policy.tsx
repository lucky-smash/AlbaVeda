import { Link, useParams } from "react-router-dom";
import policies from "../data/policies.json";
import { usePageMeta } from "../lib/meta";
import NotFound from "./NotFound";

type Block = { p: string } | { h: string };

export default function Policy() {
  const { id } = useParams();
  const policy = policies.find((p) => p.id === id);
  usePageMeta(policy ? `${policy.title} — Alba` : "Not found — Alba");
  if (!policy) return <NotFound />;
  return (
    <div className="wrap policy">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{policy.title}</span>
      </nav>
      <h1 className="h1">{policy.title}</h1>
      <div className="policy__layout">
        <nav className="policy__nav" aria-label="Policies">
          {policies.map((p) => (
            <Link key={p.id} to={`/policies/${p.id}`} aria-current={p.id === id ? "page" : undefined}>
              {p.title}
            </Link>
          ))}
        </nav>
        <article className="prose policy__body">
          {(policy.blocks as Block[]).map((b, i) => ("h" in b ? <h3 key={i}>{b.h}</h3> : <p key={i}>{b.p}</p>))}
        </article>
      </div>
    </div>
  );
}
