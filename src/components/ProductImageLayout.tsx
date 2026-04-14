/**
 * ProductImageLayout Component
 *
 * Flexible image layout renderer that supports multiple layout types
 * configured via the product's image_layout field.
 */

import { useEffect, useState } from "react";
import { LazyImage } from "@/components/LazyImage";
import { ImageLayoutConfig } from "@/lib/productImageLayouts";
import { getProductDetailGridImageUrl } from "@/lib/imageTransforms";
import { cn } from "@/lib/utils";

interface ProductImageNode {
  node: {
    url: string;
    altText: string | null;
  };
}

interface ProductImageLayoutProps {
  /** Product images */
  images: ProductImageNode[];
  /** Product title for alt text */
  productTitle: string;
  /** Layout configuration from metafield or default */
  layout: ImageLayoutConfig;
  /** Currently selected image index */
  selectedImageIndex: number;
  /** Callback when image is clicked */
  onImageClick: (index: number) => void;
}

export const ProductImageLayout: React.FC<ProductImageLayoutProps> = ({
  images,
  productTitle,
  layout,
  selectedImageIndex,
  onImageClick,
}) => {
  const carouselIndices =
    layout.type === "grid-2-left-carousel-right" ? layout.carouselImages || [] : [];
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    setCarouselIdx(0);
  }, [layout.type, carouselIndices.length]);

  useEffect(() => {
    if (layout.type !== "grid-2-left-carousel-right" || carouselIndices.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setCarouselIdx((prev) => (prev + 1) % carouselIndices.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [layout.type, carouselIndices.length]);

  const getImageButtonLabel = (imageIndex: number) =>
    `פתחי תמונה ${imageIndex + 1} של ${productTitle}`;

  // Helper to render a single image
  const renderImage = (imageIndex: number, aspectRatio: string, className?: string) => {
    const image = images[imageIndex];
    if (!image) return null;

    return (
      <button
        key={imageIndex}
        onClick={() => onImageClick(imageIndex)}
        className={cn(
          "overflow-hidden bg-secondary/10 transition-all relative",
          "hover:opacity-90",
          className
        )}
        style={{ aspectRatio: aspectRatio.replace("/", " / ") }}
        aria-label={getImageButtonLabel(imageIndex)}
      >
        <LazyImage
          src={getProductDetailGridImageUrl(image.node.url)}
          alt={image.node.altText || `${productTitle} ${imageIndex + 1}`}
          className="w-full h-full object-cover"
          priority={imageIndex === layout.mainImages[0]}
        />
      </button>
    );
  };

  // Render based on layout type
  const renderLayout = () => {
    switch (layout.type) {
      case "grid-2x2":
        return (
          <div className="grid grid-cols-2 gap-1">
            {layout.mainImages.map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i])
            )}
          </div>
        );

      case "grid-2-large-2-small":
        return (
          <div className="grid grid-cols-2 gap-1">
            {/* Top row - 2 large images */}
            {layout.mainImages.slice(0, 2).map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i])
            )}
            {/* Bottom row - 2 smaller images */}
            {layout.mainImages.slice(2, 4).map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i + 2])
            )}
          </div>
        );

      case "grid-hero-bottom":
        return (
          <div className="grid grid-cols-2 gap-1">
            {/* Hero image spans full width */}
            {renderImage(layout.mainImages[0], layout.aspectRatios[0], "col-span-2")}
            {/* Bottom row - 2 smaller images */}
            {layout.mainImages.slice(1, 3).map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i + 1])
            )}
          </div>
        );

      case "grid-3x1":
        return (
          <div className="grid grid-cols-3 gap-1">
            {layout.mainImages.slice(0, 3).map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i])
            )}
          </div>
        );

      case "grid-1-2-1":
        return (
          <div className="grid grid-cols-2 gap-1">
            {/* Top - 1 image full width */}
            {renderImage(layout.mainImages[0], layout.aspectRatios[0], "col-span-2")}
            {/* Middle - 2 images */}
            {layout.mainImages.slice(1, 3).map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i + 1])
            )}
            {/* Bottom - 1 image full width */}
            {renderImage(layout.mainImages[3], layout.aspectRatios[3], "col-span-2")}
          </div>
        );

      case "grid-2-1-3-2":
        return (
          <div className="grid grid-cols-2 gap-1">
            {/* First row - 2 large images side by side */}
            {layout.mainImages.slice(0, 2).map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i], "col-span-1")
            )}
            {/* Second row - 1 medium image full width */}
            {renderImage(layout.mainImages[2], layout.aspectRatios[2], "col-span-2")}
            {/* Third row - 3 small images (mobile: 1 col, tablet+: 3 cols) */}
            <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-1">
              {layout.mainImages.slice(3, 6).map((imageIndex, i) =>
                renderImage(imageIndex, layout.aspectRatios[i + 3])
              )}
            </div>
            {/* Fourth row - 2 images centered */}
            <div className="col-span-2 grid grid-cols-2 gap-1 max-w-xl mx-auto">
              {layout.mainImages.slice(6, 8).map((imageIndex, i) =>
                renderImage(imageIndex, layout.aspectRatios[i + 6])
              )}
            </div>
          </div>
        );

      case "grid-2-2-4":
        return (
          <div className="grid grid-cols-2 gap-1">
            {/* First row - 2 images */}
            {layout.mainImages.slice(0, 2).map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i], "col-span-1")
            )}
            {/* Second row - 2 images */}
            {layout.mainImages.slice(2, 4).map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i + 2], "col-span-1")
            )}
            {/* Third row - 4 small images (2 cols on mobile, 4 cols on desktop) */}
            <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-1">
              {layout.mainImages.slice(4, 8).map((imageIndex, i) =>
                renderImage(imageIndex, layout.aspectRatios[i + 4])
              )}
            </div>
          </div>
        );

      case "grid-2-left-1-right": {
        const rightImage = images[layout.mainImages[2]];
        if (!rightImage) {
          // Fallback to 2x2 grid if not enough images
          return (
            <div className="grid grid-cols-2 gap-1">
              {layout.mainImages.slice(0, 4).map((imageIndex, i) =>
                renderImage(imageIndex, layout.aspectRatios[i] || "10/7")
              )}
            </div>
          );
        }
        return (
          <div className="grid grid-cols-2 gap-1 items-end">
            {/* Left column - 2 stacked images */}
            <div className="flex flex-col gap-1">
              {renderImage(layout.mainImages[0], layout.aspectRatios[0])}
              {renderImage(layout.mainImages[1], layout.aspectRatios[1])}
            </div>
            {/* Right column - 1 tall image that matches left column height */}
            <div className="h-full flex items-end">
              <button
                onClick={() => onImageClick(layout.mainImages[2])}
                className="overflow-hidden bg-secondary/10 transition-all relative w-full h-full hover:opacity-90"
                aria-label={getImageButtonLabel(layout.mainImages[2])}
              >
                <LazyImage
                  src={getProductDetailGridImageUrl(rightImage.node.url)}
                  alt={rightImage.node.altText || `${productTitle} 3`}
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          </div>
        );
      }

      case "grid-1-2-right": {
        // Layout: 1 top-left, 2 bottom-left side-by-side, 1 tall right
        const rightImage = images[layout.mainImages[3]];
        if (!rightImage) {
          // Fallback to 2x2 grid if not enough images
          return (
            <div className="grid grid-cols-2 gap-1">
              {layout.mainImages.slice(0, 4).map((imageIndex, i) =>
                renderImage(imageIndex, layout.aspectRatios[i] || "10/7")
              )}
            </div>
          );
        }
        return (
          <div className="grid grid-cols-2 gap-1 items-end">
            {/* Left column - 1 top + 2 bottom side-by-side */}
            <div className="flex flex-col gap-1">
              {renderImage(layout.mainImages[0], layout.aspectRatios[0])}
              <div className="grid grid-cols-2 gap-1">
                {renderImage(layout.mainImages[1], layout.aspectRatios[1])}
                {renderImage(layout.mainImages[2], layout.aspectRatios[2])}
              </div>
            </div>
            {/* Right column - 1 tall image that matches left column height */}
            <div className="h-full flex items-end">
              <button
                onClick={() => onImageClick(layout.mainImages[3])}
                className="overflow-hidden bg-secondary/10 transition-all relative w-full h-full hover:opacity-90"
                aria-label={getImageButtonLabel(layout.mainImages[3])}
              >
                <LazyImage
                  src={getProductDetailGridImageUrl(rightImage.node.url)}
                  alt={rightImage.node.altText || `${productTitle} 4`}
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          </div>
        );
      }

      case "grid-2-stacked":
        return (
          <div className="flex flex-col gap-1 max-w-[50%]">
            {layout.mainImages.map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i])
            )}
          </div>
        );
      case "grid-2-left-carousel-right": {
        const currentCarouselImage = images[carouselIndices[carouselIdx]];
        if (!currentCarouselImage) {
          return (
            <div className="flex flex-col gap-1 max-w-[50%]">
              {layout.mainImages.map((imageIndex, i) =>
                renderImage(imageIndex, layout.aspectRatios[i])
              )}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-2 gap-1 items-stretch">
            {/* Left column - 2 stacked images */}
            <div className="flex flex-col gap-1">
              {renderImage(layout.mainImages[0], layout.aspectRatios[0])}
              {renderImage(layout.mainImages[1], layout.aspectRatios[1])}
            </div>
            {/* Right column - carousel that fills the full height */}
            <div className="relative h-full overflow-hidden bg-secondary/10">
              <button
                type="button"
                onClick={() => onImageClick(carouselIndices[carouselIdx])}
                className="w-full h-full"
                aria-label={getImageButtonLabel(carouselIndices[carouselIdx])}
              >
                <LazyImage
                  src={getProductDetailGridImageUrl(currentCarouselImage.node.url)}
                  alt={currentCarouselImage.node.altText || `${productTitle} ${carouselIndices[carouselIdx] + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-500"
                />
              </button>
              {/* Dots indicator */}
              {carouselIndices.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {carouselIndices.map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setCarouselIdx(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        i === carouselIdx ? "bg-foreground" : "bg-foreground/30"
                      )}
                      aria-label={`הציגי תמונה ${carouselIndices[i] + 1} של ${productTitle}`}
                      aria-pressed={i === carouselIdx}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }


        // Custom layout - render in 2-column grid with custom aspect ratios
        return (
          <div className="grid grid-cols-2 gap-1">
            {layout.mainImages.map((imageIndex, i) => {
              const aspectRatio = layout.aspectRatios[i] || "10/7";
              // Check if this image should span full width (aspect ratio contains "full")
              const isFullWidth = aspectRatio.includes("full");
              return renderImage(
                imageIndex,
                aspectRatio.replace("-full", ""),
                isFullWidth ? "col-span-2" : undefined
              );
            })}
          </div>
        );

      default:
        // Fallback to 2x2 grid
        return (
          <div className="grid grid-cols-2 gap-1">
            {layout.mainImages.slice(0, 4).map((imageIndex, i) =>
              renderImage(imageIndex, layout.aspectRatios[i] || "10/7")
            )}
          </div>
        );
    }
  };

  return <div className="product-image-layout">{renderLayout()}</div>;
};
