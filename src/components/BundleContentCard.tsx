import { useNavigate } from "react-router-dom";
import { ProductEdge } from "@/lib/types";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { buildProductPath } from "@/lib/routes";
import { LazyImage } from "./LazyImage";
import { useAddToCart } from "@/hooks/useAddToCart";

interface BundleContentCardProps {
  product: ProductEdge;
}

export const BundleContentCard = ({ product }: BundleContentCardProps) => {
  const navigate = useNavigate();
  const { node } = product;
  const primaryImage = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;
  const variant = node.variants.edges[0]?.node;

  // Use the custom add-to-cart hook
  const { handleAddToCart } = useAddToCart({
    product,
    variant,
  });

  const onAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleAddToCart(1); // Always add 1 item for bundle cards
  };

  return (
    <div 
      className="group bg-card border border-border overflow-hidden hover:shadow-lg transition-all cursor-pointer"
      onClick={() => navigate(buildProductPath(node.handle))}
    >
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 overflow-hidden bg-secondary/20">
          {primaryImage ? (
            <LazyImage
              src={primaryImage.url}
              alt={primaryImage.altText || node.title}
              className="group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              אין תמונה
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 flex flex-col justify-between min-w-0" dir="rtl">
          <div>
            <h4 className="font-medium text-sm md:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {node.title}
            </h4>
            {node.vendor && (
              <p className="text-muted-foreground text-xs mt-0.5">{node.vendor}</p>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm md:text-base">
              ₪{parseFloat(price.amount).toFixed(0)}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 gap-1 text-xs"
              onClick={onAddToCart}
            >
              <Plus className="h-3 w-3" />
              הוספה
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
