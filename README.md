# Albaveda Draft Website

Remake of https://www.albaveda.com (currently a Wix store run by Albatross Herbals India Pvt Ltd).

## Step 1 — Content extraction (done, 2026-10-28)

| File | What it is |
|---|---|
| `albaveda-site-content.md` | Everything in one document: nav, footer, all 20 pages, full product catalog |
| `content/pages/*.md` | One markdown file per page (+ `_header-footer.md`) |
| `content/products.md` | Product catalog: summary table + full description per product |
| `content/products.json` | Same 45 products as structured data (name, price, stock, images, description) — ready to seed the new site |
| `scripts/extract_site.py` | HTML → markdown/JSON converter (stdlib only) |
| `scripts/assemble_content.py` | Builds `albaveda-site-content.md` from `content/` |

Re-run: download pages into a raw folder (`pages/`, `products/`, `urls.txt`), then
`python -I scripts/extract_site.py <raw_dir> content && python -I scripts/assemble_content.py content albaveda-site-content.md`

## Site at a glance

- **Brands:** Alba (skin, hair, beauty, wellness), Diva (devotional — pooja kits, hawan samagri), Saar (essential oils — "Coming Soon")
- **Company:** Albatross Herbals, est. 1991 — J-79, Sector 2, DSIIDC Bawana Industrial Area, New Delhi 110039
- **Contact:** info@albatrossnaturals.com · +91-9990805005 · +91-9811360223 · +91-9891866174 · Mon–Sat 9am–9pm
- **Catalog:** 45 products, ₹22.5–₹225, all in stock, 107 product images (Wix CDN)
- **Offers on homepage:** Free delivery over ₹500, 10% off all products
- **Also sold on:** Amazon.in, Flipkart · Social: Instagram @albaveda, Facebook albavedaindia, YouTube albaindia1
- **Trust badges:** AYUSH, GMP certified

## Issues on the live site worth fixing in the remake

- Footer email is misspelled (`albatrosssnaturals.com`, triple "s") vs contact page `albatrossnaturals.com`
- Phone numbers differ between footer, contact page and meta description
- Blog is empty ("No posts yet") and its social icons point to Wix's own accounts / Google+
- Saar page is just "Coming Soon"
- Three near-duplicate shop pages (`/shop`, `/shop-1`, `/shop-2`), slugs like `about-4-1`, `copy-of-…`, `demo`
- Typos: "persoal" (meta), "Usefull Links", "Welness"
- Duplicate product listings (e.g. two 3-in-1 Shikakai entries)
- JSON-LD `price` may be the sale price for discounted items — confirm against the shop pages (e.g. Moringa ₹110 → ₹99)

## Step 2 — The new site (`site/`, 2026-10-28)

Vite + React 19 + TypeScript, Three.js for the homepage stage. No backend.

```bash
cd site
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into site/dist
npm run preview    # serve the production build
```

Rebuild data/images from `content/` (downloads optimised WebP from the Wix CDN into `site/public/img`):

```bash
python -I scripts/build_catalog.py .                 # catalog.json, policies.json, product + lifestyle images
python scripts/make_pack_textures.py . moringa-powder shikakai-amla-reetha multani-mitti-carton   # needs Pillow
```

### Structure

| Path | What it is |
|---|---|
| `site/src/data/catalog.json` | Generated catalogue: 31 products, variants, prices, categories, descriptions |
| `site/src/data/site.ts` | Verified brand facts: contact, socials, marketplaces, story copy, chapters, herb index |
| `site/src/scene/BotanicalScene.ts` | The 3D stage: soil → moringa sprouts → leaf powder → real pack; scroll chapters |
| `site/src/components/StoryStage.tsx` | Hero + chapters; maps scroll to the scene; picks full / lite / static tier |
| `site/src/lib/cart.tsx` | Client-side bag (localStorage) |
| `site/src/pages/Checkout.tsx` | Order *request* by email — see "Not connected" below |
| `site/public/brand/` | Original logos (only transparent margins trimmed), AYUSH/GMP badges |
| `site/public/img/pack/` | Real carton fronts cropped from product photos — 3D textures |

### Experience tiers

- **full** — desktop: shadows, dense powder particles, DPR ≤ 2
- **lite** — phones/tablets/≤4 cores: no shadows, fewer particles and sprouts, DPR ≤ 1.5
- **static** — `prefers-reduced-motion`, Save-Data, no WebGL, or very weak hardware: the same real packs in a 2.5D layout that crossfades per chapter. Also used if the WebGL context is lost.

The intro plays on each full page load (≈5 s, skippable, copy and CTAs readable from ~0.3 s); returning to `/` inside the app shows the settled scene.

### Catalogue curation

- The 28 products that appear on live listing pages are the verified set; sale/regular prices come from those listings.
- Size variants only where the source slug states the size: Amla (100 g / 200 g), Nikhar Ubtan (100 g / 200 g / 225 g jar), Pooja Kit (Small / Large).
- Added from unlisted pages (distinct products): Nikhar Ubtan, Triphala, Pooja Kit Small, Multani Mitti 100 g carton.
- **Excluded** as duplicates or inconsistent: `3in1-…-100g`, `alba-multani-carton-pack`, `alba-triphala-powder-100g`, `copy-of-reetha-…-100gm` (₹72 for 100 g vs ₹63 for 200 g), `shikakai-…-100gm`, `herbal-henna-1kg`, `nikhar-ubtan-jar-450gm` (cheaper than the 225 g jar), `diva-hawan-samagri-100/200/500-g` (all ₹22.50).
- Old Wix URLs redirect: `/product-page/<slug>` → product (with size preselected), `/about-us`, `/ourbrands`, `/saar`, `/shop-1`, `/shop-2`, `/about-4*`, `/copy-of-return-cancellation-policy`.

### Not connected / needs the business

- **Payments:** there is no commerce backend. The bag, quantities and totals are real; "Review order" composes an email to info@albatrossnaturals.com (or the customer calls). Plug in Paytm/Razorpay + an order API to replace `Checkout.tsx`.
- **Free-delivery threshold conflict:** homepage says over ₹500, shipping policy says ₹1000 (fee from ₹50 below). The site uses ₹500 (`FREE_DELIVERY_THRESHOLD` in `site.ts`) and never charges a fee itself — confirm.
- **Logo resolution:** the only original Alba logo is 295 px. Fine at header size; a vector/large master would sharpen the footer and Retina screens.
- **Stock:** all items are "InStock" per source data; there is no live inventory.
- **Hosting:** it's a single-page app — the host must rewrite unknown paths to `index.html`.
