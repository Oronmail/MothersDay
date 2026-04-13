import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { ProductEdge } from "@/lib/types";
import { buildProductPath } from "@/lib/routes";
import { LazyImage } from "./LazyImage";
import { useAddToCart } from "@/hooks/useAddToCart";
import { getProductProperties } from "@/lib/productProperties";
import { WishlistButton } from "./WishlistButton";

interface ProductCardCompactProps {
  product: ProductEdge;
  alignment?: 'center' | 'end';
}

export function ProductCardCompact({ product, alignment = 'center' }: ProductCardCompactProps) {
  const [isHovered, setIsHovered] = useState(false);
  const productData = product.node;
  const primaryImage = productData.images.edges[0]?.node;
  const secondaryImage = productData.images.edges[1]?.node;
  const variant = productData.variants.edges[0]?.node;
  const price = parseFloat(variant?.price.amount || productData.priceRange.minVariantPrice.amount);
  const productProps = getProductProperties(productData.title);

  // Use the custom add-to-cart hook
  const { quantity, incrementQuantity, decrementQuantity, handleAddToCart } = useAddToCart({
    product,
    variant,
  });

  const onAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddToCart();
  };

  const handleQuantityChange = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (delta > 0) {
      incrementQuantity();
    } else {
      decrementQuantity();
    }
  };

  return (
    <Link 
      to={buildProductPath(productData.handle)}
      className="flex flex-col h-full w-full group animate-fade-in"
    >
      {/* Image Container */}
      <div 
        className="relative overflow-hidden bg-secondary/30 cursor-pointer transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/10 aspect-[3/4]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {primaryImage ? (
          <>
            <LazyImage
              src={primaryImage.url}
              alt={primaryImage.altText || productData.title}
              className={`absolute inset-0 transition-all duration-500 ${isHovered ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}
            />
            {secondaryImage && (
              <LazyImage
                src={secondaryImage.url}
                alt={secondaryImage.altText || `${productData.title} - hover`}
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

        {/* Wishlist button */}
        <div className="absolute top-2 left-2 z-10">
          <WishlistButton productId={productData.id} size={16} className="bg-white/80 hover:bg-white shadow-sm" />
        </div>
      </div>

      {/* Product Info */}
      <div className="pt-2 md:pt-4 flex flex-col gap-0.5 md:gap-1" dir="rtl">
        {/* Title */}
        <h3 className="font-medium text-xs md:text-base leading-tight line-clamp-2 text-right transition-colors duration-200 group-hover:text-primary">
          {productData.title}
        </h3>

        {/* Product Properties - 2 rows: numbers on top, labels below */}
        {productProps && (
          <div className="flex gap-2 md:gap-3 mt-1 justify-start">
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
        
        {/* Quantity Selector and Add to Cart */}
        <div className={`flex gap-4 md:gap-6 mt-1.5 md:mt-3 items-center ${alignment === 'end' ? 'justify-end' : 'justify-center'} px-2 md:px-4`} dir="ltr">
          {/* Quantity Selector */}
          <div className="flex items-center border border-border h-6 md:h-7">
            <button
              onClick={(e) => handleQuantityChange(e, -1)}
              className="w-6 md:w-7 h-full flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </button>
            <span className="w-5 md:w-6 text-center text-[11px] md:text-sm font-medium">{quantity}</span>
            <button
              onClick={(e) => handleQuantityChange(e, 1)}
              className="w-6 md:w-7 h-full flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </button>
          </div>
          
          {/* Add to Cart Button with Price */}
          <Button
            onClick={onAddToCart}
            className="text-[11px] md:text-[13px] font-normal h-6 md:h-7 px-3 md:px-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] gap-0.5"
            variant="default"
            size="sm"
          >
            <span>₪ {price.toFixed(0)}</span>
            <span className="mx-0.5">-</span>
            <span>הוספה לעגלה</span>
          </Button>
        </div>
      </div>
    </Link>
  );
}
