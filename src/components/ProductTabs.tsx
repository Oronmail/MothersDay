import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProducts,
  getProductByHandle,
  getCollections,
  MAIN_COLLECTION_HANDLE,
} from "@/lib/api";
import { ProductEdge, CollectionEdge } from "@/lib/types";
import { collectionQueryConfig, productQueryConfig } from "@/lib/queryConfig";
import { ProductCard } from "./ProductCard";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import { WIDE_PRODUCT_TITLES } from "@/lib/constants";
import { ErrorBoundary } from "./ErrorBoundary";
import { ErrorFallback } from "./ErrorFallback";
import titleUnderline from "@/assets/title-underline.png";
import { COLLECTION_HANDLES, buildCollectionPath } from "@/lib/routes";

// Desktop collection filter tabs
const COLLECTION_TABS = [
  { label: "מוצרי תכנון לאימהות", handle: COLLECTION_HANDLES.mothersPlanning },
  { label: "מוצרי תכנון שבועיים", handle: COLLECTION_HANDLES.weeklyPlanning },
  { label: "מוצרי תכנון משלימים", handle: COLLECTION_HANDLES.complementaryPlanning },
  { label: "מארזים", handle: COLLECTION_HANDLES.bundles },
  { label: "מוצרים", handle: null }, // null = show all (main collection)
];

// Ensure these specific products show in the homepage carousel even if they
// were not successfully added to the main collection yet.
const HOMEPAGE_REQUIRED_PRODUCT_HANDLES = ["בלוק-תכנון-קטן", "בלוק-תכנון"] as const;

const isWideProduct = (product: ProductEdge) => {
  return WIDE_PRODUCT_TITLES.includes(product.node.title);
};

const ProductTabsContent = () => {
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  
  // Fetch collections list for tabs
  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      try {
        return await getCollections();
      } catch (error) {
        console.error('Failed to fetch collections:', error);
        return [];
      }
    },
    retry: 1,
    ...collectionQueryConfig,
  });

  // Fetch products from main collection (respects manual sort order)
  // Falls back to all products if main collection doesn't exist
  const { data: mainCollectionProducts, isLoading: mainLoading } = useQuery({
    queryKey: ['homepage-products', MAIN_COLLECTION_HANDLE],
    queryFn: async () => {
      // Try collection first for manual ordering
      try {
        const products = await getProducts(MAIN_COLLECTION_HANDLE);
        console.log('[ProductTabs] Got', products.length, 'products from collection');
        if (products.length > 0) {
          // Fetch required products by handle and append any missing ones.
          const extras = (await Promise.all(
            HOMEPAGE_REQUIRED_PRODUCT_HANDLES.map(async (handle) => {
              try {
                const product = await getProductByHandle(handle);
                return product ? ({ node: product } as ProductEdge) : null;
              } catch (error) {
                console.error('[ProductTabs] Required product fetch failed:', handle, error);
                return null;
              }
            })
          )).filter(Boolean) as ProductEdge[];

          if (extras.length === 0) return products;

          const seen = new Set(products.map((p) => p.node.id));
          const merged = [...products];
          for (const extra of extras) {
            if (!seen.has(extra.node.id)) {
              merged.push(extra);
              seen.add(extra.node.id);
            }
          }

          if (merged.length !== products.length) {
            console.log('[ProductTabs] Appended', merged.length - products.length, 'required products');
          }

          // Swap בלוק תכנון בינוני with בלוק תכנון קטן
          const swapHandleA = 'בלוק-תכנון-בינוני';
          const swapHandleB = 'בלוק-תכנון-קטן';
          const indexA = merged.findIndex((p) => p.node.handle === swapHandleA);
          const indexB = merged.findIndex((p) => p.node.handle === swapHandleB);
          if (indexA !== -1 && indexB !== -1) {
            [merged[indexA], merged[indexB]] = [merged[indexB], merged[indexA]];
          }

          return merged;
        }
        console.log('[ProductTabs] Main collection empty or not found, falling back to all products');
      } catch (e) {
        console.error('[ProductTabs] Main collection failed:', e);
      }

      // Fallback to all products - wrapped in try-catch to never throw
      try {
        console.log('[ProductTabs] Trying fallback to all products...');
        const products = await getProducts();
        console.log('[ProductTabs] Fallback got', products.length, 'products');
        return products;
      } catch (e) {
        console.error('[ProductTabs] Fallback also failed:', e);
        return []; // Return empty array instead of throwing
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,    // 5 minutes
  });

  // Fetch products from selected collection when a tab is active
  const { data: selectedCollectionProducts, isLoading: selectedLoading } = useQuery({
    queryKey: ['collection-products', activeCollection],
    queryFn: async () => {
      if (!activeCollection) return [];
      try {
        return await getProducts(activeCollection);
      } catch (e) {
        console.error('[ProductTabs] Selected collection failed:', e);
        return [];
      }
    },
    enabled: activeCollection !== null,
    ...productQueryConfig,
  });

  const isLoading = mainLoading || collectionsLoading;

  // Use selected collection products when a tab is active, otherwise main collection
  const displayProducts = activeCollection !== null ? selectedCollectionProducts : mainCollectionProducts;

  if (isLoading) {
    return (
      <section id="products" className="py-12 md:py-16 bg-background">
        <div className="w-[95%] mx-auto">
          <div className="flex flex-col items-center mb-4 md:mb-6">
            <h2 className="text-[28px] md:text-4xl lg:text-5xl font-normal text-center" dir="rtl">
              כל המוצרים של יום האם
            </h2>
            <img
              src={titleUnderline}
              alt=""
              className="w-48 md:w-72 lg:w-80 -mt-1"
            />
          </div>
          {/* Loading skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" dir="rtl">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // No explicit error check - fallback mechanism returns empty array on failure
  // which triggers the "Coming Soon" UI below

  if (!mainCollectionProducts || mainCollectionProducts.length === 0) {
    return (
      <section id="products" className="py-16">
        <div className="w-[95%] mx-auto text-center space-y-6" dir="rtl">
          <div className="flex flex-col items-center mb-4 md:mb-6">
            <h2 className="text-3xl md:text-4xl">כל המוצרים של יום האם</h2>
            <img 
              src={titleUnderline} 
              alt="" 
              className="w-48 md:w-72 lg:w-80 -mt-1"
            />
          </div>
          <div className="bg-card shadow-sm p-12 space-y-4">
            <div className="text-6xl">🛍️</div>
            <h3 className="text-2xl text-foreground">החנות שלנו בבנייה</h3>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              אנחנו עובדים על הוספת מוצרים מדהימים עבורך. תחזור בקרוב!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="pt-12 md:pt-16 pb-0 md:pb-16 bg-background">
      <div className="w-[95%] max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-2 md:mb-4">
            <h2 className="text-[28px] md:text-4xl lg:text-5xl font-normal text-center" dir="rtl">
              <span className="md:hidden">כל המוצרים של יום האם</span>
              <span className="hidden md:inline">המוצרים של יום האם</span>
            </h2>
            <img 
              src={titleUnderline} 
              alt="" 
              className="w-48 md:w-72 lg:w-80 -mt-1"
            />
          </div>

          {/* Desktop collection filter tabs */}
          <div className="hidden md:flex justify-center gap-8 mb-6" dir="rtl">
            {COLLECTION_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveCollection(tab.handle)}
                className={`text-base lg:text-lg transition-colors ${
                  activeCollection === tab.handle
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeCollection === null ? (
            // Carousel view for all products from main collection
            <div className="relative" dir="rtl">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                  direction: "rtl",
                  slidesToScroll: 1,
                  containScroll: "trimSnaps",
                }}
                className="w-full"
              >
                <CarouselContent className="ml-0">
                {mainCollectionProducts.map((product, index) => (
                    <CarouselItem
                      key={product.node.id}
                      className="pl-0 pr-3 basis-[85%] md:basis-1/3 lg:basis-1/3"
                    >
                      <ProductCard
                        product={product}
                        isWide={isWideProduct(product)}
                        largeCarouselMobile
                        imagePriority={index < 3}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-4 md:-left-6 bg-background/80 backdrop-blur-sm border-border shadow-lg top-[30%]" />
                <CarouselNext className="hidden md:flex -right-4 md:-right-6 bg-background/80 backdrop-blur-sm border-border shadow-lg top-[30%]" />
              </Carousel>
            </div>
          ) : selectedLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !displayProducts || displayProducts.length === 0 ? (
            <div className="text-center py-12" dir="rtl">
              <p className="text-muted-foreground">לא נמצאו מוצרים בקטגוריה זו</p>
            </div>
          ) : (
            <div className="relative" dir="rtl">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                  direction: "rtl",
                  slidesToScroll: 1,
                  containScroll: "trimSnaps",
                }}
                className="w-full"
              >
                <CarouselContent className="ml-0">
                {displayProducts.map((product, index) => (
                    <CarouselItem
                      key={product.node.id}
                      className="pl-0 pr-3 basis-[85%] md:basis-1/3 lg:basis-1/3"
                    >
                      <ProductCard
                        product={product}
                        isWide={isWideProduct(product)}
                        largeCarouselMobile
                        imagePriority={index < 3}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-4 md:-left-6 bg-background/80 backdrop-blur-sm border-border shadow-lg top-[30%]" />
                <CarouselNext className="hidden md:flex -right-4 md:-right-6 bg-background/80 backdrop-blur-sm border-border shadow-lg top-[30%]" />

              </Carousel>
            </div>
          )}
        </div>
      </section>
    );
};

export const ProductTabs = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback message="שגיאה בטעינת המוצרים" />}>
      <ProductTabsContent />
    </ErrorBoundary>
  );
};
