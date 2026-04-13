import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import titleUnderline from "@/assets/title-underline.png";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-4xl text-foreground text-center" dir="rtl">תקנון האתר</h1>
          <img 
            src={titleUnderline} 
            alt="" 
            className="w-48 md:w-64 h-auto -mt-1"
          />
        </div>
        
        <div className="space-y-12 text-center" dir="rtl">
          {/* Introduction */}
          <div className="space-y-2">
            <h2 className="text-xl text-foreground font-medium">תקנון ומדיניות – יום האם</h2>
            <p className="text-muted-foreground">
              ברוכים הבאים לאתר יום האם (להלן: "האתר").
            </p>
            <p className="text-muted-foreground">
              השימוש באתר ורכישת מוצרים באמצעותו כפופים לתנאים המפורטים להלן. הזמנה באתר מהווה הסכמה מלאה
            </p>
            <p className="text-muted-foreground">
              והתחייבות לכל האמור בתקנון זה.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h2 className="text-xl text-foreground font-medium">1. פרטי העסק</h2>
            <p className="text-muted-foreground">שם העסק: יום האם</p>
            <p className="text-muted-foreground">בעלות ותפעול: עדן פרידמן</p>
            <p className="text-muted-foreground">מספר עוסק מורשה בישראל</p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h2 className="text-xl text-foreground font-medium">2. תנאי שימוש כלליים</h2>
            <p className="text-muted-foreground">
              השימוש באתר מיועד ללקוחות מגיל 18 ומעלה.
            </p>
            <p className="text-muted-foreground">
              המשתמש מאשר ומצהיר כי קרא, הבין את התקנון וכי הפרטים שמסר, מדויק או שהמשתמש הסכימים לו, נכון על
            </p>
            <p className="text-muted-foreground">
              ידיו ומסר מרצונו.
            </p>
            <p className="text-muted-foreground">
              המשתמש באתר מתחייב להשתמש בו בדרך חוקית ולמעשה לגיטימית בלבד.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-4">
            <h2 className="text-xl text-foreground font-medium">3. הזמנות ותשלום</h2>
            <p className="text-muted-foreground">
              ההזמנה באתר מתבצע באמצעות טופסים ומערכת הזמנות מאובטחת, וכן גם על ידי צ'אט.
            </p>
            <p className="text-muted-foreground">
              השלמת ההזמנה מאשרת הסכמה לתשלום מראש באמצעות כרטיסי האשראי המקובלים או ביט.
            </p>
            <p className="text-muted-foreground">
              ביטלה החנות הזמנה שבה אושרה התשלום מראש ואושר של לקוחה.
            </p>
            <p className="text-muted-foreground">
              מחירים הנקובים בתשלום והכוללים מע״מ וכפופים למדיניות.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-4">
            <h2 className="text-xl text-foreground font-medium">4. משלוחים ואספקה</h2>
            <p className="text-muted-foreground">
              המשלוחים מבוצעים באמצעי משלוח עם הפקודה ישראל בלבד.
            </p>
            <p className="text-muted-foreground">
              זמן משלוח: עד 7 ימי עסקים ממועד אישור ההזמנה.
            </p>
            <p className="text-muted-foreground">
              ימי עסקים אינם כוללים ימי שישי, שבת, ערבי חג וחג.
            </p>
            <p className="text-muted-foreground">
              אנו משתדלים לעמוד בלוחות זמנים הרגילים.
            </p>
            <p className="text-muted-foreground">
              *ייתכנו עיכובים בתקופות עומס בשליחויות (ערבי חג) ואילוצים שמעבר לשליטתנו
            </p>
            <p className="text-muted-foreground">
              בהזמנה של ני מוצרים ולמעלה למשלוח במלואה, משלוח חינם המתנה באתר הזול או הלכולת.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-4">
            <h2 className="text-xl text-foreground font-medium">5. ביטולים והחזרות</h2>
            <p className="text-muted-foreground">
              ביטול עסקה: האפשרות לביטול בהתאם להוראות חוק הגנת הצרכן.
            </p>
            <p className="text-muted-foreground">
              ניתן לבטל עסקה בתוך 14 יום ממועד קבלת המשלח, בתנאי שהמוצר לא נפתח ולא נעשה בו שימוש כלשהו
            </p>
            <p className="text-muted-foreground">
              במקורית.
            </p>
            <p className="text-muted-foreground">
              במקרי ביטול ייגבו דמי ביטול בהתאם לחוק של עד 5% מהעסקה והוא עד 100 ₪ – הנמוך מבינהם.
            </p>
            <p className="text-muted-foreground">
              עלות המשלח חלי בינוי והחזרה של הלקוחה, אלא אם הביטול בגלל מום או בעקבות טעויות על ידי יום האם.
            </p>
            <p className="text-muted-foreground">
              בהתאם על הביטול תופנה ההזמנה, יש להודיע קודם עם פרטים להוראות הלכות.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-4">
            <h2 className="text-xl text-foreground font-medium">6. אחריות</h2>
            <p className="text-muted-foreground">
              המוצרים נבדק בקפידה לפני ההעלאה למשלוח אליך.
            </p>
            <p className="text-muted-foreground">
              במשלוח חדש אפשרות לבדוק את כל פירוק בנסיבות הסבירות ואיסור זה יחפור אם יש ייצור בהדפסה.
            </p>
            <p className="text-muted-foreground">
              האחריות אינה מכלת על נזקי בלאי, משיכות לא יהיה או מזון אשפסות המעות לאחר השלמת מוסר.
            </p>
          </div>

          {/* Section 7 */}
          <div className="space-y-4">
            <h2 className="text-xl text-foreground font-medium">7. קניין רוחני</h2>
            <p className="text-muted-foreground">
              כל הזכויות באתר, לרבות עיצובים, מקבצים, לוגוים, לתור, מבנהים ושאר אמור – שייכים ליום האם.
            </p>
            <p className="text-muted-foreground">
              אין להעתיק, לשכפל, לפרסם או לעשות שימושים לרעה ללא אישור מראש בכתב מהאת הכתובות באתר.
            </p>
          </div>

          {/* Section 8 */}
          <div className="space-y-4">
            <h2 className="text-xl text-foreground font-medium">8. פרטיות ומידע</h2>
            <p className="text-muted-foreground">
              באתר נאספים פרטים אישי כנדרש על ידי המשתמשות לצורך ביצוע ההזמנה או שירות אחר, לרבות שם, כתובת,
            </p>
            <p className="text-muted-foreground">
              טלפון ודוא״ל.
            </p>
            <p className="text-muted-foreground">
              הפרטים אספו לשימוש כמצוין בתשלום, הסף מיוסד לשימוש המזהה סוגי האלקטרונית באתר.
            </p>
            <p className="text-muted-foreground">
              צ'אט לאיות שימוש בקבלי לרבות מקטעיים לשיפור שביעות.
            </p>
            <p className="text-muted-foreground">
              בהצטרפות דאי אי מצפיית לקנות עד כל, אנחנו לאחרי מסכים האזור מעוניין (כגון ושולה, פרטים ומועדפים) במהלות.
            </p>
            <p className="text-muted-foreground">
              דרך.
            </p>
            <p className="text-muted-foreground">
              כל המשתמשות והמידע נשמרו בצורה דרך, ויהיו אם הראש מכל ליכו אלף באופן שאינם.
            </p>
          </div>

          {/* Section 9 */}
          <div className="space-y-4">
            <h2 className="text-xl text-foreground font-medium">9. הגבלת אחריות</h2>
            <p className="text-muted-foreground">
              השימוש באתר מבוצע על אחריות של המשתמש בלבד.
            </p>
            <p className="text-muted-foreground">
              העסק/החנות לא יישא באחריות לתקלות ייחור או על עיכובים והעברות הנגרמים משמא או מהפצלים מטיפולים.
            </p>
            <p className="text-muted-foreground">
              (נ.ס, מזון דואר בלתי)
            </p>
          </div>

          {/* Section 10 */}
          <div className="space-y-4">
            <h2 className="text-xl text-foreground font-medium">10. דין וסמכות שיפוט</h2>
            <p className="text-muted-foreground">
              על תקנון זה יחול דין בישראל בלבד.
            </p>
            <p className="text-muted-foreground">
              סמכות השיפוט הבלעדית נתונה לחלונות המנים בעניין הסמכות הבלעדית לבית המשפטים בישראל.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
