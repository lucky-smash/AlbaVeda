"""Assemble content/pages/*.md + products.md into one site-content.md.

Usage: python -I assemble_content.py <content_dir> <out_file>
"""
import re
import sys
from pathlib import Path

NOISE = {"top of page", "bottom of page", "Use tab to navigate through the menu items.",
         "More", "-", ""}

# Grouped the way the live site's menu is organised
ORDER = [
    ("Core", ["home", "about-us", "ourbrands", "contact"]),
    ("Category pages", ["skin-care", "hair-care", "beauty", "wellness", "devotional", "saar"]),
    ("Shop pages", ["shop-2", "shop", "shop-1"]),
    ("Other", ["blog", "demo", "paytm"]),
    ("Policies", ["about-4", "about-4-1", "copy-of-return-cancellation-policy", "about-4-2"]),
]


def clean(text, page_title=None):
    out = []
    for line in text.replace("​", "").replace(" ", " ").splitlines():
        s = line.strip()
        if s in NOISE or (page_title and s == page_title):
            continue
        out.append(s)
    # collapse to single blank lines between blocks
    return "\n\n".join(out)


def demote(md):
    # page H1 -> H2 inside the combined document; existing H3+ stay as-is
    return re.sub(r"^# ", "## ", md, count=1, flags=re.M)


def main(content, out_file):
    content = Path(content)
    pages = content / "pages"
    doc = ["# albaveda.com — Full Site Content", "",
           "Source: https://www.albaveda.com (Wix site, Albatross Herbals India Pvt Ltd)", "",
           "Extracted page-by-page from server-rendered HTML. Raw per-page files live in "
           "`content/pages/`, products in `content/products.md` / `content/products.json`.", "",
           "## Table of Contents", ""]
    for group, slugs in ORDER:
        doc.append(f"- **{group}:** " + ", ".join(f"`{s}`" for s in slugs))
    doc += ["- **Global:** header & footer", "- **Product catalog**", ""]

    hf = (pages / "_header-footer.md").read_text(encoding="utf-8")
    doc += ["---", "", demote(clean(hf)), ""]

    for group, slugs in ORDER:
        doc += ["---", "", f"# {group}", ""]
        for slug in slugs:
            md = (pages / f"{slug}.md").read_text(encoding="utf-8")
            first = md.splitlines()[0][2:].strip()
            doc += [demote(clean(md, page_title=first)), "", f"_Source file: content/pages/{slug}.md_", ""]

    doc += ["---", "", (content / "products.md").read_text(encoding="utf-8")]
    Path(out_file).write_text("\n".join(doc), encoding="utf-8")
    print("wrote", out_file)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
