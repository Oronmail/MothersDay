import { Instagram, Mail } from "lucide-react";
import footerTexture from "@/assets/footer-texture.png";
import footerLogo from "@/assets/logo-new.png";
import { ROUTES } from "@/lib/routes";
export const Footer = () => {
  return <footer className="py-6 md:py-12 relative" style={{
    backgroundImage: `url(${footerTexture})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }}>
      <div className="max-w-7xl mx-auto">

        {/* Mobile Footer */}
        <div className="md:hidden flex flex-col items-center gap-2 px-4" dir="rtl">
          {/* Top row: Logo + tagline + Menu */}
          <div className="flex flex-row items-start gap-6 w-full">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="bg-[#6B5B5A] p-4 px-0 py-0">
                <img src={footerLogo} alt="יום האם" className="h-16" />
              </div>
              <p className="text-sm text-foreground whitespace-nowrap max-w-[80px] text-center leading-tight">מוצרי תכנון לאימהות</p>
            </div>
            <nav className="text-sm items-center flex flex-row flex-wrap gap-x-2 gap-y-2 pt-2">
              <a href={ROUTES.allProducts} className="hover:bg-primary hover:text-primary-foreground px-1.5 py-1 transition-colors text-foreground whitespace-nowrap">חנות</a>
              <a href={ROUTES.about} className="hover:bg-primary hover:text-primary-foreground px-1.5 py-1 transition-colors text-foreground whitespace-nowrap">יום האם</a>
              <a href={ROUTES.blog} className="hover:bg-primary hover:text-primary-foreground px-1.5 py-1 transition-colors text-foreground whitespace-nowrap">בלוג</a>
              <a href={ROUTES.terms} className="hover:bg-primary hover:text-primary-foreground px-1.5 py-1 transition-colors text-foreground whitespace-nowrap">תקנון האתר</a>
              <a href={ROUTES.support} className="hover:bg-primary hover:text-primary-foreground px-1.5 py-1 transition-colors text-foreground whitespace-nowrap">שירות לקוחות</a>
            </nav>
          </div>

          {/* Icons centered, aligned with tagline text */}
          <div className="flex items-center gap-3 -mt-1">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
              <Instagram size={28} />
            </a>
            <a href="https://wa.me/972548024058" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </a>
            <a href="mailto:support@mothersday.co.il" className="text-foreground hover:text-primary transition-colors">
              <Mail size={28} />
            </a>
          </div>
        </div>

        {/* Desktop Footer - Single Row RTL */}
        <div dir="rtl" className="hidden md:flex gap-16 px-4 md:px-8 w-full items-center justify-start">
          {/* Logo Box - Appears on Right in RTL */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-[#6B5B5A] p-4 px-0 py-0">
              <img src={footerLogo} alt="יום האם" className="h-14" />
            </div>
            <p className="text-xs text-foreground text-center whitespace-nowrap">
              מוצרי תכנון לאימהות
            </p>
            <div className="flex items-center gap-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
                <Instagram size={20} />
              </a>
              <a href="https://wa.me/972548024058" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </a>
              <a href="mailto:support@mothersday.co.il" className="text-foreground hover:text-primary transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Menu Items - Appears on Left in RTL */}
          <nav className="text-lg items-center justify-start flex flex-row gap-[200px] -mt-14">
            <a href={ROUTES.allProducts} className="hover:text-foreground transition-colors text-foreground whitespace-nowrap">
              חנות
            </a>
            <a href={ROUTES.about} className="hover:text-foreground transition-colors text-foreground whitespace-nowrap">
              יום האם
            </a>
            <a href={ROUTES.blog} className="hover:text-foreground transition-colors text-foreground whitespace-nowrap">
              בלוג
            </a>
            <a href={ROUTES.terms} className="hover:text-foreground transition-colors text-foreground whitespace-nowrap">
              תקנון האתר
            </a>
            <a href={ROUTES.support} className="hover:text-foreground transition-colors text-foreground whitespace-nowrap">
              שירות לקוחות
            </a>
          </nav>
        </div>
      </div>
    </footer>;
};
