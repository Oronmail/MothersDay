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
    paperWeight: "120",
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

export interface ProductSpecs {
  size: string | null;
  pages: string | null;
  paperWeight: string | null;
}

/**
 * Reads the display specs (size / pages / paper weight) straight from a product's
 * DB-backed fields (`page_size`, `page_quantity`, `page_weight`), which are managed
 * in the admin — so editing a product there updates the site immediately.
 *
 * The DB stores values with their unit words (e.g. "30 דפים", "120 גרם"); we strip
 * the unit down to the number so each card can render its own label, then the JSX
 * re-adds the unit. Returns null when the product has no specs at all (e.g. bundles).
 */
export const getProductSpecs = (p: {
  pageSize?: string | null;
  pageQuantity?: string | null;
  pageWeight?: string | null;
}): ProductSpecs | null => {
  const clean = (v?: string | null) => (v ? v.trim() : '');
  const numeric = (v?: string | null) => {
    const t = clean(v);
    if (!t) return null;
    const m = t.match(/\d+/);
    return m ? m[0] : t;
  };
  const size = clean(p.pageSize) || null;
  const pages = numeric(p.pageQuantity);
  const paperWeight = numeric(p.pageWeight);
  if (!size && !pages && !paperWeight) return null;
  return { size, pages, paperWeight };
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
