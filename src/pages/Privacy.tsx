import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl text-foreground mb-8 text-center" dir="rtl">מדיניות פרטיות</h1>
        
        <div className="prose prose-lg max-w-none space-y-6" dir="rtl">
          <p className="text-muted-foreground">
            עודכן לאחרונה: נובמבר 2024
          </p>
          
          <h2 className="text-2xl text-foreground mt-8 mb-4">איסוף מידע</h2>
          <p className="text-muted-foreground">
            אנו אוספים מידע שאת מספקת לנו ישירות בעת ביצוע הזמנה, כולל שם, כתובת אימייל, 
            כתובת למשלוח ופרטי תשלום.
          </p>
          
          <h2 className="text-2xl text-foreground mt-8 mb-4">שימוש במידע</h2>
          <p className="text-muted-foreground">
            המידע שאנו אוספים משמש אותנו לצורך:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>עיבוד ומשלוח הזמנות</li>
            <li>תקשורת בנוגע להזמנות</li>
            <li>שיפור השירות שלנו</li>
            <li>שליחת עדכונים ומבצעים (באישורך בלבד)</li>
          </ul>
          
          <h2 className="text-2xl text-foreground mt-8 mb-4">אבטחת מידע</h2>
          <p className="text-muted-foreground">
            אנו נוקטים באמצעי אבטחה מתאימים להגנה על המידע האישי שלך מפני גישה, 
            שינוי, חשיפה או השמדה בלתי מורשים.
          </p>
          
          <h2 className="text-2xl text-foreground mt-8 mb-4">שיתוף מידע</h2>
          <p className="text-muted-foreground">
            איננו מוכרים או משתפים את המידע האישי שלך עם צדדים שלישיים, 
            למעט ספקי שירותים הכרחיים לביצוע ההזמנה (כגון חברות משלוחים).
          </p>
          
          <h2 className="text-2xl text-foreground mt-8 mb-4">יצירת קשר</h2>
          <p className="text-muted-foreground">
            לשאלות בנוגע למדיניות הפרטיות, ניתן לפנות אלינו בכתובת hello@yomhaem.co.il
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
