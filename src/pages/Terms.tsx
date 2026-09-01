import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import titleUnderline from "@/assets/title-underline.png";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, WHATSAPP_URL } from "@/lib/siteConfig";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Terms = () => {
  // Shipping pricing comes from store_settings (same source as checkout), so the
  // legal text can't drift from what customers are actually charged.
  const { data: settings } = useStoreSettings();
  const shippingCost = settings?.shipping_cost ?? 35;
  const freeShippingThreshold = settings?.free_shipping_threshold ?? 350;

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
              ברוכות הבאות לאתר <strong>יום האם</strong> (להלן: &quot;האתר&quot;). האתר מופעל על ידי עדן מזרחי, עוסק מורשה (להלן: &quot;העסק&quot; או &quot;החנות&quot;), ומוכר מוצרי תכנון וארגון מודפסים לאימהות.
            </p>
            <p className="text-muted-foreground">
              תקנון זה מהווה הסכם מחייב בין המשתמש/ת באתר (להלן: &quot;המשתמש/ת&quot; או &quot;הלקוח/ה&quot;) לבין העסק. השימוש באתר, לרבות ביצוע הזמנות, מהווה הסכמה לכל התנאים המפורטים בתקנון זה. אם אינך מסכימה לתנאים אלה, אנא הימנעי משימוש באתר.
            </p>
            <p className="text-muted-foreground">
              התקנון מנוסח בלשון נקבה מטעמי נוחות, אך מתייחס לכל המגדרים באופן שווה.
            </p>
            <p className="text-muted-foreground text-sm">
              עודכן לאחרונה: ספטמבר 2026
            </p>
          </section>

          {/* 1. Business Details */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">1. פרטי העסק</h2>
            <ul className="text-muted-foreground space-y-1 list-none">
              <li>שם העסק: יום האם</li>
              <li>בעלות ותפעול: עדן מזרחי</li>
              <li>סוג העסק: עוסק מורשה</li>
              <li>כתובת דוא״ל: {SUPPORT_EMAIL}</li>
              <li>טלפון / וואטסאפ: {SUPPORT_PHONE_DISPLAY}</li>
              <li>כתובת האתר: mothersday.co.il</li>
            </ul>
            <p className="text-muted-foreground">
              לעסק אין חנות פיזית פתוחה לקהל; כל הפעילות מתבצעת באתר ובמשלוחים.
            </p>
          </section>

          {/* 2. Definitions */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">2. הגדרות</h2>
            <ul className="text-muted-foreground space-y-2 list-none">
              <li><strong>&quot;האתר&quot;</strong> – אתר האינטרנט של יום האם, על כל דפיו ותכניו.</li>
              <li><strong>&quot;מוצר&quot;</strong> – כל פריט המוצע למכירה באתר: לוחות תכנון שבועיים ומשפחתיים, מחברות לניהול משימות, מחברות שורות, בלוקי תכנון ומארזים המורכבים מפריטים אלה.</li>
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
              ניתן לרכוש באתר גם ללא פתיחת חשבון. אם נפתח חשבון משתמש, האחריות לשמירת פרטי ההתחברות היא על בעלת החשבון, ואין למסור אותם לאחרים.
            </p>
            <p className="text-muted-foreground">
              המשתמש/ת מתחייב/ת להשתמש באתר בדרך חוקית בלבד, שלא לפגוע בתפקוד האתר ושלא לעשות בו שימוש לצורך מעשה בלתי חוקי.
            </p>
          </section>

          {/* 4. Products */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">4. המוצרים</h2>
            <p className="text-muted-foreground">
              האתר מציע למכירה מוצרי נייר מודפסים לתכנון ולארגון: לוחות תכנון שבועיים ומשפחתיים, לוחות לתכנון ארוחות, בלוקים לרשימות קניות וסידורים, מחברות לניהול משימות קבועות, מחברות שורות בגדלים שונים, בלוקי תכנון ומארזים המשלבים כמה מהמוצרים יחד.
            </p>
            <p className="text-muted-foreground">
              התמונות המוצגות באתר הן להמחשה בלבד. ייתכנו הפרשי גוון בין התצוגה במסך לבין הגוון המודפס בפועל, וכן הבדלים קלים בגימור ובחיתוך המתקבלים בתהליכי הדפסה.
            </p>
            <p className="text-muted-foreground">
              מפרט המוצר (מידות, סוג הנייר, מספר העמודים) מופיע בדף המוצר. העסק רשאי לעדכן את המפרט או את העיצוב מעת לעת; המפרט המחייב הוא זה שהוצג בדף המוצר בעת ביצוע ההזמנה.
            </p>
            <p className="text-muted-foreground">
              המוצרים מוצעים למכירה בכפוף למלאי הקיים. אם מוצר שהוזמן אזל, נודיע לך בהקדם ונציע החלפה, המתנה לחידוש המלאי או ביטול ההזמנה והחזר כספי מלא.
            </p>
          </section>

          {/* 5. Ordering Process */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">5. ביצוע הזמנות</h2>
            <p className="text-muted-foreground">
              ביצוע הזמנה באתר מתבצע באמצעות בחירת מוצרים, מילוי פרטים אישיים ופרטי משלוח, ותשלום מקוון.
            </p>
            <p className="text-muted-foreground">
              הזמנה תיחשב כמאושרת רק לאחר אישור התשלום וקבלת הודעת אישור הזמנה בדוא״ל מהעסק. עצם השלמת הטופס באתר אינה מהווה התחייבות מצד העסק לספק את המוצר, אלא לאחר אישור ההזמנה.
            </p>
            <p className="text-muted-foreground">
              העסק רשאי לסרב לבצע הזמנה או לבטלה, בין היתר, במקרים הבאים: מסירת פרטים שגויים, חשד לשימוש לרעה או לשימוש בכרטיס אשראי ללא הרשאה, מוצר שאזל מהמלאי, או תקלה טכנית שגרמה להצגת מחיר או מפרט שגויים. במקרה של ביטול כאמור לאחר שבוצע חיוב, יוחזר הסכום ששולם במלואו.
            </p>
            <p className="text-muted-foreground">
              הלקוחה אחראית למסירת פרטים מדויקים ומלאים (כתובת, טלפון, שם הנמען). העסק לא יישא באחריות לעיכוב או לאי-אספקה שנגרמו עקב מסירת פרטים שגויים.
            </p>
          </section>

          {/* 6. Pricing & Payment */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">6. מחירים ותשלום</h2>
            <p className="text-muted-foreground">
              כל המחירים המוצגים באתר נקובים בשקלים חדשים (₪) וכוללים מע״מ כדין.
            </p>
            <p className="text-muted-foreground">
              העסק רשאי לעדכן מחירים מעת לעת. המחיר הקובע הוא המחיר שהוצג בעמוד סיכום ההזמנה בעת ביצוע התשלום.
            </p>
            <p className="text-muted-foreground">
              התשלום מתבצע בכרטיס אשראי באמצעות <strong>PayPlus</strong>, חברת סליקה ישראלית מורשית. הזנת פרטי כרטיס האשראי מתבצעת בעמוד התשלום המאובטח של PayPlus, ופרטי הכרטיס אינם נשמרים ואינם מגיעים לשרתי האתר. העסק מקבל מחברת הסליקה אישור על ביצוע התשלום בלבד.
            </p>
            <p className="text-muted-foreground">
              לאחר אישור התשלום תישלח אלייך הודעת אישור הזמנה לכתובת הדוא״ל שמסרת, הכוללת את פרטי ההזמנה. מסמך חשבונית/קבלה יימסר בהתאם לדין; אם לא קיבלת אותו, ניתן לפנות אלינו בדוא״ל ונשלח אותו אלייך.
            </p>
          </section>

          {/* 7. Shipping & Delivery */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">7. משלוחים ואספקה</h2>
            <p className="text-muted-foreground">
              המשלוחים מתבצעים לכתובות בישראל בלבד, בשיטת משלוח אחת: משלוח עד הכתובת שנמסרה בהזמנה.
            </p>
            <p className="text-muted-foreground">
              עלות המשלוח היא {shippingCost} ₪, ומשלוח חינם בהזמנה מעל {freeShippingThreshold} ₪. עלות המשלוח המחייבת היא זו המוצגת בעמוד סיכום ההזמנה לפני התשלום, ועשויה להתעדכן מעת לעת.
            </p>
            <p className="text-muted-foreground">
              זמני האספקה המצוינים באתר הם הערכה בלבד. ככלל, ההזמנה נארזת ויוצאת מאיתנו תוך 1–3 ימי עסקים ממועד אישור ההזמנה, וזמן ההגעה הוא בדרך כלל עד 7 ימי עסקים ממועד אישור ההזמנה.
            </p>
            <p className="text-muted-foreground">
              ימי עסקים אינם כוללים ימי שישי, שבת, ערבי חג וחגים. בתקופות עומס (חגים, יום האם) ייתכנו עיכובים מעבר ללוחות הזמנים המצוינים.
            </p>
            <p className="text-muted-foreground">
              במקרה שהנמענת אינה נמצאת בכתובת המשלוח, ייעשה ניסיון ליצור קשר טלפוני. אם לא ניתן להשלים את המסירה והמשלוח יוחזר לעסק, ניצור קשר לתיאום משלוח חוזר; עלות המשלוח החוזר תחול על הלקוחה.
            </p>
            <p className="text-muted-foreground">
              לאחר מסירת המשלוח לחברת השילוח, זמני ההגעה תלויים בה ואינם בשליטת העסק. אנחנו כאן לכל בירור על מצב ההזמנה — פשוט פני אלינו.
            </p>
          </section>

          {/* 8. Cancellation & Returns */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">8. ביטול עסקה והחזרות</h2>
            <p className="text-muted-foreground font-medium">
              בהתאם לחוק הגנת הצרכן, התשמ״א-1981:
            </p>

            <p className="text-muted-foreground">
              <strong>זכות ביטול:</strong> ניתן לבטל את העסקה תוך 14 יום ממועד קבלת המוצר או ממועד קבלת מסמך פרטי העסקה — המאוחר מביניהם — ובלבד שהמוצר לא נפגם ולא נעשה בו שימוש.
            </p>
            <p className="text-muted-foreground">
              <strong>ללא דמי ביטול:</strong> החוק מתיר לעסק לגבות דמי ביטול בשיעור של עד 5% ממחיר העסקה או 100 ₪ — הנמוך מביניהם. אנחנו בחרנו לוותר על גבייתם: בביטול לפי סעיף זה יינתן החזר מלא של הסכום ששולם עבור המוצרים.
            </p>
            <p className="text-muted-foreground">
              <strong>משלוח ההחזרה:</strong> בביטול מתוך בחירה, החזרת המוצר אלינו היא באחריות הלקוחה ועל חשבונה, ודמי המשלוח ששולמו בהזמנה המקורית אינם מוחזרים. בביטול בשל פגם, אי-התאמה בין המוצר לתיאורו באתר, עיכוב משמעותי באספקה או הפרה אחרת מצד העסק — העסק יישא בעלות ההחזרה ויחזיר גם את דמי המשלוח.
            </p>
            <p className="text-muted-foreground">
              <strong>אוכלוסיות מוגנות:</strong> אזרחים ותיקים (מגיל 65), אנשים עם מוגבלות ועולים חדשים (עד 5 שנים מיום העלייה) רשאים לבטל עסקה תוך 4 חודשים ממועד ביצועה, ממועד קבלת המוצר או ממועד קבלת מסמך פרטי העסקה — לפי המאוחר, בהתאם לחוק. ייתכן שנבקש להציג תעודה מתאימה.
            </p>
            <p className="text-muted-foreground">
              <strong>אופן הביטול:</strong> בקשת ביטול תישלח בדוא״ל לכתובת {SUPPORT_EMAIL}, בוואטסאפ או בטלפון {SUPPORT_PHONE_DISPLAY}. יש לציין שם, מספר הזמנה וסיבת הביטול. לאחר אישור הבקשה נמסור את כתובת ההחזרה.
            </p>
            <p className="text-muted-foreground">
              <strong>החזר כספי:</strong> ההחזר יבוצע תוך 14 יום ממועד קבלת הודעת הביטול, באותו אמצעי תשלום שבו בוצעה העסקה.
            </p>
            <p className="text-muted-foreground">
              פירוט מלא של תהליך ההחזרה מופיע בעמוד <strong>מדיניות החזרות</strong> באתר, והוא חלק בלתי נפרד מתקנון זה.
            </p>
          </section>

          {/* 9. Warranty */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">9. אחריות על מוצרים</h2>
            <p className="text-muted-foreground">
              כל המוצרים נבדקים ונארזים בקפידה לפני המשלוח.
            </p>
            <p className="text-muted-foreground">
              במקרה שהתקבל מוצר פגום, שבור, מודפס באופן לקוי או שונה מהותית מתיאורו באתר, יש ליצור קשר עם שירות הלקוחות תוך 14 יום מקבלת המשלוח, בצירוף תמונות של המוצר והאריזה. נחליף את המוצר, נתקן את הטעות או ניתן החזר כספי מלא, לפי בחירתך, ועלות ההחזרה תחול על העסק.
            </p>
            <p className="text-muted-foreground">
              המוצרים הם מוצרי נייר מודפסים. האחריות אינה חלה על בלאי טבעי משימוש, על נזק שנגרם לאחר המסירה (כגון רטיבות, קרעים או כתמים), ועל כתיבה או סימון שנעשו במוצר.
            </p>
          </section>

          {/* 10. Liability */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">10. הגבלת אחריות</h2>
            <p className="text-muted-foreground">
              התכנים באתר, לרבות מאמרי הבלוג והמלצות התכנון, הם מידע כללי בלבד ואינם מהווים ייעוץ מקצועי מכל סוג.
            </p>
            <p className="text-muted-foreground">
              העסק אינו אחראי לנזקים עקיפים או תוצאתיים הנובעים משימוש באתר או מאי-יכולת להשתמש בו, לרבות תקלות טכניות, הפרעות בשירותי אינטרנט, וירוסים או רכיבים מזיקים.
            </p>
            <p className="text-muted-foreground">
              העסק אינו אחראי לעיכובים או לאי-אספקה הנגרמים עקב כוח עליון, לרבות מלחמה, פעולות איבה, מגפה, שביתות, תנאי מזג אוויר קיצוניים, או כל אירוע שאינו בשליטת העסק.
            </p>
            <p className="text-muted-foreground">
              בכל מקרה, ובכפוף להוראות הדין שאינן ניתנות להתניה, אחריות העסק לא תעלה על הסכום ששולם בפועל עבור המוצר שבגינו נטענת הטענה.
            </p>
          </section>

          {/* 11. Privacy */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">11. פרטיות</h2>
            <p className="text-muted-foreground">
              העסק מחויב להגנה על פרטיות המשתמשות בהתאם לחוק הגנת הפרטיות, התשמ״א-1981.
            </p>
            <p className="text-muted-foreground">
              <strong>מידע הנאסף:</strong> במהלך השימוש באתר וביצוע הזמנות נאספים הפרטים הנדרשים לביצוע ההזמנה ולמתן השירות: שם מלא, כתובת למשלוח, מספר טלפון וכתובת דוא״ל. פרטי כרטיס האשראי נמסרים ישירות לחברת הסליקה ואינם נשמרים אצלנו.
            </p>
            <p className="text-muted-foreground">
              <strong>מטרת האיסוף:</strong> עיבוד הזמנות, ביצוע משלוחים, מתן שירות לקוחות, שיפור האתר, ודיוור שיווקי למי שנתנה לכך הסכמה.
            </p>
            <p className="text-muted-foreground">
              <strong>שיתוף מידע:</strong> מידע מועבר לספקי שירות רק במידה הנדרשת להפעלת האתר ולביצוע ההזמנה (אחסון ובסיס נתונים, סליקת אשראי, שליחת דוא״ל, שילוח, מדידת שימוש וניטור תקלות), או כנדרש על פי דין. פירוט מלא של ספקי השירות מופיע ב<strong>מדיניות הפרטיות</strong> באתר.
            </p>
            <p className="text-muted-foreground">
              <strong>זכויות המשתמשת:</strong> בהתאם לחוק, כל אחת רשאית לעיין במידע האישי המוחזק אודותיה, לבקש את תיקונו או את מחיקתו. פנייה בעניין זה תופנה לכתובת {SUPPORT_EMAIL}.
            </p>
            <p className="text-muted-foreground">
              מדיניות הפרטיות המלאה מופיעה בעמוד ייעודי באתר והיא חלק בלתי נפרד מתקנון זה.
            </p>
          </section>

          {/* 12. Cookies */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">12. עוגיות (Cookies)</h2>
            <p className="text-muted-foreground">
              האתר משתמש בעוגיות ובאחסון מקומי בדפדפן לצורך תפעול שוטף, שיפור חוויית הגלישה ואיסוף נתונים סטטיסטיים.
            </p>
            <p className="text-muted-foreground">
              <strong>עוגיות הכרחיות:</strong> נדרשות לתפקוד בסיסי של האתר (כגון שמירת סל הקניות והתחברות לחשבון).
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
              ההרשמה לרשימת התפוצה היא בחירה חופשית ואינה תנאי לרכישה. הנרשמות מקבלות עדכונים על מוצרים חדשים, השקות, מבצעים ותכנים על תכנון וניהול זמן.
            </p>
            <p className="text-muted-foreground">
              העסק רשאי לשלוח דברי פרסומת בדוא״ל או ב-SMS ללקוחות שנתנו הסכמתן לכך, בהתאם לחוק התקשורת (בזק ושידורים), התשמ״ב-1982.
            </p>
            <p className="text-muted-foreground">
              ניתן להסיר את עצמך מרשימת הדיוור בכל עת באמצעות קישור ההסרה שבכל הודעה, או בפנייה ישירה אלינו.
            </p>
          </section>

          {/* 14. Intellectual Property */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">14. קניין רוחני</h2>
            <p className="text-muted-foreground">
              כל הזכויות באתר ובתכניו, לרבות עיצוב המוצרים, פריסות הלוחות והמחברות, טקסטים, תמונות, לוגו, סימני מסחר, קוד מקור וכל חומר אחר, שייכים לעסק או לצדדים שלישיים שהעניקו לעסק רישיון שימוש, והם מוגנים על פי חוקי זכויות יוצרים וקניין רוחני.
            </p>
            <p className="text-muted-foreground">
              המוצרים נמכרים לשימוש אישי וביתי. אין להעתיק, לסרוק, לשכפל, להפיץ, לפרסם, להציג בפומבי או לעשות שימוש מסחרי בכל תוכן מהאתר או במוצרים ללא אישור מראש ובכתב מהעסק.
            </p>
          </section>

          {/* 15. User Conduct */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">15. התנהגות משתמשים ותוכן גולשות</h2>
            <p className="text-muted-foreground">
              המשתמשת מתחייבת שלא לעשות שימוש באתר לכל מטרה בלתי חוקית או אסורה, לרבות:
            </p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>פריצה, חדירה בלתי מורשית או ניסיון לשבש את פעילות האתר</li>
              <li>איסוף מידע על משתמשות אחרות ללא הסכמתן</li>
              <li>שימוש בזהות בדויה או מסירת פרטים כוזבים</li>
              <li>ביצוע הזמנות בזדון או ללא כוונה אמיתית לרכוש</li>
            </ul>
            <p className="text-muted-foreground">
              חוות דעת על מוצרים שנכתבות באתר עוברות בדיקה לפני פרסומן. העסק רשאי שלא לפרסם, לערוך או להסיר חוות דעת הכוללת תוכן פוגעני, פרסומי, שקרי או שאינו קשור למוצר. בשליחת חוות דעת ניתנת לעסק רשות להציגה באתר.
            </p>
            <p className="text-muted-foreground">
              העסק שומר לעצמו את הזכות לחסום משתמשות המפרות תנאים אלה.
            </p>
          </section>

          {/* 16. Third-Party Links */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">16. קישורים לאתרים חיצוניים</h2>
            <p className="text-muted-foreground">
              האתר עשוי לכלול קישורים לאתרי אינטרנט של צדדים שלישיים. העסק אינו אחראי לתוכן, למדיניות הפרטיות או לפעילות של אתרים אלה. הכניסה אליהם היא באחריות המשתמשת בלבד.
            </p>
          </section>

          {/* 17. Accessibility */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">17. נגישות</h2>
            <p className="text-muted-foreground">
              העסק פועל להנגיש את האתר ברוח התקן הישראלי 5568 ותקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג-2013, ורואה בנגישות תהליך מתמשך של שיפור.
            </p>
            <p className="text-muted-foreground">
              אם נתקלת בבעיית נגישות באתר, נשמח לסייע. ניתן לפנות אלינו בדוא״ל {SUPPORT_EMAIL} ואנו נעשה כל מאמץ לתת מענה ולשפר את הנגישות.
            </p>
          </section>

          {/* 18. Changes to Terms */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">18. שינויים בתקנון</h2>
            <p className="text-muted-foreground">
              העסק רשאי לעדכן תקנון זה מעת לעת. שינויים מהותיים יפורסמו באתר. על כל הזמנה יחול נוסח התקנון שהיה בתוקף במועד ביצועה.
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
              סמכות השיפוט בכל עניין הנוגע לתקנון זה, לפרשנותו וליישומו, תהיה נתונה לבתי המשפט המוסמכים בישראל, ובתביעה צרכנית — לבית המשפט המוסמך במחוז מגוריה של הלקוחה או במחוז שבו מתנהל העסק, בהתאם להוראות הדין.
            </p>
          </section>

          {/* 20. Contact */}
          <section className="space-y-3">
            <h2 className="text-xl text-foreground font-medium">20. יצירת קשר</h2>
            <p className="text-muted-foreground">
              לכל שאלה, בירור או פנייה בנוגע לתקנון זה או לשירותי האתר, אפשר לפנות אלינו:
            </p>
            <ul className="text-muted-foreground space-y-1 list-none">
              <li>דוא״ל: {SUPPORT_EMAIL}</li>
              <li>טלפון: {SUPPORT_PHONE_DISPLAY}</li>
              <li>
                וואטסאפ:{" "}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:opacity-70 transition-opacity"
                >
                  שליחת הודעה
                </a>
              </li>
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
