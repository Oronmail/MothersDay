import { Helmet } from "react-helmet-async";

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
  siteName: "יום האם Mother's Day",
  defaultTitle: "יום האם | מוצרי תכנון איכותיים לאימהות",
  defaultDescription: "יום האם הוא מותג מוצרי תכנון עם מטרה ברורה! לדייק את היום, את השבוע ואת הזמן שלנו האימהות. מוצרי נייר איכותיים בעיצוב נקי ומינימליסטי.",
  defaultImage: "/og-image.jpg", // You'll need to add this image
  defaultUrl: "https://mothersday.co.il", 
  twitterHandle: "@yomhaem", // Add your Twitter handle if you have one
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
  const pageTitle = title
    ? `${title} | ${defaultSEO.siteName}`
    : defaultSEO.defaultTitle;
  const pageDescription = description || defaultSEO.defaultDescription;
  const pageImage = image || defaultSEO.defaultImage;
  const pageUrl = url || defaultSEO.defaultUrl;

  // Ensure image is absolute URL
  const absoluteImageUrl = pageImage.startsWith("http")
    ? pageImage
    : `${defaultSEO.defaultUrl}${pageImage}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={absoluteImageUrl} />
      <meta property="og:site_name" content={defaultSEO.siteName} />
      <meta property="og:locale" content="he_IL" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={absoluteImageUrl} />
      {defaultSEO.twitterHandle && (
        <meta name="twitter:site" content={defaultSEO.twitterHandle} />
      )}

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
  url: defaultSEO.defaultUrl,
  logo: `${defaultSEO.defaultUrl}/logo.png`,
  sameAs: [
    // Add your social media links here
    // "https://www.facebook.com/yomhaem",
    // "https://www.instagram.com/yomhaem",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Service",
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
  url: defaultSEO.defaultUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${defaultSEO.defaultUrl}/site/products?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
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
