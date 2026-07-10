import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import titleUnderline from "@/assets/title-underline.png";
import heartFilled from "@/assets/heart-filled.png";

// ⚠️ תוכן זמני — placeholder בלבד, להחלפה ב-7 חוות הדעת האמיתיות מקבוצת המיקוד.
// אין להעלות לאתר החי עם התוכן הזה.
interface Testimonial {
  name: string;    // שם לפרסום
  date: string;    // תאריך (מוצג משמאל, בהתאם לרפרנס)
  product: string; // המוצר
  title: string;   // כותרת קצרה מודגשת
  quote: string;   // גוף חוות הדעת
  rating: number;  // 1–5
}

const TESTIMONIALS: Testimonial[] = [
  { name: "[שם]", date: "[תאריך]", product: "[שם המוצר]", title: "[כותרת קצרה]", quote: "כאן ייכנס הטקסט האמיתי של חוות הדעת מקבוצת המיקוד. זהו טקסט זמני שממחיש את הפריסה ואת אורך הטקסט האופייני בכרטיס.", rating: 5 },
  { name: "[שם]", date: "[תאריך]", product: "[שם המוצר]", title: "[כותרת קצרה]", quote: "כאן ייכנס הטקסט האמיתי של חוות הדעת מקבוצת המיקוד. זהו טקסט זמני שממחיש את הפריסה.", rating: 5 },
  { name: "[שם]", date: "[תאריך]", product: "[שם המוצר]", title: "[כותרת קצרה]", quote: "כאן ייכנס הטקסט האמיתי של חוות הדעת מקבוצת המיקוד. זהו טקסט זמני שממחיש את הפריסה ואת אורך הטקסט האופייני בכרטיס אחד.", rating: 5 },
  { name: "[שם]", date: "[תאריך]", product: "[שם המוצר]", title: "[כותרת קצרה]", quote: "כאן ייכנס הטקסט האמיתי של חוות הדעת מקבוצת המיקוד. זהו טקסט זמני שממחיש את הפריסה.", rating: 5 },
  { name: "[שם]", date: "[תאריך]", product: "[שם המוצר]", title: "[כותרת קצרה]", quote: "כאן ייכנס הטקסט האמיתי של חוות הדעת מקבוצת המיקוד. זהו טקסט זמני שממחיש את הפריסה ואת אורך הטקסט.", rating: 5 },
  { name: "[שם]", date: "[תאריך]", product: "[שם המוצר]", title: "[כותרת קצרה]", quote: "כאן ייכנס הטקסט האמיתי של חוות הדעת מקבוצת המיקוד. זהו טקסט זמני שממחיש את הפריסה.", rating: 5 },
  { name: "[שם]", date: "[תאריך]", product: "[שם המוצר]", title: "[כותרת קצרה]", quote: "כאן ייכנס הטקסט האמיתי של חוות הדעת מקבוצת המיקוד. זהו טקסט זמני שממחיש את הפריסה ואת אורך הטקסט האופייני.", rating: 5 },
];

// לב מצויר-ביד, ממולא, צבוע בגוון המותג (דסטי-רוז = --ring) דרך CSS mask —
// כך אפשר לשנות את הגוון ב-CSS בלי ליצור מחדש את התמונה.
const Heart = ({ filled }: { filled: boolean }) => (
  <span
    aria-hidden="true"
    className={`inline-block h-5 w-5 ${filled ? "bg-[#4d3c40]" : "bg-muted"}`}
    style={{
      WebkitMaskImage: `url(${heartFilled})`,
      maskImage: `url(${heartFilled})`,
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    }}
  />
);

const Hearts = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1.5" aria-label={`${rating} מתוך 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Heart key={i} filled={i <= rating} />
    ))}
  </div>
);

const TestimonialCard = ({ t }: { t: Testimonial }) => (
  <article className="flex aspect-square flex-col overflow-hidden border border-border p-6 text-right">
    {/* שורה עליונה: שם מימין, תאריך משמאל (בהתאם לרפרנס) */}
    <div className="flex items-center justify-between gap-3">
      <span className="text-base font-semibold text-foreground">{t.name}</span>
      <span className="text-sm text-muted-foreground">{t.date}</span>
    </div>
    <div className="mt-2.5">
      <Hearts rating={t.rating} />
    </div>
    <h3 className="mt-3.5 text-lg font-semibold text-foreground leading-snug">{t.title}</h3>
    <p className="mt-2 text-base text-muted-foreground leading-relaxed flex-1 overflow-hidden line-clamp-5">
      {t.quote}
    </p>
    {/* קישור למוצר — בתחתית משמאל, בהתאם לרפרנס */}
    <div className="mt-4 pt-3 border-t border-border text-left">
      <span className="text-sm text-muted-foreground">{t.product}</span>
    </div>
  </article>
);

export const Testimonials = () => {
  return (
    <section className="pt-12 md:pt-16 pb-4 md:pb-8 bg-background" dir="rtl">
      <div className="container mx-auto px-4">
        {/* Title + underline, matching the site's section-title treatment */}
        <div className="flex flex-col items-center mb-6 md:mb-10">
          <h2 className="font-display text-[28px] md:text-4xl lg:text-5xl font-normal text-foreground">
            אימהות מספרות
          </h2>
          <img src={titleUnderline} alt="" className="w-56 md:w-80 lg:w-96 -mt-1" />
        </div>

        <Carousel
          opts={{ align: "start", loop: true, dragFree: true, direction: "rtl" }}
          className="w-full"
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {TESTIMONIALS.map((t, i) => (
              <CarouselItem
                key={i}
                className="pl-3 md:pl-4 basis-[85%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <TestimonialCard t={t} />
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
