/**
 * Verified brand facts, sourced from content/pages/*.md (live albaveda.com).
 * Where the live site disagrees with itself, the choice is noted.
 */

export const company = {
  legalName: "Albatross Herbals India Pvt. Ltd.",
  founded: 1991,
  address: ["J-79, Sector 2, DSIIDC", "Bawana Industrial Area", "New Delhi, India – 110039"],
  // Contact page spelling. The live footer misspells the domain (albatrosssnaturals).
  email: "info@albatrossnaturals.com",
  phones: [
    { label: "Tel", number: "+91-9990805005" },
    { label: "Other", number: "+91-9811360223" },
    { label: "Office", number: "+91-9891866174" },
  ],
  hours: "Monday – Saturday, 9am – 9pm",
};

export const social = [
  { label: "Instagram", handle: "@albaveda", href: "https://www.instagram.com/albaveda/" },
  { label: "Facebook", handle: "albavedaindia", href: "https://www.facebook.com/albavedaindia/" },
  { label: "YouTube", handle: "albaindia1", href: "https://www.youtube.com/user/albaindia1" },
  { label: "X / Twitter", handle: "@albaveda", href: "https://twitter.com/albaveda" },
];

export const marketplaces = [
  { label: "Amazon.in", href: "https://www.amazon.in/s?me=A2X3C290U88HN4&marketplaceID=A21TJRUUN4KGV&redirect=true" },
  {
    label: "Flipkart",
    href: "https://www.flipkart.com/beauty-and-grooming/pr?count=40&otracker=categorytree&p[]=facets.brand%255B%255D%3DAlba&q=alba&sid=g9b",
  },
];

/**
 * Homepage offer banner reads "Free Delivery over Rs.500"; the Delivery &
 * Shipping Policy page says ₹1000 with a fee from ₹50 below that. The homepage
 * promotion is used here — confirm with the business before launch.
 */
export const FREE_DELIVERY_THRESHOLD = 500;

export const delivery = {
  processing: "Orders are processed within 48 hours",
  eta: "Usually 3 to 5 business days, depending on location",
  coverage: "We ship across India through well-known courier companies",
  returns: "Returns accepted within 4 days of delivery, unused and undamaged",
};

export const certifications = [
  { src: "/brand/ayush.webp", alt: "AYUSH certified", w: 260, h: 261 },
  { src: "/brand/gmp.webp", alt: "GMP certified", w: 300, h: 300 },
];

export const aboutCopy = {
  intro:
    "Today, the use of herbs (botanicals) is vital to the restoration of the human race. Their power to invoke the cleansing and regeneration process can’t be equaled by manufactured supplements or chemical medications.",
  mission: "We at Albatross herbals are striving to give the world the goodness of these herbs.",
  company:
    "Albatross Herbals India Pvt Ltd is a company established in 1991. We are a leading manufacturer, exporter & marketer of Ayurvedic, Herbal, Organic & devotional product lines. Presently Albatross has a global presence with products shipped and made available across the world.",
  vedas:
    "We at Albatross strive to deliver goodness of vedas through our products. Our products are made out of best quality ingredients which insures the efficacy of each and every product.",
  ayurveda:
    "Ayurveda, which literally means the science of life. Can heal and cure using the power of herbs. Similarly Essential oils are essence or extract of herbs and botanicals that can heal by Aroma Therapy or Application",
  devotion: "Herbs has tremendous amount of powerful energies that can make any environment divine",
};

export const brands = [
  {
    id: "alba",
    name: "Alba",
    logo: "/brand/alba-logo-trim.png",
    role: "Skin, hair, beauty & wellness",
    body: "Alba products are made from natural herbs.",
    href: "/shop",
    cta: "Shop Alba",
  },
  {
    id: "diva",
    name: "Diva",
    logo: "/brand/diva-logo-trim.webp",
    role: "Devotional products for pooja",
    body: "Diva offers devotional products for Pooja — hawan samagri and all-in-one pooja kits.",
    href: "/devotional",
    cta: "Shop Diva",
  },
  {
    id: "saar",
    name: "Saar",
    logo: "/brand/saar-logo-trim.webp",
    role: "Luxurious ayurveda & essential oils",
    body: "Saar showcases luxurious ayurveda and Essential Oils.",
    href: null,
    cta: "Coming soon",
  },
] as const;

/** Scroll-story chapters. Copy is quoted from each product's own description. */
export const chapters = [
  {
    productId: "moringa-powder",
    pack: "/img/pack/moringa-powder.webp",
    tint: "#5f8f3e",
    halo: "#9dbb6a",
    deva: "मोरिंगा",
    title: "Moringa",
    kicker: "From the leaf",
    quote: "Our Moringa is responsibly sourced from our own farms and local farmers, ensuring the highest quality.",
  },
  {
    productId: "shikakai-amla-reetha",
    pack: "/img/pack/shikakai-amla-reetha.webp",
    tint: "#7a3f7c",
    halo: "#c58ec0",
    deva: "आंवला · रीठा · शिकाकाई",
    title: "Amla, Reetha & Shikakai",
    kicker: "From the old remedies",
    quote:
      "Going back to Indian Ayurvedic practices, there are three ingredients that have been used in almost any hair related remedy. These ingredients are Amla, Reetha and Shikakai.",
  },
  {
    productId: "multani-mitti-carton",
    pack: "/img/pack/multani-mitti-carton.webp",
    tint: "#b4875a",
    halo: "#e8c79a",
    deva: "मुल्तानी मिट्टी",
    title: "Multani Mitti",
    kicker: "From the earth itself",
    quote:
      "Alba Multani Mitti is the purest and softest clay available with a silky texture. It has been used from times immemorial to draw out impurities from the skin.",
  },
] as const;

export const INTRO_PACK = chapters[0].pack;

/** Ingredient index — each herb links to the real product made from it. */
export const herbs = [
  { name: "Amla", deva: "आंवला", productId: "amla-powder" },
  { name: "Reetha", deva: "रीठा", productId: "reetha-powder" },
  { name: "Shikakai", deva: "शिकाकाई", productId: "shikakai-powder" },
  { name: "Bhringraj", deva: "भृंगराज", productId: "bhringraj-powder" },
  { name: "Henna", deva: "मेहंदी", productId: "herbal-henna" },
  { name: "Indigo", deva: "नील", productId: "indigo-powder" },
  { name: "Hibiscus", deva: "गुड़हल", productId: "hibiscus-powder" },
  { name: "Neem", deva: "नीम", productId: "neem-leaves-powder" },
  { name: "Tulsi", deva: "तुलसी", productId: "tulsi-powder" },
  { name: "Moringa", deva: "मोरिंगा", productId: "moringa-powder" },
  { name: "Ashwagandha", deva: "अश्वगंधा", productId: "ashwagandha-powder" },
  { name: "Mulethi", deva: "मुलेठी", productId: "mulethi-powder" },
  { name: "Chandan", deva: "चंदन", productId: "sandalwood-powder" },
  { name: "Multani Mitti", deva: "मुल्तानी मिट्टी", productId: "multani-mitti-jar" },
  { name: "Triphala", deva: "त्रिफला", productId: "triphala-powder" },
  { name: "Rosemary", deva: "रोज़मेरी", productId: "rosemary-powder" },
  { name: "Beetroot", deva: "चुकंदर", productId: "beetroot-powder" },
  { name: "Orange peel", deva: "संतरे का छिलका", productId: "orange-peel-powder" },
];

export const featuredIds = [
  "nikhar-ubtan",
  "herbal-henna",
  "bhringraj-powder",
  "multani-mitti-jar",
  "ubtan-facepack",
  "amla-powder",
  "tulsi-powder",
  "pooja-kit",
];
