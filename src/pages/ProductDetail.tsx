import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getProductByHandle,
  getBundlesContainingProduct,
  getProductRecommendations,
  getBundleItems,
  MAIN_COLLECTION_HANDLE
} from "@/lib/api";
import { ProductEdge } from "@/lib/types";
import { trackViewItem } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { ArrowRight, Loader2, Minus, Plus, ShoppingBag, Package } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useState, useRef, useEffect } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { BundleContentCard } from "@/components/BundleContentCard";
import { ROUTES, buildCollectionPath, buildProductPath } from "@/lib/routes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorFallback } from "@/components/ErrorFallback";
import { LazyImage } from "@/components/LazyImage";
import { ProductImageLayout } from "@/components/ProductImageLayout";
import { ProductImageMobileGallery } from "@/components/ProductImageMobileGallery";
import { ProductExtraCarousel } from "@/components/ProductExtraCarousel";
import { NotebookStory } from "@/components/NotebookStory";
import {
  getProductDetailGridImageUrl,
  getProductDetailLightboxImageUrl,
} from "@/lib/imageTransforms";
import { parseImageLayout, getProductCarouselConfig, getProductImageLayoutOverride } from "@/lib/productImageLayouts";
import { getProductSpecs } from "@/lib/productProperties";
import { ProductReviews } from "@/components/ProductReviews";
import { getProductReviews } from "@/data/productReviews";
import { useApprovedReviews } from "@/hooks/useProductReviews";
import DOMPurify from "dompurify";
import { WishlistButton } from "@/components/WishlistButton";
import {
  SEO,
  getBreadcrumbStructuredData,
  getProductStructuredData,
} from "@/components/SEO";
import { getAbsoluteSiteUrl } from "@/lib/siteConfig";

/**
 * For bundle products, replace product names in description HTML with clickable links.
 * Uses bundle items fetched from the database.
 */
function linkifyBundleDescription(
  html: string,
  bundleItems: Array<{ product: { handle: string; title: string } }>
): string {
  if (!bundleItems || bundleItems.length === 0) return html;

  let result = html;
  for (const item of bundleItems) {
    const productPath = buildProductPath(item.product.handle);
    const name = item.product.title;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace text that is NOT already inside an <a> tag
    result = result.replace(
      new RegExp(`(?!<a[^>]*>.*?)${escapedName}(?![^<]*<\\/a>)`, 'g'),
      `<a href="${productPath}" style="text-decoration:underline;cursor:pointer">${name}</a>`
    );
  }
  return result;
}

export default function ProductDetail() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const descContentRef = useRef<HTMLDivElement>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descCanExpand, setDescCanExpand] = useState(false);

  // Fetch main product
  const { data, isLoading, error } = useQuery({
    queryKey: ['product', handle],
    queryFn: async () => {
      return await getProductByHandle(handle!);
    },
    enabled: !!handle
  });

  // Check if this product is a bundle
  const isBundle = data?.title?.includes('מארז');

  // Approved site reviews (Supabase) — affect where the reviews section sits
  const siteReviews = useApprovedReviews(handle);

  // Fetch only the bundles that actually contain this product - only for non-bundle products
  const { data: bundlesData } = useQuery({
    queryKey: ['bundles-containing', data?.id],
    queryFn: async () => {
      if (!data?.id) return [];
      return await getBundlesContainingProduct(data.id);
    },
    enabled: !isBundle && !!data?.id
  });

  // Fetch bundle items from DB (for bundle contents)
  const { data: bundleItemsData } = useQuery({
    queryKey: ['bundle-items', data?.id],
    queryFn: async () => {
      if (!data?.id) return [];
      return await getBundleItems(data.id);
    },
    enabled: isBundle && !!data?.id
  });

  // Bundles already shown in the "זמין גם במארזים" section — excluded from the
  // recommendations below so the same bundle never appears in both sections.
  const shownBundleIds = (bundlesData || []).slice(0, 4).map((b: ProductEdge) => b.node.id);

  // Fetch product recommendations (for "אימהות מוסיפות גם" section).
  // For non-bundle products we wait for bundlesData so we know which bundles to exclude.
  const { data: relatedProductsData } = useQuery({
    queryKey: ['product-recommendations', data?.id, shownBundleIds.join(',')],
    queryFn: async () => {
      if (!data?.id) return [];
      return await getProductRecommendations(data.id, shownBundleIds);
    },
    enabled: !!data?.id && (isBundle || bundlesData !== undefined),
  });

  // Measure whether the description is long enough to warrant a "read more" toggle.
  // scrollHeight reports full content height even while clamped, so this works in either state.
  useEffect(() => {
    const el = descContentRef.current;
    if (!el) return;
    setDescExpanded(false);
    const check = () => setDescCanExpand(el.scrollHeight > 340);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [data?.id]);

  // Funnel: report each product view (GA4 view_item / Meta ViewContent)
  useEffect(() => {
    if (!data) return;
    const variant = data.variants.edges[0]?.node;
    trackViewItem({
      item_id: variant?.id || data.id,
      item_name: data.title,
      price: parseFloat(variant?.price.amount || data.priceRange.minVariantPrice.amount),
      quantity: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const handleAddToCart = () => {
    if (!data) return;

    const variant = data.variants.edges[selectedVariantIndex]?.node;
    if (!variant) {
      toast.error('לא ניתן להוסיף לעגלה', {
        description: 'אין גרסאות זמינות למוצר זה'
      });
      return;
    }

    const cartItem = {
      product: { node: data },
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: quantity,
      selectedOptions: variant.selectedOptions || []
    };
    
    addItem(cartItem);
    
    toast.success('הוסף לעגלה', {
      description: `${data.title} (${quantity})`,
      position: 'top-center',
      // Product name carries the narrow brand font; the label stays in body type.
      classNames: { description: 'group-[.toast]:font-display' }
    });
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="text-center py-20" dir="rtl">
          <p className={`mb-4 ${error ? 'text-destructive' : 'text-foreground'}`}>
            {error ? 'שגיאה בטעינת המוצר' : 'המוצר הזה לא זמין כרגע'}
          </p>
          <Button variant="outline" onClick={() => navigate(ROUTES.home)}>
            <ArrowRight className="ml-2 h-4 w-4" />
            חזרה לעמוד הראשי
          </Button>
        </div>
      </div>
    );
  }

  const selectedVariant = data.variants.edges[selectedVariantIndex]?.node;
  const productProps = getProductSpecs(data);
  // Reviews with content sit high on the page (before cross-sell); the empty
  // "כתבי לנו" state is moved to the very bottom so it doesn't interrupt shopping.
  const hasReviews = getProductReviews(handle).length > 0 || siteReviews.length > 0;
  const images = data.images.edges;
  const price = parseFloat(selectedVariant?.price.amount || data.priceRange.minVariantPrice.amount);
  const bundles = bundlesData || [];
  // Filter out products that are already in this bundle from recommendations
  const bundleContentHandles = isBundle && bundleItemsData
    ? bundleItemsData.map(item => item.product.handle)
    : [];
  const relatedProducts = (relatedProductsData || []).filter((product: ProductEdge) =>
    !bundleContentHandles.includes(product.node.handle)
  );

  // For bundles: use bundle items from DB
  const bundleContents = isBundle && bundleItemsData
    ? bundleItemsData.map(item => ({ node: item.product }))
    : [];

  // Parse image layout from metafield, or use override if exists
  // Bundle products get a special 2-stacked layout (images 3 & 4 only)
  // The bundle carousel is limited to the images that actually exist, so a bundle
  // with only two extra shots (e.g. מארז יין) rotates between two, not three.
  const imageLayout = isBundle
    ? {
        type: "grid-2-left-carousel-right" as const,
        mainImages: [2, 3],
        carouselImages: [4, 5, 6].filter((i) => !!images[i]),
        aspectRatios: ["4/3", "4/3"],
        description: "2 stacked left, carousel right",
      }
    : getProductImageLayoutOverride(handle || '') || parseImageLayout(data.imageLayout);

  // Mobile: planning products & bundles get an enlarged swipe gallery instead of the
  // cramped mosaic. Slide 1 = the two landscape shots stacked; then one slide per
  // remaining image (the portrait shot for planning products, or the three individual
  // shots for bundles — the old right-hand carousel broken out into separate slides).
  let galleryStacked: number[] = [];
  let gallerySingles: number[] = [];
  if (imageLayout.type === "grid-2-left-1-right" && imageLayout.mainImages.length >= 3) {
    galleryStacked = imageLayout.mainImages.slice(0, 2);
    gallerySingles = [imageLayout.mainImages[2]];
  } else if (isBundle && imageLayout.type === "grid-2-left-carousel-right") {
    galleryStacked = imageLayout.mainImages.slice(0, 2);
    gallerySingles = imageLayout.carouselImages || [];
  }
  gallerySingles = gallerySingles.filter((i) => !!images[i]);
  const useMobileGallery =
    galleryStacked.length === 2 &&
    galleryStacked.every((i) => !!images[i]) &&
    gallerySingles.length > 0;

  // Get carousel configuration if this product has extra carousel
  const carouselConfig = getProductCarouselConfig(handle || '');
  const primaryImage = images[0]?.node?.url || "/logo.png";
  const seoDescription = (
    data.seoDescription ||
    data.description ||
    "מוצר תכנון איכותי לאימהות מבית יום האם."
  ).replace(/\s+/g, " ").trim();
  const productUrl = getAbsoluteSiteUrl(buildProductPath(data.handle));
  const breadcrumbItems = [
    { name: "דף הבית", url: getAbsoluteSiteUrl(ROUTES.home) },
    ...(isBundle
      ? [{ name: "כל המארזים", url: getAbsoluteSiteUrl(ROUTES.allSets) }]
      : data.collections?.edges?.[0]
        ? [{
            name: data.collections.edges[0].node.title,
            url: getAbsoluteSiteUrl(
              buildCollectionPath(data.collections.edges[0].node.handle)
            ),
          }]
        : []),
    { name: data.title, url: productUrl },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      getProductStructuredData({
        name: data.title,
        description: seoDescription,
        image: primaryImage,
        price: price.toFixed(0),
        currency: selectedVariant?.price.currencyCode || "ILS",
        availability: selectedVariant?.availableForSale ? "InStock" : "OutOfStock",
        url: productUrl,
      }),
      getBreadcrumbStructuredData(breadcrumbItems),
    ],
  };

  return (
    <>
      <SEO
        title={data.seoTitle || data.title}
        description={seoDescription}
        image={primaryImage}
        url={productUrl}
        type="product"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <AnnouncementBanner />
        <Header />
      
        {/* Breadcrumbs Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[
            ...(isBundle
              ? [{ label: 'מארזים', href: ROUTES.allSets }]
              : data.collections?.edges?.[0]
                ? [{ label: data.collections.edges[0].node.title, href: buildCollectionPath(data.collections.edges[0].node.handle) }]
                : []),
            { label: data.title }
          ]} />
        </div>
      
        {/* Section 1: Product Info */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          <div className="grid md:grid-cols-12 gap-6 lg:gap-10">
            {/* Left Column - Product Info (visually on right in RTL) */}
            <div className="order-2 md:order-1 md:col-span-4 space-y-5" dir="rtl">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-[28px] md:text-3xl mb-1">{data.title}</h1>
                  <WishlistButton productId={data.id} size={24} className="mt-1 flex-shrink-0" />
                </div>
                {productProps ? (
                  <p className="text-muted-foreground text-base flex flex-wrap items-center gap-x-1.5" dir="rtl">
                    {[
                      productProps.size,
                      productProps.pages ? `${productProps.pages} דפים` : null,
                      productProps.paperWeight ? `${productProps.paperWeight} גרם` : null,
                    ]
                      .filter(Boolean)
                      .map((part, i) => (
                        <span key={i} className="flex items-center gap-x-1.5">
                          {i > 0 && <span aria-hidden="true">·</span>}
                          <span>{part}</span>
                        </span>
                      ))}
                  </p>
                ) : data.vendor ? (
                  <p className="text-muted-foreground text-base">{data.vendor}</p>
                ) : null}
                <p className="text-xl md:text-2xl mt-3">₪{price.toFixed(0)}</p>
              </div>

              {/* Desktop Add to Cart with Quantity */}
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center border border-border">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="p-2 hover:bg-muted transition-colors"
                    aria-label={`הפחיתי כמות עבור ${data.title}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-3 min-w-[2.5rem] text-center">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="p-2 hover:bg-muted transition-colors"
                    aria-label={`הגדילי כמות עבור ${data.title}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                <Button
                  // min-w keeps the button at the size it had when the label still
                  // carried the price ("הוספה לעגלה · ₪160"), so dropping the price
                  // doesn't shrink it.
                  className="text-lg min-w-[175px]"
                  onClick={handleAddToCart}
                  disabled={!selectedVariant?.availableForSale}
                >
                  {selectedVariant?.availableForSale ? 'הוספה לעגלה' : 'אזל מהמלאי'}
                </Button>
              </div>

              {/* Variant Selection */}
              {data.variants.edges.length > 1 && (
                <div>
                  <label className="block text-sm md:text-base font-medium mb-2">
                    בחר אפשרות
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {data.variants.edges.map((edge, index: number) => (
                      <Button
                        key={edge.node.id}
                        variant={selectedVariantIndex === index ? "default" : "outline"}
                        onClick={() => setSelectedVariantIndex(index)}
                        disabled={!edge.node.availableForSale}
                        size="sm"
                      >
                        {edge.node.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {(data.descriptionHtml || data.description) ? (
                <div className="pt-4 border-t border-border">
                  <div className="relative">
                    <div
                      ref={descContentRef}
                      className="overflow-hidden"
                      style={{ maxHeight: descExpanded || !descCanExpand ? undefined : '280px' }}
                    >
                  {data.descriptionHtml ? (
                    <div 
                      dir="rtl"
                      className="text-muted-foreground text-lg leading-relaxed prose prose-lg max-w-none [&>p]:mb-3 [&>br]:block [&>br]:mb-0 [&_a]:text-foreground [&_a]:underline [&_a]:hover:opacity-70 [&_a]:transition-opacity [&_ul]:list-none [&_ul]:p-0 [&_li]:block [&_li]:mb-0 [&_.desc-highlight]:bg-muted/50 [&_.desc-highlight]:p-3 [&_.desc-highlight]:-mx-1 [&_.desc-highlight]:rounded-sm [&_.desc-highlight]:my-2"
                      dangerouslySetInnerHTML={{ 
                        __html: (() => {
                          const sanitized = DOMPurify.sanitize(data.descriptionHtml, {
                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
                            ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
                          });
                          // Fix RTL punctuation
                          const fixedPunctuation = sanitized.replace(
                            /(<\/p>\s*<p[^>]*>(?:\s*<span[^>]*>)?\s*)([,.\u060C\u061B])/g,
                            (match, tags, punct) => {
                              return punct + tags.replace(/^<\/p>/, '</p>');
                            }
                          );
                          const fixedHtml = fixedPunctuation.replace(
                            />([,.\u060C\u061B])(\s*[\u0590-\u05FF\u0600-\u06FF])/g,
                            '>$2$1'
                          );
                          const linkedHtml = isBundle && bundleItemsData ? linkifyBundleDescription(fixedHtml, bundleItemsData) : fixedHtml;
                          // Wrap the specific "family board" section with a highlight
                          const startMarker = 'הלוח המשפחתי שומר';
                          const endMarker = 'משימות בשגרה';
                          const startIdx = linkedHtml.indexOf(startMarker);
                          const endIdx = linkedHtml.indexOf(endMarker);
                          if (startIdx !== -1 && endIdx !== -1) {
                            const endPos = endIdx + endMarker.length;
                            // Find the nearest closing tag after endMarker
                            const afterEnd = linkedHtml.substring(endPos);
                            const closingMatch = afterEnd.match(/^[^<]*\.?\s*(<\/p>)?/);
                            const closeLen = closingMatch ? closingMatch[0].length : 0;
                            // Find the nearest opening tag before startMarker
                            const beforeStart = linkedHtml.substring(0, startIdx);
                            const lastOpenTag = beforeStart.lastIndexOf('<p');
                            const wrapStart = lastOpenTag !== -1 ? lastOpenTag : startIdx;
                            const wrapEnd = endPos + closeLen;
                            return linkedHtml.substring(0, wrapStart) + 
                              '<div class="desc-highlight">' + 
                              linkedHtml.substring(wrapStart, wrapEnd) + 
                              '</div>' + 
                              linkedHtml.substring(wrapEnd);
                          }
                          return linkedHtml;
                        })()
                      }}
                    />
                  ) : (
                    <p dir="rtl" className="text-muted-foreground text-lg leading-relaxed whitespace-pre-line">
                      {data.description}
                    </p>
                  )}
                    </div>
                    {descCanExpand && !descExpanded && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
                    )}
                  </div>
                  {descCanExpand && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-3 text-base font-medium text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity"
                      dir="rtl"
                    >
                      {descExpanded ? 'הצג פחות' : 'קרא עוד'}
                    </button>
                  )}
                </div>
              ) : null}

            </div>

            {/* Right Column - Images Grid (visually on left in RTL) */}
            <div className="order-1 md:order-2 md:col-span-8">
              {/* Planning products: mobile gets an enlarged swipe gallery with a peek
                  of the next image; desktop keeps the mosaic. Other products unchanged. */}
              {useMobileGallery && (
                <div className="md:hidden">
                  <ProductImageMobileGallery
                    images={images}
                    stackedIndices={galleryStacked}
                    singleIndices={gallerySingles}
                    productTitle={data.title}
                    onImageClick={(index) => { setSelectedImageIndex(index); setLightboxOpen(true); }}
                    videoSrc={handle === "מחברת-יום-האם" ? "/videos/p1-mobile.mp4" : undefined}
                    videoPoster={handle === "מחברת-יום-האם" ? "/videos/p1-mobile-poster.jpg" : undefined}
                    singlesFirst={handle === "מחברת-יום-האם"}
                  />
                </div>
              )}
              <div className={useMobileGallery ? 'hidden md:block' : undefined}>
                <ProductImageLayout
                  images={images}
                  productTitle={data.title}
                  layout={imageLayout}
                  selectedImageIndex={selectedImageIndex}
                  onImageClick={(index) => { setSelectedImageIndex(index); setLightboxOpen(true); }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Editorial story sections — anchor product מחברת יום האם only */}
        {handle === 'מחברת-יום-האם' && (
          <ErrorBoundary fallback={null}>
            <NotebookStory
              images={images}
              onImageClick={(i) => { setSelectedImageIndex(i); setLightboxOpen(true); }}
            />
          </ErrorBoundary>
        )}

        {/* Section 2: Extra Product Carousel (if configured) — hidden for p1 (replaced by NotebookStory) */}
        {carouselConfig && handle !== 'מחברת-יום-האם' && (
          <ErrorBoundary fallback={<div className="py-8"><ErrorFallback message="שגיאה בטעינת תמונות נוספות" /></div>}>
            <ProductExtraCarousel
              images={images}
              productTitle={data.title}
              config={carouselConfig}
            />
          </ErrorBoundary>
        )}


      {/* Section 3.5: Customer reviews — only when there ARE reviews.
          Empty state is rendered at the very end of the page instead (below). */}
      {hasReviews && (
        <ErrorBoundary fallback={null}>
          <ProductReviews handle={handle} productTitle={data.title} productId={data.id} />
        </ErrorBoundary>
      )}

      {/* Section 4: Product in Bundles (only for non-bundle products) */}
      {!isBundle && bundles.length > 0 && (
        <ErrorBoundary fallback={<div className="py-8"><ErrorFallback message="שגיאה בטעינת המארזים" /></div>}>
          <section className="py-6 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
             <h2 className="text-[28px] md:text-3xl text-right mb-8">
              המוצר זמין גם במארזים
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {bundles.slice(0, 4).map((bundle: ProductEdge) => (
                <ProductCard key={bundle.node.id} product={bundle} />
              ))}
            </div>
          </div>
        </section>
        </ErrorBoundary>
      )}

      {/* Section 5: Frequently Bought Together */}
      {relatedProducts.length > 0 && (
        <ErrorBoundary fallback={<div className="py-8"><ErrorFallback message="שגיאה בטעינת המוצרים הקשורים" /></div>}>
          <section className="py-12 md:py-16 bg-primary/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
            <h2 className="text-[28px] md:text-3xl text-right mb-8">
              אימהות מוסיפות גם
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((product: ProductEdge) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          </div>
        </section>
        </ErrorBoundary>
      )}

      {/* Reviews empty state — lives at the very bottom so the "כתבי לנו"
          prompt doesn't take prime space when there are no reviews yet. */}
      {!hasReviews && (
        <ErrorBoundary fallback={null}>
          <ProductReviews handle={handle} productTitle={data.title} productId={data.id} />
        </ErrorBoundary>
      )}

        {/* Mobile Sticky Add to Cart Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t shadow-lg z-50">
          <div className="flex items-center gap-3 p-4" dir="rtl">
            <div className="flex items-center border border-border flex-shrink-0">
            <button
              onClick={() => handleQuantityChange(-1)}
              className="p-2.5 hover:bg-muted transition-colors"
              aria-label="הפחת כמות"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-4 text-base font-medium min-w-[3rem] text-center">{quantity}</span>
            <button
              onClick={() => handleQuantityChange(1)}
              className="p-2.5 hover:bg-muted transition-colors"
              aria-label="הוסף כמות"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="flex-1 text-lg"
            onClick={handleAddToCart}
            disabled={!selectedVariant?.availableForSale}
          >
            <ShoppingBag className="h-5 w-5 ml-2" />
            {selectedVariant?.availableForSale ? `הוספה לעגלה · ₪${price.toFixed(0)}` : 'אזל מהמלאי'}
          </Button>
        </div>
      </div>
      
        {data && (
          <ImageLightbox
            images={data.images.edges.map((imageEdge) => ({
              url: getProductDetailLightboxImageUrl(imageEdge.node.url),
              altText: imageEdge.node.altText,
            }))}
            currentIndex={selectedImageIndex}
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            onNavigate={setSelectedImageIndex}
          />
        )}
        <Footer />
      </div>
    </>
  );
}
