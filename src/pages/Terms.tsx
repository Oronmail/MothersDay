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

        <div className="space-y-10 text-right leading-relaxed" dir="rtl">

          {/* Introduction */}
          <section className="space-y-3">
            <p className="text-muted-foreground">
              ברוכים הבאים לאתר <strong>יום האם</strong> (להלן: &quot;האתר&quot;). האתר מופעל על ידי עדן מזרחי, עוסק מורשה (להלן: &quot;העסק&quot; או &quot;החנות&quot;).
            </p>
            <p className="text-muted-foreground">
              תקנון זה מהווה הסכם מחייב בין המשתמש/ת באתר (להלן: &quot;המשתמש/ת&quot; או &quot;הלקוח/ה&quot;) לבין העסק. השימוש באתר, לרבות ביצוע הזמנות, מהווה הסכמה לכל התנאים המפורטים בתקנון זה. אם אינך מסכים/ה לתנאים אלה, אנא הימנע/י משימוש באתר.
            </p>
            <p className="text-muted-foreground">
              התקנון מנוסח בלשון זכר ונקבה לסירוגין, אך מתייחס לכל המגדרים באופן שווה.
            </p>
            <p className="text-muted-foreground text-sm">
              עדכון אחרון: אפריל 2026
            </p>
          </section>

          {/* 1. Business Details */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">1. פרטי העסק</h2>
            <ul className="text-muted-foreground space-y-1 list-none">
              <li>שם העסק: יום האם</li>
              <li>בעלות ותפעול: עדן מזרחי</li>
              <li>סוג העסק: עוסק מורשה</li>
              <li>כתובת דוא&quot;ל: support@mothersday.co.il</li>
              <li>כתובת האתר: mothersday.co.il</li>
            </ul>
          </section>

          {/* 2. Definitions */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">2. הגדרות</h2>
            <ul className="text-muted-foreground space-y-2 list-none">
              <li><strong>&quot;האתר&quot;</strong> – אתר האינטרנט של יום האם, על כל דפיו ותכניו.</li>
              <li><strong>&quot;מוצר&quot;</strong> – כל פריט או שירות המוצע למכירה באתר, לרבות זרי פרחים, מתנות, מארזים וכל מוצר אחר.</li>
              <li><strong>&quot;הזמנה&quot;</strong> – בקשה לרכישת מוצר/ים באמצעות האתר.</li>
              <li><strong>&quot;ימי עסקים&quot;</strong> – ימים א׳–ה׳, למעט ימי שישי, שבת, ערבי חג, חגים וימי זיכרון.</li>
            </ul>
          </section>

          {/* 3. Eligibility */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">3. כשירות ותנאי שימוש</h2>
            <p className="text-muted-foreground">
              השימוש באתר וביצוע רכישות מותרים למשתמשים מגיל 18 ומעלה, בעלי כשרות משפטית להתקשר בהסכמים מחייבים, ובעלי כרטיס אשראי תקף על שמם.
            </p>
            <p className="text-muted-foreground">
              המשתמש/ת מצהיר/ה כי קרא/ה את התקנון, הבין/ה את תוכנו, ומסכים/ה לכל תנאיו.
            </p>
            <p className="text-muted-foreground">
              המשתמש/ת מתחייב/ת להשתמש באתר בדרך חוקית בלבד, שלא לפגוע בתפקוד האתר ושלא לעשות בו שימוש לצורך מעשה בלתי חוקי.
            </p>
          </section>

          {/* 4. Products */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">4. המוצרים</h2>
            <p className="text-muted-foreground">
              האתר מציע למכירה מגוון מוצרים הכוללים, בין היתר, זרי פרחים, מארזי מתנות, שוקולדים ומוצרים נלווים.
            </p>
            <p className="text-muted-foreground">
              התמונות המוצגות באתר הן להמחשה בלבד. ייתכנו הבדלים בין התמונה למוצר בפועל, בין היתר בשל שינויים עונתיים, זמינות פרחים או חומרי גלם, גווני צבע ועוד.
            </p>
            <p className="text-muted-foreground">
              העסק שומר לעצמו את הזכות להחליף רכיבים במוצר (לדוגמה: סוגי פרחים, צבעים או אריזות) ברכיבים דומים בערכם ובמראם, מבלי לפגוע באיכות המוצר ובערכו הכולל, וזאת בהתאם לזמינות.
            </p>
          </section>

          {/* 5. Ordering Process */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">5. ביצוע הזמנות</h2>
            <p className="text-muted-foreground">
              ביצוע הזמנה באתר מתבצע באמצעות בחירת מוצרים, מילוי פרטים אישיים ופרטי משלוח, ותשלום מקוון.
            </p>
            <p className="text-muted-foreground">
              הזמנה תיחשב כמאושרת רק לאחר קבלת אישור בדוא&quot;ל מהעסק. עצם השלמת ההזמנה באתר אינה מהווה התחייבות מצד העסק לספק את המוצר, אלא לאחר אישור ההזמנה.
            </p>
            <p className="text-muted-foreground">
              העסק רשאי לסרב לבצע הזמנה או לבטלה, בין היתר, במקרים הבאים: מסירת פרטים שגויים, חשד לשימוש לרעה, מוצר שאזל מהמלאי, או תקלה טכנית שגרמה להצגת מחיר שגוי.
            </p>
            <p className="text-muted-foreground">
              הלקוח/ה אחראי/ת למסירת פרטים מדויקים ומלאים (כתובת, טלפון, שם הנמען). העסק לא יישא באחריות לעיכוב או אי-אספקה שנגרמו עקב מסירת פרטים שגויים.
            </p>
          </section>

          {/* 6. Pricing & Payment */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">6. מחירים ותשלום</h2>
            <p className="text-muted-foreground">
              כל המחירים המוצגים באתר כוללים מע&quot;מ כדין ונקובים בשקלים חדשים (₪).
            </p>
            <p className="text-muted-foreground">
              העסק רשאי לעדכן מחירים מעת לעת. המחיר הקובע הוא המחיר שהוצג בעת השלמת ההזמנה.
            </p>
            <p className="text-muted-foreground">
              התשלום מתבצע באמצעות כרטיס אשראי או כל אמצעי תשלום אחר שיוצע באתר. עסקת התשלום מאובטחת ומתבצעת באמצעות שירות סליקה מוסמך. פרטי כרטיס האשראי אינם נשמרים בשרתי האתר.
            </p>
          </section>

          {/* 7. Shipping & Delivery */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">7. משלוחים ואספקה</h2>
            <p className="text-muted-foreground">
              המשלוחים מתבצעים לכתובות בישראל בלבד.
            </p>
            <p className="text-muted-foreground">
              זמני האספקה המצוינים באתר הם הערכה בלבד ואינם מהווים התחייבות. ככלל, המשלוח יתבצע תוך 1–7 ימי עסקים ממועד אישור ההזמנה, בהתאם לסוג המוצר ולאזור המשלוח.
            </p>
            <p className="text-muted-foreground">
              ימי עסקים אינם כוללים ימי שישי, שבת, ערבי חג וחגים.
            </p>
            <p className="text-muted-foreground">
              עלות המשלוח תוצג בעת ביצוע ההזמנה. ייתכנו הבדלים בעלות המשלוח בהתאם לאזור המשלוח.
            </p>
            <p className="text-muted-foreground">
              בתקופות עומס (כגון ערבי חג ויום האם) ייתכנו עיכובים מעבר ללוחות הזמנים המצוינים.
            </p>
            <p className="text-muted-foreground">
              במקרה שהנמען אינו נמצא בכתובת המשלוח, ייעשה ניסיון ליצור קשר טלפוני. אם לא ניתן להשלים את המסירה, המשלוח יוחזר לעסק והלקוח/ה יישא/תישא בעלות משלוח חוזר.
            </p>
          </section>

          {/* 8. Cancellation & Returns */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">8. ביטול עסקה והחזרות</h2>
            <p className="text-muted-foreground font-medium">
              בהתאם לחוק הגנת הצרכן, התשמ&quot;א-1981:
            </p>

            <p className="text-muted-foreground">
              <strong>זכות ביטול כללית:</strong> ניתן לבטל עסקה תוך 14 יום ממועד קבלת המוצר או ממועד קבלת מסמך פרטי העסקה (המאוחר מביניהם), ובלבד שהמוצר לא נפגם ולא נעשה בו שימוש.
            </p>
            <p className="text-muted-foreground">
              <strong>חריג – מוצרים מתכלים:</strong> בהתאם לסעיף 14ג(ד)(4) לחוק, לא ניתן לבטל עסקה של &quot;טובין פסידים&quot; – מוצרים שעלולים להתקלקל, כגון פרחים טריים ומוצרי מזון. מוצרים אלה אינם ניתנים לביטול לאחר אספקתם.
            </p>
            <p className="text-muted-foreground">
              <strong>דמי ביטול:</strong> בעסקאות הניתנות לביטול, ייגבו דמי ביטול בסך 5% ממחיר העסקה או 100 ₪ – הנמוך מביניהם – בהתאם לחוק.
            </p>
            <p className="text-muted-foreground">
              <strong>ביטול ללא דמי ביטול:</strong> ביטול שנובע מפגם במוצר, אי-התאמה בין המוצר לתיאורו באתר, עיכוב משמעותי באספקה מעבר למועד שהובטח, או הפרה אחרת של תנאי העסקה מצד העסק – לא ייגבו בגינו דמי ביטול.
            </p>
            <p className="text-muted-foreground">
              <strong>אוכלוסיות מוגנות:</strong> אזרחים ותיקים (מגיל 65), אנשים עם מוגבלות ועולים חדשים (עד 5 שנים מיום העלייה) רשאים לבטל עסקה תוך 4 חודשים ממועד ביצועה או ממועד קבלת מסמך פרטי העסקה, בהתאם לחוק (למעט חריגים על מוצרים מתכלים).
            </p>
            <p className="text-muted-foreground">
              <strong>אופן הביטול:</strong> בקשת ביטול תישלח בדוא&quot;ל לכתובת support@mothersday.co.il או בטלפון. יש לציין את שם הלקוח/ה, מספר ההזמנה וסיבת הביטול.
            </p>
            <p className="text-muted-foreground">
              <strong>החזר כספי:</strong> במקרה של ביטול עסקה, ההחזר הכספי יבוצע תוך 14 ימים ממועד קבלת הודעת הביטול, באותו אמצעי תשלום בו בוצעה העסקה.
            </p>
          </section>

          {/* 9. Warranty */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">9. אחריות על מוצרים</h2>
            <p className="text-muted-foreground">
              כל המוצרים נבדקים בקפידה לפני המשלוח.
            </p>
            <p className="text-muted-foreground">
              במקרה שהתקבל מוצר פגום, שבור או שונה מהותית מתיאורו באתר, יש ליצור קשר עם שירות הלקוחות תוך 24 שעות מקבלת המשלוח בצירוף תמונות של המוצר. העסק יפעל לתקן את הבעיה, להחליף את המוצר או להעניק החזר כספי, לפי שיקול דעתו.
            </p>
            <p className="text-muted-foreground">
              פרחים טריים הם מוצרים טבעיים שאורך חייהם מוגבל. העסק אינו אחראי לקמילת פרחים או שינוי מראם לאחר מסירתם ללקוח.
            </p>
          </section>

          {/* 10. Liability */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">10. הגבלת אחריות</h2>
            <p className="text-muted-foreground">
              העסק אינו אחראי לנזקים ישירים או עקיפים הנובעים משימוש באתר או מאי-יכולת להשתמש בו, לרבות תקלות טכניות, הפרעות בשירותי אינטרנט, וירוסים או רכיבים מזיקים.
            </p>
            <p className="text-muted-foreground">
              העסק אינו אחראי לעיכובים או לאי-אספקה הנגרמים עקב כוח עליון, לרבות מלחמה, פעולות איבה, מגפה, שביתות, תנאי מזג אוויר קיצוניים, או כל אירוע שאינו בשליטת העסק.
            </p>
            <p className="text-muted-foreground">
              בכל מקרה, אחריות העסק לא תעלה על הסכום ששולם בפועל עבור המוצר הספציפי שבגינו נטענת הטענה.
            </p>
          </section>

          {/* 11. Privacy */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">11. מדיניות פרטיות</h2>
            <p className="text-muted-foreground">
              העסק מחויב להגנה על פרטיות המשתמשים בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981, ותיקון מס׳ 13 לחוק.
            </p>

            <p className="text-muted-foreground">
              <strong>מידע הנאסף:</strong> במהלך השימוש באתר וביצוע הזמנות, נאספים פרטים אישיים הנדרשים לביצוע ההזמנה ומתן השירות, ובכלל זה: שם מלא, כתובת, מספר טלפון, כתובת דוא&quot;ל ופרטי תשלום.
            </p>
            <p className="text-muted-foreground">
              <strong>מטרת האיסוף:</strong> המידע נאסף לצורך עיבוד הזמנות, ביצוע משלוחים, מתן שירות לקוחות, ושיפור חוויית המשתמש באתר.
            </p>
            <p className="text-muted-foreground">
              <strong>שיתוף מידע:</strong> פרטים אישיים יועברו לצדדים שלישיים אך ורק במידה הנדרשת לביצוע ההזמנה (כגון חברות שילוח וחברות סליקה), או כנדרש על פי דין.
            </p>
            <p className="text-muted-foreground">
              <strong>אבטחת מידע:</strong> העסק נוקט אמצעים סבירים לאבטחת המידע האישי, לרבות הצפנת נתונים ושימוש בפרוטוקולי אבטחה מקובלים. עם זאת, אין באפשרות העסק להבטיח הגנה מוחלטת מפני חדירות בלתי מורשות.
            </p>
            <p className="text-muted-foreground">
              <strong>זכויות המשתמש:</strong> בהתאם לחוק, כל משתמש/ת רשאי/ת לעיין במידע האישי המוחזק אודותיו/ה, לבקש את תיקונו או מחיקתו. פנייה בעניין זה תופנה לכתובת הדוא&quot;ל של העסק.
            </p>
            <p className="text-muted-foreground">
              <strong>שמירת מידע:</strong> מידע אישי יישמר כל עוד הוא נדרש למטרות שלשמן נאסף, או כנדרש על פי דין.
            </p>
          </section>

          {/* 12. Cookies */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">12. עוגיות (Cookies)</h2>
            <p className="text-muted-foreground">
              האתר משתמש בעוגיות (Cookies) לצורך תפעול שוטף, שיפור חוויית הגלישה, ואיסוף נתונים סטטיסטיים.
            </p>
            <p className="text-muted-foreground">
              <strong>עוגיות הכרחיות:</strong> נדרשות לתפקוד בסיסי של האתר (כגון סל קניות והתחברות).
            </p>
            <p className="text-muted-foreground">
              <strong>עוגיות אנליטיות:</strong> מסייעות בהבנת אופן השימוש באתר לצורך שיפורו.
            </p>
            <p className="text-muted-foreground">
              ניתן לנהל את העדפות העוגיות דרך הגדרות הדפדפן. חסימת עוגיות מסוימות עלולה לפגוע בחוויית השימוש באתר.
            </p>
          </section>

          {/* 13. Marketing */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">13. דיוור ופרסום</h2>
            <p className="text-muted-foreground">
              העסק רשאי לשלוח דברי פרסומת בדוא&quot;ל או ב-SMS ללקוחות שנתנו הסכמתם לכך, בהתאם לחוק התקשורת (בזק ושידורים), התשמ&quot;ב-1982.
            </p>
            <p className="text-muted-foreground">
              ניתן להסיר את עצמך מרשימת הדיוור בכל עת באמצעות לחיצה על קישור ההסרה המופיע בכל הודעה, או בפנייה ישירה לעסק.
            </p>
          </section>

          {/* 14. Intellectual Property */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">14. קניין רוחני</h2>
            <p className="text-muted-foreground">
              כל הזכויות באתר ובתכניו, לרבות עיצוב, טקסטים, תמונות, לוגו, סימני מסחר, קוד מקור וכל חומר אחר, שייכים לעסק או לצדדים שלישיים שהעניקו לעסק רישיון שימוש, והם מוגנים על פי חוקי זכויות יוצרים וקניין רוחני.
            </p>
            <p className="text-muted-foreground">
              אין להעתיק, לשכפל, להפיץ, לפרסם, להציג בפומבי או לעשות שימוש מסחרי בכל תוכן מהאתר ללא אישור מראש ובכתב מהעסק.
            </p>
          </section>

          {/* 15. User Conduct */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">15. התנהגות משתמשים</h2>
            <p className="text-muted-foreground">
              המשתמש/ת מתחייב/ת שלא לעשות שימוש באתר לכל מטרה בלתי חוקית או אסורה, לרבות:
            </p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>פריצה, חדירה בלתי מורשית או ניסיון לשבש את פעילות האתר</li>
              <li>איסוף מידע על משתמשים אחרים ללא הסכמתם</li>
              <li>שימוש בזהות בדויה או מסירת פרטים כוזבים</li>
              <li>ביצוע הזמנות בזדון או ללא כוונה אמיתית לרכוש</li>
            </ul>
            <p className="text-muted-foreground">
              העסק שומר לעצמו את הזכות לחסום משתמשים המפרים תנאים אלה, ללא הודעה מוקדמת.
            </p>
          </section>

          {/* 16. Third-Party Links */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">16. קישורים לאתרים חיצוניים</h2>
            <p className="text-muted-foreground">
              האתר עשוי לכלול קישורים לאתרי אינטרנט של צדדים שלישיים. העסק אינו אחראי לתוכן, למדיניות הפרטיות או לפעילות של אתרים אלה. הכניסה אליהם היא באחריות המשתמש/ת בלבד.
            </p>
          </section>

          {/* 17. Accessibility */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">17. נגישות</h2>
            <p className="text-muted-foreground">
              העסק פועל להנגיש את האתר בהתאם לתקן הישראלי 5568 ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג-2013.
            </p>
            <p className="text-muted-foreground">
              אם נתקלת בבעיית נגישות באתר, נשמח לסייע. ניתן לפנות אלינו בדוא&quot;ל support@mothersday.co.il ואנו נעשה כל מאמץ לתת מענה ולשפר את הנגישות.
            </p>
          </section>

          {/* 18. Changes to Terms */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">18. שינויים בתקנון</h2>
            <p className="text-muted-foreground">
              העסק רשאי לעדכן תקנון זה מעת לעת, לפי שיקול דעתו. שינויים מהותיים יפורסמו באתר. המשך השימוש באתר לאחר עדכון התקנון מהווה הסכמה לתנאים המעודכנים.
            </p>
            <p className="text-muted-foreground">
              מומלץ לעיין בתקנון מפעם לפעם על מנת להתעדכן בשינויים.
            </p>
          </section>

          {/* 19. Governing Law */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">19. דין חל וסמכות שיפוט</h2>
            <p className="text-muted-foreground">
              על תקנון זה יחולו דיני מדינת ישראל בלבד.
            </p>
            <p className="text-muted-foreground">
              סמכות השיפוט הבלעדית בכל עניין הנוגע לתקנון זה, לפרשנותו וליישומו, תהיה נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.
            </p>
          </section>

          {/* 20. Contact */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">20. יצירת קשר</h2>
            <p className="text-muted-foreground">
              לכל שאלה, בירור או פנייה בנוגע לתקנון זה או לשירותי האתר, ניתן לפנות אלינו:
            </p>
            <ul className="text-muted-foreground space-y-1 list-none">
              <li>דוא&quot;ל: support@mothersday.co.il</li>
              <li>באמצעות טופס יצירת הקשר באתר</li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section className="space-y-3 border-t pt-8 mt-8">
            <p className="text-sm text-muted-foreground/70">
              * תקנון זה נערך כמסמך כללי ואינו מהווה ייעוץ משפטי. מומלץ להיוועץ בעורך דין לצורך התאמתו המלאה לדרישות החוק.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
