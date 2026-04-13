import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play } from "lucide-react";
import { buildProductPath } from "@/lib/routes";
import { useIsMobile } from "@/hooks/use-mobile";

interface VideoFile {
  name: string;
  url: string;
}

// Hardcoded mapping: video filename -> product info with custom delay
const VIDEO_PRODUCT_MAP: Record<string, { title: string; handle: string; delay: number; cropBorder?: boolean }> = {
  "HP_VCarousel_1": { title: "מחברת יום האם לניהול משימות קבועות", handle: "p1", delay: 2500 },
  "HP_VCarousel_2": { title: "לוח משפחתי", handle: "p2", delay: 3000 },
  "HP_VCarousel_3": { title: "תכנון ארוחות משפחתי שבועי", handle: "p3", delay: 2000 },
  
  "HP_VCarousel_4": { title: "תכנון ארוחות", handle: "p4", delay: 2500, cropBorder: true },
  "HP_VCarousel_5": { title: "רשימת קניות / סידורים", handle: "p5", delay: 3000 },
  "HP_VCarousel_6": { title: "בלוק תכנון", handle: "p6", delay: 1000 },
};

// Manual order for carousel (right to left in RTL)
const CAROUSEL_ORDER = [
  'רשימת קניות',
  'מחברת',
  'בלוק תכנון',
];

const sortVideosByOrder = (videos: VideoFile[]): VideoFile[] => {
  return [...videos].sort((a, b) => {
    const keyA = a.name.replace(/\.[^/.]+$/, "");
    const keyB = b.name.replace(/\.[^/.]+$/, "");
    const infoA = VIDEO_PRODUCT_MAP[keyA];
    const infoB = VIDEO_PRODUCT_MAP[keyB];
    
    const indexA = CAROUSEL_ORDER.findIndex(title => infoA?.title.includes(title));
    const indexB = CAROUSEL_ORDER.findIndex(title => infoB?.title.includes(title));
    
    // If both are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If only one is in the list, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    // Otherwise keep original order
    return 0;
  });
};

const VideoItem = ({ video }: { video: VideoFile }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showProductName, setShowProductName] = useState(false);
  const isMobile = useIsMobile();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extract filename without extension to match with map
  const videoKey = video.name.replace(/\.[^/.]+$/, "");
  const productInfo = VIDEO_PRODUCT_MAP[videoKey];

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
      // Show product name after custom delay for each video
      if (productInfo) {
        timeoutRef.current = setTimeout(() => {
          setShowProductName(true);
        }, productInfo.delay);
      }
    }
  };

  const handleMouseLeave = () => {
    // Clear timeout to reset the clock
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setShowProductName(false);
    }
  };

  const handleProductClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (productInfo) {
      navigate(buildProductPath(productInfo.handle));
    }
  };
  const handleMobileTap = () => {
    if (!isMobile || !videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setShowProductName(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      if (productInfo) {
        timeoutRef.current = setTimeout(() => setShowProductName(true), productInfo.delay);
      }
    }
  };

  return (
    <div
      className="aspect-[9/16] bg-muted overflow-hidden relative cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleMobileTap}
    >
      <video
        ref={videoRef}
        src={video.url}
        className={`w-full h-full object-cover ${productInfo?.cropBorder ? 'scale-[1.08]' : ''}`}
        muted
        loop
        playsInline
      />

      {/* Play icon overlay - mobile only */}
      {isMobile && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/30 rounded-full p-3 backdrop-blur-sm">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Product name overlay - appears after custom delay */}
      {productInfo && (
        <div
          className={`absolute bottom-2 right-2 transition-all duration-500 ease-in-out ${
            showProductName ? 'opacity-100' : 'opacity-0'
          }`}
          dir="rtl"
        >
          <button
            onClick={handleProductClick}
            className="text-white/50 text-[9px] hover:text-white/70 hover:underline transition-all duration-200 bg-black/15 px-1.5 py-0.5 backdrop-blur-sm"
          >
            {productInfo.title}
          </button>
        </div>
      )}
    </div>
  );
};

export const VideoCarousel = ({ className }: { className?: string }) => {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data: files, error } = await supabase.storage
          .from("videos")
          .list("Clip_Carousel", {
            limit: 100,
            sortBy: { column: "created_at", order: "asc" },
          });

        if (error) {
          console.error("Error fetching videos:", error);
          return;
        }

        if (files && files.length > 0) {
          const videoFiles = files
            .filter((file) => 
              file.name !== ".emptyFolderPlaceholder" && 
              file.name !== ".lovkeep" &&
              file.metadata?.mimetype?.startsWith('video/')
            )
            .map((file) => {
              const { data } = supabase.storage.from("videos").getPublicUrl(`Clip_Carousel/${file.name}`);
              return {
                name: file.name,
                url: data.publicUrl,
              };
            });
          const sortedVideos = sortVideosByOrder(videoFiles);
          setVideos(sortedVideos);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <section className={`py-12 bg-background ${className || ""}`}>
        <div className="w-[95%] mx-auto flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

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
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {videos.map((video) => (
              <CarouselItem key={video.name} className="pl-3 md:pl-4 basis-[65%] md:basis-1/5">
                <VideoItem video={video} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex left-0" />
          <CarouselNext className="hidden md:flex right-0" />
        </Carousel>
      </div>
    </section>
  );
};
