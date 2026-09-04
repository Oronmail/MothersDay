import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SUPPORT_EMAIL } from "@/lib/siteConfig";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl text-foreground mb-8 text-center" dir="rtl">מדיניות פרטיות</h1>

        <div className="prose prose-lg max-w-none space-y-6" dir="rtl">
          <p className="text-muted-foreground">
            עודכן לאחרונה: ספטמבר 2026
          </p>

          <p className="text-muted-foreground">
            אתר יום האם (mothersday.co.il) מופעל על ידי עדן מזרחי. אנחנו מתייחסות למידע שאת
            משתפת איתנו בכובד ראש, אוספות רק את מה שנחוץ כדי להפעיל את החנות, ולא מוכרות ולא
            משכירות מידע אישי לאף אחד. מדיניות זו מסבירה בפשטות איזה מידע נאסף, למה, עם מי הוא
            משותף ומה הזכויות שלך לפי חוק הגנת הפרטיות, התשמ״א-1981.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">איזה מידע אנחנו אוספות</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li><strong>פרטי הזמנה:</strong> שם, כתובת דוא״ל, טלפון, כתובת למשלוח ופרטי ההזמנה עצמה.</li>
            <li><strong>חשבון משתמשת (אם פתחת חשבון):</strong> כתובת הדוא״ל, כתובות שמורות, סל הקניות והווישליסט שלך.</li>
            <li><strong>הרשמה לרשימת התפוצה:</strong> כתובת דוא״ל, ולעיתים שם וטלפון, בהסכמתך.</li>
            <li><strong>חוות דעת על מוצרים:</strong> השם והתוכן שכתבת, לצורך פרסום באתר לאחר בדיקה.</li>
            <li><strong>פניות שירות:</strong> תוכן ההודעות שאת שולחת אלינו בדוא״ל או בוואטסאפ.</li>
            <li><strong>מידע טכני:</strong> נתוני שימוש כלליים באתר (עמודים שנצפו, סוג דפדפן ומכשיר, מקור ההגעה) ודיווחי תקלות.</li>
          </ul>
          <p className="text-muted-foreground">
            <strong>פרטי כרטיס האשראי אינם נאספים ואינם נשמרים אצלנו.</strong> הם מוזנים ישירות
            בעמוד התשלום המאובטח של חברת הסליקה, ואנחנו מקבלות ממנה רק אישור על ביצוע התשלום.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">למה אנחנו משתמשות במידע</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>עיבוד הזמנות, גביית תשלום ומשלוח המוצרים אלייך</li>
            <li>שליחת אישור הזמנה ועדכונים הקשורים אליה</li>
            <li>מתן שירות לקוחות ומענה לפניות</li>
            <li>ניהול החשבון, סל הקניות והווישליסט</li>
            <li>שיפור האתר והבנת אופן השימוש בו</li>
            <li>שליחת עדכונים שיווקיים — רק למי שנרשמה ונתנה לכך הסכמה, וניתן להסיר בכל עת</li>
            <li>עמידה בחובות חוקיות, לרבות חובות מס והנהלת חשבונות</li>
          </ul>

          <h2 className="text-2xl text-foreground mt-8 mb-4">עם מי המידע משותף</h2>
          <p className="text-muted-foreground">
            כדי שהאתר יעבוד אנחנו נעזרות בספקי שירות מקצועיים. כל אחד מהם מקבל רק את המידע
            שנחוץ לו לתפקידו, ואינו רשאי להשתמש בו למטרות אחרות:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li><strong>Supabase</strong> — בסיס הנתונים של האתר: חשבונות משתמשות, הזמנות, כתובות ורשימות משאלות. השרתים ממוקמים מחוץ לישראל.</li>
            <li><strong>PayPlus</strong> — סליקת התשלומים. פרטי הכרטיס מוזנים אצלה ואינם עוברים דרכנו; אנחנו מקבלות אישור תשלום בלבד.</li>
            <li><strong>Resend</strong> — שליחת הדוא״ל התפעולי, כמו אישור הזמנה.</li>
            <li><strong>Vercel</strong> — אחסון האתר והרצת השירותים שלו. השרתים ממוקמים מחוץ לישראל.</li>
            <li><strong>Google Analytics</strong> — סטטיסטיקות שימוש באתר בעזרת עוגיות, לצורך שיפור החנות.</li>
            <li><strong>Sentry</strong> — קבלת דיווחי תקלות טכניות מהאתר, כדי שנוכל לתקן אותן.</li>
            <li><strong>data.gov.il</strong> — השלמה אוטומטית של ערים ורחובות בטופס המשלוח, מתוך מאגר הנתונים הממשלתי הפתוח. הטקסט שאת מקלידה בשדה הכתובת נשלח לשאילתה במאגר.</li>
            <li><strong>שירותי שילוח</strong> — שם, כתובת וטלפון, לצורך מסירת החבילה בלבד.</li>
          </ul>
          <p className="text-muted-foreground">
            חלק מספקי השירות מאחסנים מידע מחוץ לישראל. מעבר לכך, מידע יימסר לצד שלישי רק אם
            נידרש לכך על פי דין או על פי צו של רשות מוסמכת.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">עוגיות ואחסון בדפדפן</h2>
          <p className="text-muted-foreground">
            האתר משתמש בעוגיות ובאחסון מקומי בדפדפן. חלקם הכרחיים לתפקוד — שמירת סל הקניות,
            הווישליסט והתחברות לחשבון — וחלקם משמשים למדידה סטטיסטית (Google Analytics).
            אפשר לחסום או למחוק עוגיות דרך הגדרות הדפדפן, אך חסימה עלולה לפגוע בחלק
            מהפעולות באתר, כמו שמירת הסל.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">כמה זמן המידע נשמר</h2>
          <p className="text-muted-foreground">
            מידע על הזמנות נשמר לתקופה הנדרשת לפי דיני המס והנהלת החשבונות. פרטי חשבון
            משתמשת נשמרים כל עוד החשבון פעיל. פרטי רשימת התפוצה נשמרים עד להסרה. מידע שאין
            עוד צורך בו ואין חובה חוקית לשמרו — נמחק.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">אבטחת מידע</h2>
          <p className="text-muted-foreground">
            הגלישה באתר מוצפנת (HTTPS), הגישה למידע מוגבלת לבעלת העסק ולספקי השירות הדרושים,
            והמידע נשמר בשירותים מקצועיים עם בקרות הרשאה. אנחנו נוקטות אמצעי אבטחה סבירים,
            אך כמו בכל שירות מקוון, לא ניתן להבטיח הגנה מוחלטת.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">הזכויות שלך</h2>
          <p className="text-muted-foreground">
            לפי חוק הגנת הפרטיות, את רשאית לעיין במידע האישי שנשמר אודותייך, לבקש לתקן מידע
            שגוי או לא מעודכן, ולבקש את מחיקתו — בכפוף למידע שאנחנו חייבות לשמור על פי דין
            (למשל רשומות הזמנה לצורכי מס). כמו כן, את רשאית לבטל בכל עת את הסכמתך לקבלת דיוור,
            בלחיצה על קישור ההסרה שבכל הודעה או בפנייה אלינו. לפנייה בכל אחד מהנושאים האלה
            אפשר לכתוב לנו לכתובת {SUPPORT_EMAIL}, ונטפל בבקשה בהקדם.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">קטינים</h2>
          <p className="text-muted-foreground">
            האתר מיועד לבגירות ובגירים מגיל 18 ומעלה, ואיננו אוספות ביודעין מידע על ילדים.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">שינויים במדיניות</h2>
          <p className="text-muted-foreground">
            ייתכן שנעדכן מדיניות זו מעת לעת, למשל אם נוסיף או נחליף ספק שירות. הנוסח המעודכן
            יפורסם בעמוד זה עם תאריך העדכון.
          </p>

          <h2 className="text-2xl text-foreground mt-8 mb-4">יצירת קשר</h2>
          <p className="text-muted-foreground">
            לשאלות בנוגע למדיניות הפרטיות, ניתן לפנות אלינו בכתובת {SUPPORT_EMAIL}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
