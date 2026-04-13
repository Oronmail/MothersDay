// Centralized routing constants for type-safe navigation

// Base routes
export const ROUTES = {
  // Root routes
  root: '/',
  auth: '/auth',
  
  // Site routes (main content)
  home: '/',
  allProducts: '/products',
  allSets: '/sets',
  profile: '/profile',
  addresses: '/addresses',
  orders: '/orders',
  wishlist: '/wishlist',
  about: '/about',
  blog: '/blog',
  content1: '/content-1',
  content2: '/content-2',
  content3: '/content-3',
  shipping: '/shipping',
  privacy: '/privacy',
  terms: '/terms',
  returns: '/returns',
  support: '/support',
  checkout: '/checkout',
  checkoutConfirmation: '/checkout/confirmation',
} as const;

// Collection handles (for type safety and consistency)
export const COLLECTION_HANDLES = {
  mothersPlanning: 'frontpage',
  weeklyPlanning: 'מוצרי-תכנון-שבועיים',
  complementaryPlanning: 'מוצרי-תכנון-משלימים',
  bundles: 'מארזים',
} as const;

// Product handles (for common/featured products)
export const PRODUCT_HANDLES = {
  planningBundle: 'מארז-תכנון',
  powderBundle: 'מארז-פודרה',
  wineBundle: 'מארז-יין',
  stoneBundle: 'מארז-אבן',
  blocksBundle: 'מארז-בלוקים-1',
  notebooksBundle: 'מארז-מחברות',
} as const;

// Dynamic route builders (type-safe functions)
export const buildProductPath = (handle: string): string =>
  `/product/${handle}`;

export const buildCollectionPath = (handle: string): string =>
  `/collection/${handle}`;

// Type exports for TypeScript consumers
export type RouteKey = keyof typeof ROUTES;
export type CollectionHandle = typeof COLLECTION_HANDLES[keyof typeof COLLECTION_HANDLES];
export type ProductHandle = typeof PRODUCT_HANDLES[keyof typeof PRODUCT_HANDLES];
