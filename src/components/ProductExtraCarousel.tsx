/**
 * ProductExtraCarousel Component
 *
 * Displays additional product images in a horizontal carousel format.
 * Used for products that need to showcase extra details beyond main images.
 */

import { LazyImage } from "@/components/LazyImage";
import { ProductExtraCarouselConfig, FeatureIconType } from "@/lib/productImageLayouts";
import { getProductDetailGridImageUrl } from "@/lib/imageTransforms";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import clockIcon from "@/assets/clock-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import smileyIcon from "@/assets/smiley-icon.png";

interface ProductImageNode {
  node: {
    url: string;
    altText: string | null;
  };
}

interface ProductExtraCarouselProps {
  /** All product images */
  images: ProductImageNode[];
  /** Product title for alt text */
  productTitle: string;
  /** Carousel configuration */
  config: ProductExtraCarouselConfig;
}

const getIconSrc = (iconType: FeatureIconType): string => {
  switch (iconType) {
    case 'clock':
      return clockIcon;
    case 'heart':
      return heartIcon;
    case 'smiley':
      return smileyIcon;
    default:
      return clockIcon;
  }
};

export const ProductExtraCarousel: React.FC<ProductExtraCarouselProps> = ({
  images,
  productTitle,
  config,
}) => {
  // Extract carousel images based on config indices
  const carouselImages = images.slice(
    config.carouselImageStartIndex,
    config.carouselImageEndIndex
  );

  // Don't render if no images available
  if (carouselImages.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-10 bg-secondary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
        {/* Section Title */}
        <h2 className="text-2xl md:text-3xl text-right mb-8">
          {config.carouselTitle}
        </h2>

        {/* Features List with Icons */}
        {config.features && config.features.length > 0 && (
          <div className="mb-10 flex flex-col md:flex-row md:flex-wrap justify-start gap-y-2 md:gap-x-6 md:gap-y-3">
            {config.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-foreground">
                <img 
                  src={getIconSrc(feature.icon)} 
                  alt="" 
                  className="w-5 h-5 opacity-70"
                />
                <span className="text-sm md:text-base">{feature.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Optional Description Text */}
        {config.descriptionText && (
          <div className="max-w-4xl mb-10">
            {config.descriptionText.split('\n\n').map((paragraph, index) => (
              <p
                key={index}
                className="text-lg md:text-xl text-foreground leading-relaxed text-right mb-6 last:mb-0"
              >
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* Horizontal Carousel - All images in one line */}
        <Carousel
          opts={{
            align: "start",
            loop: true,
            dragFree: true,
            direction: "rtl",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {carouselImages.map((image, index) => {
              const absoluteIndex = config.carouselImageStartIndex + index;
              return (
                <CarouselItem
                  key={absoluteIndex}
                  className="pl-3 basis-[65%] sm:basis-[30%] md:basis-[22%] lg:basis-[18%]"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-secondary/10">
                    <LazyImage
                      src={getProductDetailGridImageUrl(image.node.url)}
                      alt={
                        image.node.altText ||
                        `${productTitle} - ${config.carouselTitle} ${index + 1}`
                      }
                      objectFit="contain"
                    />
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          {!config.hideArrows && (
            <>
              <CarouselPrevious className="hidden md:flex -left-4" />
              <CarouselNext className="hidden md:flex -right-4" />
            </>
          )}
        </Carousel>
      </div>
    </section>
  );
};
