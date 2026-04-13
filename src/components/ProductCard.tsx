import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { ShopifyProduct } from "@/lib/shopify";
import { Minus, Plus } from "lucide-react";
import { buildProductPath } from "@/lib/routes";
import { QuickViewModal } from "./QuickViewModal";
import { LazyImage } from "./LazyImage";
import { useAddToCart } from "@/hooks/useAddToCart";
import { getProductProperties } from "@/lib/productProperties";

interface ProductCardProps {
  product: ShopifyProduct;
  isWide?: boolean;
  showDescriptionFirstLine?: boolean;
  largeCarouselMobile?: boolean;
}

export const ProductCard = ({ product, isWide = false, showDescriptionFirstLine = false, largeCarouselMobile = false }: ProductCardProps) => {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const navigate = useNavigate();
  const { node } = product;
  const primaryImage = node.images.edges[0]?.node;
  const secondaryImage = node.images.edges[1]?.node;
  const price = node.priceRange.minVariantPrice;
  const variant = node.variants.edges[0]?.node;
  const productProps = getProductProperties(node.title);
  
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


  return (
    <>
      <div className="flex flex-col h-full w-full group animate-fade-in">
      {/* Image Container - all products use 4/5 aspect ratio */}
      <div
        className="relative overflow-hidden bg-secondary/30 cursor-pointer transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/10 aspect-[4/5]"
        onClick={() => navigate(buildProductPath(node.handle))}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        
        {primaryImage ? (
          <>
            {/* Primary Image */}
            <LazyImage
              src={primaryImage.url}
              alt={primaryImage.altText || node.title}
              className={`absolute inset-0 transition-all duration-500 ${isHovered && secondaryImage ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}
            />
            {/* Hover Image - only if secondary image exists */}
            {secondaryImage && (
              <LazyImage
                src={secondaryImage.url}
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

      </div>
      {/* Product Info */}
      <div className="pt-2 md:pt-4 flex flex-col gap-0.5 md:gap-1 flex-1" dir="rtl">
        {/* Title Row - with price on left for mobile */}
        <div className="flex items-start justify-between min-h-[2.5rem] md:min-h-0">
          <div className="flex-1">
            <h3 className={`font-medium leading-tight line-clamp-2 text-right transition-colors duration-200 group-hover:text-primary ${largeCarouselMobile ? 'text-lg md:text-lg' : 'text-base md:text-lg'}`}>{node.title}</h3>
            {showDescriptionFirstLine && descriptionFirstLine && (
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 text-right">{descriptionFirstLine}</p>
            )}
          </div>
          <span className={`font-medium text-foreground mr-2 md:hidden whitespace-nowrap ${largeCarouselMobile ? 'text-lg' : 'text-base'}`}>{parseFloat(price.amount).toFixed(0)} ש״ח</span>
        </div>

        {/* Product Properties - 2 rows: numbers on top, labels below */}
        {productProps && (
          <div className="hidden md:flex gap-2 md:gap-3 mt-1 justify-start">
            {/* גודל (Size) - rightmost in RTL */}
            <div className="flex flex-col items-center leading-none gap-px">
              <div className="text-sm md:text-base font-medium text-foreground leading-none">{productProps.size}</div>
              <div className="text-[9px] md:text-xs text-muted-foreground leading-none">גודל</div>
            </div>

            {/* דפים (Pages) - center */}
            <div className="flex flex-col items-center leading-none gap-px">
              <div className="text-sm md:text-base font-medium text-foreground leading-none">{productProps.pages}</div>
              <div className="text-[9px] md:text-xs text-muted-foreground leading-none">דפים</div>
            </div>

            {/* עובי דף (Paper Weight) - leftmost in RTL */}
            <div className="flex flex-col items-center leading-none gap-px">
              <div className="text-sm md:text-base font-medium text-foreground leading-none" dir="rtl">
                {productProps.paperWeight} <span className="text-[9px] md:text-xs text-muted-foreground font-normal">גרם</span>
              </div>
              <div className="text-[9px] md:text-xs text-muted-foreground leading-none">עובי דף</div>
            </div>
          </div>
        )}

          {/* Spacer to push buttons to bottom */}
          {!largeCarouselMobile && <div className="flex-1" />}

          {/* Quantity Selector and Add to Cart */}
          <div className={`flex gap-4 md:gap-6 items-center justify-end ${largeCarouselMobile ? 'mt-0.5 md:mt-3' : 'mt-1.5 md:mt-3'}`} dir="ltr">
            {/* Quantity Selector - Left */}
            <div className="flex items-center border border-border h-7 md:h-7 flex-1 md:flex-none justify-center">
              <button
                onClick={(e) => handleQuantityChange(-1, e)}
                className="w-6 md:w-7 h-full flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
              </button>
              <span className={`w-5 md:w-6 text-center font-medium ${largeCarouselMobile ? 'text-base md:text-sm' : 'text-sm md:text-sm'}`}>{quantity}</span>
              <button
                onClick={(e) => handleQuantityChange(1, e)}
                className="w-6 md:w-7 h-full flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
              </button>
            </div>

            {/* Add to Cart Button with Price - Right */}
            <Button
              onClick={onAddToCart}
              className={`font-normal h-7 md:h-7 px-3 md:px-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] gap-0.5 flex-1 md:flex-none ${largeCarouselMobile ? 'text-base md:text-sm' : 'text-sm md:text-sm'}`}
              variant="default"
              size="sm"
            >
              <span className="hidden md:inline">₪ {parseFloat(price.amount).toFixed(0)}</span>
              <span className="hidden md:inline mx-0.5">-</span>
              <span>הוספה לעגלה</span>
            </Button>
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