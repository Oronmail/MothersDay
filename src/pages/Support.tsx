import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Mail, Phone } from "lucide-react";
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

const faqItems = [
  {
    question: "כמה זמן לוקחת המשלוח?",
    answer: "משלוחים בדואר רשום מגיעים תוך 3-5 ימי עסקים. משלוחים עם שליח עד הבית מגיעים תוך 1-3 ימי עסקים."
  },
  {
    question: "האם אפשר להחזיר מוצר?",
    answer: "בהחלט! ניתן להחזיר מוצרים תוך 14 יום מקבלת ההזמנה, כל עוד המוצר לא נפתח ולא נעשה בו שימוש. לפרטים נוספים ראי את מדיניות ההחזרות שלנו."
  },
  {
    question: "איך אני יודעת איזה מוצר מתאים לי?",
    answer: "כל מוצר בחנות כולל תיאור מפורט והסבר על השימוש בו. אם את עדיין לא בטוחה, שלחי לנו הודעה בוואטסאפ ונשמח לעזור לך לבחור את המוצר המתאים למשפחה שלך."
  },
  {
    question: "האם המוצרים מתאימים לכל סוגי העטים?",
    answer: "כן! המוצרים שלנו מודפסים על נייר עבה ואיכותי שמתאים לכתיבה בכל סוגי העטים - כדורי, ג'ל, מרקרים ואפילו עפרונות."
  },
  {
    question: "האם יש הנחה על הזמנה גדולה?",
    answer: "כן, אנחנו מציעים הנחות על הזמנות מרובות ועל חבילות מוצרים. בדקי את החבילות שלנו בחנות או צרי קשר לקבלת הצעה מותאמת אישית."
  },
  {
    question: "מתי הלוח השבועי מתחיל?",
    answer: "כל המוצרים שלנו מתחילים את השבוע ביום ראשון - בדיוק כמו שאנחנו רגילות בישראל!"
  },
  {
    question: "האם אפשר לקבל חשבונית?",
    answer: "בוודאי! חשבונית נשלחת אוטומטית למייל לאחר ביצוע ההזמנה. אם את צריכה חשבונית מס, צרי איתנו קשר עם פרטי העסק."
  },
  {
    question: "איך אפשר לעקוב אחרי ההזמנה שלי?",
    answer: "לאחר שליחת ההזמנה תקבלי מייל עם מספר מעקב. ניתן לעקוב אחרי המשלוח דרך אתר דואר ישראל או חברת השליחויות."
  }
];

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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          {/* Branded header */}
          <div className="text-center mb-14" dir="rtl">
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

          {/* Contact channels */}
          <div className="grid md:grid-cols-3 gap-5 mb-20" dir="rtl">
            {contactChannels.map(({ icon: Icon, title, description, cta, href, external }) => (
              <div
                key={title}
                className="group bg-card border border-border p-8 text-center transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="bg-secondary/30 group-hover:bg-secondary/50 transition-colors w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Icon className="h-7 w-7 text-foreground" />
                </div>
                <h2 className="font-display text-xl font-bold mb-1 text-foreground">{title}</h2>
                <p className="text-foreground/60 text-sm mb-5">{description}</p>
                <Button
                  variant="outline"
                  className="w-full rounded-none hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                  asChild
                >
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {cta}
                  </a>
                </Button>
              </div>
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
