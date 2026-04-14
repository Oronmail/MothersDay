import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
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
  defaultTitle: "יום האם | מוצרי תכנון איכותיים לאימהות",
  defaultDescription: "יום האם הוא מותג מוצרי תכנון עם מטרה ברורה! לדייק את היום, את השבוע ואת הזמן שלנו האימהות. מוצרי נייר איכותיים בעיצוב נקי ומינימליסטי.",
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
}: DomSeoConfig) => {
  if (typeof document === "undefined") return;

  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";
  document.title = title;

  upsertMetaTag("name", "description", description);
  upsertMetaTag("name", "theme-color", "#4d3c40");
  upsertMetaTag("name", "format-detection", "telephone=no");
  upsertMetaTag("name", "robots", noindex ? "noindex,nofollow" : "index,follow");

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

  upsertLinkTag("canonical", url);

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
 * SEO component using React Helmet for meta tags
 * Supports Open Graph, Twitter Cards, and JSON-LD structured data
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
  const pageUrl = url || siteUrl;

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

    return () => {
      applyDomSeo({
        title: defaultSEO.defaultTitle,
        description: defaultSEO.defaultDescription,
        image: `${siteUrl}${defaultSEO.defaultImage}`,
        url: siteUrl,
        type: "website",
        noindex: false,
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

  return (
    <Helmet>
      <html lang="he" dir="rtl" />
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={pageUrl} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={absoluteImageUrl} />
      <meta property="og:image:alt" content={pageTitle} />
      <meta property="og:site_name" content={defaultSEO.siteName} />
      <meta property="og:locale" content="he_IL" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={absoluteImageUrl} />

      {/* Additional Meta Tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#4d3c40" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

/**
 * Helper function to generate Organization structured data
 */
export const getOrganizationStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "יום האם - Yom Ha'Em",
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
  name: defaultSEO.siteName,
  url: getSiteUrl(),
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
