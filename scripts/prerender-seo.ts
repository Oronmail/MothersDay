import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

type StaticRoute = {
  route: string;
  title: string;
  description: string;
  type?: "website" | "product" | "article";
  image?: string;
  structuredData?: Record<string, unknown>;
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

const siteUrl = (process.env.VITE_SITE_URL || "https://mothers-day-flax-one.vercel.app").replace(/\/$/, "");
const defaultImage = `${siteUrl}/logo.png`;
const siteName = "יום האם Mother's Day";
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

const staticRoutes: StaticRoute[] = [
  {
    route: "/",
    title: "דף הבית | יום האם Mother's Day",
    description:
      "יום האם - מוצרי תכנון איכותיים לאימהות. בלוקי תכנון, לוחות משפחתיים, מחברות ומארזים מיוחדים. תכנון פשוט ויעיל עם עיצוב נקי ונעים בנייר באיכות פרימיום.",
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "יום האם - Yom Ha'Em",
          description: "מותג מוצרי תכנון איכותיים לאימהות",
          url: siteUrl,
          logo: `${siteUrl}/logo.png`,
        },
        {
          "@type": "WebSite",
          name: siteName,
          url: siteUrl,
        },
      ],
    },
  },
  {
    route: "/products",
    title: "כל המוצרים | יום האם Mother's Day",
    description:
      "כל מוצרי התכנון של יום האם במקום אחד. מחברות, לוחות, בלוקים ומוצרים משלימים לאימהות שמבקשות יותר סדר, בהירות ושליטה ביום-יום.",
  },
  {
    route: "/sets",
    title: "כל המארזים | יום האם Mother's Day",
    description:
      "מארזי התכנון של יום האם מרכזים יחד מוצרים משלימים במחיר משתלם, כדי לתת לאימהות פתרון שלם ומעוצב לניהול הבית והזמן.",
  },
  {
    route: "/about",
    title: "אודות | יום האם Mother's Day",
    description:
      "הסיפור מאחורי יום האם: איך נולד מותג מוצרי התכנון לאימהות, מה מייחד את השיטה, ולמה המוצרים נבנו במיוחד לחיי המשפחה האמיתיים.",
  },
  {
    route: "/blog",
    title: "בלוג | יום האם Mother's Day",
    description:
      "הבלוג של יום האם על תכנון, ניהול זמן ואימהות. מחשבות, תובנות וכלים שעוזרים לעשות יותר סדר ביומיום המשפחתי.",
    type: "article",
  },
  {
    route: "/support",
    title: "תמיכה ושירות לקוחות | יום האם Mother's Day",
    description:
      "שירות הלקוחות של יום האם. שאלות נפוצות, יצירת קשר בוואטסאפ, בטלפון או במייל, ומענה על משלוחים, החזרות והתאמת מוצרים.",
  },
  {
    route: "/shipping",
    title: "משלוחים | יום האם Mother's Day",
    description:
      "כל המידע על אפשרויות המשלוח, זמני האספקה ועלויות המשלוח של יום האם.",
  },
  {
    route: "/returns",
    title: "החזרות וביטולים | יום האם Mother's Day",
    description:
      "מדיניות ההחזרות והביטולים של יום האם, כולל תנאים, לוחות זמנים ודרכי יצירת קשר.",
  },
  {
    route: "/privacy",
    title: "מדיניות פרטיות | יום האם Mother's Day",
    description:
      "מדיניות הפרטיות של יום האם: איך אנחנו שומרים על המידע שלך, באילו נתונים נעשה שימוש ומהן הזכויות שלך.",
  },
  {
    route: "/terms",
    title: "תקנון האתר | יום האם Mother's Day",
    description:
      "תקנון האתר של יום האם, כולל תנאי שימוש, הזמנות, תשלומים, משלוחים, ביטולים ושירות לקוחות.",
  },
  {
    route: "/content-1",
    title: "האמא של היום היא לא האמא של פעם | יום האם Mother's Day",
    description:
      "פוסט מתוך הבלוג של יום האם על המורכבות של האימהות המודרנית, הפער בין הדורות, ולמה תכנון הוא כבר לא מותרות אלא צורך.",
    type: "article",
  },
  {
    route: "/content-2",
    title: "חלוקת זמן לאימהות | יום האם Mother's Day",
    description:
      "פוסט של יום האם על חלוקת זמן, סדרי עדיפויות ואיך אימהות יכולות לתכנן את הזמן שלהן מתוך בחירה מודעת ולא מתוך תגובה מתמדת לעומס.",
    type: "article",
  },
  {
    route: "/content-3",
    title: "תכנון ביום האם | יום האם Mother's Day",
    description:
      "פוסט של יום האם על המשמעות של תכנון באימהות: יצירת ודאות, גבולות, שגרה ושקט בתוך חיי משפחה עמוסים.",
    type: "article",
  },
];

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
  const robots = "index,follow";

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
  html = upsertTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}">`,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}">`
  );
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

const getProductRoutes = async (): Promise<StaticRoute[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("[prerender-seo] Missing Supabase env vars, skipping dynamic product prerender.");
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("handle,title,description_html,seo_title,seo_description,updated_at,price,vendor,product_images(url,alt_text,position),product_variants(price,available_for_sale,sort_order)")
    .eq("status", "active");

  if (error) {
    console.warn("[prerender-seo] Failed to fetch products:", error.message);
    return [];
  }

  return ((data || []) as ProductRow[]).map((product) => {
    const description = truncate(
      product.seo_description ||
        stripHtml(product.description_html) ||
        `מוצר תכנון איכותי לאימהות מבית יום האם.`
    );
    const title = `${product.seo_title || product.title} | ${siteName}`;
    const sortedImages = [...(product.product_images || [])].sort(
      (a, b) => (a.position || 0) - (b.position || 0)
    );
    const image = sortedImages[0]?.url || defaultImage;
    const variants = [...(product.product_variants || [])].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );
    const firstVariant = variants[0];
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
            image,
            brand: "יום האם",
            offers: {
              "@type": "Offer",
              price: firstVariant?.price ?? product.price ?? 0,
              priceCurrency: "ILS",
              availability:
                firstVariant?.available_for_sale === false
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/InStock",
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
                name: product.title,
                item: pageUrl,
              },
            ],
          },
        ],
      },
    };
  });
};

const getCollectionRoutes = async (): Promise<StaticRoute[]> => {
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

  return ((data || []) as CollectionRow[])
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
      };
    });
};

async function main() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");

  const template = await fs.readFile(distIndexPath, "utf8");
  const dynamicRoutes = [...(await getProductRoutes()), ...(await getCollectionRoutes())];
  const allRoutes = [
    ...staticRoutes,
    ...dynamicRoutes,
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
