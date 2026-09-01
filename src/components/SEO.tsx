import { useEffect } from "react";
import {
  INSTAGRAM_URL,
  SITE_NAME,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_E164,
  getSiteUrl,
} from "@/lib/siteConfig";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "article";
  noindex?: boolean;
  structuredData?: object;
}

const defaultSEO = {
  siteName: SITE_NAME,
  defaultTitle: "יום האם | מוצרי תכנון לאימהות",
  defaultDescription: "לוחות, מחברות ובלוקי תכנון מעוצבים, שעוזרים לאימהות לדייק את היום, את השבוע ואת הזמן שלהן.",
  defaultImage: "/logo.png",
};

const upsertMetaTag = (
  attribute: "name" | "property",
  key: string,
  content: string
) => {
  if (typeof document === "undefined") return;

  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`
  );

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
};

const upsertLinkTag = (rel: string, href: string) => {
  if (typeof document === "undefined") return;

  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }

  tag.setAttribute("href", href);
};

const removeLinkTag = (rel: string) => {
  if (typeof document === "undefined") return;

  document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)?.remove();
};

const removeMetaTag = (attribute: "name" | "property", key: string) => {
  if (typeof document === "undefined") return;

  document.head
    .querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    ?.remove();
};

type DomSeoConfig = {
  title: string;
  description: string;
  keywords?: string;
  image: string;
  url: string;
  type: "website" | "product" | "article";
  noindex: boolean;
  structuredData?: object;
  /**
   * Cleanup mode (component unmount): restore neutral defaults and REMOVE the
   * canonical link instead of pointing it anywhere - a page without an <SEO>
   * must not inherit the previous page's (or the homepage's) canonical.
   */
  removeCanonical?: boolean;
};

const applyDomSeo = ({
  title,
  description,
  keywords,
  image,
  url,
  type,
  noindex,
  structuredData,
  removeCanonical,
}: DomSeoConfig) => {
  if (typeof document === "undefined") return;

  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";
  document.title = title;

  upsertMetaTag("name", "description", description);
  upsertMetaTag("name", "theme-color", "#4d3c40");
  upsertMetaTag("name", "format-detection", "telephone=no");
  // "noindex,follow" - same value the prerender shells write, so the client
  // never flips a prerendered noindex,follow into a different directive.
  upsertMetaTag("name", "robots", noindex ? "noindex,follow" : "index,follow");

  if (keywords) {
    upsertMetaTag("name", "keywords", keywords);
  } else {
    removeMetaTag("name", "keywords");
  }

  upsertMetaTag("property", "og:type", type);
  upsertMetaTag("property", "og:url", url);
  upsertMetaTag("property", "og:title", title);
  upsertMetaTag("property", "og:description", description);
  upsertMetaTag("property", "og:image", image);
  upsertMetaTag("property", "og:image:alt", title);
  upsertMetaTag("property", "og:site_name", defaultSEO.siteName);
  upsertMetaTag("property", "og:locale", "he_IL");

  upsertMetaTag("name", "twitter:card", "summary_large_image");
  upsertMetaTag("name", "twitter:url", url);
  upsertMetaTag("name", "twitter:title", title);
  upsertMetaTag("name", "twitter:description", description);
  upsertMetaTag("name", "twitter:image", image);

  if (removeCanonical) {
    removeLinkTag("canonical");
  } else {
    upsertLinkTag("canonical", url);
  }

  const existingStructuredData = document.head.querySelector<HTMLScriptElement>(
    'script[data-seo-structured="true"]'
  );

  if (structuredData) {
    const script = existingStructuredData || document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoStructured = "true";
    script.textContent = JSON.stringify(structuredData);

    if (!existingStructuredData) {
      document.head.appendChild(script);
    }
  } else if (existingStructuredData) {
    existingStructuredData.remove();
  }
};

/**
 * SEO component - writes meta tags straight into document.head (single
 * mechanism; the Helmet path was removed because it duplicated every tag the
 * DOM writer already upserts over the prerendered shell).
 * Supports Open Graph, Twitter Cards, and JSON-LD structured data.
 */
export const SEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  noindex = false,
  structuredData,
}: SEOProps) => {
  const siteUrl = getSiteUrl();
  const pageTitle = title
    ? `${title} | ${defaultSEO.siteName}`
    : defaultSEO.defaultTitle;
  const pageDescription = description || defaultSEO.defaultDescription;
  const pageImage = image || defaultSEO.defaultImage;
  // Without an explicit url, canonicalize to the current path - not the site
  // root - so inner pages never declare the homepage as their canonical.
  const pageUrl =
    url ||
    (typeof window !== "undefined" && window.location.pathname !== "/"
      ? `${siteUrl}${window.location.pathname}`
      : siteUrl);

  // Ensure image is absolute URL
  const absoluteImageUrl = pageImage.startsWith("http")
    ? pageImage
    : `${siteUrl}${pageImage}`;

  useEffect(() => {
    applyDomSeo({
      title: pageTitle,
      description: pageDescription,
      keywords,
      image: absoluteImageUrl,
      url: pageUrl,
      type,
      noindex,
      structuredData,
    });

    // On unmount restore neutral defaults so a page that renders no <SEO> of
    // its own never keeps the previous page's title/description/robots, and
    // gets NO canonical at all (a missing canonical is safer than a wrong one).
    return () => {
      applyDomSeo({
        title: defaultSEO.defaultTitle,
        description: defaultSEO.defaultDescription,
        image: `${siteUrl}${defaultSEO.defaultImage}`,
        url: siteUrl,
        type: "website",
        noindex: false,
        removeCanonical: true,
      });
    };
  }, [
    absoluteImageUrl,
    keywords,
    noindex,
    pageDescription,
    pageTitle,
    pageUrl,
    siteUrl,
    structuredData,
    type,
  ]);

  return null;
};

/**
 * Helper function to generate Organization structured data
 */
export const getOrganizationStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${getSiteUrl()}/#organization`,
  name: "יום האם",
  alternateName: "Yom Ha'Em - Mother's Day",
  description: "מותג מוצרי תכנון איכותיים לאימהות",
  url: getSiteUrl(),
  logo: `${getSiteUrl()}/logo.png`,
  sameAs: INSTAGRAM_URL ? [INSTAGRAM_URL] : undefined,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Service",
    email: SUPPORT_EMAIL,
    telephone: SUPPORT_PHONE_E164,
    availableLanguage: ["Hebrew"],
  },
});

/**
 * Helper function to generate Product structured data
 */
export const getProductStructuredData = (product: {
  name: string;
  description: string;
  image: string;
  price: string;
  currency: string;
  availability: string;
  url: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.description,
  image: product.image,
  offers: {
    "@type": "Offer",
    price: product.price,
    priceCurrency: product.currency,
    availability: `https://schema.org/${product.availability}`,
    url: product.url,
  },
});

/**
 * Helper function to generate WebSite structured data with search
 */
export const getWebsiteStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${getSiteUrl()}/#website`,
  name: "יום האם",
  alternateName: ["Mother's Day", "יום האם Mother's Day"],
  url: getSiteUrl(),
  inLanguage: "he",
  publisher: { "@id": `${getSiteUrl()}/#organization` },
});

/**
 * Helper function to generate BreadcrumbList structured data
 */
export const getBreadcrumbStructuredData = (
  items: Array<{ name: string; url: string }>
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});
