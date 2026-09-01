import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const Hero = () => {
  const [showHover, setShowHover] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();

  // Mobile browsers pause off-screen videos and don't always auto-resume, leaving the
  // hero frozen on a cropped frame after you scroll away and back. Replay on re-entry.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [isMobile]);

  const handleMouseMove = () => {
    setShowHover(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Reduced from 1000ms to 500ms for faster response
    timeoutRef.current = setTimeout(() => {
      setShowHover(false);
    }, 500);
  };

  const handleMouseLeave = () => {
    setShowHover(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <section className="relative w-full mb-0 md:mb-4">
      <Link
        to={ROUTES.allProducts}
        aria-label="צפי בכל המוצרים"
        className="relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onFocus={() => setShowHover(true)}
        onBlur={handleMouseLeave}
      >
        <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center z-10 ${showHover ? 'bg-foreground/20' : 'bg-foreground/0'}`}>
          <span className={`bg-primary/30 text-primary-foreground px-8 py-4 text-lg font-medium transform transition-all duration-300 hover:bg-primary/40 backdrop-blur-sm ${showHover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            צפה בכל המוצרים
          </span>
        </div>
        <div className={`relative w-full overflow-hidden bg-muted ${isMobile ? 'hero-mobile-height' : ''}`} style={isMobile ? undefined : { aspectRatio: '16 / 9' }}>
          <video
            ref={videoRef}
            key={isMobile ? 'hero-mobile' : 'hero-desktop'}
            className={`absolute left-1/2 w-full h-full transition-transform duration-300 ${isMobile ? 'bottom-0' : 'top-1/2'} ${showHover ? 'scale-[1.02]' : 'scale-100'}`}
            style={{ objectFit: 'cover', objectPosition: isMobile ? 'center bottom' : 'center center', transform: isMobile ? 'translateX(-50%)' : 'translate(-50%, -50%)' }}
            autoPlay
            loop
            muted
            playsInline
            // Only the variant for the current device is mounted (useIsMobile is
            // correct on the very first render), and it autoplays immediately -
            // so let it load; the poster paints the frame until playback starts.
            preload="auto"
            poster={isMobile ? '/videos/Hero/hero-mobile-poster.jpg' : '/videos/Hero/hero-drawer-poster.jpg'}
            aria-hidden="true"
          >
            {isMobile ? (
              <>
                <source src="/videos/Hero/hero-mobile.webm" type="video/webm" />
                <source src="/videos/Hero/hero-mobile.mp4" type="video/mp4" />
              </>
            ) : (
              <>
                <source src="/videos/Hero/hero-drawer.webm" type="video/webm" />
                <source src="/videos/Hero/hero-drawer.mp4" type="video/mp4" />
              </>
            )}
          </video>
        </div>
      </Link>
    </section>
  );
};
