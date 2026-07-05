import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { Pause, Play } from "lucide-react";
import { buildProductPath } from "@/lib/routes";
import { getProductCardsByHandles } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

interface VideoFile {
  name: string;
  url: string;
  poster: string;
}

// Maps each carousel video -> its product handle.
// `title` is only a fallback for the brief loading moment — the real title and price
// are pulled live from Supabase by handle (see getProductCardsByHandles), so the label
// can never drift from the actual product again.
const VIDEO_PRODUCT_MAP: Record<string, { title: string; handle: string; cropBorder?: boolean }> = {
  "HP_VCarousel_1": { title: "מחברת יום האם לניהול משימות קבועות", handle: "p1" },
  "HP_VCarousel_2": { title: "לוח משפחתי שבועי", handle: "לוח-משפחתי-שבועי" },
  "HP_VCarousel_3": { title: "תכנון ארוחות משפחתי שבועי", handle: "p3" },
  "HP_VCarousel_4": { title: "לוח שבועי", handle: "p4", cropBorder: true },
  "HP_VCarousel_5": { title: "רשימת קניות / סידורים", handle: "p5" },
};

// Display order = the order of this array (RTL direction handled by the carousel).
// To reorder the carousel, just move items up/down in this list.
const CAROUSEL_VIDEOS: VideoFile[] = [
  {
    name: 'HP_VCarousel_5',
    url: '/videos/HomeVideoCarousel/HP_VCarousel_5.mp4',
    poster: '/videos/HomeVideoCarousel/posters/HP_VCarousel_5.webp',
  },
  {
    name: 'HP_VCarousel_1',
    url: '/videos/HomeVideoCarousel/HP_VCarousel_1.mp4',
    poster: '/videos/HomeVideoCarousel/posters/HP_VCarousel_1.webp',
  },
  {
    name: 'HP_VCarousel_2',
    url: '/videos/HomeVideoCarousel/HP_VCarousel_2.mp4',
    poster: '/videos/HomeVideoCarousel/posters/HP_VCarousel_2.webp',
  },
  {
    name: 'HP_VCarousel_3',
    url: '/videos/HomeVideoCarousel/HP_VCarousel_3.mp4',
    poster: '/videos/HomeVideoCarousel/posters/HP_VCarousel_3.webp',
  },
  {
    name: 'HP_VCarousel_4',
    url: '/videos/HomeVideoCarousel/HP_VCarousel_4.mp4',
    poster: '/videos/HomeVideoCarousel/posters/HP_VCarousel_4.webp',
  },
];

const VideoItem = ({
  video,
  card,
}: {
  video: VideoFile;
  card?: { title: string; price: string };
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isMobile = useIsMobile();

  // Extract filename without extension to match with map
  const videoKey = video.name.replace(/\.[^/.]+$/, "");
  const productInfo = VIDEO_PRODUCT_MAP[videoKey];
  const handle = productInfo?.handle;
  // Live product data (from Supabase) wins; the map title is only a loading fallback.
  const title = card?.title || productInfo?.title;
  const price = card?.price;

  const goToProduct = () => {
    if (handle) navigate(buildProductPath(handle));
  };

  const handleMouseEnter = () => {
    if (isMobile || !videoRef.current) return;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const handleMouseLeave = () => {
    if (isMobile || !videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const handleMobileToggle = () => {
    if (!isMobile || !videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div
      className={`aspect-[9/16] bg-muted overflow-hidden relative group ${
        !isMobile && handle ? "cursor-pointer" : ""
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={!isMobile ? goToProduct : undefined}
    >
      <video
        ref={videoRef}
        src={video.url}
        poster={video.poster}
        className={`w-full h-full object-cover ${productInfo?.cropBorder ? 'scale-[1.08]' : ''}`}
        muted
        loop
        playsInline
        preload="none"
      />

      {/* Mobile: tap the video area to preview the clip */}
      {isMobile && (
        <button
          type="button"
          onClick={handleMobileToggle}
          aria-label={
            isPlaying
              ? `עצרי סרטון של ${title || "המוצר"}`
              : `נגני סרטון של ${title || "המוצר"}`
          }
          className={`absolute z-10 flex items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/45 ${
            isPlaying
              ? "top-2 left-2 h-10 w-10 backdrop-blur-sm"
              : "inset-0 h-full w-full rounded-none"
          }`}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-white" />
          ) : (
            <Play className="h-6 w-6 fill-white" />
          )}
        </button>
      )}

      {/* Always-visible shoppable caption: product name + price, links to the product */}
      {(title || price) && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 pointer-events-none bg-gradient-to-t from-black/75 via-black/30 to-transparent pt-10 pb-2 px-2.5"
          dir="rtl"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToProduct();
            }}
            className="pointer-events-auto block w-full text-right text-white focus:outline-none"
            aria-label={title ? `עברי לעמוד המוצר ${title}` : "עברי לעמוד המוצר"}
          >
            {title && (
              <span className="block text-[13px] md:text-sm font-medium leading-tight line-clamp-2">
                {title}
              </span>
            )}
            <span className="mt-0.5 flex items-center justify-between gap-2">
              {price ? (
                <span className="text-xs md:text-sm font-semibold">
                  ₪{parseFloat(price).toFixed(0)}
                </span>
              ) : (
                <span />
              )}
              <span className="text-[11px] text-white/90 transition-opacity duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                לעמוד המוצר ←
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export const VideoCarousel = ({ className }: { className?: string }) => {
  const videos = CAROUSEL_VIDEOS;

  // Pull the real title + price for every mapped product in one query, keyed by handle.
  const handles = videos
    .map((v) => VIDEO_PRODUCT_MAP[v.name.replace(/\.[^/.]+$/, "")]?.handle)
    .filter((h): h is string => Boolean(h));

  const { data: cards } = useQuery({
    queryKey: ["carousel-product-cards", handles],
    queryFn: () => getProductCardsByHandles(handles),
    staleTime: 1000 * 60 * 5,
  });

  if (videos.length === 0) {
    return (
      <section className={`py-12 bg-background ${className || ""}`}>
        <div className="w-[95%] mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <CarouselItem key={item} className="pl-2 md:pl-4 basis-1/3 md:basis-1/5">
                  <div className="aspect-[9/16] bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Video {item}</span>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0" />
            <CarouselNext className="right-0" />
          </Carousel>
        </div>
      </section>
    );
  }

  return (
    <section className={`pt-0 pb-0 md:pb-16 bg-background ${className || ""}`}>
      <div className="px-4 md:w-[95%] md:mx-auto md:px-0">
        <Carousel
          opts={{
            align: "start",
            loop: true,
            dragFree: true,
            direction: "rtl",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {videos.map((video) => {
              const handle = VIDEO_PRODUCT_MAP[video.name.replace(/\.[^/.]+$/, "")]?.handle;
              return (
                <CarouselItem key={video.name} className="pl-3 md:pl-4 basis-[65%] md:basis-1/5">
                  <VideoItem video={video} card={handle ? cards?.[handle] : undefined} />
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex left-0" />
          <CarouselNext className="hidden md:flex right-0" />
        </Carousel>
      </div>
    </section>
  );
};
