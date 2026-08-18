import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChevronLeft, Mail, Phone } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_E164,
  WHATSAPP_URL,
  getAbsoluteSiteUrl,
} from "@/lib/siteConfig";
import titleUnderline from "@/assets/title-underline.png";
import heartIcon from "@/assets/heart-icon.png";
import { SEO } from "@/components/SEO";
import { faqItems } from "@/content/faq";
import { ROUTES } from "@/lib/routes";

// Same hand-drawn WhatsApp glyph used in the footer's social row.
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const contactChannels = [
  {
    icon: WhatsAppIcon,
    title: "וואטסאפ",
    description: "הדרך הכי מהירה לקבל מענה",
    cta: "שלחי הודעה",
    href: WHATSAPP_URL,
    external: true,
  },
  {
    icon: Mail,
    title: "אימייל",
    description: "נחזור אליך תוך 24 שעות",
    cta: "שלחי מייל",
    href: `mailto:${SUPPORT_EMAIL}`,
    external: false,
  },
  {
    icon: Phone,
    title: "טלפון",
    description: "א׳-ה׳ 9:00-17:00",
    cta: SUPPORT_PHONE_DISPLAY,
    href: `tel:${SUPPORT_PHONE_E164}`,
    external: false,
  },
];

// faqItems הועברו ל-src/content/faq.ts כדי שגם ה-prerender (FAQPage
// structured data) וגם העמוד הזה יקראו מאותו מקור.

const Support = () => {
  return (
    <>
      <SEO
        title="תמיכה ושירות לקוחות"
        description="שירות הלקוחות של יום האם. שאלות נפוצות, יצירת קשר בוואטסאפ, בטלפון או במייל, ומענה על משלוחים, החזרות והתאמת מוצרים."
        url={getAbsoluteSiteUrl(ROUTES.support)}
      />
      <div className="min-h-screen bg-background">
        <AnnouncementBanner />
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-20">
          {/* Branded header */}
          <div className="text-center mb-10 md:mb-14" dir="rtl">
            <img src={heartIcon} alt="" className="w-10 h-10 mx-auto mb-3" />
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              שירות לקוחות
            </h1>
            <img
              src={titleUnderline}
              alt=""
              className="mx-auto h-4 w-56 object-contain mt-1 mb-5"
            />
            <p className="text-foreground/70 max-w-md mx-auto leading-relaxed">
              אנחנו כאן בשבילך. בחרי את הדרך הנוחה לך ליצור קשר, ונשמח לעזור.
            </p>
          </div>

          {/* Contact channels.
              מובייל: שורה קומפקטית שכולה לחיצה (אייקון, טקסט, חץ).
              דסקטופ (md ומעלה): אותם נתונים כשלושה כרטיסים זה לצד זה, כמו קודם. */}
          <div className="grid gap-3 md:grid-cols-3 md:gap-5 mb-14 md:mb-20" dir="rtl">
            {contactChannels.map(({ icon: Icon, title, description, cta, href, external }) => (
              <a
                key={title}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex items-center gap-4 bg-card border border-border p-4 text-right transition-all duration-200 hover:border-primary/40 hover:shadow-sm md:flex-col md:p-8 md:text-center"
              >
                <span className="bg-secondary/30 group-hover:bg-secondary/50 transition-colors w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shrink-0 md:mb-5">
                  <Icon className="h-6 w-6 md:h-7 md:w-7 text-foreground" />
                </span>

                <span className="flex-1 md:w-full">
                  <span className="block font-display text-lg md:text-xl font-bold text-foreground md:mb-1">
                    {title}
                  </span>
                  <span className="block text-foreground/60 text-sm md:mb-5">{description}</span>
                  {/* מובייל: ה-CTA כשורת טקסט. דסקטופ: כפתור מסגרת ברוחב מלא. */}
                  <span className="mt-0.5 block text-sm text-primary md:hidden">{cta}</span>
                  <span className="hidden md:flex h-10 w-full items-center justify-center border border-input text-sm font-medium transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                    {cta}
                  </span>
                </span>

                <ChevronLeft className="h-5 w-5 shrink-0 text-foreground/30 md:hidden" />
              </a>
            ))}
          </div>

          {/* FAQ */}
          <div dir="rtl" className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                שאלות נפוצות
              </h2>
              <img
                src={titleUnderline}
                alt=""
                className="mx-auto h-3 w-40 object-contain mt-1"
              />
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-border">
                  <AccordionTrigger className="font-display text-right text-[17px] text-foreground hover:no-underline hover:text-primary transition-colors">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-foreground/70 text-[16px] leading-[1.8]">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Support;
