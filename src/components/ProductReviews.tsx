import { useState } from "react";
import { Star } from "lucide-react";
import { getProductReviews, type Review } from "@/data/productReviews";
import { ReviewForm } from "@/components/ReviewForm";
import heartOutline from "@/assets/heart-icon.png";

const PAGE_SIZE = 5;

const Stars = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) => {
  const cls = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} מתוך 5 כוכבים`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= rating ? "fill-secondary text-secondary" : "fill-none text-muted"}`}
        />
      ))}
    </div>
  );
};

const ReviewItem = ({ r }: { r: Review }) => (
  <article className="py-6 border-b border-border last:border-b-0 text-right">
    <div className="flex items-center justify-between gap-3">
      <Stars rating={r.rating} />
      {r.date && <span className="text-xs text-muted-foreground">{r.date}</span>}
    </div>
    <h3 className="mt-3 text-lg font-semibold text-foreground leading-snug">{r.title}</h3>
    <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">{r.quote}</p>
    <div className="mt-3 flex items-center gap-2">
      <span className="text-sm font-medium text-foreground">{r.name}</span>
      <span className="text-[11px] text-muted-foreground">· השתתפה בקבוצת המיקוד</span>
    </div>
  </article>
);

/** מצב ריק — מוצר שעדיין אין לו חוות דעת. */
const EmptyState = ({ onWrite }: { onWrite: () => void }) => (
  <div className="flex flex-col items-center text-center py-10 md:py-14">
    {/* לב ריק — הלב המצויר-ביד שלנו (קו-מתאר), צבוע בגוון המותג */}
    <span
      aria-hidden="true"
      className="inline-block h-12 w-12 bg-[#4d3c40]"
      style={{
        WebkitMaskImage: `url(${heartOutline})`,
        maskImage: `url(${heartOutline})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
    <p className="mt-5 text-lg md:text-xl font-semibold text-foreground">
      איך המוצר השפיע על יום האם שלך?
    </p>
    <button
      type="button"
      onClick={onWrite}
      className="mt-2 text-base md:text-lg font-bold text-foreground underline underline-offset-4 decoration-1 hover:text-primary transition-colors"
    >
      כתבי לנו
    </button>
  </div>
);

export const ProductReviews = ({
  handle,
  productTitle,
}: {
  handle: string | undefined;
  productTitle?: string;
}) => {
  const reviews = getProductReviews(handle);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);

  const count = reviews.length;
  const average =
    count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  return (
    <section className="py-12 md:py-16 bg-background" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-[28px] md:text-3xl text-center mb-6 md:mb-8 text-foreground">
          מה חשבת על המוצר?
        </h2>

        {count === 0 ? (
          <EmptyState onWrite={() => setFormOpen(true)} />
        ) : (
          <>
            {/* סיכום: ציון ממוצע + כוכבים + מספר חוות דעת אמיתי */}
            <div className="flex items-center gap-4 bg-card border border-border p-5 md:p-6">
              <span className="text-4xl md:text-5xl font-semibold text-foreground leading-none">
                {Number.isInteger(average) ? average : average.toFixed(1)}
              </span>
              <div className="flex flex-col gap-1">
                <Stars rating={Math.round(average)} size="lg" />
                <span className="text-sm text-muted-foreground">
                  על סמך {count} {count === 1 ? "חוות דעת" : "חוות דעת"} מקבוצת המיקוד
                </span>
              </div>
            </div>

            {/* רשימה אנכית — אחת מתחת לשנייה */}
            <div className="mt-2">
              {reviews.slice(0, visible).map((r, i) => (
                <ReviewItem key={i} r={r} />
              ))}
            </div>

            {/* טען עוד */}
            {visible < count && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="border border-foreground/70 text-foreground px-8 py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
                >
                  טען עוד חוות דעת
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ReviewForm productTitle={productTitle} open={formOpen} onOpenChange={setFormOpen} />
    </section>
  );
};
