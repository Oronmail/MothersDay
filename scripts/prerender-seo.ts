import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { faqItems } from "../src/content/faq";

type BodyLink = { href: string; label: string };

type StaticRoute = {
  route: string;
  title: string;
  description: string;
  type?: "website" | "product" | "article";
  image?: string;
  structuredData?: Record<string, unknown>;
  /** App/account routes that must not be indexed (no canonical, robots noindex). */
  noindex?: boolean;
  /** Static HTML injected into #root so crawlers that don't run JS (most AI bots) see real content. */
  bodyHtml?: string;
};

import { getProductReviews } from "../src/data/productReviews";

type ProductRow = {
  handle: string;
  title: string;
  description_html: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string | null;
  price: number | null;
  vendor: string | null;
  is_bundle: boolean | null;
  product_images?: Array<{
    url: string;
    alt_text: string | null;
    position: number | null;
  }>;
  product_variants?: Array<{
    price: number | null;
    available_for_sale: boolean | null;
    sort_order: number | null;
  }>;
};

/** store_settings rows the checkout uses; the same numbers the /shipping page shows. */
type ShippingSettings = {
  shippingCost: number;
  freeShippingThreshold: number;
};

/** An approved row from the `reviews` table (what useApprovedReviews renders). */
type SiteReviewRow = {
  product_handle: string;
  rating: number;
  body: string;
  name: string;
  created_at: string;
};

/** One review in the shape both sources (curated + site) reduce to for JSON-LD. */
type SchemaReview = {
  name: string;
  rating: number;
  body: string;
  datePublished?: string;
};

type CollectionRow = {
  handle: string;
  title: string;
  description: string | null;
  image_url: string | null;
  updated_at: string | null;
};

// Resolved in main() AFTER .env files load, so a local VITE_SITE_URL is honored.
let siteUrl = "https://www.mothersday.co.il";
let defaultImage = `${siteUrl}/logo.png`;
let instagramUrl = "";

const siteName = "יום האם";
const supportEmail = "support@mothersday.co.il";
const supportPhone = "+972548024059";
const distDir = path.join(process.cwd(), "dist");
const distIndexPath = path.join(distDir, "index.html");

const loadEnvFile = async (filename: string) => {
  const filePath = path.join(process.cwd(), filename);

  try {
    const content = await fs.readFile(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value.replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // Ignore missing env files.
  }
};

const collectionDescriptionMap: Record<string, string> = {
  frontpage:
    "מוצרי התכנון לאימהות של יום האם עוזרים לעשות סדר בשבוע, לחדד סדרי עדיפויות וליצור שגרה שמתאימה למשפחה שלך.",
  "מוצרי-תכנון-שבועיים":
    "מוצרי התכנון השבועיים של יום האם נועדו לעזור לאימהות לתכנן את השבוע, לנהל עומס ולהישאר בשליטה גם בתוך שגרה עמוסה.",
  "מוצרי-תכנון-משלימים":
    "מוצרי התכנון המשלימים של יום האם משלימים את חוויית התכנון המשפחתית, מהמשימות הקטנות של היום ועד לארגון הבית כולו.",
  "מארזים":
    "מארזי התכנון של יום האם מרכזים יחד מוצרים משלימים במחיר משתלם, כדי לתת לאימהות פתרון שלם ומעוצב לניהול הבית והזמן.",
};

const stripHtml = (value: string | null | undefined) =>
  (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, max = 220) =>
  value.length <= max ? value : `${value.slice(0, max - 1).trim()}…`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// encodeURI percent-encodes Hebrew route segments (product/collection handles)
// so canonical/og/JSON-LD URLs are valid URLs, not raw Unicode paths.
const absoluteUrl = (route: string) =>
  route === "/" ? siteUrl : encodeURI(`${siteUrl}${route}`);

const NAV_LINKS: BodyLink[] = [
  { href: "/products", label: "כל המוצרים" },
  { href: "/sets", label: "מארזים" },
  { href: "/about", label: "אודות" },
  { href: "/blog", label: "בלוג" },
  { href: "/support", label: "שירות לקוחות ושאלות נפוצות" },
  { href: "/shipping", label: "משלוחים" },
];

const renderLinkList = (links: BodyLink[]) =>
  `<ul style="list-style:none;padding:0;margin:16px 0;display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:center">${links
    .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
    .join("")}</ul>`;

// Plain, minimally-styled content. React replaces it on hydration; until then
// (and for non-JS crawlers - most AI bots) this is the page.
const renderStaticBody = (opts: {
  heading: string;
  paragraphs?: string[];
  sections?: Array<{ heading: string; text: string }>;
  links?: BodyLink[];
  includeNav?: boolean;
}) => {
  const parts: string[] = [];
  parts.push(`<h1 style="font-size:1.5rem;font-weight:500">${escapeHtml(opts.heading)}</h1>`);
  for (const paragraph of opts.paragraphs || []) {
    parts.push(`<p style="line-height:1.7">${escapeHtml(paragraph)}</p>`);
  }
  for (const section of opts.sections || []) {
    parts.push(`<h2 style="font-size:1.1rem;font-weight:500;margin-top:20px">${escapeHtml(section.heading)}</h2>`);
    parts.push(`<p style="line-height:1.7">${escapeHtml(section.text)}</p>`);
  }
  if (opts.links?.length) {
    parts.push(renderLinkList(opts.links));
  }
  if (opts.includeNav) {
    parts.push(renderLinkList(NAV_LINKS));
  }
  return `<div class="prerender-content" dir="rtl" lang="he" style="max-width:760px;margin:0 auto;padding:40px 20px;text-align:center">${parts.join(
    ""
  )}</div>`;
};

const organizationStructuredData = () => ({
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: siteName,
  alternateName: "Yom Ha'Em - Mother's Day",
  description: "מותג מוצרי תכנון איכותיים לאימהות",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  email: supportEmail,
  telephone: supportPhone,
  ...(instagramUrl ? { sameAs: [instagramUrl] } : {}),
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: supportEmail,
    telephone: supportPhone,
    availableLanguage: ["Hebrew"],
  },
});

const articleStructuredData = (route: string, headline: string, description: string) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline,
  description,
  inLanguage: "he",
  mainEntityOfPage: absoluteUrl(route),
  image: defaultImage,
  author: { "@type": "Organization", name: siteName, url: siteUrl },
  publisher: {
    "@type": "Organization",
    name: siteName,
    logo: { "@type": "ImageObject", url: `${siteUrl}/logo.png` },
  },
});

const buildStaticRoutes = (products: ProductRow[]): StaticRoute[] => {
  const productPrice = (product: ProductRow) => {
    const variants = [...(product.product_variants || [])].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );
    return variants[0]?.price ?? product.price ?? null;
  };

  const productLink = (product: ProductRow): BodyLink => {
    const price = productPrice(product);
    return {
      href: `/product/${product.handle}`,
      label: price ? `${product.title} - ${price} ₪` : product.title,
    };
  };

  const productLinks = products.map(productLink);
  // Bundles are flagged in the DB (products.is_bundle) - never inferred from the title.
  const setLinks = products.filter((p) => p.is_bundle).map(productLink);

  const productItemList = (routeUrl: string, name: string, rows: ProductRow[]) => ({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: routeUrl,
    itemListElement: rows.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.title,
      url: absoluteUrl(`/product/${product.handle}`),
    })),
  });

  return [
    {
      route: "/",
      title: "יום האם | מוצרי תכנון לאימהות",
      description:
        "לוחות, מחברות ובלוקי תכנון מעוצבים, שעוזרים לאימהות לדייק את היום, את השבוע ואת הזמן שלהן.",
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          organizationStructuredData(),
          {
            "@type": "WebSite",
            "@id": `${siteUrl}/#website`,
            name: siteName,
            alternateName: ["Mother's Day", "יום האם Mother's Day"],
            url: siteUrl,
            inLanguage: "he",
            publisher: { "@id": `${siteUrl}/#organization` },
          },
        ],
      },
      bodyHtml: renderStaticBody({
        heading: "יום האם - מוצרי תכנון לאימהות",
        paragraphs: [
          "לוחות, מחברות ובלוקי תכנון מעוצבים, שעוזרים לאימהות לדייק את היום, את השבוע ואת הזמן שלהן.",
          "יום האם הוא מותג מוצרי תכנון עם מטרה ברורה: לעזור לאימהות לדייק את היום, את השבוע ואת הזמן.",
        ],
        links: productLinks,
        includeNav: true,
      }),
    },
    {
      route: "/products",
      title: `כל המוצרים | ${siteName}`,
      description:
        "כל מוצרי התכנון של יום האם במקום אחד. מחברות, לוחות, בלוקים ומוצרים משלימים לאימהות שמבקשות יותר סדר, בהירות ושליטה ביום-יום.",
      structuredData: productItemList(absoluteUrl("/products"), "כל המוצרים של יום האם", products),
      bodyHtml: renderStaticBody({
        heading: "כל המוצרים",
        paragraphs: [
          "כל מוצרי התכנון של יום האם במקום אחד. מחברות, לוחות, בלוקים ומוצרים משלימים לאימהות שמבקשות יותר סדר, בהירות ושליטה ביום-יום.",
        ],
        links: productLinks,
        includeNav: true,
      }),
    },
    {
      route: "/sets",
      title: `כל המארזים | ${siteName}`,
      description:
        "מארזי התכנון של יום האם מרכזים יחד מוצרים משלימים במחיר משתלם, כדי לתת לאימהות פתרון שלם ומעוצב לניהול הבית והזמן.",
      structuredData: productItemList(
        absoluteUrl("/sets"),
        "מארזי התכנון של יום האם",
        products.filter((p) => p.is_bundle)
      ),
      bodyHtml: renderStaticBody({
        heading: "כל המארזים",
        paragraphs: [
          "מארזי התכנון של יום האם מרכזים יחד מוצרים משלימים במחיר משתלם, כדי לתת לאימהות פתרון שלם ומעוצב לניהול הבית והזמן.",
        ],
        links: setLinks,
        includeNav: true,
      }),
    },
    {
      route: "/about",
      title: `אודות | ${siteName}`,
      description:
        "הסיפור מאחורי יום האם: איך נולד מותג מוצרי התכנון לאימהות, מה מייחד את השיטה, ולמה המוצרים נבנו במיוחד לחיי המשפחה האמיתיים.",
      bodyHtml: renderStaticBody({
        heading: "אודות יום האם",
        paragraphs: [
          "הסיפור מאחורי יום האם: איך נולד מותג מוצרי התכנון לאימהות, מה מייחד את השיטה, ולמה המוצרים נבנו במיוחד לחיי המשפחה האמיתיים.",
        ],
        includeNav: true,
      }),
    },
    {
      route: "/blog",
      title: `בלוג | ${siteName}`,
      description:
        "הבלוג של יום האם על תכנון, ניהול זמן ואימהות. מחשבות, תובנות וכלים שעוזרים לעשות יותר סדר ביומיום המשפחתי.",
      type: "article",
      bodyHtml: renderStaticBody({
        heading: "הבלוג של יום האם",
        paragraphs: [
          "הבלוג של יום האם על תכנון, ניהול זמן ואימהות. מחשבות, תובנות וכלים שעוזרים לעשות יותר סדר ביומיום המשפחתי.",
        ],
        links: [
          { href: "/content-1", label: "האמא של היום היא לא האמא של פעם" },
          { href: "/content-2", label: "חלוקת זמן לאימהות" },
          { href: "/content-3", label: "תכנון ביום האם" },
        ],
        includeNav: true,
      }),
    },
    {
      route: "/support",
      title: `תמיכה ושירות לקוחות | ${siteName}`,
      description:
        "שירות הלקוחות של יום האם. שאלות נפוצות, יצירת קשר בוואטסאפ, בטלפון או במייל, ומענה על משלוחים, החזרות והתאמת מוצרים.",
      structuredData: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      bodyHtml: renderStaticBody({
        heading: "שירות לקוחות",
        paragraphs: [
          `אנחנו כאן בשבילך: וואטסאפ, טלפון ${supportPhone.replace("+972", "0")} או מייל ${supportEmail}.`,
        ],
        sections: faqItems.map((item) => ({ heading: item.question, text: item.answer })),
        includeNav: true,
      }),
    },
    {
      route: "/shipping",
      title: `משלוחים | ${siteName}`,
      description: "כל המידע על אפשרויות המשלוח, זמני האספקה ועלויות המשלוח של יום האם.",
      bodyHtml: renderStaticBody({
        heading: "מידע על משלוחים",
        paragraphs: ["כל המידע על אפשרויות המשלוח, זמני האספקה ועלויות המשלוח של יום האם."],
        includeNav: true,
      }),
    },
    {
      route: "/returns",
      title: `החזרות וביטולים | ${siteName}`,
      description: "מדיניות ההחזרות והביטולים של יום האם, כולל תנאים, לוחות זמנים ודרכי יצירת קשר.",
      bodyHtml: renderStaticBody({
        heading: "החזרות וביטולים",
        paragraphs: ["מדיניות ההחזרות והביטולים של יום האם, כולל תנאים, לוחות זמנים ודרכי יצירת קשר."],
        includeNav: true,
      }),
    },
    {
      route: "/privacy",
      title: `מדיניות פרטיות | ${siteName}`,
      description:
        "מדיניות הפרטיות של יום האם: איך אנחנו שומרים על המידע שלך, באילו נתונים נעשה שימוש ומהן הזכויות שלך.",
    },
    {
      route: "/terms",
      title: `תקנון האתר | ${siteName}`,
      description: "תקנון האתר של יום האם, כולל תנאי שימוש, הזמנות, תשלומים, משלוחים, ביטולים ושירות לקוחות.",
    },
    {
      route: "/content-1",
      title: `האמא של היום היא לא האמא של פעם | ${siteName}`,
      description:
        "פוסט מתוך הבלוג של יום האם על המורכבות של האימהות המודרנית, הפער בין הדורות, ולמה תכנון הוא כבר לא מותרות אלא צורך.",
      type: "article",
      structuredData: articleStructuredData(
        "/content-1",
        "האמא של היום היא לא האמא של פעם",
        "פוסט מתוך הבלוג של יום האם על המורכבות של האימהות המודרנית, הפער בין הדורות, ולמה תכנון הוא כבר לא מותרות אלא צורך."
      ),
      bodyHtml: renderStaticBody({
        heading: "האמא של היום היא לא האמא של פעם",
        paragraphs: [
          "פוסט מתוך הבלוג של יום האם על המורכבות של האימהות המודרנית, הפער בין הדורות, ולמה תכנון הוא כבר לא מותרות אלא צורך.",
        ],
        links: [{ href: "/blog", label: "לכל הפוסטים בבלוג" }],
        includeNav: true,
      }),
    },
    {
      route: "/content-2",
      title: `חלוקת זמן לאימהות | ${siteName}`,
      description:
        "פוסט של יום האם על חלוקת זמן, סדרי עדיפויות ואיך אימהות יכולות לתכנן את הזמן שלהן מתוך בחירה מודעת ולא מתוך תגובה מתמדת לעומס.",
      type: "article",
      structuredData: articleStructuredData(
        "/content-2",
        "חלוקת זמן לאימהות",
        "פוסט של יום האם על חלוקת זמן, סדרי עדיפויות ואיך אימהות יכולות לתכנן את הזמן שלהן מתוך בחירה מודעת ולא מתוך תגובה מתמדת לעומס."
      ),
      bodyHtml: renderStaticBody({
        heading: "חלוקת זמן לאימהות",
        paragraphs: [
          "פוסט של יום האם על חלוקת זמן, סדרי עדיפויות ואיך אימהות יכולות לתכנן את הזמן שלהן מתוך בחירה מודעת ולא מתוך תגובה מתמדת לעומס.",
        ],
        links: [{ href: "/blog", label: "לכל הפוסטים בבלוג" }],
        includeNav: true,
      }),
    },
    {
      route: "/content-3",
      title: `תכנון ביום האם | ${siteName}`,
      description:
        "פוסט של יום האם על המשמעות של תכנון באימהות: יצירת ודאות, גבולות, שגרה ושקט בתוך חיי משפחה עמוסים.",
      type: "article",
      structuredData: articleStructuredData(
        "/content-3",
        "תכנון ביום האם",
        "פוסט של יום האם על המשמעות של תכנון באימהות: יצירת ודאות, גבולות, שגרה ושקט בתוך חיי משפחה עמוסים."
      ),
      bodyHtml: renderStaticBody({
        heading: "תכנון ביום האם",
        paragraphs: [
          "פוסט של יום האם על המשמעות של תכנון באימהות: יצירת ודאות, גבולות, שגרה ושקט בתוך חיי משפחה עמוסים.",
        ],
        links: [{ href: "/blog", label: "לכל הפוסטים בבלוג" }],
        includeNav: true,
      }),
    },
    // App/account routes: without a shell they'd be served the homepage shell
    // (index,follow + homepage canonical) by the SPA rewrite. Explicit noindex.
    { route: "/checkout", title: `תשלום | ${siteName}`, description: "השלמת הזמנה באתר יום האם.", noindex: true },
    { route: "/profile", title: `האזור האישי | ${siteName}`, description: "ניהול החשבון שלך באתר יום האם.", noindex: true },
    { route: "/orders", title: `ההזמנות שלי | ${siteName}`, description: "היסטוריית ההזמנות שלך באתר יום האם.", noindex: true },
    { route: "/wishlist", title: `ווישליסט | ${siteName}`, description: "המוצרים ששמרת באתר יום האם.", noindex: true },
    { route: "/auth", title: `התחברות | ${siteName}`, description: "התחברות והרשמה לאתר יום האם.", noindex: true },
    { route: "/reset-password", title: `איפוס סיסמה | ${siteName}`, description: "איפוס סיסמה לחשבון יום האם.", noindex: true },
    { route: "/admin/login", title: `כניסת ניהול | ${siteName}`, description: "כניסה לממשק הניהול של יום האם.", noindex: true },
  ];
};

const upsertTag = (
  html: string,
  pattern: RegExp,
  replacement: string,
  fallback: string
) => (pattern.test(html) ? html.replace(pattern, replacement) : html.replace("</head>", `${fallback}\n</head>`));

const applySeoToHtml = (template: string, route: string, meta: StaticRoute) => {
  const pageUrl = absoluteUrl(route);
  const imageUrl = meta.image || defaultImage;
  const ogType = meta.type || "website";
  const robots = meta.noindex ? "noindex,follow" : "index,follow";

  let html = template;
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(meta.title)}</title>`);
  html = upsertTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<meta name="description" content="${escapeHtml(meta.description)}">`
  );
  html = upsertTag(
    html,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${robots}">`,
    `<meta name="robots" content="${robots}">`
  );
  // No canonical in the ROOT shell (dist/index.html): Vercel's SPA rewrite
  // serves that same file for any route without its own prerendered shell
  // (e.g. a product added after the last deploy). A homepage canonical there
  // would tell crawlers every such page IS the homepage - a missing canonical
  // is safer than a wrong one. The client-side <SEO> component sets the
  // correct canonical on hydration for all routes, homepage included.
  if (!meta.noindex && route !== "/") {
    html = upsertTag(
      html,
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(pageUrl)}">`,
      `<link rel="canonical" href="${escapeHtml(pageUrl)}">`
    );
  }
  html = upsertTag(
    html,
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:type" content="${ogType}" />`
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}">`
  );
  if (imageUrl === defaultImage) {
    // The brand logo is a known 778x778 PNG; explicit dimensions help link
    // previews render on the first share (before the image is fetched).
    html = upsertTag(
      html,
      /<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image:width" content="778">`,
      `<meta property="og:image:width" content="778">`
    );
    html = upsertTag(
      html,
      /<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image:height" content="778">`,
      `<meta property="og:image:height" content="778">`
    );
    html = upsertTag(
      html,
      /<meta\s+property="og:image:type"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image:type" content="image/png">`,
      `<meta property="og:image:type" content="image/png">`
    );
  }
  html = upsertTag(
    html,
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:alt" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(meta.title)}">`
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:site_name"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}">`,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}">`
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:locale" content="he_IL" />`,
    `<meta property="og:locale" content="he_IL" />`
  );
  html = upsertTag(
    html,
    /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:card" content="summary_large_image">`
  );
  html = upsertTag(
    html,
    /<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:url" content="${escapeHtml(pageUrl)}">`,
    `<meta name="twitter:url" content="${escapeHtml(pageUrl)}">`
  );
  html = upsertTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`
  );
  html = upsertTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`
  );
  html = upsertTag(
    html,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`
  );

  html = html.replace(
    /<script type="application\/ld\+json" data-prerender-structured="true">[\s\S]*?<\/script>\n?/g,
    ""
  );

  if (meta.structuredData) {
    const structuredTag = `<script type="application/ld+json" data-prerender-structured="true">${JSON.stringify(
      meta.structuredData
    )}</script>`;
    html = html.replace("</head>", `${structuredTag}\n</head>`);
  }

  if (meta.bodyHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root">${meta.bodyHtml}</div>`);
  }

  return html;
};

const writeRouteHtml = async (route: string, html: string) => {
  const normalizedRoute = route === "/" ? "" : route.replace(/^\/+/, "");
  const routeDir = path.join(distDir, normalizedRoute);
  await fs.mkdir(routeDir, { recursive: true });
  const filePath = route === "/" ? distIndexPath : path.join(routeDir, "index.html");
  await fs.writeFile(filePath, html, "utf8");
};

const getSupabaseClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // Public catalog reads only - prefer the anon key (RLS allows public SELECT);
  // the service key is a fallback for environments that only define it.
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_Secret_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const fetchProducts = async (): Promise<ProductRow[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("[prerender-seo] Missing Supabase env vars, skipping dynamic product prerender.");
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("handle,title,description_html,seo_title,seo_description,updated_at,price,vendor,is_bundle,product_images(url,alt_text,position),product_variants(price,available_for_sale,sort_order)")
    .eq("status", "active")
    .order("title");

  if (error) {
    console.warn("[prerender-seo] Failed to fetch products:", error.message);
    return [];
  }

  return (data || []) as ProductRow[];
};

const DEFAULT_SHIPPING: ShippingSettings = { shippingCost: 35, freeShippingThreshold: 350 };

const fetchShippingSettings = async (): Promise<ShippingSettings> => {
  const supabase = getSupabaseClient();
  if (!supabase) return DEFAULT_SHIPPING;

  const { data, error } = await supabase
    .from("store_settings")
    .select("key,value")
    .in("key", ["shipping_cost", "free_shipping_threshold"]);

  if (error || !data) {
    console.warn("[prerender-seo] Failed to fetch store_settings, using defaults:", error?.message);
    return DEFAULT_SHIPPING;
  }

  const numberFor = (key: string, fallback: number) => {
    const raw = data.find((row) => row.key === key)?.value;
    const value = typeof raw === "string" ? Number(raw) : raw;
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  };

  return {
    shippingCost: numberFor("shipping_cost", DEFAULT_SHIPPING.shippingCost),
    freeShippingThreshold: numberFor("free_shipping_threshold", DEFAULT_SHIPPING.freeShippingThreshold),
  };
};

// Approved reviews only - the same rows the product page shows. If the reviews
// migration hasn't been applied the query fails and we simply emit no reviews.
const fetchApprovedReviews = async (): Promise<Map<string, SchemaReview[]>> => {
  const byHandle = new Map<string, SchemaReview[]>();
  const supabase = getSupabaseClient();
  if (!supabase) return byHandle;

  const { data, error } = await supabase
    .from("reviews")
    .select("product_handle,rating,body,name,created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[prerender-seo] Skipping site reviews:", error.message);
    return byHandle;
  }

  for (const row of (data || []) as SiteReviewRow[]) {
    const list = byHandle.get(row.product_handle) || [];
    list.push({
      name: row.name,
      rating: row.rating,
      body: row.body,
      datePublished: row.created_at.slice(0, 10),
    });
    byHandle.set(row.product_handle, list);
  }
  return byHandle;
};

/**
 * Review markup for a product: curated focus-group reviews first (as on the
 * page), then approved site reviews. Google requires marked-up reviews to be
 * visible on the page and ratings to come from real users - with neither
 * source populated this emits nothing, and GSC keeps flagging the missing
 * (optional) fields until real reviews exist. Never invent ratings here.
 */
const reviewStructuredData = (handle: string, siteReviews: SchemaReview[]) => {
  const curated: SchemaReview[] = getProductReviews(handle).map((review) => ({
    name: review.name,
    rating: review.rating,
    body: review.quote,
  }));
  const reviews = [...curated, ...siteReviews].filter(
    (review) => review.rating >= 1 && review.rating <= 5 && review.body.trim()
  );
  if (!reviews.length) return {};

  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Math.round(average * 10) / 10,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.name },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.body,
      ...(review.datePublished ? { datePublished: review.datePublished } : {}),
    })),
  };
};

// Mirrors /shipping: packed within 1-3 business days, delivered within 7 business
// days of order confirmation (Israeli business days, Sun-Thu), 35 ₪ under the
// free-shipping threshold. The rate is per single-item order of this product.
const shippingDetailsStructuredData = (price: number, shipping: ShippingSettings) => ({
  "@type": "OfferShippingDetails",
  shippingRate: {
    "@type": "MonetaryAmount",
    value: price >= shipping.freeShippingThreshold ? 0 : shipping.shippingCost,
    currency: "ILS",
  },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: "IL" },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 4, unitCode: "DAY" },
    businessDays: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "https://schema.org/Sunday",
        "https://schema.org/Monday",
        "https://schema.org/Tuesday",
        "https://schema.org/Wednesday",
        "https://schema.org/Thursday",
      ],
    },
  },
});

// Mirrors /returns: 14 days from delivery, full refund, no cancellation fee; on a
// change-of-mind return the customer ships it back at her own cost.
const returnPolicyStructuredData = () => ({
  "@type": "MerchantReturnPolicy",
  applicableCountry: "IL",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 14,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  refundType: "https://schema.org/FullRefund",
  merchantReturnLink: absoluteUrl("/returns"),
});

const getProductRoutes = (
  products: ProductRow[],
  shipping: ShippingSettings,
  siteReviews: Map<string, SchemaReview[]>
): StaticRoute[] =>
  products.map((product) => {
    const fullDescription =
      product.seo_description ||
      stripHtml(product.description_html) ||
      `מוצר תכנון איכותי לאימהות מבית יום האם.`;
    const description = truncate(fullDescription);
    const title = `${product.seo_title || product.title} | ${siteName}`;
    const sortedImages = [...(product.product_images || [])].sort(
      (a, b) => (a.position || 0) - (b.position || 0)
    );
    const image = sortedImages[0]?.url || defaultImage;
    const variants = [...(product.product_variants || [])].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );
    const firstVariant = variants[0];
    const price = firstVariant?.price ?? product.price ?? 0;
    const available = firstVariant?.available_for_sale !== false;
    const pageUrl = absoluteUrl(`/product/${product.handle}`);

    return {
      route: `/product/${product.handle}`,
      title,
      description,
      image,
      type: "product" as const,
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product",
            name: product.title,
            description,
            image: sortedImages.length
              ? sortedImages.slice(0, 3).map((img) => img.url)
              : image,
            brand: { "@type": "Brand", name: siteName },
            url: pageUrl,
            ...reviewStructuredData(product.handle, siteReviews.get(product.handle) || []),
            offers: {
              "@type": "Offer",
              price,
              priceCurrency: "ILS",
              availability: available
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url: pageUrl,
              shippingDetails: shippingDetailsStructuredData(price, shipping),
              hasMerchantReturnPolicy: returnPolicyStructuredData(),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "דף הבית",
                item: siteUrl,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "כל המוצרים",
                item: absoluteUrl("/products"),
              },
              {
                "@type": "ListItem",
                position: 3,
                name: product.title,
                item: pageUrl,
              },
            ],
          },
        ],
      },
      bodyHtml: renderStaticBody({
        heading: product.title,
        paragraphs: [
          price ? `מחיר: ${price} ₪ · ${available ? "במלאי" : "אזל מהמלאי"}` : available ? "במלאי" : "אזל מהמלאי",
          fullDescription,
        ],
        links: [
          { href: "/products", label: "לכל המוצרים" },
          { href: "/sets", label: "לכל המארזים" },
        ],
        includeNav: true,
      }),
    };
  });

const fetchCollections = async (): Promise<CollectionRow[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("[prerender-seo] Missing Supabase env vars, skipping dynamic collection prerender.");
    return [];
  }

  const { data, error } = await supabase
    .from("collections")
    .select("handle,title,description,image_url,updated_at")
    .eq("is_published", true);

  if (error) {
    console.warn("[prerender-seo] Failed to fetch collections:", error.message);
    return [];
  }

  return (data || []) as CollectionRow[];
};

const getCollectionRoutes = (collections: CollectionRow[]): StaticRoute[] =>
  collections
    .filter((collection) => collection.handle !== "הכל")
    .map((collection) => {
      const description = truncate(
        collection.description ||
          collectionDescriptionMap[collection.handle] ||
          `קולקציית ${collection.title} של יום האם עם מוצרי תכנון איכותיים לאימהות.`
      );
      const pageUrl = absoluteUrl(`/collection/${collection.handle}`);

      return {
        route: `/collection/${collection.handle}`,
        title: `${collection.title} | ${siteName}`,
        description,
        image: collection.image_url || defaultImage,
        structuredData: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "דף הבית",
              item: siteUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: collection.title,
              item: pageUrl,
            },
          ],
        },
        bodyHtml: renderStaticBody({
          heading: collection.title,
          paragraphs: [description],
          links: [{ href: "/products", label: "לכל המוצרים" }],
          includeNav: true,
        }),
      };
    });

// llms-full.txt - the expanded companion to public/llms.txt (llmstxt.org
// convention). Regenerated on every build so AI crawlers and answer engines
// quote live product names, prices and URLs instead of guessing.
const writeLlmsFullTxt = async (
  products: ProductRow[],
  collections: CollectionRow[]
) => {
  const salePrice = (product: ProductRow): number | null => {
    const variants = [...(product.product_variants || [])].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );
    return variants[0]?.price ?? product.price ?? null;
  };

  const productEntry = (product: ProductRow): string => {
    const price = salePrice(product);
    const variants = product.product_variants || [];
    const available =
      variants.length === 0 || variants.some((v) => v.available_for_sale);
    const description = truncate(
      product.seo_description || stripHtml(product.description_html),
      300
    );
    const lines = [
      `### ${product.title}${price ? ` — ${price} ₪` : ""}`,
      `- קישור לרכישה: ${absoluteUrl(`/product/${product.handle}`)}`,
      `- זמינות: ${available ? "במלאי" : "אזל מהמלאי"}`,
    ];
    // The flagship product (same marker as api/sitemap.ts)
    if (product.handle === "מחברת-יום-האם") {
      lines.push(`- מוצר הדגל של המותג`);
    }
    if (description) {
      lines.push(`- תיאור: ${description}`);
    }
    return lines.join("\n");
  };

  const singles = products.filter((p) => !p.is_bundle);
  const bundles = products.filter((p) => p.is_bundle);

  const sections = [
    `# יום האם (Yom Ha'Em) — קטלוג מלא`,
    [
      `> "יום האם" (mothersday.co.il) הוא מותג ישראלי של מוצרי נייר ותכנון לאימהות: לוחות תכנון שבועיים, מחברות ניהול משימות, בלוקי תכנון ומארזים מעוצבים. המוצרים נמכרים באתר הרשמי בלבד: ${siteUrl}`,
      ``,
      `> Yom Ha'Em ("Mother's Day") is an Israeli brand of Hebrew planning products for mothers, sold exclusively at ${siteUrl}. This file is regenerated on every deploy - names, prices (in ILS) and availability below are current.`,
    ].join("\n"),
    `## מוצרים\n\n${singles.map(productEntry).join("\n\n")}`,
    bundles.length
      ? `## מארזים\n\n${bundles.map(productEntry).join("\n\n")}`
      : "",
    collections.length
      ? `## קטגוריות\n\n${collections
          .filter((c) => c.handle !== "הכל")
          .map(
            (c) =>
              `- [${c.title}](${absoluteUrl(`/collection/${c.handle}`)})${
                c.description ? `: ${truncate(c.description, 160)}` : ""
              }`
          )
          .join("\n")}`
      : "",
    [
      `## פרטים חשובים`,
      ``,
      `- משלוח: 35 ₪ לכל הארץ, חינם בהזמנה מעל 350 ₪; אספקה בדרך כלל עד 7 ימי עסקים`,
      `- תשלום: כרטיס אשראי בעמוד סליקה מאובטח של PayPlus`,
      `- החזרות: עד 14 יום מקבלת ההזמנה, בתנאי שהמוצר לא נפתח`,
      `- שירות לקוחות: support@mothersday.co.il · 054-8024059 · ${absoluteUrl("/support")}`,
      `- מידע תמציתי על המותג: ${siteUrl}/llms.txt`,
    ].join("\n"),
  ].filter(Boolean);

  await fs.writeFile(
    path.join(distDir, "llms-full.txt"),
    `${sections.join("\n\n")}\n`,
    "utf8"
  );
};

async function main() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");

  siteUrl = (process.env.VITE_SITE_URL || "https://www.mothersday.co.il").replace(/\/$/, "");
  defaultImage = `${siteUrl}/logo.png`;
  instagramUrl = process.env.VITE_INSTAGRAM_URL?.trim() || "";

  const template = await fs.readFile(distIndexPath, "utf8");
  const products = await fetchProducts();
  const collections = await fetchCollections();
  const shipping = await fetchShippingSettings();
  const siteReviews = await fetchApprovedReviews();
  const allRoutes = [
    ...buildStaticRoutes(products),
    ...getProductRoutes(products, shipping, siteReviews),
    ...getCollectionRoutes(collections),
  ];

  for (const routeMeta of allRoutes) {
    const html = applySeoToHtml(template, routeMeta.route, routeMeta);
    await writeRouteHtml(routeMeta.route, html);
  }

  await writeLlmsFullTxt(products, collections);

  console.log(
    `[prerender-seo] Generated ${allRoutes.length} prerendered route shells with route-specific SEO + llms-full.txt.`
  );
}

main().catch((error) => {
  console.error("[prerender-seo] Failed:", error);
  process.exit(1);
});
