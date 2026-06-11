import { Instagram, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import footerTexture from "@/assets/footer-texture.webp";
import footerLogo from "@/assets/logo-new.png";
import { ROUTES } from "@/lib/routes";
import {
  INSTAGRAM_URL,
  SUPPORT_EMAIL,
  WHATSAPP_URL,
} from "@/lib/siteConfig";

const NAV_LINKS = [
  { to: ROUTES.allProducts, label: "חנות" },
  { to: ROUTES.about, label: "יום האם" },
  { to: ROUTES.blog, label: "בלוג" },
  { to: ROUTES.support, label: "שירות לקוחות" },
];

const POLICY_LINKS = [
  { to: ROUTES.shipping, label: "משלוחים" },
  { to: ROUTES.returns, label: "החזרות והחלפות" },
  { to: ROUTES.privacy, label: "מדיניות פרטיות" },
  { to: ROUTES.terms, label: "תקנון האתר" },
];

const Socials = ({ size }: { size: number }) => (
  <div className="flex items-center gap-3">
    {INSTAGRAM_URL && (
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="עמוד האינסטגרם של יום האם"
        className="text-foreground/80 hover:text-primary transition-colors"
      >
        <Instagram size={size} />
      </a>
    )}
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="שלחי הודעת וואטסאפ ליום האם"
      className="text-foreground/80 hover:text-primary transition-colors"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    </a>
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      aria-label="שלחי אימייל ליום האם"
      className="text-foreground/80 hover:text-primary transition-colors"
    >
      <Mail size={size} />
    </a>
  </div>
);

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative"
      style={{
        backgroundImage: `url(${footerTexture})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8" dir="rtl">
        {/* Main row: brand pinned right (RTL), nav centered on the page */}
        <div className="relative flex flex-col md:block items-center gap-6 py-8 md:py-10">
          {/* Brand block */}
          <div className="flex flex-col items-center md:items-start gap-3 shrink-0 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
            <div className="bg-[#6B5B5A] rounded-md overflow-hidden">
              <img src={footerLogo} alt="יום האם" className="h-16 w-16 md:h-[72px] md:w-[72px] object-cover" />
            </div>
            <p className="text-xs text-foreground/80 text-center md:text-right">
              מוצרי תכנון לאימהות
            </p>
            <Socials size={20} />
          </div>

          {/* Primary navigation */}
          <nav className="flex flex-row flex-wrap items-center justify-center gap-x-8 gap-y-3 text-base md:text-lg font-display">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-foreground hover:text-primary transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom strip: policy links + copyright */}
        <div className="border-t border-foreground/15 py-4 flex flex-col-reverse md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-foreground/70">
            © {year} יום האם · כל הזכויות שמורות
          </p>
          <nav className="flex flex-row flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            {POLICY_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-foreground/70 hover:text-primary transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};
