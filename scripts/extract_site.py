"""Convert downloaded albaveda.com (Wix) HTML into markdown.

Usage: python -I extract_site.py <raw_dir> <out_dir>
  raw_dir contains pages/*.html, products/*.html, urls.txt
"""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SKIP = {"script", "style", "noscript", "svg", "template", "iframe"}
BLOCK = {"p", "div", "section", "li", "h1", "h2", "h3", "h4", "h5", "h6",
         "br", "tr", "td", "button", "span"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "source", "track", "wbr"}
BASE = "https://www.albaveda.com"


def clean_img(src):
    # Strip Wix resize params -> original media URL
    m = re.match(r"(https://static\.wixstatic\.com/media/[^/]+)", src or "")
    return m.group(1) if m else src


class Extractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.region = []          # stack of "header"/"footer"/None
        self.out = {"header": [], "footer": [], "main": []}
        self.buf = []
        self.prefix = ""
        self.link = None

    def _region(self):
        for r in reversed(self.region):
            if r:
                return r
        return "main"

    def flush(self):
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        self.buf = []
        if text:
            self.out[self._region()].append(self.prefix + text)
        self.prefix = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in SKIP:
            self.skip += 1
            return
        if self.skip:
            return
        rid = a.get("id", "")
        if tag not in VOID:
            # Wix renders the main menu as <nav aria-label="Site"> outside <header>
            self.region.append("header" if tag == "header" or rid == "SITE_HEADER"
                               or (tag == "nav" and a.get("aria-label") == "Site")
                               else "footer" if tag == "footer" or rid == "SITE_FOOTER"
                               else None)
        if tag in BLOCK and self.link is None:
            self.flush()
        if re.fullmatch(r"h[1-6]", tag):
            self.prefix = "#" * (int(tag[1]) + 1) + " "   # page title is the H1
        elif tag == "li":
            self.prefix = "- "
        elif tag == "a" and a.get("href"):
            self.flush()
            self.link = a["href"]
        elif tag == "img":
            src = clean_img(a.get("src") or a.get("data-src"))
            if src and "wixstatic" in src:
                alt = (a.get("alt") or "").strip()
                self.out[self._region()].append(f"![{alt}]({src})")

    def handle_endtag(self, tag):
        if tag in SKIP:
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        if tag == "a" and self.link is not None:
            text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
            self.buf = []
            href = self.link
            self.link = None
            if text:
                self.out[self._region()].append(f"{self.prefix}[{text}]({href})")
                self.prefix = ""
            elif href.startswith("http"):
                self.out[self._region()].append(f"[link]({href})")   # image-only link
        elif tag in BLOCK and self.link is None:
            self.flush()
        if tag in VOID:
            return
        if self.region:
            self.region.pop()

    def handle_data(self, data):
        if not self.skip:
            self.buf.append(data)


def dedupe(lines):
    seen, out = set(), []
    for line in lines:
        if line in seen:
            continue
        seen.add(line)
        out.append(line)
    return out


def meta(h, prop):
    m = re.search(rf'(?:name|property)="{re.escape(prop)}" content="([^"]*)"', h)
    return html.unescape(m.group(1)) if m else ""


def title(h):
    m = re.search(r"<title>(.*?)</title>", h, re.S)
    return html.unescape(m.group(1)).strip() if m else ""


def jsonld(h):
    out = []
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try:
            out.append(json.loads(m))
        except json.JSONDecodeError:
            pass
    return out


def parse(h):
    p = Extractor()
    p.feed(h)
    p.flush()
    return {k: dedupe(v) for k, v in p.out.items()}


def main(raw, out):
    raw, out = Path(raw), Path(out)
    (out / "pages").mkdir(parents=True, exist_ok=True)
    urls = {}
    for u in (raw / "urls.txt").read_text().split():
        slug = u.replace(BASE, "").strip("/").replace("product-page/", "") or "home"
        urls[slug] = u

    chrome = None
    index = []
    for f in sorted((raw / "pages").glob("*.html")):
        h = f.read_text(encoding="utf-8", errors="ignore")
        parts = parse(h)
        if f.stem == "home":
            chrome = parts
        body = [f"# {title(h)}", "",
                f"- **URL:** {urls.get(f.stem, '')}",
                f"- **Meta description:** {meta(h, 'description')}",
                f"- **OG image:** {meta(h, 'og:image')}", "", "---", ""]
        body += [line + "\n" for line in parts["main"]]
        (out / "pages" / f"{f.stem}.md").write_text("\n".join(body), encoding="utf-8")
        index.append((f.stem, title(h), urls.get(f.stem, ""), len(parts["main"])))

    if chrome:
        nav = ["# Site Header & Footer (global)", "", "## Header", ""]
        nav += [line + "\n" for line in chrome["header"]]
        nav += ["", "## Footer", ""] + [line + "\n" for line in chrome["footer"]]
        (out / "pages" / "_header-footer.md").write_text("\n".join(nav), encoding="utf-8")

    products = []
    for f in sorted((raw / "products").glob("*.html")):
        h = f.read_text(encoding="utf-8", errors="ignore")
        prod = next((d for d in jsonld(h) if d.get("@type") == "Product"), None)
        if not prod:
            continue
        offer = prod.get("offers") or {}
        if isinstance(offer, list):
            offer = offer[0]
        imgs = [clean_img(i.get("contentUrl")) for i in prod.get("image", [])
                if isinstance(i, dict)]
        products.append({
            "slug": f.stem,
            "url": urls.get(f.stem, ""),
            "name": prod.get("name", ""),
            "price": offer.get("price") or offer.get("lowPrice"),
            "currency": offer.get("priceCurrency", "INR"),
            "availability": (offer.get("availability") or "").rsplit("/", 1)[-1],
            "sku": prod.get("sku", ""),
            "brand": (prod.get("brand") or {}).get("name", "") if isinstance(prod.get("brand"), dict) else prod.get("brand", ""),
            "images": imgs,
            "description": (prod.get("description") or "").replace(" ", "").strip(),
        })

    (out / "products.json").write_text(json.dumps(products, indent=2, ensure_ascii=False),
                                       encoding="utf-8")
    md = ["# Product Catalog", "", f"Total products: {len(products)}", "",
          "| # | Product | Price (INR) | Stock | Slug |", "|---|---|---|---|---|"]
    for i, p in enumerate(products, 1):
        md.append(f"| {i} | {p['name']} | {p['price']} | {p['availability']} | {p['slug']} |")
    for p in products:
        md += ["", "---", "", f"## {p['name']}", "",
               f"- **URL:** {p['url']}",
               f"- **Price:** ₹{p['price']} ({p['availability']})"]
        if p["sku"]:
            md.append(f"- **SKU:** {p['sku']}")
        md += ["- **Images:**"] + [f"  - {u}" for u in p["images"]]
        md += ["", "### Description", "", p["description"]]
    (out / "products.md").write_text("\n".join(md), encoding="utf-8")

    print("pages:", len(index), "products:", len(products))
    for row in index:
        print(row)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
