import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import { ProductCard } from "@/components/ProductCard";
import { getProducts, MAIN_COLLECTION_HANDLE } from "@/lib/api";
import { ProductEdge } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WIDE_PRODUCT_TITLES } from "@/lib/constants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorFallback } from "@/components/ErrorFallback";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import titleUnderline from "@/assets/title-underline.png";
import heroImage1 from "@/assets/all-products-hero-1.png";
import heroImage2 from "@/assets/all-products-hero-2.png";
import heroImage3 from "@/assets/all-products-hero-3.png";
import smileyIcon from "@/assets/smiley-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import clockIcon from "@/assets/clock-icon.png";

const isWideProduct = (product: ProductEdge) => {
  return WIDE_PRODUCT_TITLES.includes(product.node.title);
};

type SortOption = "default" | "price-asc" | "price-desc" | "newest";

const sortProducts = (products: ProductEdge[], sortBy: SortOption): ProductEdge[] => {
  if (sortBy === "default") return products;
  
  return [...products].sort((a, b) => {
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

// Collection handles to display in filter (excluding bundles and "הכל")
const FILTER_COLLECTIONS = [
  { handle: 'מארזים', title: 'מארזים' },
  { handle: 'frontpage', title: 'מוצרי תכנון לאימהות' },
  { handle: 'מוצרי-תכנון-שבועיים', title: 'מוצרי תכנון שבועיים' },
  { handle: 'מוצרי-תכנון-משלימים', title: 'מוצרי תכנון משלימים' },
];

const AllProducts = () => {
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [selectedCollection, setSelectedCollection] = useState<string>("all");

  // Fetch all products from the "הכל" collection (preserves Shopify manual order)
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['all-products-collection'],
    queryFn: async () => {
      return await getProducts(MAIN_COLLECTION_HANDLE);
    },
    enabled: selectedCollection === "all",
  });

  // Fetch products from specific collection when selected
  const { data: collectionProducts, isLoading: collectionLoading } = useQuery({
    queryKey: ['collection-products', selectedCollection],
    queryFn: async () => {
      return await getProducts(selectedCollection);
    },
    enabled: selectedCollection !== "all",
  });

  const isLoading = selectedCollection === "all" ? productsLoading : collectionLoading;
  const activeProducts = selectedCollection === "all" ? products : collectionProducts;

  // Sort products
  const filteredAndSortedProducts = useMemo(() => {
    if (!activeProducts) return [];
    return sortProducts(activeProducts, sortBy);
  }, [activeProducts, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />

      {/* Breadcrumbs - top right */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 -mb-8 md:-mb-10">
        <Breadcrumbs 
          items={[
            { label: "כל המוצרים" }
          ]} 
        />
      </div>
      
      {/* Title Section */}
      <section className="pt-12 md:pt-14 pb-8 md:pb-12 relative z-10" dir="rtl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col items-center">
            <h1 className="text-[28px] md:text-4xl font-normal text-center">
              כל המוצרים
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
        <div className="w-full">
          <div className="grid grid-cols-3 gap-0 items-end">
            {/* Left - Kitchen */}
            <div className="aspect-[3/4] md:aspect-[4/5] overflow-hidden">
              <img 
                src={heroImage1} 
                alt="כל המוצרים"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Middle - Calendar */}
            <div className="aspect-[3/4] md:aspect-[4/5] overflow-hidden">
              <img 
                src={heroImage2} 
                alt="כל המוצרים"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Right - Bedroom */}
            <div className="aspect-[3/4] md:aspect-[4/5] overflow-hidden">
              <img 
                src={heroImage3} 
                alt="כל המוצרים"
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
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            המוצרים של יום האם עזרו לי להיות האמא שאני רוצה להיות.
          </p>
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            להיות בטוחה באימהות שלי.
          </p>
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            לתעדף,
          </p>
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            לתכנן להיות בשליטה,
          </p>
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            לנהל את הזמן בדרך שמתאימה לי,
          </p>
          <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium pt-4 md:pt-6">
            והכי חשוב-
          </p>
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            לחבר את את שאר בני הבית להיות שותפים ומעורבים בחיי היומיום המשפחתי.
          </p>
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            ולכוון אותם להיות האנשים הבוגרים שהייתי רוצה שיהיו.
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

      
      {/* Header with Filters and Sort */}
      <section className="py-4 md:py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6" dir="rtl">
          <div className="flex flex-col gap-4">
            
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">סינון:</span>
              </div>
              
              {/* Collection Filter */}
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="קולקציה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקולקציות</SelectItem>
                  {FILTER_COLLECTIONS.map((collection) => (
                    <SelectItem key={collection.handle} value={collection.handle}>
                      {collection.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                מציג {filteredAndSortedProducts.length} מוצרים
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <ErrorBoundary fallback={<ErrorFallback message="שגיאה בטעינת המוצרים" />}>
        <section className="py-4 md:py-8">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" dir="rtl">
                {[...Array(8)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="aspect-[3/4]" />
                    <div className="pt-2 md:pt-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAndSortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-16 md:gap-x-6 md:gap-y-20" dir="rtl">
                {filteredAndSortedProducts.map((product) => (
                  <div key={product.node.id}>
                    <ProductCard product={product} isWide={isWideProduct(product)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16" dir="rtl">
                <div className="bg-secondary/20 p-12 max-w-md mx-auto space-y-4">
                  <div className="text-5xl">🔍</div>
                  <h3 className="text-xl">לא נמצאו מוצרים</h3>
                  <p className="text-muted-foreground">
                    נסו לשנות את הסינון או לחזור לכל המוצרים
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedCollection("all");
                      setSortBy("default");
                    }}
                  >
                    אפס סינונים
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </ErrorBoundary>

      <Newsletter />
      <Footer />
    </div>
  );
};

export default AllProducts;
