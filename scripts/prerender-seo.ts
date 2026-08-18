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

type ProductRow = {
  handle: string;
  title: string;
  description_html: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string | null;
  price: number | null;
  vendor: string | null;
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

const absoluteUrl = (route: string) =>
  route === "/" ? siteUrl : `${siteUrl}${route}`;

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
  const setLinks = products.filter((p) => p.title.startsWith("מארז")).map(productLink);

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
        products.filter((p) => p.title.startsWith("מארז"))
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
    { route: "/wishlist", title: `המועדפים שלי | ${siteName}`, description: "המוצרים ששמרת באתר יום האם.", noindex: true },
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
  if (!meta.noindex) {
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
  const supabaseKey =
    process.env.SUPABASE_Secret_KEY || process.env.VITE_SUPABASE_ANON_KEY;

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
    .select("handle,title,description_html,seo_title,seo_description,updated_at,price,vendor,product_images(url,alt_text,position),product_variants(price,available_for_sale,sort_order)")
    .eq("status", "active")
    .order("title");

  if (error) {
    console.warn("[prerender-seo] Failed to fetch products:", error.message);
    return [];
  }

  return (data || []) as ProductRow[];
};

const getProductRoutes = (products: ProductRow[]): StaticRoute[] =>
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
            offers: {
              "@type": "Offer",
              price,
              priceCurrency: "ILS",
              availability: available
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url: pageUrl,
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

async function main() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");

  siteUrl = (process.env.VITE_SITE_URL || "https://www.mothersday.co.il").replace(/\/$/, "");
  defaultImage = `${siteUrl}/logo.png`;
  instagramUrl = process.env.VITE_INSTAGRAM_URL?.trim() || "";

  const template = await fs.readFile(distIndexPath, "utf8");
  const products = await fetchProducts();
  const collections = await fetchCollections();
  const allRoutes = [
    ...buildStaticRoutes(products),
    ...getProductRoutes(products),
    ...getCollectionRoutes(collections),
  ];

  for (const routeMeta of allRoutes) {
    const html = applySeoToHtml(template, routeMeta.route, routeMeta);
    await writeRouteHtml(routeMeta.route, html);
  }

  console.log(
    `[prerender-seo] Generated ${allRoutes.length} prerendered route shells with route-specific SEO.`
  );
}

main().catch((error) => {
  console.error("[prerender-seo] Failed:", error);
  process.exit(1);
});
