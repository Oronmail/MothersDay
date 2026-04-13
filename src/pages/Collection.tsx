import { useState, useMemo, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Newsletter } from "@/components/Newsletter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { getProducts, getCollections, MAIN_COLLECTION_HANDLE } from "@/lib/api";
import { ProductEdge, CollectionEdge } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { WIDE_PRODUCT_TITLES } from "@/lib/constants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorFallback } from "@/components/ErrorFallback";
import { collectionQueryConfig, productQueryConfig } from "@/lib/queryConfig";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import collectionHeroComplementary from "@/assets/collection-hero-complementary-new.png";
import collectionHeroWeekly from "@/assets/collection-hero-weekly.png";
import collectionHeroFrontpage from "@/assets/collection-hero-frontpage.png";
import titleUnderline from "@/assets/title-underline.png";
import smileyIcon from "@/assets/smiley-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import clockIcon from "@/assets/clock-icon.png";

// Hero assets mapping by collection handle
const getCollectionHeroAssets = (handle: string): { image: string; video: string | null } => {
  const heroAssets: Record<string, { image: string; video: string | null }> = {
    'frontpage': {
      image: collectionHeroFrontpage,
      video: '/videos/collection-hero-frontpage.mp4?v=2'
    },
    'מוצרי-תכנון-שבועיים': {
      image: collectionHeroWeekly,
      video: '/videos/collection-hero-weekly.mp4?v=3'
    },
    'מוצרי-תכנון-משלימים': {
      image: collectionHeroComplementary,
      video: '/videos/ProductVideos/comlete.mp4'
    }
  };

  // Default: use complementary image, no video
  return heroAssets[handle] || { image: collectionHeroComplementary, video: null };
};

// Collection description text mapping
const getCollectionDescription = (handle: string): string[] => {
  const descriptions: Record<string, string[]> = {
    'frontpage': [
      'העבודה, הבית, הילדים, הזוגיות, אני...',
      'איך נכון לחלק את הזמן?',
      'אין נוסחה אחת שמתאימה לכולן.',
      'אבל אם כרגע משהו לא עובד לי,',
      'בטוח יש אחת טובה יותר בשבילי.',
      'מוצרי התכנון לאימהות של יום האם עזרו לי למצוא',
      'את הנוסחה שמתאימה לי ולמשפחה שלי.'
    ],
    'מוצרי-תכנון-שבועיים': [
      'מוצרי התכנון השבועיים של יום האם מאפשרים לי לתכנן את השבוע שלך,',
      'כך שבמקום לרוץ במרוץ בין משימה למשימה,',
      'אני בוחרת את המסלול, לומדת אותו,',
      'יודעת מתי להגביר קצב ומתי לעצור לקחת אוויר,',
      'מתי לבקש עזרה,',
      'וחשוב לא פחות, באיזו "נעל" הכי נכון לי לצעוד השבוע.'
    ],
    'מוצרי-תכנון-משלימים': [
      'השבוע נשאר אותו שבוע, והימים עדיין עם 24 שעות',
      'אבל מאז שהפכתי לאמא, רשימת המשימות רק הלכה והתארכה.',
      'כשאני מתכננת, אני זו שמנהלת את המשימות,',
      'ולא הן שמנהלות אותי.',
      'מוצרי התכנון המשלימים של יום האם משלימים את חוויית התכנון שלי',
      'מהאירועים הקטנים ועד הגדולים'
    ]
  };
  
  return descriptions[handle] || descriptions['מוצרי-תכנון-משלימים'];
};

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

const Collection = () => {
  const [sortBy] = useState<SortOption>("default");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { handle } = useParams<{ handle: string }>();
  // Check if video should autoplay (no play button)
  const shouldAutoplay =
    handle === "frontpage" ||
    handle === "מוצרי-תכנון-משלימים" ||
    handle === "מוצרי-תכנון-שבועיים";

  // Get hero assets and description based on collection handle
  const heroAssets = getCollectionHeroAssets(handle || '');
  const descriptionLines = getCollectionDescription(handle || '');

  const hasVideo = !!heroAssets.video;

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      return await getCollections();
    },
    ...collectionQueryConfig,
  });

  const collection = collections?.find(c => c.node.handle === handle);

  const { data: products, isLoading } = useQuery({
    queryKey: ['collection-products', handle],
    queryFn: async () => {
      if (!handle) return [];
      return await getProducts(handle);
    },
    enabled: !!handle,
    ...productQueryConfig,
  });

  // Fetch הכל collection to use its order as reference
  const { data: allCollectionProducts } = useQuery({
    queryKey: ['collection-products', MAIN_COLLECTION_HANDLE],
    queryFn: async () => {
      return await getProducts(MAIN_COLLECTION_HANDLE);
    },
    ...productQueryConfig,
  });

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    if (sortBy !== "default" ) return sortProducts(products, sortBy);
    if (!allCollectionProducts || allCollectionProducts.length === 0) return products;
    
    // Build order map from הכל collection
    const orderMap = new Map<string, number>();
    allCollectionProducts.forEach((p, i) => orderMap.set(p.node.id, i));
    
    const sorted = [...products].sort((a, b) => {
      const orderA = orderMap.get(a.node.id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.node.id) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
    
    // Swap בלוק תכנון בינוני with בלוק תכנון קטן
    const idxA = sorted.findIndex(p => p.node.handle === 'בלוק-תכנון-בינוני');
    const idxB = sorted.findIndex(p => p.node.handle === 'בלוק-תכנון-קטן');
    if (idxA !== -1 && idxB !== -1) {
      [sorted[idxA], sorted[idxB]] = [sorted[idxB], sorted[idxA]];
    }
    return sorted;
  }, [products, sortBy, allCollectionProducts]);

  const handlePlayVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  // Redirect "הכל" collection to All Products page
  if (handle === 'הכל') {
    return <Navigate to={ROUTES.allProducts} replace />;
  }

  if (!handle) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBanner />
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center" dir="rtl">
          <h1 className="text-2xl">קולקציה לא נמצאה</h1>
        </div>
        <Footer />
      </div>
    );
  }

  const title = collection?.node.title || handle;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      
      {/* Title Section */}
      <section className="pt-12 md:pt-14 pb-8 md:pb-12 relative z-10" dir="rtl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col items-center">
            <h1 className="text-[28px] md:text-4xl font-normal text-center">
              {title}
            </h1>
            <img 
              src={titleUnderline} 
              alt="" 
              className="h-2 md:h-3 -mt-1 w-auto max-w-[200px] md:max-w-[300px]"
            />
          </div>
        </div>
      </section>

      {/* Hero Section - Image + Video side by side */}
      <section className="pb-2 md:pb-6 -mt-6 md:-mt-10">
        <div className="w-full">
          <div className={`grid ${hasVideo ? 'grid-cols-2' : 'grid-cols-1'} gap-0`} style={hasVideo ? { aspectRatio: '2 / 1' } : undefined}>
            {/* Left side - Static Image */}
            <div className={`overflow-hidden ${!hasVideo ? 'aspect-[4/3.75] md:aspect-[5/4.75] max-w-3xl mx-auto' : ''}`}>
              <img 
                src={heroAssets.image} 
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Right side - Video (only if video exists) */}
            {hasVideo && (
              <div className="overflow-hidden relative bg-muted">
                <video
                  ref={videoRef}
                  src={heroAssets.video!}
                  className="w-full h-full object-cover"
                  playsInline
                  loop
                  muted
                  autoPlay={shouldAutoplay}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                />
                {!shouldAutoplay && !isVideoPlaying && (
                  <button
                    onClick={handlePlayVideo}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-foreground/80 flex items-center justify-center">
                      <Play className="w-5 h-5 md:w-7 md:h-7 text-background fill-background ml-1" />
                    </div>
                  </button>
                )}
                {!shouldAutoplay && isVideoPlaying && (
                  <button
                    onClick={handlePlayVideo}
                    className="absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center bg-black/20 transition-opacity"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-foreground/80 flex items-center justify-center">
                      <div className="w-3 h-3 md:w-4 md:h-4 bg-background" />
                    </div>
                  </button>
                )}
              </div>
            )}
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
          {descriptionLines.map((line, index) => (
            <p 
              key={index} 
              className={`text-lg md:text-xl text-foreground leading-relaxed ${index === descriptionLines.length - 2 ? 'font-medium pt-4 md:pt-6' : ''}`}
            >
              {line}
            </p>
          ))}
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

      {/* Products Carousel */}
      <ErrorBoundary fallback={<ErrorFallback message="שגיאה בטעינת המוצרים" />}>
        <section className="py-8 md:py-12">
          <div className="max-w-7xl mx-auto px-4">
            {isLoading ? (
              <div className="flex gap-4 justify-center" dir="rtl">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="min-w-[200px] md:min-w-[280px]">
                    <Skeleton className="aspect-[3/4]" />
                    <div className="pt-2 md:pt-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedProducts.length > 0 ? (
              <>
                {/* Mobile: Grid layout */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-16 md:hidden" dir="rtl">
                  {sortedProducts.map((product) => (
                    <div key={product.node.id}>
                      <ProductCard product={product} isWide={isWideProduct(product)} />
                    </div>
                  ))}
                </div>
                {/* Desktop: Carousel */}
                <div className="hidden md:block">
                  <Carousel
                    opts={{
                      align: "center",
                      direction: "rtl",
                    }}
                    className="w-full"
                    dir="rtl"
                  >
                    <CarouselContent className="-ml-4">
                      {sortedProducts.map((product) => (
                        <CarouselItem 
                          key={product.node.id}
                          className={`pl-4 ${isWideProduct(product) ? "basis-[40%] lg:basis-[30%]" : "basis-[28%] lg:basis-[22%]"}`}
                        >
                          <ProductCard product={product} isWide={isWideProduct(product)} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="-left-4" />
                    <CarouselNext className="-right-4" />
                  </Carousel>
                </div>
              </>
            ) : (
              <div className="text-center py-16" dir="rtl">
                <div className="bg-secondary/20 p-12 max-w-md mx-auto space-y-4">
                  <div className="text-5xl">📦</div>
                  <h3 className="text-xl md:text-2xl">אין מוצרים בקולקציה זו</h3>
                  <p className="text-muted-foreground text-sm md:text-base">
                    נסו לחזור מאוחר יותר או לבחור קולקציה אחרת
                  </p>
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

export default Collection;
