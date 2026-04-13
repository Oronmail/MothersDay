import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const Hero = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showHover, setShowHover] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();

  const videoUrl = isMobile
    ? '/videos/Hero/hero mobile 2.mp4'
    : '/videos/Hero/hero22.mp4';

  const handleClick = () => {
    navigate(ROUTES.allProducts);
  };

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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <section
      className="relative w-full cursor-pointer overflow-hidden mb-2 md:mb-12"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center z-10 ${showHover ? 'bg-foreground/20' : 'bg-foreground/0'}`}>
        <button className={`bg-primary/30 text-primary-foreground px-8 py-4 text-lg font-medium transform transition-all duration-300 hover:bg-primary/40 backdrop-blur-sm ${showHover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          צפה בכל המוצרים
        </button>
      </div>
      <div className="relative w-full overflow-hidden bg-muted" style={isMobile ? { height: '66vh' } : { paddingTop: '45%' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          className={`absolute left-1/2 w-full h-full transition-transform duration-300 ${isMobile ? 'bottom-0' : 'top-1/2'} ${showHover ? 'scale-[1.02]' : 'scale-100'}`}
          style={{ objectFit: 'cover', objectPosition: isMobile ? 'center bottom' : 'center center', transform: isMobile ? 'translateX(-50%)' : 'translate(-50%, -50%)' }}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      </div>
    </section>
  );
};
