// Product properties data derived from products_properties.csv
// Hardcoded for instant lookup performance (0ms runtime cost)

export interface ProductProperties {
  isWide: boolean;
  size: string;
  pages: string;
  paperWeight: string;
}

// Product properties lookup map (key = product title)
export const PRODUCT_PROPERTIES: Record<string, ProductProperties> = {
  "מחברת יום האם לניהול משימות קבועות": {
    isWide: true,
    size: "A4",
    pages: "30",
    paperWeight: "90",
  },
  "לוח משפחתי": {
    isWide: true,
    size: "A4",
    pages: "30",
    paperWeight: "90",
  },
  "לוח שבועי": {
    isWide: true,
    size: "A4",
    pages: "50",
    paperWeight: "90",
  },
  "תכנון ארוחות משפחתי שבועי": {
    isWide: true,
    size: "A4",
    pages: "50",
    paperWeight: "90",
  },
  "רשימת קניות / סידורים": {
    isWide: true,
    size: "A5",
    pages: "50",
    paperWeight: "120",
  },
  "מחברת גדולה": {
    isWide: false,
    size: "A4",
    pages: "30",
    paperWeight: "90",
  },
  "מחברת קטנה": {
    isWide: false,
    size: "A4/A5",
    pages: "30",
    paperWeight: "90",
  },
  "מחברת שורות גדולה": {
    isWide: false,
    size: "B5+",
    pages: "30",
    paperWeight: "90",
  },
  "מחברת שורות קטנה": {
    isWide: false,
    size: "A5",
    pages: "30",
    paperWeight: "90",
  },
  "בלוק תכנון": {
    isWide: false,
    size: "A4/A5/A6",
    pages: "50",
    paperWeight: "120",
  },
  "בלוק תכנון קטן": {
    isWide: false,
    size: "A6",
    pages: "50",
    paperWeight: "120",
  },
  "בלוק תכנון בינוני": {
    isWide: false,
    size: "A5",
    pages: "50",
    paperWeight: "120",
  },
  "בלוק תכנון גדול": {
    isWide: false,
    size: "A4",
    pages: "50",
    paperWeight: "120",
  },
};

/**
 * Get product properties by product title
 * @param title - Product title (exact match)
 * @returns ProductProperties or null if not found
 */
export const getProductProperties = (title: string): ProductProperties | null => {
  return PRODUCT_PROPERTIES[title] || null;
};

/**
 * Check if a product should be displayed as wide (2x width)
 * @param title - Product title
 * @returns true if product is wide
 */
export const isWideProduct = (title: string): boolean => {
  const props = getProductProperties(title);
  return props?.isWide || false;
};

/**
 * Array of product titles that should be displayed wide
 * Derived from CSV "Wide card" column
 */
export const WIDE_PRODUCT_TITLES = Object.entries(PRODUCT_PROPERTIES)
  .filter(([_, props]) => props.isWide)
  .map(([title, _]) => title);

/**
 * Bundle contents mapping
 * Maps bundle product handles to their included product display names and handles
 */
export interface BundleContentItem {
  displayName: string;
  handle: string;
  /** Alternative names as they may appear in Shopify descriptions */
  descriptionAliases?: string[];
}

export const BUNDLE_CONTENTS: Record<string, BundleContentItem[]> = {
  "מארז-תכנון": [
    { displayName: "לוח שבועי", handle: "p4", descriptionAliases: ["תכנון שבועי"] },
    { displayName: "לוח ארוחות", handle: "p3", descriptionAliases: ["תכנון ארוחות"] },
    { displayName: "רשימת קניות וסידורים", handle: "p5", descriptionAliases: ["תכנון קניות וסידורים"] },
  ],
  "מארז-פודרה": [
    { displayName: "תכנון שבועי", handle: "p4" },
    { displayName: "מחברת בינונית", handle: "מחברת-שורות-גדולה" },
    { displayName: "בלוק בינוני", handle: "בלוק-תכנון-בינוני" },
  ],
  "מארז-אבן": [
    { displayName: "רשימת קניות וסידורים", handle: "p5", descriptionAliases: ["תכנון קניות וסידורים"] },
    { displayName: "מחברת קטנה", handle: "מחברת-שורות-קטנה" },
    { displayName: "בלוק קטן", handle: "בלוק-תכנון-קטן" },
  ],
  "מארז-יין": [
    { displayName: "לוח ארוחות", handle: "p3", descriptionAliases: ["תכנון ארוחות"] },
    { displayName: "בלוק גדול", handle: "בלוק-תכנון-גדול" },
  ],
  "מארז-בלוקים-1": [
    { displayName: "בלוק קטן", handle: "בלוק-תכנון-קטן" },
    { displayName: "בלוק בינוני", handle: "בלוק-תכנון-בינוני" },
    { displayName: "בלוק גדול", handle: "בלוק-תכנון-גדול" },
  ],
  "מארז-מחברות": [
    { displayName: "מחברת גדולה", handle: "מחברת-שורות-גדולה", descriptionAliases: ["מחברת שורות בינונית"] },
    { displayName: "מחברת קטנה", handle: "מחברת-שורות-קטנה", descriptionAliases: ["מחברת שורות קטנה"] },
  ],
};

/**
 * Get bundle contents by bundle handle
 */
export const getBundleContents = (handle: string): BundleContentItem[] | null => {
  return BUNDLE_CONTENTS[handle] || null;
};

/**
 * Explicit overrides for which bundles to show on a product's detail page.
 * If a product handle is listed here, only these bundle handles will be shown.
 * If not listed, falls back to automatic detection from BUNDLE_CONTENTS.
 */
const PRODUCT_BUNDLE_OVERRIDES: Record<string, string[]> = {
  "p2": [],
  "מחברת-שורות-קטנה": ["מארז-מחברות", "מארז-אבן"],
  "מחברת-שורות-גדולה": ["מארז-מחברות", "מארז-פודרה"],
  "בלוק-תכנון-גדול": ["מארז-בלוקים-1", "מארז-יין"],
  "בלוק-תכנון-בינוני": ["מארז-בלוקים-1", "מארז-פודרה"],
  "בלוק-תכנון-קטן": ["מארז-בלוקים-1", "מארז-אבן"],
};

/**
 * Get bundle handles that contain a given product handle
 * Uses explicit overrides if available, otherwise derived from BUNDLE_CONTENTS
 */
export const getBundlesForProduct = (productHandle: string): string[] => {
  if (productHandle in PRODUCT_BUNDLE_OVERRIDES) {
    return PRODUCT_BUNDLE_OVERRIDES[productHandle];
  }
  return Object.entries(BUNDLE_CONTENTS)
    .filter(([_, items]) => items.some(item => item.handle === productHandle))
    .map(([bundleHandle]) => bundleHandle);
};
