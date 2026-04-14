import { useState } from "react";
import { ProductEdge } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LazyImage } from "@/components/LazyImage";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Link } from "react-router-dom";
import { buildProductPath } from "@/lib/routes";
import { useAddToCart } from "@/hooks/useAddToCart";
import {
  getProductDetailImageUrl,
  getProductThumbnailImageUrl,
} from "@/lib/imageTransforms";

interface QuickViewModalProps {
  product: ProductEdge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickViewModal = ({ product, open, onOpenChange }: QuickViewModalProps) => {
  if (!product) return null;

  return (
    <QuickViewModalContent
      product={product}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};

const QuickViewModalContent = ({
  product,
  open,
  onOpenChange,
}: {
  product: ProductEdge;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const data = product.node;
  const selectedVariant = data.variants.edges[selectedVariantIndex]?.node;
  const images = data.images.edges;
  const price = parseFloat(selectedVariant?.price.amount || data.priceRange.minVariantPrice.amount);

  // Use the custom add-to-cart hook
  const { quantity, incrementQuantity, decrementQuantity, handleAddToCart } = useAddToCart({
    product,
    variant: selectedVariant,
    onSuccess: () => onOpenChange(false), // Close modal on success
  });

  const handleQuantityChange = (delta: number) => {
    if (delta > 0) {
      incrementQuantity();
    } else {
      decrementQuantity();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 border-b">
          <DialogTitle className="sr-only">תצוגה מהירה</DialogTitle>
          <Link
            to={buildProductPath(data.handle)}
            className="text-sm text-primary hover:underline"
            onClick={() => onOpenChange(false)}
          >
            צפה בפרטים המלאים
          </Link>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6" dir="rtl">
          {/* Images Column */}
          <div className="space-y-3">
            {/* Main Image */}
            <div className="aspect-square overflow-hidden bg-secondary/10">
              <LazyImage
                src={getProductDetailImageUrl(images[selectedImageIndex]?.node.url)}
                alt={images[selectedImageIndex]?.node.altText || data.title}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            
            {/* Thumbnail Grid */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.slice(0, 4).map((edge, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square overflow-hidden bg-secondary/10 transition-all ${
                      selectedImageIndex === index ? 'ring-2 ring-primary' : 'hover:opacity-75'
                    }`}
                  >
                    <LazyImage
                      src={getProductThumbnailImageUrl(edge.node.url)}
                      alt={edge.node.altText || `${data.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Column */}
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl mb-2">{data.title}</h2>
              {data.vendor && (
                <p className="text-muted-foreground text-sm">{data.vendor}</p>
              )}
              <p className="text-xl mt-3">₪{price.toFixed(0)}</p>
            </div>

            {/* Variant Selection */}
            {data.variants.edges.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  בחר אפשרות
                </label>
                <div className="flex flex-wrap gap-2">
                  {data.variants.edges.map((edge, index) => (
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
            {data.description && (
              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line line-clamp-4">
                  {data.description}
                </p>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="flex items-center gap-3 pt-4">
              <div className="flex items-center border border-border">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="p-2 hover:bg-muted transition-colors"
                  aria-label="הפחת כמות"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 min-w-[3rem] text-center">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  className="p-2 hover:bg-muted transition-colors"
                  aria-label="הוסף כמות"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              <Button
                size="lg"
                className="flex-1"
                onClick={() => handleAddToCart()}
                disabled={!selectedVariant?.availableForSale}
              >
                <ShoppingBag className="h-5 w-5 ml-2" />
                {selectedVariant?.availableForSale ? `הוספה לעגלה · ₪${price.toFixed(0)}` : 'אזל מהמלאי'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
