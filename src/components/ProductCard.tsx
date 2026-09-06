import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ProductEdge } from "@/lib/types";
import { Minus, Plus } from "lucide-react";
import { buildProductPath } from "@/lib/routes";
import { QuickViewModal } from "./QuickViewModal";
import { LazyImage } from "./LazyImage";
import { useAddToCart } from "@/hooks/useAddToCart";
import { getProductSpecs } from "@/lib/productProperties";
import { WishlistButton } from "./WishlistButton";
import { getProductCardImageUrl } from "@/lib/imageTransforms";

interface ProductCardProps {
  product: ProductEdge;
  isWide?: boolean;
  showDescriptionFirstLine?: boolean;
  largeCarouselMobile?: boolean;
  imagePriority?: boolean;
  preloadSecondaryImage?: boolean;
  onPrimaryImageLoad?: () => void;
}

export const ProductCard = ({
  product,
  isWide = false,
  showDescriptionFirstLine = false,
  largeCarouselMobile = false,
  imagePriority = false,
  preloadSecondaryImage = false,
  onPrimaryImageLoad,
}: ProductCardProps) => {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const [hasPrimaryImageLoaded, setHasPrimaryImageLoaded] = useState(false);
  const [shouldLoadSecondaryImage, setShouldLoadSecondaryImage] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { node } = product;
  const productPath = buildProductPath(node.handle);
  const primaryImage = node.images.edges[0]?.node;
  const secondaryImage = node.images.edges[1]?.node;
  const price = node.priceRange.minVariantPrice;
  const variant = node.variants.edges[0]?.node;
  const productProps = getProductSpecs(node);
  
  // Extract first bolded text from HTML description for bundles/sets
  const getFirstBoldText = () => {
    if (!node.descriptionHtml) return '';
    // Match <strong> or <b> tags with optional attributes
    const match = node.descriptionHtml.match(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/i);
    if (match) {
      // Strip any inner HTML tags and return plain text
      return match[2].replace(/<[^>]*>/g, '').trim();
    }
    return '';
  };
  const descriptionFirstLine = getFirstBoldText();

  // Use the custom add-to-cart hook
  const { quantity, incrementQuantity, decrementQuantity, handleAddToCart } = useAddToCart({
    product,
    variant,
  });

  const handleQuantityChange = (delta: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (delta > 0) {
      incrementQuantity();
    } else {
      decrementQuantity();
    }
  };

  const onAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddToCart();
  };

  const handlePrimaryImageLoad = () => {
    setHasPrimaryImageLoaded(true);
    onPrimaryImageLoad?.();

    if (!isMobile && preloadSecondaryImage && secondaryImage) {
      setShouldLoadSecondaryImage(true);
    }
  };

  const handleCardMouseEnter = () => {
    if (isMobile) return;
    if (secondaryImage) {
      setShouldLoadSecondaryImage(true);
    }
    setIsHovered(true);
  };

  const handleCardMouseLeave = () => {
    if (isMobile) return;
    setIsHovered(false);
  };

  const handleCardFocus = () => {
    if (secondaryImage) {
      setShouldLoadSecondaryImage(true);
    }
  };

  useEffect(() => {
    if (!isMobile && preloadSecondaryImage && hasPrimaryImageLoaded && secondaryImage) {
      setShouldLoadSecondaryImage(true);
    }
  }, [hasPrimaryImageLoaded, isMobile, preloadSecondaryImage, secondaryImage]);


  return (
    <>
      <div className="flex flex-col h-full w-full group animate-fade-in">
      {/* Image Container - portrait 4/5 (suits long A4-size products) */}
      <div
        className="relative overflow-hidden bg-secondary/30 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/10 aspect-[4/5]"
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
      >
        <Link
          to={productPath}
          aria-label={`עבור לעמוד המוצר ${node.title}`}
          className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onFocus={handleCardFocus}
        >
          {primaryImage ? (
            <>
              {/* Primary Image */}
              <LazyImage
                src={getProductCardImageUrl(primaryImage.url)}
                alt={primaryImage.altText || node.title}
                className={`absolute inset-0 transition-all duration-500 ${isHovered && secondaryImage ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}
                priority={imagePriority}
                onLoad={handlePrimaryImageLoad}
              />
              {/* Hover Image - only if secondary image exists */}
              {secondaryImage && shouldLoadSecondaryImage && (
                <LazyImage
                  src={getProductCardImageUrl(secondaryImage.url)}
                  alt={secondaryImage.altText || `${node.title} - hover`}
                  className={`absolute inset-0 transition-all duration-500 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              אין תמונה
            </div>
          )}

          {/* Overlay gradient on hover */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
        </Link>

        {/* Wishlist button */}
        <div className="absolute top-2 left-2 z-10">
          <WishlistButton productId={node.id} size={18} className="bg-white/80 hover:bg-white shadow-sm" />
        </div>

      </div>
      {/* Product Info */}
      <div className="pt-2 md:pt-3 flex flex-col flex-1" dir="rtl">
        {/* Title - reserve 2 lines so specs/price align across all cards */}
        <h3 className={`font-medium leading-tight line-clamp-2 text-right min-h-[2.75rem] md:min-h-[3.25rem] transition-colors duration-200 group-hover:text-primary ${largeCarouselMobile ? 'text-xl' : 'text-lg md:text-xl'}`}>
          <Link
            to={productPath}
            aria-label={`עבור לעמוד המוצר ${node.title}`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
          >
            {node.title}
          </Link>
        </h3>
        {showDescriptionFirstLine && descriptionFirstLine && (
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 text-right -mt-1">{descriptionFirstLine}</p>
        )}

        {/* Bundles: what's inside, inline on one line (fills the otherwise-empty spec area). */}
        {node.isBundle && node.bundleContents?.length ? (
          <p className="mt-1 text-xs md:text-sm text-muted-foreground text-right leading-relaxed">
            {node.bundleContents
              .map((item) => (item.quantity > 1 ? `${item.quantity}× ` : '') + item.title)
              .join(' | ')}
          </p>
        ) : null}

        {/* Product Properties - size / pages / weight (mobile + desktop).
            Each value sits in a fixed-height, centered box so the labels below
            always align across cells — even the עובי דף value mixes font sizes
            (number + smaller "גרם"), which would otherwise shift its label down.
            Mobile keeps this row light (smaller, lighter text + tighter gaps);
            desktop stays at the original weight. */}
        {!node.isBundle && productProps && (
          <div className="flex gap-3 md:gap-5 mt-1 justify-start">
            {/* גודל (Size) */}
            {productProps.size && (
              <div className="flex flex-col items-center gap-0.5 md:gap-1">
                <div className="flex items-center h-3.5 md:h-5 text-xs md:text-base font-normal md:font-medium text-foreground leading-none">{productProps.size}</div>
                <div className="text-[0.625rem] md:text-xs text-muted-foreground leading-none">גודל</div>
              </div>
            )}

            {/* דפים (Pages) */}
            {productProps.pages && (
              <div className="flex flex-col items-center gap-0.5 md:gap-1">
                <div className="flex items-center h-3.5 md:h-5 text-xs md:text-base font-normal md:font-medium text-foreground leading-none">{productProps.pages}</div>
                <div className="text-[0.625rem] md:text-xs text-muted-foreground leading-none">דפים</div>
              </div>
            )}

            {/* עובי דף (Paper Weight) */}
            {productProps.paperWeight && (
              <div className="flex flex-col items-center gap-0.5 md:gap-1">
                <div className="flex items-center h-3.5 md:h-5 text-xs md:text-base font-normal md:font-medium text-foreground leading-none whitespace-nowrap" dir="rtl">
                  <span>{productProps.paperWeight} <span className="text-[0.625rem] md:text-xs text-muted-foreground font-normal">גרם</span></span>
                </div>
                <div className="text-[0.625rem] md:text-xs text-muted-foreground leading-none">עובי דף</div>
              </div>
            )}
          </div>
        )}

        {/* Spacer pushes price + cart to the bottom for consistent alignment */}
        <div className="flex-1 min-h-[0.25rem]" />

        {/* Price - above the button, consistent on mobile + desktop
            (kept smaller than the title so the product name stays the hero) */}
        <div className="text-right font-medium text-foreground text-base md:text-lg mb-1.5">
          {parseFloat(price.amount).toFixed(0)} ₪
        </div>

        {/* Quantity Selector and Add to Cart.
            Wide carousel cards keep the row layout; narrow grid cards (collection pages)
            would overflow, so on mobile they stack: quantity on top, full-width button below. */}
        <div className={`flex gap-3 ${largeCarouselMobile ? "items-stretch" : "flex-col-reverse items-center gap-2.5 md:flex-row md:items-stretch md:gap-3"}`}>
          {/* Add to Cart Button - takes remaining width (right side in RTL) */}
          <Button
            onClick={onAddToCart}
            className={`font-normal h-9 px-4 text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${largeCarouselMobile ? "flex-1" : "w-full md:w-auto md:flex-1"}`}
            variant="default"
            size="sm"
            disabled={!variant?.availableForSale}
            aria-label={`הוסיפי את ${node.title} לעגלה`}
          >
            {variant?.availableForSale ? 'הוספה לעגלה' : 'אזל מהמלאי'}
          </Button>

          {/* Quantity Selector — hidden on mobile everywhere (adds to cart as 1;
              adjustable in the cart), shown on desktop. */}
          <div className="items-center border border-border h-9 shrink-0 hidden md:flex">
            <button
              onClick={(e) => handleQuantityChange(-1, e)}
              className="w-8 h-full flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors"
              aria-label={`הפחתי כמות עבור ${node.title}`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center font-medium text-sm">{quantity}</span>
            <button
              onClick={(e) => handleQuantityChange(1, e)}
              className="w-8 h-full flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors"
              aria-label={`הגדילי כמות עבור ${node.title}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <QuickViewModal 
      product={product}
      open={quickViewOpen}
      onOpenChange={setQuickViewOpen}
    />
  </>
  );
};
