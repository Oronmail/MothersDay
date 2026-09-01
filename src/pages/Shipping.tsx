import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Truck, Clock, MapPin, Gift } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { SUPPORT_EMAIL, WHATSAPP_URL } from "@/lib/siteConfig";

const Shipping = () => {
  // Single source of truth for shipping pricing — the same settings checkout uses
  // (the hook falls back to 35 ₪ / 350 ₪ if the table can't be read).
  const { data: settings } = useStoreSettings();
  const shippingCost = settings?.shipping_cost ?? 35;
  const freeShippingThreshold = settings?.free_shipping_threshold ?? 350;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl text-foreground mb-8 text-center" dir="rtl">מידע על משלוחים</h1>

        <div className="grid md:grid-cols-2 gap-8 mb-12" dir="rtl">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl">משלוח חינם</h2>
            </div>
            <p className="text-muted-foreground">
              משלוח חינם לכל רחבי הארץ ברכישה מעל {freeShippingThreshold} ש״ח
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl">זמן אספקה</h2>
            </div>
            <p className="text-muted-foreground">
              בדרך כלל עד 7 ימי עסקים מרגע אישור ההזמנה
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl">משלוח עד הבית</h2>
            </div>
            <p className="text-muted-foreground">
              משלוח אחיד בעלות {shippingCost} ש״ח, לכתובת שתמלאי בהזמנה
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl">איזור משלוח</h2>
            </div>
            <p className="text-muted-foreground">
              משלוחים לכל רחבי ישראל
            </p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none" dir="rtl">
          <h2 className="text-2xl text-foreground mb-4">מחירי משלוח</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>משלוח אחיד לכל הארץ: {shippingCost} ש״ח</li>
            <li>משלוח חינם ברכישה מעל {freeShippingThreshold} ש״ח</li>
            <li>עלות המשלוח מוצגת בסיכום ההזמנה לפני התשלום</li>
          </ul>

          <h2 className="text-2xl text-foreground mt-8 mb-4">זמני אספקה</h2>
          <p className="text-muted-foreground">
            ההזמנה נארזת ויוצאת מאיתנו תוך 1–3 ימי עסקים, וזמן ההגעה הוא בדרך כלל
            עד 7 ימי עסקים מרגע אישור ההזמנה. ימי עסקים הם א׳–ה׳, ואינם כוללים ימי שישי,
            שבת, ערבי חג וחגים. בתקופות עומס (חגים, יום האם) ייתכנו עיכובים קצרים.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">סטטוס ההזמנה</h2>
          <p className="text-muted-foreground">
            מיד לאחר הרכישה נשלח אלייך מייל עם אישור ההזמנה ופרטיה. רוצה לדעת איפה ההזמנה
            שלך עומדת? כתבי לנו ל־{SUPPORT_EMAIL} או{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              שלחי הודעה בוואטסאפ
            </a>{" "}
            ונעדכן אותך.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Shipping;
