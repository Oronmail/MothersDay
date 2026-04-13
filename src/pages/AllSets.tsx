import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import { ProductCard } from "@/components/ProductCard";
import { storefrontApiRequest, STOREFRONT_COLLECTION_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { WIDE_PRODUCT_TITLES } from "@/lib/constants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorFallback } from "@/components/ErrorFallback";
import { Button } from "@/components/ui/button";
import titleUnderline from "@/assets/title-underline.png";
import heroImage1 from "@/assets/sets-hero-1.png";
import heroImage2 from "@/assets/sets-hero-2.png";
import smileyIcon from "@/assets/smiley-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import clockIcon from "@/assets/clock-icon.png";
import { COLLECTION_HANDLES } from "@/lib/routes";

const isWideProduct = (product: ShopifyProduct) => {
  return WIDE_PRODUCT_TITLES.includes(product.node.title);
};

type SortOption = "default" | "price-asc" | "price-desc" | "newest";

// Manual order for sets page (right to left in RTL)
const SETS_ORDER = [
  'מארז תכנון',
  'מארז פודרה', 
  'מארז אבן',
  'מארז יין',
  'מארז בלוקים',
  'מארז מחברות',
];

const sortProducts = (products: ShopifyProduct[], sortBy: SortOption): ShopifyProduct[] => {
  // Always apply manual ordering first
  const orderedProducts = [...products].sort((a, b) => {
    const indexA = SETS_ORDER.findIndex(title => a.node.title.includes(title));
    const indexB = SETS_ORDER.findIndex(title => b.node.title.includes(title));
    
    // If both are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If only one is in the list, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    // Otherwise keep original order
    return 0;
  });

  if (sortBy === "default") return orderedProducts;
  
  return orderedProducts.sort((a, b) => {
    const priceA = parseFloat(a.node.priceRange.minVariantPrice.amount);
    const priceB = parseFloat(b.node.priceRange.minVariantPrice.amount);
    
    switch (sortBy) {
      case "price-asc":
        return priceA - priceB;
      case "price-desc":
        return priceB - priceA;
      case "newest":
        return b.node.id.localeCompare(a.node.id);
      default:
        return 0;
    }
  });
};

const AllSets = () => {
  const [sortBy, setSortBy] = useState<SortOption>("default");

  // Fetch products from bundles collection
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['bundles-products'],
    queryFn: async () => {
      const response = await storefrontApiRequest(STOREFRONT_COLLECTION_PRODUCTS_QUERY, {
        handle: COLLECTION_HANDLES.bundles,
        first: 100
      });
      return response.data.collection?.products.edges as ShopifyProduct[] || [];
    },
  });

  // Sort products
  const sortedProducts = useMemo(() => {
    if (!products) return [];
    return sortProducts(products, sortBy);
  }, [products, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />

      {/* Breadcrumbs - top right */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 -mb-8 md:-mb-10">
        <Breadcrumbs 
          items={[
            { label: "כל המארזים" }
          ]} 
        />
      </div>
      
      {/* Title Section */}
      <section className="pt-12 md:pt-14 pb-8 md:pb-12 relative z-10" dir="rtl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col items-center">
            <h1 className="text-[28px] md:text-4xl font-normal text-center">
              כל המארזים
            </h1>
            <img 
              src={titleUnderline} 
              alt="" 
              className="h-2 md:h-3 -mt-1 w-auto max-w-[200px] md:max-w-[300px]"
            />
          </div>
        </div>
      </section>

      {/* Hero Section - 3 Images side by side */}
      <section className="pb-2 md:pb-6 -mt-6 md:-mt-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 gap-1 items-end">
            {/* Left */}
            <div className="aspect-square overflow-hidden">
              <img 
                src={heroImage2} 
                alt="כל המארזים"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Right */}
            <div className="aspect-square overflow-hidden">
              <img 
                src={heroImage1} 
                alt="כל המארזים"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Icons Row */}
      <section className="pt-2 md:pt-6 pb-1 md:pb-6">
        <div className="flex justify-center gap-4">
          <img src={clockIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={heartIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={smileyIcon} alt="" className="h-6 md:h-8 w-auto" />
        </div>
      </section>

      {/* Description Text */}
      <section className="py-2 md:py-4" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-2 md:space-y-3">
          <p className="text-lg md:text-2xl text-foreground leading-relaxed font-medium">
            מה את מתכננת?
          </p>
          <p className="text-lg md:text-2xl text-foreground leading-relaxed">
            בחרי את המארז שמתאים לך
          </p>
          <p className="text-lg md:text-2xl text-foreground leading-relaxed inline-flex items-center justify-center gap-1">
            ותהני מ<span className="font-medium">פיתרון שלם</span> במחיר משתלם (חרוז
            <img src={smileyIcon} alt="" className="w-5 h-5 md:w-7 md:h-7 inline-block" />
            )
          </p>
        </div>
      </section>

      {/* Second Icons Row */}
      <section className="pt-1 md:pt-6 pb-2 md:pb-8">
        <div className="flex justify-center gap-4">
          <img src={clockIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={heartIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={smileyIcon} alt="" className="h-6 md:h-8 w-auto" />
        </div>
      </section>

      
      {/* Results count */}
      <section className="py-4 md:py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6" dir="rtl">
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              מציג {sortedProducts.length} מארזים
            </p>
          )}
        </div>
      </section>

      {/* Products Grid */}
      <ErrorBoundary fallback={<ErrorFallback message="שגיאה בטעינת המארזים" />}>
        <section className="py-4 md:py-8">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" dir="rtl">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-[3/4]" />
                    <div className="pt-2 md:pt-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-16 md:gap-x-6 md:gap-y-20" dir="rtl">
                {sortedProducts.map((product) => (
                  <div key={product.node.id}>
                    <ProductCard product={product} isWide={isWideProduct(product)} showDescriptionFirstLine />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16" dir="rtl">
                <div className="bg-secondary/20 p-12 max-w-md mx-auto space-y-4">
                  <div className="text-5xl">📦</div>
                  <h3 className="text-xl">לא נמצאו מארזים</h3>
                  <p className="text-muted-foreground">
                    נסו לרענן את הדף או לחזור מאוחר יותר
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                  >
                    רענן
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </ErrorBoundary>

      <div className="pb-12 md:pb-16" />

      <Newsletter />
      <Footer />
    </div>
  );
};

export default AllSets;
