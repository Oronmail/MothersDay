/**
 * Product Image Layouts Configuration
 *
 * Maps product handles to their extra carousel configuration.
 * Image layouts are managed via Shopify metafields (custom.image_layout).
 */

export type FeatureIconType = 'clock' | 'heart' | 'smiley';

export interface FeatureItem {
  text: string;
  icon: FeatureIconType;
}

export interface ProductExtraCarouselConfig {
  /** Whether this product has an extra carousel section */
  hasCarousel: boolean;
  /** Title for the carousel section (in Hebrew) */
  carouselTitle: string;
  /** Starting index for carousel images (0-based) */
  carouselImageStartIndex: number;
  /** Ending index for carousel images (exclusive) */
  carouselImageEndIndex: number;
  /** Optional descriptive text to display above carousel */
  descriptionText?: string;
  /** Optional features list with icons */
  features?: FeatureItem[];
  /** Whether to hide navigation arrows (default: false) */
  hideArrows?: boolean;
}

/**
 * Products with extra image carousels
 * Images vary by product - check configuration below
 */
export const PRODUCTS_WITH_EXTRA_CAROUSEL: Record<string, ProductExtraCarouselConfig> = {
  // מחברת יום האם לניהול משימות קבועות - Task notebook
  "p1": {
    hasCarousel: true,
    carouselTitle: "כלי תכנון במחברת",
    carouselImageStartIndex: 9,
    carouselImageEndIndex: 16,
    features: [
      // Row 1 (right to left)
      { text: "ארגון סדרי עדיפויות", icon: "smiley" },
      { text: "שגרת בוקר/ צהריים/ ערב משפחתית", icon: "heart" },
      { text: "לוח תכנון שבועי משפחתי לאירועים קבועים", icon: "clock" },
      { text: "לוח תכנון שבועי אישי למשימות ואירועים קבועים", icon: "smiley" },
      { text: "ליווי", icon: "heart" },
      // Row 2 (right to left)
      { text: "משימות לפי תחומים: אני, משפחה, זוגיות, ילדים, בית ופרויקטים", icon: "clock" },
      { text: "משימות לפי סטטוס", icon: "heart" },
      { text: "משימות לפי תדירות: יומי, שבועי, חודשי, תקופתי", icon: "clock" },
      { text: "השראה והעצמה", icon: "smiley" },
    ],
  },

  // לוח משפחתי - Family board product
  "p2": {
    hasCarousel: true,
    carouselTitle: "הטבלאות בלוח",
    carouselImageStartIndex: 6,
    carouselImageEndIndex: 10, // Images 7-10 (4 images total)
    hideArrows: true,
  },
};

/**
 * Product-specific image layout overrides (when Shopify metafield is not set)
 */
/**
 * Standard layout for מוצרים collection products:
 * Image 3 (index 2) top-left, Image 4 (index 3) bottom-left, Image 5 (index 4) tall right
 */
const STANDARD_PRODUCT_LAYOUT: ImageLayoutConfig = {
  type: "grid-2-left-1-right",
  mainImages: [2, 3, 4],
  aspectRatios: ["4/3", "4/3", "3/4"],
  description: "2 stacked left, 1 tall right"
};

export const PRODUCT_IMAGE_LAYOUT_OVERRIDES: Record<string, ImageLayoutConfig> = {
  "p1": STANDARD_PRODUCT_LAYOUT,
  "p2": {
    type: "grid-2-left-carousel-right",
    mainImages: [2, 3],
    carouselImages: [4, 5],
    aspectRatios: ["4/3", "4/3"],
    description: "2 stacked left, carousel right for family board"
  },
  "p3": STANDARD_PRODUCT_LAYOUT,
  "p4": STANDARD_PRODUCT_LAYOUT,
  "p5": STANDARD_PRODUCT_LAYOUT,
  "p6": STANDARD_PRODUCT_LAYOUT,
  "p7": STANDARD_PRODUCT_LAYOUT,
  "מחברת-שורות-קטנה": STANDARD_PRODUCT_LAYOUT,
  "מחברת-שורות-גדולה": STANDARD_PRODUCT_LAYOUT,
  "בלוק-תכנון-קטן": STANDARD_PRODUCT_LAYOUT,
  "בלוק-תכנון-בינוני": STANDARD_PRODUCT_LAYOUT,
  "בלוק-תכנון-גדול": STANDARD_PRODUCT_LAYOUT,
};

/**
 * Get carousel configuration for a product
 */
export const getProductCarouselConfig = (productHandle: string): ProductExtraCarouselConfig | null => {
  return PRODUCTS_WITH_EXTRA_CAROUSEL[productHandle] || null;
};

/**
 * Check if product has extra carousel
 */
export const hasExtraCarousel = (productHandle: string): boolean => {
  return !!PRODUCTS_WITH_EXTRA_CAROUSEL[productHandle];
};

/**
 * Get image layout override for a product (if exists)
 */
export const getProductImageLayoutOverride = (productHandle: string): ImageLayoutConfig | null => {
  return PRODUCT_IMAGE_LAYOUT_OVERRIDES[productHandle] || null;
};

/**
 * Image Layout Types (configured via Shopify metafields)
 */
export type ImageLayoutType =
  | "grid-2x2"                    // Standard 2x2 grid (default)
  | "grid-2-large-2-small"        // 2 large top, 2 small bottom
  | "grid-hero-bottom"            // 1 large hero, 2 small bottom
  | "grid-3x1"                    // 3 images horizontal
  | "grid-1-2-1"                  // 1 top, 2 middle, 1 bottom
  | "grid-2-1-3-2"                // 8 images: 2 large top, 1 medium, 3 small, 2 small
  | "grid-2-2-4"                  // 8 images: 2 top, 2 middle, 4 bottom
  | "grid-2-left-1-right"         // 2 stacked left, 1 tall right
  | "grid-1-2-right"              // 1 top-left, 2 bottom-left side-by-side, 1 tall right
  | "grid-2-stacked"              // 2 images stacked vertically (left-aligned)
  | "grid-2-left-carousel-right"  // 2 stacked left, vertical carousel right
  | "grid-custom";                // Custom aspect ratios

export interface ImageLayoutConfig {
  /** Layout type */
  type: ImageLayoutType;
  /** Main image indices to display (0-3) */
  mainImages: number[];
  /** Carousel image indices (for carousel layouts) */
  carouselImages?: number[];
  /** Aspect ratios for each image (Tailwind aspect-* format) */
  aspectRatios: string[];
  /** Human-readable description */
  description?: string;
}

/**
 * Default layout configuration (fallback if no metafield)
 */
export const DEFAULT_IMAGE_LAYOUT: ImageLayoutConfig = {
  type: "grid-2x2",
  mainImages: [0, 1, 2, 3],
  aspectRatios: ["10/7", "10/7", "10/7", "10/7"],
  description: "Standard 2x2 grid layout",
};

/**
 * Parse image layout from Shopify metafield
 * Returns default layout if parsing fails
 */
export const parseImageLayout = (metafieldValue: string | null | undefined): ImageLayoutConfig => {
  if (!metafieldValue) {
    return DEFAULT_IMAGE_LAYOUT;
  }

  try {
    const parsed = JSON.parse(metafieldValue);

    // Validate required fields
    if (!parsed.type || !Array.isArray(parsed.mainImages) || !Array.isArray(parsed.aspectRatios)) {
      console.warn('Invalid image layout metafield, using default layout');
      return DEFAULT_IMAGE_LAYOUT;
    }

    return parsed as ImageLayoutConfig;
  } catch (error) {
    console.error('Failed to parse image layout metafield:', error);
    return DEFAULT_IMAGE_LAYOUT;
  }
};
