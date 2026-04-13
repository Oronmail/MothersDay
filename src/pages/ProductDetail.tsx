import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getProductByHandle,
  getProducts,
  getProductRecommendations,
  getBundleItems,
  MAIN_COLLECTION_HANDLE
} from "@/lib/api";
import { ProductEdge } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { ArrowRight, Loader2, Minus, Plus, ShoppingBag, Package } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCardCompact } from "@/components/ProductCardCompact";
import { BundleContentCard } from "@/components/BundleContentCard";
import { ROUTES, buildCollectionPath, buildProductPath } from "@/lib/routes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorFallback } from "@/components/ErrorFallback";
import { LazyImage } from "@/components/LazyImage";
import { ProductImageLayout } from "@/components/ProductImageLayout";
import { ProductExtraCarousel } from "@/components/ProductExtraCarousel";
import { parseImageLayout, getProductCarouselConfig, getProductImageLayoutOverride } from "@/lib/productImageLayouts";
import { getBundleContents, getBundlesForProduct, BUNDLE_CONTENTS } from "@/lib/productProperties";
import DOMPurify from "dompurify";

/**
 * For bundle products, replace product names in description HTML with clickable links
 */
function linkifyBundleDescription(html: string, bundleHandle: string): string {
  const contents = BUNDLE_CONTENTS[bundleHandle];
  if (!contents) return html;
  
  let result = html;
  for (const item of contents) {
    const productPath = `/site/product/${item.handle}`;
    const names = [item.displayName, ...(item.descriptionAliases || [])];
    // Sort by length descending to match longer names first
    names.sort((a, b) => b.length - a.length);
    for (const name of names) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Replace text that is NOT already inside an <a> tag
      result = result.replace(
        new RegExp(`(?!<a[^>]*>.*?)${escapedName}(?![^<]*<\\/a>)`, 'g'),
        `<a href="${productPath}" style="text-decoration:underline;cursor:pointer">${name}</a>`
      );
    }
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

  // Fetch bundles (מארזים collection) - only for non-bundle products
  const { data: bundlesData } = useQuery({
    queryKey: ['bundles-collection'],
    queryFn: async () => {
      return await getProducts('מארזים');
    },
    enabled: !isBundle
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

  // Fetch product recommendations (for "אימהות מוסיפות גם" section)
  const { data: relatedProductsData } = useQuery({
    queryKey: ['product-recommendations', data?.id],
    queryFn: async () => {
      if (!data?.id) return [];
      return await getProductRecommendations(data.id);
    },
    enabled: !!data?.id
  });

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
      action: {
        label: 'ביטול',
        onClick: () => {
          useCartStore.getState().updateQuantity(variant.id, 
            (useCartStore.getState().items.find(i => i.variantId === variant.id)?.quantity || quantity) - quantity
          );
          toast.info('המוצר הוסר מהעגלה');
        }
      }
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
          <p className="text-destructive mb-4">שגיאה בטעינת המוצר</p>
          <Button variant="outline" onClick={() => navigate(ROUTES.home)}>
            <ArrowRight className="ml-2 h-4 w-4" />
            חזרה לעמוד הראשי
          </Button>
        </div>
      </div>
    );
  }

  const selectedVariant = data.variants.edges[selectedVariantIndex]?.node;
  const images = data.images.edges;
  const price = parseFloat(selectedVariant?.price.amount || data.priceRange.minVariantPrice.amount);
  const relevantBundleHandles = handle ? getBundlesForProduct(handle) : [];
  const bundles = (bundlesData || []).filter((bundle: ProductEdge) =>
    relevantBundleHandles.length > 0
      ? relevantBundleHandles.includes(bundle.node.handle)
      : true
  );
  // Filter out products that are already in this bundle from recommendations
  const bundleContentHandles = isBundle && handle ? (getBundleContents(handle) || []).map(item => item.handle) : [];
  const relatedProducts = (relatedProductsData || []).filter((product: ProductEdge) =>
    !bundleContentHandles.includes(product.node.handle)
  );

  // For bundles: use bundle items from DB
  const bundleContents = isBundle && bundleItemsData
    ? bundleItemsData.map(item => ({ node: item.product }))
    : [];

  // Parse image layout from metafield, or use override if exists
  // Bundle products get a special 2-stacked layout (images 3 & 4 only)
  const imageLayout = isBundle
    ? { type: "grid-2-left-carousel-right" as const, mainImages: [2, 3], carouselImages: [4, 5, 6], aspectRatios: ["4/3", "4/3"], description: "2 stacked left, carousel right" }
    : getProductImageLayoutOverride(handle || '') || parseImageLayout(data.imageLayout);

  // Get carousel configuration if this product has extra carousel
  const carouselConfig = getProductCarouselConfig(handle || '');

  return (
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
          <div className="order-2 md:order-1 md:col-span-3 space-y-5" dir="rtl">
            <div>
              <h1 className="text-[28px] md:text-3xl mb-1">{data.title}</h1>
              {data.vendor && (
                <p className="text-muted-foreground text-base">{data.vendor}</p>
              )}
              <p className="text-xl md:text-2xl mt-3">₪{price.toFixed(0)}</p>
            </div>

            {/* Desktop Add to Cart with Quantity */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center border border-border">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="p-2 hover:bg-muted transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-3 min-w-[2.5rem] text-center">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  className="p-2 hover:bg-muted transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              <Button
                className="text-lg"
                onClick={handleAddToCart}
                disabled={!selectedVariant?.availableForSale}
              >
                {selectedVariant?.availableForSale ? `הוספה לעגלה · ₪${price.toFixed(0)}` : 'אזל מהמלאי'}
              </Button>
            </div>

            {/* Variant Selection */}
            {data.variants.edges.length > 1 && (
              <div>
                <label className="block text-sm md:text-base font-medium mb-2">
                  בחר אפשרות
                </label>
                <div className="flex flex-wrap gap-2">
                  {data.variants.edges.map((edge: any, index: number) => (
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
            {(data.descriptionHtml || data.description) && (
              <div className="pt-4 border-t border-border">
                {data.descriptionHtml ? (
                  <div 
                    dir="rtl"
                    className="text-muted-foreground text-lg leading-snug prose prose-lg max-w-none [&>p]:mb-0 [&>br]:block [&>br]:mb-0 [&_a]:text-foreground [&_a]:underline [&_a]:hover:opacity-70 [&_a]:transition-opacity [&_ul]:list-none [&_ul]:p-0 [&_li]:block [&_li]:mb-0 [&_.desc-highlight]:bg-muted/50 [&_.desc-highlight]:p-3 [&_.desc-highlight]:-mx-1 [&_.desc-highlight]:rounded-sm [&_.desc-highlight]:my-2"
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
                        const linkedHtml = isBundle ? linkifyBundleDescription(fixedHtml, handle || '') : fixedHtml;
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
            )}

          </div>

          {/* Right Column - Images Grid (visually on left in RTL) */}
          <div className="order-1 md:order-2 md:col-span-9">
            <ProductImageLayout
              images={images}
              productTitle={data.title}
              layout={imageLayout}
              selectedImageIndex={selectedImageIndex}
              onImageClick={(index) => { setSelectedImageIndex(index); setLightboxOpen(true); }}
            />
            {/* Extra row of images 6-9 for p1 only */}
            {handle === 'p1' && images.length >= 9 && (
              <>
                {/* Mobile: 3 images in a row */}
                <div className="grid grid-cols-3 gap-1 mt-1 md:hidden">
                  {[5, 6, 7].map((imgIndex) => {
                    const img = images[imgIndex];
                    if (!img) return null;
                    return (
                      <button
                        key={imgIndex}
                        onClick={() => { setSelectedImageIndex(imgIndex); setLightboxOpen(true); }}
                        className="overflow-hidden bg-secondary/10 hover:opacity-90 transition-all aspect-[4/5]"
                      >
                        <LazyImage
                          src={img.node.url}
                          alt={img.node.altText || `${data.title} ${imgIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
                {/* Desktop: Grid */}
                <div className="hidden md:grid grid-cols-4 gap-1 mt-1">
                  {[5, 6, 7, 8].map((imgIndex) => {
                    const img = images[imgIndex];
                    if (!img) return null;
                    return (
                      <button
                        key={imgIndex}
                        onClick={() => { setSelectedImageIndex(imgIndex); setLightboxOpen(true); }}
                        className="overflow-hidden bg-secondary/10 hover:opacity-90 transition-all aspect-[4/5]"
                      >
                        <LazyImage
                          src={img.node.url}
                          alt={img.node.altText || `${data.title} ${imgIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Extra Product Carousel (if configured) */}
      {carouselConfig && (
        <ErrorBoundary fallback={<div className="py-8"><ErrorFallback message="שגיאה בטעינת תמונות נוספות" /></div>}>
          <ProductExtraCarousel
            images={images}
            productTitle={data.title}
            config={carouselConfig}
          />
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
                <ProductCardCompact key={bundle.node.id} product={bundle} />
              ))}
            </div>
          </div>
        </section>
        </ErrorBoundary>
      )}

      {/* Section 5: Frequently Bought Together */}
      {relatedProducts.length > 0 && (
        <ErrorBoundary fallback={<div className="py-8"><ErrorFallback message="שגיאה בטעינת המוצרים הקשורים" /></div>}>
          <section className="py-12 md:py-16 bg-secondary/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
            <h2 className="text-[28px] md:text-3xl text-right mb-8">
              אימהות מוסיפות גם
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((product: ProductEdge) => (
                <ProductCardCompact key={product.node.id} product={product} alignment="end" />
              ))}
            </div>
          </div>
        </section>
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
          images={data.images.edges.map((e: any) => ({ url: e.node.url, altText: e.node.altText }))}
          currentIndex={selectedImageIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setSelectedImageIndex}
        />
      )}
      <Footer />
    </div>
  );
}
