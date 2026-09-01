import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RotateCcw, Clock, CheckCircle, XCircle } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, WHATSAPP_URL } from "@/lib/siteConfig";

const Returns = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl text-foreground mb-8 text-center" dir="rtl">מדיניות החזרות וביטולים</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-12" dir="rtl">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl">14 ימים לביטול</h2>
            </div>
            <p className="text-muted-foreground">
              ניתן לבטל הזמנה ולהחזיר מוצרים תוך 14 יום מקבלת ההזמנה
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <RotateCcw className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl">החזר כספי מלא</h2>
            </div>
            <p className="text-muted-foreground">
              החזר כספי מלא למוצרים שהוחזרו במצב תקין — בלי דמי ביטול
            </p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none space-y-6" dir="rtl">
          <p className="text-muted-foreground">
            המוצרים שלנו הם מוצרי נייר — לוחות תכנון, מחברות ובלוקים — ולכן כמעט תמיד אפשר
            להחזיר אותם. המדיניות כאן תואמת את חוק הגנת הצרכן, התשמ״א-1981, ואת התקנון של האתר.
          </p>

          <h2 className="text-2xl text-foreground mb-4">תנאי החזרה</h2>

          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-1 shrink-0" />
            <p className="text-muted-foreground">
              ניתן לבטל את העסקה תוך 14 יום מקבלת המוצר או מקבלת מסמך פרטי העסקה — המאוחר מביניהם
            </p>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-1 shrink-0" />
            <p className="text-muted-foreground">המוצר באריזתו המקורית, שלם ולא נעשה בו שימוש</p>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-1 shrink-0" />
            <p className="text-muted-foreground">
              אנחנו לא גובות דמי ביטול — ההחזר הוא מלא, על מלוא הסכום ששולם עבור המוצר
            </p>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-1 shrink-0" />
            <p className="text-muted-foreground">יש ליצור קשר איתנו לפני שליחת ההחזרה</p>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <XCircle className="h-5 w-5 text-red-500 mt-1 shrink-0" />
            <p className="text-muted-foreground">
              לא ניתן להחזיר מוצרים שנעשה בהם שימוש, שנכתב בהם או שניזוקו אצל הלקוחה
            </p>
          </div>

          <h2 className="text-2xl text-foreground mt-8 mb-4">מוצר פגום או שאינו תואם להזמנה</h2>
          <p className="text-muted-foreground">
            אם המוצר הגיע פגום, שבור או שונה ממה שהוזמן — כתבי לנו תוך 14 יום מקבלת המשלוח וצרפי
            תמונות. נחליף את המוצר, נתקן את הטעות או ניתן החזר כספי מלא, לפי בחירתך. במקרה כזה
            עלות ההחזרה עלינו ולא ייגבו דמי משלוח.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">מי משלם על משלוח ההחזרה</h2>
          <p className="text-muted-foreground">
            בביטול מתוך בחירה (התחרטת, המוצר לא התאים) — עלות המשלוח בחזרה אלינו היא על הלקוחה,
            ודמי המשלוח ששולמו בהזמנה המקורית אינם מוחזרים. בביטול בשל פגם, אי-התאמה או עיכוב
            משמעותי מצדנו — אנחנו נושאות בעלות ההחזרה ומחזירות גם את דמי המשלוח.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">איך להחזיר?</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2">
            <li>שלחי לנו הודעה בוואטסאפ או במייל עם מספר ההזמנה וסיבת הביטול</li>
            <li>נאשר את הבקשה ונשלח לך את כתובת ההחזרה</li>
            <li>ארזי את המוצר באריזתו המקורית ושלחי אלינו</li>
            <li>עם קבלת המוצר נטפל בהחזר — בכל מקרה עד 14 יום ממועד הודעת הביטול</li>
          </ol>
          <p className="text-muted-foreground">
            ההחזר הכספי מבוצע לאותו אמצעי תשלום שבו בוצעה ההזמנה.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">אוכלוסיות מוגנות</h2>
          <p className="text-muted-foreground">
            אזרחיות ואזרחים ותיקים (מגיל 65), אנשים עם מוגבלות ועולים חדשים (עד 5 שנים מיום
            העלייה) רשאים לבטל עסקה תוך 4 חודשים ממועד ביצועה או ממועד קבלת מסמך פרטי העסקה,
            בהתאם לחוק. ייתכן שנבקש להציג תעודה מתאימה.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">יצירת קשר</h2>
          <p className="text-muted-foreground">
            לבקשות ביטול והחזרה אפשר לפנות אלינו במייל {SUPPORT_EMAIL}, בטלפון {SUPPORT_PHONE_DISPLAY} או{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              בוואטסאפ
            </a>
            . נשמח לעזור.
          </p>

          <p className="text-sm text-muted-foreground/70">
            עודכן לאחרונה: ספטמבר 2026. במקרה של סתירה בין עמוד זה לתקנון האתר, יגבר התקנון.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Returns;
