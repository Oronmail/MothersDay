// ─────────────────────────────────────────────────────────────────────────────
// חוות דעת אוצרות (קבוצת המיקוד) — מוזן ידנית מ-7 חוות הדעת האמיתיות.
// בנוסף, חוות דעת שגולשות שולחות מהאתר נשמרות ב-Supabase (טבלת reviews)
// ומוצגות בעמוד המוצר לצד אלה שכאן — רק אחרי אישור ב-/admin/reviews
// (ר' src/hooks/useProductReviews.ts).
//
// ⚠️ כרגע התוכן PLACEHOLDER בלבד (מסומן ב-[...]). אין להעלות לאתר החי עם תוכן זה.
//    אין "Verified Buyer", אין מספר חוות-דעת מומצא — כותרת כנה "השתתפה בקבוצת המיקוד".
//
// כל חוות דעת שייכת ל-handle של מוצר (המפתח במפה).
// מוצר בלי חוות דעת → מוצג "מצב ריק" (empty state) בעמוד המוצר.
// featured: true → החוות דעת עולה גם לקרוסלה בעמוד הבית ("מה אומרות עלינו").
// ─────────────────────────────────────────────────────────────────────────────

export interface Review {
  name: string;        // שם לפרסום (שם פרטי / ר״ת / "אנונימית")
  title: string;       // כותרת קצרה מודגשת
  quote: string;       // גוף חוות הדעת
  rating: number;      // 1–5
  date?: string;       // תאריך תצוגה, אופציונלי (עדיף בלי מאשר מומצא)
  featured?: boolean;  // האם להציג גם בקרוסלה בעמוד הבית
}

// חוות דעת אמיתיות — נכנסות לכאן וייראו גם באתר החי.
// כשיגיעו 7 חוות הדעת מקבוצת המיקוד, מוסיפים אותן כאן לפי handle:
//   "p1": [{ name: "...", title: "...", quote: "...", rating: 5, featured: true }],
const REAL_REVIEWS: Record<string, Review[]> = {};

// תוכן PLACEHOLDER — להמחשת העיצוב בפיתוח המקומי בלבד.
// מסונן החוצה בבנייה לפרודקשן, כך שהאתר החי לעולם לא מציג חוות דעת מומצאות.
const PLACEHOLDER_REVIEWS: Record<string, Review[]> = {
  "מחברת-יום-האם": [
    {
      name: "[שם]",
      title: "[כותרת קצרה]",
      quote: "כאן ייכנס הטקסט האמיתי של חוות הדעת מקבוצת המיקוד. זהו טקסט זמני שממחיש את הפריסה ואת אורך הטקסט האופייני בחוות דעת אחת בעמוד המוצר.",
      rating: 5,
      featured: true,
    },
    {
      name: "[שם]",
      title: "[כותרת קצרה]",
      quote: "כאן ייכנס הטקסט האמיתי של חוות הדעת מקבוצת המיקוד. זהו טקסט זמני שממחיש את הפריסה.",
      rating: 5,
      featured: true,
    },
  ],
};

// מפתח = handle של המוצר (כמו ב-URL /product/<handle>)
export const PRODUCT_REVIEWS: Record<string, Review[]> = import.meta.env.DEV
  ? { ...PLACEHOLDER_REVIEWS, ...REAL_REVIEWS }
  : REAL_REVIEWS;

/** כל חוות הדעת של מוצר לפי ה-handle שלו (ריק אם אין). */
export function getProductReviews(handle: string | undefined): Review[] {
  if (!handle) return [];
  return PRODUCT_REVIEWS[handle] ?? [];
}

/** חוות הדעת המסומנות featured — לקרוסלה בעמוד הבית, עם ה-handle של המוצר. */
export function getFeaturedReviews(): Array<Review & { handle: string }> {
  return Object.entries(PRODUCT_REVIEWS).flatMap(([handle, reviews]) =>
    reviews.filter((r) => r.featured).map((r) => ({ ...r, handle })),
  );
}
