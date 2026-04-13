import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Truck, Clock, MapPin, Gift } from "lucide-react";

const Shipping = () => {
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
              משלוח חינם לכל רחבי הארץ ברכישה מעל 350 ש״ח
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
              3-5 ימי עסקים מרגע ביצוע ההזמנה
            </p>
          </div>
          
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl">אפשרויות משלוח</h2>
            </div>
            <p className="text-muted-foreground">
              משלוח לבית או לנקודת איסוף לבחירתך
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
            <li>משלוח רגיל: 25 ש״ח</li>
            <li>משלוח לנקודת איסוף: 20 ש״ח</li>
            <li>משלוח חינם ברכישה מעל 350 ש״ח</li>
          </ul>
          
          <h2 className="text-2xl text-foreground mt-8 mb-4">מעקב משלוח</h2>
          <p className="text-muted-foreground">
            לאחר שההזמנה תישלח, תקבלי מייל עם מספר מעקב לצפייה בסטטוס המשלוח.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Shipping;
