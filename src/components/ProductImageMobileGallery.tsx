/**
 * ProductImageMobileGallery
 *
 * Mobile-only swipe gallery for planning products & bundles, modelled on Eden's
 * reference:
 * - Slide 1 (the big main): the two landscape shots stacked one above the other,
 *   together reading as a single tall portrait-shaped image.
 * - Then one slide per remaining ("single") image — the portrait styled shot for
 *   planning products, or the three individual shots for bundles (the old right-hand
 *   carousel, broken out into separate swipeable slides).
 * A small peek of the next slide shows on the left (matching the reference), hinting
 * "swipe for more". Square corners, no card/background — photos fill edge to edge.
 * The two landscape shots (3:2) fill each half of the 3/4 frame with no crop.
 *
 * Uses native CSS scroll-snap rather than a JS carousel: the browser handles RTL
 * scrolling correctly (main flush right, peek on the left, no over-scroll past the
 * ends), which embla's rtl mode does not do reliably inside an already-RTL page.
 */

import { LazyImage } from "@/components/LazyImage";
import { getProductDetailGridImageUrl } from "@/lib/imageTransforms";

interface ProductImageNode {
  node: {
    url: string;
    altText: string | null;
  };
}

interface ProductImageMobileGalleryProps {
  images: ProductImageNode[];
  /** The two landscape images stacked together into the main slide */
  stackedIndices: number[];
  /** Each becomes its own slide after the main (portrait shot / bundle shots) */
  singleIndices: number[];
  productTitle: string;
  onImageClick: (index: number) => void;
  /** Optional hero video (mobile only) — shown as the first slide, autoplay/muted/loop */
  videoSrc?: string;
  /** Poster still shown until the video paints */
  videoPoster?: string;
  /** Show the single (portrait) slides before the stacked pair, not after */
  singlesFirst?: boolean;
}

export const ProductImageMobileGallery: React.FC<ProductImageMobileGalleryProps> = ({
  images,
  stackedIndices,
  singleIndices,
  productTitle,
  onImageClick,
  videoSrc,
  videoPoster,
  singlesFirst = false,
}) => {
  const [topIndex, bottomIndex] = stackedIndices;
  const topImage = images[topIndex];
  const bottomImage = images[bottomIndex];
  const singles = singleIndices
    .map((index) => ({ index, image: images[index] }))
    .filter((slide) => !!slide.image);

  if (!topImage || !bottomImage || singles.length === 0) return null;

  const imageButton = (imageIndex: number, image: ProductImageNode) => (
    <button
      type="button"
      onClick={() => onImageClick(imageIndex)}
      className="block w-full h-full overflow-hidden bg-secondary/10"
      aria-label={`פתחי תמונה ${imageIndex + 1} של ${productTitle}`}
    >
      <LazyImage
        src={getProductDetailGridImageUrl(image.node.url)}
        alt={image.node.altText || `${productTitle} ${imageIndex + 1}`}
        className="w-full h-full object-cover"
      />
    </button>
  );

  const stackedSlide = (
    <div className="snap-start shrink-0 basis-[88%]">
      <div className="grid grid-rows-2 gap-1 aspect-[3/4]">
        {imageButton(topIndex, topImage)}
        {imageButton(bottomIndex, bottomImage)}
      </div>
    </div>
  );

  const singleSlides = singles.map(({ index, image }) => (
    <div key={index} className="snap-start shrink-0 basis-[88%]">
      <div className="aspect-[3/4]">{imageButton(index, image)}</div>
    </div>
  ));

  return (
    // RTL flex + native scroll-snap: first slide rests flush right, next slide peeks
    // on the left. snap-mandatory settles cleanly on each slide.
    <div
      dir="rtl"
      className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
    >
      {/* Hero video slide (mobile only), first — autoplay muted loop */}
      {videoSrc && (
        <div className="snap-start shrink-0 basis-[88%]">
          <div className="aspect-[3/4] overflow-hidden bg-secondary/10">
            <video
              className="w-full h-full object-cover"
              src={videoSrc}
              poster={videoPoster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={`סרטון של ${productTitle}`}
            />
          </div>
        </div>
      )}
      {/* singlesFirst: portrait shot before the stacked pair (else the reverse) */}
      {singlesFirst ? (
        <>
          {singleSlides}
          {stackedSlide}
        </>
      ) : (
        <>
          {stackedSlide}
          {singleSlides}
        </>
      )}
    </div>
  );
};
