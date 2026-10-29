"""Build site/src/data/catalog.json from content/products.json and download
optimised product + lifestyle imagery into site/public/img.

Usage:  python -I scripts/build_catalog.py <repo_root> [--no-download]

Curation rules (see README "Catalogue curation"):
  * Products that appear on a live listing page are the verified set; their
    regular/sale prices are read from those listings.
  * Size variants are only created where the source slug states the size.
  * Legacy/duplicate product pages with inconsistent prices are excluded.
"""
import json
import os
import re
import sys
import urllib.request

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
DOWNLOAD = "--no-download" not in sys.argv
CONTENT = os.path.join(ROOT, "content")
SITE = os.path.join(ROOT, "site")
IMG_DIR = os.path.join(SITE, "public", "img")

WIX = "https://static.wixstatic.com/media/"

# id, name, brand, type, categories, [(source slug, variant label or None)], ingredient
CATALOG = [
    # ---- Hair care
    ("shikakai-amla-reetha", "3in1 Shikakai Powder with Amla & Reetha", "Alba", "Hair cleanser powder",
     ["hair-care"], [("3in1-shikakai-powder-with-amla-reetha", None)], "Shikakai, Amla & Reetha"),
    ("amla-powder", "Amla Powder", "Alba", "Herbal powder",
     ["hair-care", "wellness"], [("amla-powder-indian-gooseberry-100gm", "100 g"),
                                 ("amla-powder-indian-gooseberry-200gm", "200 g")], "Amla · Indian gooseberry"),
    ("reetha-powder", "Reetha Powder", "Alba", "Herbal powder",
     ["hair-care"], [("reetha-powder-sapindus-mukorossi-200gm", "200 g")], "Reetha · Sapindus mukorossi"),
    ("shikakai-powder", "Shikakai Powder", "Alba", "Herbal powder",
     ["hair-care"], [("shikakai-powder-acacia-concinna-200gm", "200 g")], "Shikakai · Acacia concinna"),
    ("bhringraj-powder", "Bhringraj Powder", "Alba", "Herbal powder",
     ["hair-care", "skin-care", "beauty"], [("alba-bhringraj-powder", None)], "Bhringraj · Eclipta alba"),
    ("hibiscus-powder", "Hibiscus Powder", "Alba", "Herbal powder",
     ["hair-care", "skin-care", "wellness"], [("alba-hibiscus-powder", None)], "Hibiscus"),
    ("rosemary-powder", "Rosemary Powder", "Alba", "Herbal powder",
     ["hair-care", "skin-care", "wellness"], [("alba-rosemary-powder", None)], "Rosemary"),
    ("herbal-henna", "Herbal Henna", "Alba", "Natural hair colour",
     ["hair-care", "beauty"], [("AlbaHenna", None)], "Henna leaves, Rajasthan"),
    ("indigo-powder", "Indigo Powder", "Alba", "Natural hair colour",
     ["hair-care", "beauty"], [("indigo-powder", "100 g")], "Indigo"),
    ("henna-indigo-combo", "Indigo Powder & Herbal Henna Combo Pack", "Alba", "Natural hair colour",
     ["hair-care", "beauty"], [("alba-herbal-henna-indigo-powder-combo-pack", None)], "Henna & Indigo"),
    ("rachni-mehandi", "Rachni Mehandi", "Alba", "Henna for hands",
     ["beauty"], [("alba-rachni-mehandi", None)], "Henna leaves"),
    # ---- Skin care / beauty
    ("multani-mitti-jar", "Multani Mitti Jar · Fuller's Earth", "Alba", "Clay",
     ["skin-care", "beauty"], [("alba-multani-mitti-jar-fullers-earth", None)], "Multani mitti · Fuller's earth"),
    ("multani-mitti-carton", "Multani Mitti · Fuller's Earth", "Alba", "Clay",
     ["skin-care", "beauty"], [("alba-multani-mitti-carton-pack-100g", "100 g carton")], "Multani mitti · Fuller's earth"),
    ("nikhar-ubtan", "Nikhar Ubtan", "Alba", "Ubtan",
     ["skin-care", "beauty"], [("nikhar-ubtan-100g", "100 g"), ("nikhar-ubtan-200g", "200 g"),
                               ("nikhar-ubtan-jar-225g", "225 g jar")], "Rose, Sandal & Turmeric"),
    ("ubtan-facepack", "Ubtan Facepack with Kesar, Chandan, Gulab & Haldi", "Alba", "Facepack powder",
     ["skin-care", "beauty"], [("alba-ubtan-facepack-with-kesar-chandan-gulab-haldi", None)], "Kesar, Chandan, Gulab & Haldi"),
    ("chandan-facepack", "Chandan Facepack Powder", "Alba", "Facepack powder",
     ["skin-care", "beauty"], [("alba-chandan-facepack-powder", None)], "Chandan · Sandalwood"),
    ("neem-facepack", "Neem Facepack Powder", "Alba", "Facepack powder",
     ["skin-care", "beauty"], [("alba-neem-facepack-powder", None)], "Neem"),
    ("orange-facepack", "Orange Facepack Powder", "Alba", "Facepack powder",
     ["skin-care", "beauty"], [("alba-orange-facepack-powder", None)], "Orange"),
    ("cucumber-facepack", "Cucumber Facepack Powder", "Alba", "Facepack powder",
     ["skin-care", "beauty"], [("alba-cucumber-facepack-powder", None)], "Cucumber"),
    ("sandalwood-powder", "Sandalwood Powder", "Alba", "Herbal powder",
     ["skin-care", "beauty"], [("alba-sandalwood-powder", None)], "Chandan · Sandalwood"),
    ("orange-peel-powder", "Orange Peel Powder", "Alba", "Herbal powder",
     ["skin-care", "beauty", "hair-care"], [("alba-orange-peel-powder", None)], "Orange peel"),
    ("neem-leaves-powder", "Neem Leaves Powder", "Alba", "Herbal powder",
     ["skin-care", "hair-care"], [("alba-neem-leaves-powder", None)], "Neem leaves"),
    ("mulethi-powder", "Mulethi Powder", "Alba", "Herbal powder",
     ["skin-care", "hair-care"], [("alba-mulethi-powder", None)], "Mulethi · Liquorice"),
    # ---- Wellness
    ("moringa-powder", "Moringa Powder", "Alba", "Superfood powder",
     ["wellness"], [("alba-moringa-powder", None)], "Moringa leaves"),
    ("beetroot-powder", "Beetroot Powder", "Alba", "Superfood powder",
     ["wellness", "skin-care", "beauty"], [("alba-beetroot-powder", None)], "Beetroot"),
    ("ashwagandha-powder", "Ashwagandha Powder", "Alba", "Herbal powder",
     ["wellness"], [("alba-ashwagandha-powder", None)], "Ashwagandha · Withania somnifera"),
    ("tulsi-powder", "Tulsi Powder", "Alba", "Herbal powder",
     ["wellness", "hair-care"], [("alba-tulsi-powder", None)], "Tulsi · Holy basil"),
    ("triphala-powder", "Triphala Powder", "Alba", "Churna",
     ["wellness"], [("triphala", None)], "Triphala"),
    # ---- Devotional (Diva)
    ("hawan-samagri", "Hawan Samagri", "Diva", "Hawan samagri",
     ["devotional"], [("diva-hawan-samagri", None)], "Til, jau, dhoop, kapoor, rose petals, sandalwood"),
    ("hawan-samagri-1kg", "Hawan Samagri Poly Pack", "Diva", "Hawan samagri",
     ["devotional"], [("diva-hawan-samagri-poly-pack-1kg", "1 kg")], "Herbs"),
    ("pooja-kit", "Pooja Kit", "Diva", "Pooja kit",
     ["devotional"], [("diva-pooja-samagri-pooja-kit-small", "Small"),
                      ("diva-pooja-samagri-pooja-kit", "Large")], "All-in-one pooja essentials"),
]

CATEGORIES = [
    # id, label, headline (verbatim from the category page), lede (verbatim), hero image key
    ("skin-care", "Skin Care", "Cleanse. Balance. Restore.",
     "Ditch harsh chemicals and use these herbs for smooth and glowing skin", "skin"),
    ("hair-care", "Hair Care", "All Over Indulgence",
     "Natures precious herbs are used for smooth and silky hair as well as hair growth", "hair"),
    ("beauty", "Beauty", "Enhances the beauty within",
     "Harmful chemicals and dyes can really spoil your beauty in the long run. Use power of herbs for the ultimate beautification", "beauty"),
    ("wellness", "Wellness", "Wellness From Nature",
     "With herbs powerful cleansing actions, they empower the body to clean itself out of all obstructions", "wellness"),
    ("devotional", "Devotional", "Divine devotion",
     "Herbs has tremendous amount of powerful energies that can make any environment divine", "devotional"),
]

LIFESTYLE = {
    "skin": "9c608a_f7f89260104a4c60bc3f0102dff6abe7.jpg",
    "hair": "9c608a_42b4413ea27c4e8686f1208d95cb54c4.jpg",
    "beauty": "9c608a_40bbc275242f4d8fbd140fd1a13aedf0.jpg",
    "wellness": "2117ee45626a489a9853b93a98739158.jpg",
    "devotional": "9b6bae15ff824d389e6f296e7e307e8a.jpeg",
    "herbs": "fe8c5ac0dace48d095e45c2156df863d.jpg",
    "about": "11062b_2042bb7351284f0f982e4787d37415e6f000.jpg",
    "soil": "nsplsh_774c377077696d42373851~mv2_d_5760_3840_s_4_2.jpg",
    "oils": "5979d0afaa9440a7b6d93de77652f506.jpg",
    "brands": "bc3ec7bc825c4e6ca746c659189cea83.jpg",
    "home-skin": "50ae1457bf6e2044a70215637636a722.jpg",
    "home-hair": "c99e193fd08a42f5b09623096212f4bb.jpg",
    "home-wellness": "ae2ac9d1bc304c8bac9128046d7ebad7.jpg",
    "home-beauty": "fe42fb74b1e00afa1d9231e04b183b42.jpg",
}


def money(s):
    return float(s.replace(",", ""))


def listing_prices():
    """slug -> (sale, regular) from 'Regular Price₹x Sale Price₹y' listing links."""
    out = {}
    pat = re.compile(r"Regular Price₹([\d,.]+)Sale Price₹([\d,.]+)[^\]]*\]\(https://www\.albaveda\.com/product-page/([^)\s]+)\)")
    for f in os.listdir(os.path.join(CONTENT, "pages")):
        text = open(os.path.join(CONTENT, "pages", f), encoding="utf-8").read()
        for reg, sale, slug in pat.findall(text):
            out[slug] = (money(sale), money(reg))
    return out


def clean_description(text):
    """Normalise whitespace/bullets into blocks: {'p': str} or {'ul': [str]}."""
    text = text.replace(" ", " ").replace("​", "")
    blocks, bullets = [], []
    for raw in text.split("\n"):
        line = re.sub(r"\s+", " ", raw).strip()
        if not line:
            continue
        m = re.match(r"^(?:[•●▪◦\-–]|\d+\.)\s*(.+)$", line)
        if m and not re.match(r"^\d+\.\s*[A-Z][^.]{0,60}$", line):
            bullets.append(m.group(1).strip())
            continue
        if bullets:
            blocks.append({"ul": bullets})
            bullets = []
        blocks.append({"p": line})
    if bullets:
        blocks.append({"ul": bullets})
    return blocks


def first_sentences(text, limit=170):
    text = re.sub(r"\s+", " ", text.replace(" ", " ")).strip()
    text = re.sub(r"^100% Natural\s*", "", text)
    text = re.sub(r"^[•●]\s*", "", text)
    out = ""
    for sent in re.split(r"(?<=[.!?])\s+", text):
        if not out:
            out = sent
        elif len(out) + len(sent) + 1 <= limit:
            out += " " + sent
        else:
            break
    if len(out) > limit + 60:
        out = out[:limit].rsplit(" ", 1)[0] + "…"
    return out


def media_id(url):
    return url.split("/media/")[1].split("/")[0]


def fetch(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        with open(dest, "wb") as fh:
            fh.write(data)
        return True
    except Exception as exc:  # noqa: BLE001
        print("  ! failed", url, exc)
        return False


def wix_webp(mid, w, h, mode="fit", q=82):
    return f"{WIX}{mid}/v1/{mode}/w_{w},h_{h},q_{q}/img.webp"


POLICIES = [
    # id, title, source page
    ("privacy", "Privacy Policy", "about-4.md"),
    ("terms", "Terms & Conditions", "about-4-1.md"),
    ("shipping", "Delivery & Shipping Policy", "copy-of-return-cancellation-policy.md"),
    ("refunds", "Refund & Cancellation Policy", "about-4-2.md"),
]
NOISE = re.compile(r"^(top of page|bottom of page|Acerca de|​|​)$|^!\[|^\[link\]")


def policy_blocks(fname, title):
    text = open(os.path.join(CONTENT, "pages", fname), encoding="utf-8").read()
    body = text.split("top of page", 1)[-1].split("bottom of page", 1)[0]
    blocks = []
    for raw in body.split("\n"):
        line = raw.strip().replace("​", "")
        if not line or NOISE.search(line):
            continue
        line = re.sub(r"\[([^\]]+)\]\(mailto:[^)]+\)", r"\1", line)
        line = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
        heading = re.match(r"^#{1,6}\s*(.+)$", line)
        if heading:
            h = heading.group(1).strip()
            if h.lower() != title.lower():
                blocks.append({"h": h})
            continue
        if line.lower().replace("cancelation", "cancellation") == title.lower():
            continue
        if line in ("Cancellation Policy",):  # unmarked heading in the source
            blocks.append({"h": line})
            continue
        if blocks and blocks[-1].get("p", "").startswith("http") and len(blocks[-1]["p"]) < 40:
            blocks[-1]["p"] = "albaveda.com " + line
            continue
        # The source splits "email us at\n[address]" across lines; re-join.
        if blocks and "p" in blocks[-1] and (blocks[-1]["p"].endswith(" at") or line.startswith("and ")):
            blocks[-1]["p"] += " " + line
            continue
        blocks.append({"p": line})
    # The source page lost the address in "email us at <addr>" twice.
    for b in blocks:
        if "p" in b:
            b["p"] = re.sub(r"email (us )?at (with|and) ", r"email us at info@albatrossnaturals.com \2 ", b["p"])
    return blocks


def main():
    pol = [{"id": i, "title": t, "blocks": policy_blocks(f, t)} for i, t, f in POLICIES]
    os.makedirs(os.path.join(SITE, "src", "data"), exist_ok=True)
    with open(os.path.join(SITE, "src", "data", "policies.json"), "w", encoding="utf-8") as fh:
        json.dump(pol, fh, ensure_ascii=False, indent=1)
    products = {p["slug"]: p for p in json.load(open(os.path.join(CONTENT, "products.json"), encoding="utf-8"))}
    prices = listing_prices()
    os.makedirs(os.path.join(IMG_DIR, "p"), exist_ok=True)
    os.makedirs(os.path.join(IMG_DIR, "life"), exist_ok=True)

    out_products = []
    for pid, name, brand, ptype, cats, sources, ingredient in CATALOG:
        variants, images, seen = [], [], set()
        for slug, label in sources:
            src = products[slug]
            sale, regular = prices.get(slug, (money(src["price"]), None))
            variants.append({
                "id": slug, "label": label, "price": sale,
                "compareAt": regular if regular and regular > sale else None,
                "inStock": src["availability"] == "InStock",
                "sourceUrl": src["url"],
            })
            for url in src["images"]:
                mid = media_id(url)
                if mid in seen:
                    continue
                seen.add(mid)
                idx = len(images)
                base = f"{pid}-{idx}"
                if DOWNLOAD:
                    fetch(wix_webp(mid, 1000, 1000), os.path.join(IMG_DIR, "p", base + "-1000.webp"))
                    fetch(wix_webp(mid, 480, 480), os.path.join(IMG_DIR, "p", base + "-480.webp"))
                images.append(f"/img/p/{base}")
        main_src = products[sources[-1][0]]
        out_products.append({
            "id": pid, "name": name, "brand": brand, "type": ptype,
            "categories": cats, "ingredient": ingredient,
            "summary": first_sentences(main_src["description"]) if main_src["description"].strip() else "",
            "description": clean_description(main_src["description"]),
            "images": images, "variants": variants,
        })
        print(f"{pid}: {len(variants)} variant(s), {len(images)} image(s)")

    life = {}
    for key, mid in LIFESTYLE.items():
        if DOWNLOAD:
            fetch(wix_webp(mid, 1800, 1800), os.path.join(IMG_DIR, "life", key + "-1800.webp"))
            fetch(wix_webp(mid, 900, 900), os.path.join(IMG_DIR, "life", key + "-900.webp"))
        life[key] = f"/img/life/{key}"

    catalog = {
        "categories": [
            {"id": c, "label": l, "headline": h, "lede": d, "image": life[img]}
            for c, l, h, d, img in CATEGORIES
        ],
        "products": out_products,
        "lifestyle": life,
    }
    dest = os.path.join(SITE, "src", "data", "catalog.json")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as fh:
        json.dump(catalog, fh, ensure_ascii=False, indent=1)
    print("wrote", dest, len(out_products), "products")


if __name__ == "__main__":
    main()
