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
import collectionHeroComplementary from "@/assets/collection-hero-complementary-new.webp";
import collectionHeroWeekly from "@/assets/collection-hero-weekly.webp";
import collectionHeroFrontpage from "@/assets/collection-hero-frontpage.webp";
import titleUnderline from "@/assets/title-underline.png";
import smileyIcon from "@/assets/smiley-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import clockIcon from "@/assets/clock-icon.png";
import { SEO, getBreadcrumbStructuredData } from "@/components/SEO";
import { getAbsoluteSiteUrl } from "@/lib/siteConfig";
import { useIsMobile } from "@/hooks/use-mobile";

// Hero assets mapping by collection handle
type CollectionHeroAssets = { image: string; video: string | null; videoPoster?: string };

const getCollectionHeroAssets = (handle: string): CollectionHeroAssets => {
  // ?v= bumped after the 2026-09 re-encode (smaller files, same names).
  const heroAssets: Record<string, CollectionHeroAssets> = {
    'frontpage': {
      image: collectionHeroFrontpage,
      video: '/videos/collection-hero-frontpage.mp4?v=3',
      videoPoster: '/videos/collection-hero-frontpage-poster.jpg'
    },
    'מוצרי-תכנון-שבועיים': {
      image: collectionHeroWeekly,
      video: '/videos/collection-hero-weekly.mp4?v=4',
      videoPoster: '/videos/collection-hero-weekly-poster.jpg'
    },
    'מוצרי-תכנון-משלימים': {
      image: collectionHeroComplementary,
      video: '/videos/ProductVideos/comlete.mp4?v=2',
      videoPoster: '/videos/ProductVideos/comlete-poster.jpg'
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
      'אבל יש אחת שמתאימה לי.',
      'מוצרי התכנון של יום האם עזרו לי למצוא',
      'את הנוסחה שמתאימה לי ולמשפחה שלי.'
    ],
    'מוצרי-תכנון-שבועיים': [
      'השבוע שלך לא חייב להיות מרוץ בין משימה למשימה.',
      'כשהוא מתוכנן מראש, את לומדת את המסלול ובוחרת את הקצב:',
      'מתי להאיץ, מתי לעצור, ומתי לבקש עזרה.',
      'וחשוב לא פחות, מהי הנעל שהכי מתאימה.'
    ],
    'מוצרי-תכנון-משלימים': [
      'השבוע נשאר אותו שבוע, והימים עדיין עם 24 שעות',
      'אבל מאז שהפכתי לאמא, רשימת המשימות רק הלכה והתארכה.',
      'כשאני מתכננת, אני זו שמנהלת את המשימות,',
      'ולא הן שמנהלות אותי.',
      'המוצרים המשלימים משלימים את חוויית התכנון,',
      'מהרשימה הקטנה ועד האירוע הגדול.'
    ]
  };
  
  return descriptions[handle] || descriptions['מוצרי-תכנון-משלימים'];
};

// Clean display titles per handle — take precedence over the DB title so the
// heading is always correct and consistent (matches the filter labels on the
// All Products page) and never shows the raw handle (dashes / English
// "frontpage") during load.
const COLLECTION_DISPLAY_TITLES: Record<string, string> = {
  'frontpage': 'מוצרי תכנון לאימהות',
  'מוצרי-תכנון-שבועיים': 'מוצרי תכנון שבועיים',
  'מוצרי-תכנון-משלימים': 'מוצרי תכנון משלימים',
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
  // Mount only ONE of the two collection videos (desktop hero / mobile closer).
  // Both used to be in the DOM with CSS hiding one - so every device downloaded both.
  const isMobile = useIsMobile();
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

  const title =
    COLLECTION_DISPLAY_TITLES[handle || ''] ||
    collection?.node.title ||
    (handle ? handle.replace(/-/g, ' ') : '');
  const collectionUrl = getAbsoluteSiteUrl(ROUTES.allProducts);
  const collectionPathUrl = handle
    ? getAbsoluteSiteUrl(`/collection/${handle}`)
    : collectionUrl;
  const seoDescription = (
    collection?.node.description ||
    descriptionLines.join(" ")
  ).replace(/\s+/g, " ").trim();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      getBreadcrumbStructuredData([
        { name: "דף הבית", url: getAbsoluteSiteUrl(ROUTES.home) },
        { name: title, url: collectionPathUrl },
      ]),
    ],
  };

  return (
    <>
      <SEO
        title={title}
        description={seoDescription}
        image={heroAssets.image}
        url={collectionPathUrl}
        structuredData={structuredData}
      />
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
          {/* Mobile: single full-width still image — the side-by-side image+video
              split is a desktop pattern that cramps both on a narrow screen. The
              video moves to its own section below the products (mobile only).
              Desktop (md+) keeps the original image + video pairing in the hero. */}
          <div className={`grid gap-0 ${hasVideo ? 'grid-cols-1 md:grid-cols-2 md:items-stretch md:w-full md:aspect-[2.2/1] md:grid-rows-1 md:max-h-[75vh]' : 'grid-cols-1'}`}>
            {/* Static Image — full-width hero on mobile; left half on desktop */}
            <div className={`overflow-hidden ${!hasVideo ? 'aspect-[4/3.75] md:aspect-[2.2/1] md:max-h-[75vh] max-w-3xl md:max-w-none md:w-full mx-auto' : 'aspect-[4/5] md:aspect-auto md:h-full'}`}>
              <img 
                src={heroAssets.image} 
                alt={title}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
            
            {/* Right side - Video (only if video exists; desktop only - not mounted on mobile) */}
            {hasVideo && !isMobile && (
              <div className="hidden md:block overflow-hidden relative bg-muted md:h-full">
                <video
                  ref={videoRef}
                  src={heroAssets.video!}
                  poster={heroAssets.videoPoster}
                  className="w-full h-full object-cover"
                  playsInline
                  loop
                  muted
                  autoPlay={shouldAutoplay}
                  preload={shouldAutoplay ? "metadata" : "none"}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                />
                {!shouldAutoplay && !isVideoPlaying && (
                  <button
                    onClick={handlePlayVideo}
                    aria-label={`נגני את סרטון הקולקציה ${title}`}
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
                    aria-label={`עצרי את סרטון הקולקציה ${title}`}
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
              className={`text-base md:text-xl text-foreground leading-relaxed ${index === descriptionLines.length - 2 ? 'font-medium pt-4 md:pt-6' : ''}`}
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

      {/* Products Grid */}
      <ErrorBoundary fallback={<ErrorFallback message="שגיאה בטעינת המוצרים" />}>
        <section className="py-8 md:py-12">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" dir="rtl">
                {[...Array(3)].map((_, i) => (
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
                    <ProductCard product={product} isWide={isWideProduct(product)} />
                  </div>
                ))}
              </div>
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

      {/* Collection video — mobile only, below the products (on desktop it lives in
          the hero beside the image). Loops silently as a closing "in-use" moment.
          Mounted only on mobile so desktop never downloads it. */}
      {hasVideo && isMobile && (
        <section className="md:hidden pb-4">
          <div className="w-full aspect-[4/5] overflow-hidden bg-muted">
            <video
              src={heroAssets.video!}
              poster={heroAssets.videoPoster}
              className="w-full h-full object-cover"
              playsInline
              loop
              muted
              autoPlay
              preload="metadata"
            />
          </div>
        </section>
      )}

      <Newsletter />
        <Footer />
      </div>
    </>
  );
};

export default Collection;
