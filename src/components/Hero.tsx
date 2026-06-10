import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeroNewsletterCard } from "./HeroNewsletterCard";

// The hero card has its own dismiss key (independent of the global popup) so it
// shows fresh. Dismissing it also writes the global popup's key, so signing up /
// closing here suppresses the popup on other pages too.
const HERO_NEWSLETTER_KEY = "hero_newsletter_dismissed_at";
const POPUP_DISMISS_KEY = "newsletter_popup_dismissed_at";
const NEWSLETTER_DISMISS_MS = 1000 * 60 * 60 * 24 * 14;
// Delay before the signup card rises over the hero (tuned to the loop).
const NEWSLETTER_DELAY_MS = 17000;

const heroNewsletterDismissed = () => {
  const stored = localStorage.getItem(HERO_NEWSLETTER_KEY);
  if (!stored) return false;
  const at = Number(stored);
  return Number.isFinite(at) && Date.now() - at < NEWSLETTER_DISMISS_MS;
};

export const Hero = () => {
  const [showHover, setShowHover] = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();

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

  const dismissNewsletter = () => {
    setShowNewsletter(false);
    const now = String(Date.now());
    localStorage.setItem(HERO_NEWSLETTER_KEY, now);
    localStorage.setItem(POPUP_DISMISS_KEY, now);
  };

  // Show the signup card a few seconds before the hero loop restarts.
  useEffect(() => {
    if (heroNewsletterDismissed()) return;
    const timer = window.setTimeout(() => setShowNewsletter(true), NEWSLETTER_DELAY_MS);
    return () => {
      clearTimeout(timer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="relative w-full mb-2 md:mb-4">
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
        <div className="relative w-full overflow-hidden bg-muted" style={isMobile ? { height: '66vh' } : { aspectRatio: '16 / 9' }}>
          <video
            key={isMobile ? 'hero-mobile' : 'hero-desktop'}
            className={`absolute left-1/2 w-full h-full transition-transform duration-300 ${isMobile ? 'bottom-0' : 'top-1/2'} ${showHover ? 'scale-[1.02]' : 'scale-100'}`}
            style={{ objectFit: 'cover', objectPosition: isMobile ? 'center bottom' : 'center center', transform: isMobile ? 'translateX(-50%)' : 'translate(-50%, -50%)' }}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            {isMobile ? (
              <source src="/videos/Hero/hero mobile 2.mp4" type="video/mp4" />
            ) : (
              <>
                <source src="/videos/Hero/hero-drawer.webm" type="video/webm" />
                <source src="/videos/Hero/hero-drawer.mp4" type="video/mp4" />
              </>
            )}
          </video>
        </div>
      </Link>

      {showNewsletter && <HeroNewsletterCard onDismiss={dismissNewsletter} />}
    </section>
  );
};
