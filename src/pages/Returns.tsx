import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RotateCcw, Clock, CheckCircle, XCircle } from "lucide-react";

const Returns = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl text-foreground mb-8 text-center" dir="rtl">מדיניות החזרות</h1>
        
        <div className="grid md:grid-cols-2 gap-6 mb-12" dir="rtl">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl">14 ימים להחזרה</h2>
            </div>
            <p className="text-muted-foreground">
              ניתן להחזיר מוצרים תוך 14 יום מיום קבלת ההזמנה
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
              החזר כספי מלא למוצרים שהוחזרו במצב תקין
            </p>
          </div>
        </div>
        
        <div className="prose prose-lg max-w-none space-y-6" dir="rtl">
          <h2 className="text-2xl text-foreground mb-4">תנאי החזרה</h2>
          
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-1 shrink-0" />
            <p className="text-muted-foreground">המוצר באריזתו המקורית ולא נעשה בו שימוש</p>
          </div>
          
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-1 shrink-0" />
            <p className="text-muted-foreground">ההחזרה מתבצעת תוך 14 ימים מיום קבלת המשלוח</p>
          </div>
          
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-1 shrink-0" />
            <p className="text-muted-foreground">יש ליצור קשר איתנו לפני שליחת ההחזרה</p>
          </div>
          
          <div className="flex items-start gap-3 mb-4">
            <XCircle className="h-5 w-5 text-red-500 mt-1 shrink-0" />
            <p className="text-muted-foreground">לא ניתן להחזיר מוצרים שנעשה בהם שימוש או שניזוקו</p>
          </div>
          
          <h2 className="text-2xl text-foreground mt-8 mb-4">איך להחזיר?</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2">
            <li>שלחי לנו הודעה בוואטסאפ או במייל עם מספר ההזמנה</li>
            <li>נשלח לך אישור וכתובת להחזרה</li>
            <li>ארזי את המוצר באריזתו המקורית</li>
            <li>שלחי אלינו ונטפל בהחזר תוך 5 ימי עסקים</li>
          </ol>
          
          <h2 className="text-2xl text-foreground mt-8 mb-4">יצירת קשר</h2>
          <p className="text-muted-foreground">
            לבקשות החזרה, ניתן לפנות אלינו בכתובת support@mothersday.co.il או בוואטסאפ
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Returns;
