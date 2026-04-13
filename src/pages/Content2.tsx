import { Link } from "react-router-dom";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import titleUnderline from "@/assets/title-underline.png";
import { ROUTES } from "@/lib/routes";

const Content2 = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="max-w-[680px] mx-auto px-4 sm:px-6 pt-8 pb-16" dir="rtl">
        {/* Blog Navigation Button */}
        <div className="flex justify-center mb-6">
          <Link
            to={ROUTES.blog}
            className="px-6 py-2 border border-muted-foreground/30 text-foreground hover:bg-muted/50 transition-colors rounded-sm"
          >
            בלוג
          </Link>
        </div>
        
        <div className="border border-muted-foreground/20 p-6 md:p-10 rounded-sm bg-background shadow-sm">
        {/* Post Title */}
        <div className="flex flex-col items-center mb-8">
          <span className="text-sm text-muted-foreground mb-2">פרק 2</span>
          <h1 className="text-[28px] md:text-3xl text-foreground text-center leading-relaxed">
            הזמן שלי, כבר לא רק שלי
          </h1>
          <img 
            src={titleUnderline} 
            alt="" 
            className="w-32 md:w-48 mt-2"
          />
        </div>
        
        {/* Blog Content */}
        <article className="space-y-6 text-[17px] leading-[1.7] text-foreground/90">
          <p>
            בפרק הקודם העליתי את בעיה מס׳ 1 – האימהות של היום היא לא האימהות של פעם. היא יותר מורכבת ואין ספר הדרכה. אנחנו נדרשות לשלב בין כמה תחומים כשכל תחום בפני עצמו כולל המון משימות.
          </p>

          <p className="font-medium">הפיתרון – תכנון הזמן</p>

          <p>
            בפרק הזה, מתנצלת, אני מעלה עוד בעיה נוספת – ברגע שהפכתי להיות אמא, הזמן שלי הוא כבר לא רק שלי. אני יכולה להיות הכי מסודרת ומאורגנת שיש, אבל תכנון הזמן מורכב יותר. זה לא איזה מבחן בתואר שיש לו תאריך ואני מנהלת את תוכנית הלימודים וההצלחה תלויה רק בי. למעשה, כשמדובר בהורות – הרבה פעמים אני אפילו לא יודעת את החומר.
          </p>

          <p>
            העבודה, הבית, הילדים, הזוגיות, אני… איך אני מחלקת את הזמן? כמה מהזמן שלי מוקדש לעבודה? כמה לבית? לילדים, לזוגיות? כמה לעצמי?
          </p>

          <p className="font-medium">והאם זה באמת מה שאני רוצה?</p>

          <p>
            אלה הם העקרונות שמנחים אותי בחלוקת הזמן, והם הבסיס להבין מה עומד מאחורי הבחירות שלי (במקרו ובמיקרו)
          </p>

          <section className="mt-8 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">1. אני בוחרת איך לחלק את הזמן שלי מתוך סדר העדיפויות שלי.</h3>
            <p className="mb-2">מה חשוב לי כרגע?</p>
            <ul className="list-none space-y-2 mr-4 [&>li]:before:content-['■'] [&>li]:before:ml-2 [&>li]:before:text-foreground/70 [&>li]:before:text-[10px]">
              <li>כסף? כי זה הזמן לעשות כסף, לבסס מעמד, להתקדם בעבודה, בקריירה…</li>
              <li>הילדים? כי הילדים זה הדבר הכי חשוב. בשנים הראשונות לחייהם הילדים צריכים אותי… לאמא אין תחליף כשיגדלו יהיה לי זמן...</li>
              <li>בית נקי? כשהבית נקי ומסודר זה נותן לי הרגשה טובה ומאפשר לי לחשוב ולהיות פנויה לדברים אחרים…</li>
              <li>אווירה? חשוב לי בית שמח – אני לא מעוניינת להיות שוטר. ואין לי בעיה עם בלאגן ולכלוך.</li>
              <li>בריאות? תזונה? חשוב לי לבשל בעצמי, שהאוכל יהיה מזין… ובכלל, אני אוהבת לבשל.</li>
              <li>אני? אני הכי חשובה? כי כשיהיה לי טוב יהיה לכולם טוב. אני רוצה לעשות 3 פעמים בשבוע ספורט בערב, או לפתוח את הבוקר באימון יוגה, להכין לי אוכל בריא, להיות מטופחת – קוסמטיקאית, ציפורניים, טיפולי פנים, שנ״צ…</li>
              <li>זוגיות? בעלי במקום הראשון? כי בסוף הילדים גדלים ועוזבים את הבית וזה רק אני והוא.</li>
            </ul>
            <p className="mt-4 font-medium">מה חשוב לי? מה הכי חשוב לי? אני בוחרת, אני מתעדפת.</p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">2. אי אפשר הכל.</h3>
            <p>
              כשהכל חשוב לי אני לא מגיעה לכלום. אי אפשר לתת 100% בעבודה 100% לילדים 100% לעצמי ו-100% בבית.... כשהכל חשוב לי, יש לזה מחירים. באיכות, בהספק ובעיקר באנרגיות שלי.
            </p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">3. אנרגיה.</h3>
            <p>
              זה לא רק הזמן שמתחלק, אלא גם האנרגיה שלי. ובעוד שיש משימות ששואבות ממני אנרגיה, יש משימות שממלאות אותי באנרגיה.
            </p>
            <p className="mt-4">
              למשל לארח – לארח זו השקעה מטורפת: קניות, בישולים, עריכה, אבל כשהאורחים באים וכולם יחד סביב השולחן, צוחקים, מדברים, זה ממלא אותי פי כמה וכמה ביחס לאנרגיות שהשקעתי בהכנות.
            </p>
            <p className="mt-4">ואם גרפתי כמה מחמאות, בכלל…</p>
            <p className="mt-2">גם פעילות גופנית</p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">4. אין שחור ולבן.</h3>
            <p>
              יכול להיות מצב שבו כאשר אני משקיעה בתחום אחד, אני תורמת בתחומים אחרים. למשל, כאשר אני עובדת ומגשימה את עצמי, אני משמשת דוגמא לילדים שלי. כשאני עובדת הרבה שעות, אני מרוויחה יותר ובכך דואגת לעתיד ילדיי. כשאני עובדת הרבה שעות ולא נמצאת, מבלי לשים לב אני מעודדת את הילדים שלי להסתדר בכוחות עצמם, לפתור בעיות, לסמוך על עצמם ובכך מעודדת עצמאות.
            </p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">5. אין מושלם ולבחירות יש השלכות.</h3>
            <p>
              יכול להיות שאבחר להיות עצמאית ולהגשים את עצמי, אבל זה ידרוש ממני לעבוד גם אחרי שעות העבודה ויבוא על חשבון הבית או הילדים.
            </p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">6. מה שמגדיר אותי הוא לא תחום אחד או עיסוק מסוים וכמה אני טובה בו, אלא הערכים שלי, על פיהם בחרתי את סדר העדיפויות שלי.</h3>
            <p>
              למשל אם בחרתי לעבוד חצי משרה, ליד הבית, לא העבודה מגדירה אותי, אלא מה שעומד מאחורי הבחירה שלי.
            </p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">7. החיים הם דינמיים ומשתנים כל הזמן.</h3>
            <p>
              ההורות היא דינמית. מה שלא מתאים לשלב מסוים יכול להתאים לשלב אחר. סדרי העדיפויות יכולות להשתנות.
            </p>
            <p className="mt-4">
              יכול להיות שעכשיו ילדתי ואני בחופשת לידה. אז זהו? כל החיים שלי יראו ככה? (לטוב ולרע) ודאי שלא. זוהי תקופה זמנית.
            </p>
            <p className="mt-4">
              רצוי שחלוקת הזמן שלי תשתנה בהתאם לצרכים שלי ושל בני הבית. וכן… הצרכים פה משתנים כל הזמן
            </p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-lg font-medium text-foreground mb-4">8. פרופורציות.</h3>
            <p>
              כשאני בוחנת בחירה מסוימת בחלוקת הזמן שלי, חשוב שאבחן אותה לפרק זמן ארוך, לתקופה. ולא באופן נקודתי. למשל יכול להיות שהרגשתי שהיום לא הייתי עם הילדים בכלל – אבל בשבוע האחרון? או בחודש האחרון?
            </p>
          </section>

          <p className="font-medium mt-8">
            לסיכום: השורה התחתונה היא שהבחירה היא שלי, שאין מושלם, שתמיד יש איזה מחיר. אבל כשיש סיבה לבחירות שלי, שאני מבינה את הסיבה וכשאני שלמה איתה, אדע לעמוד מאחוריהן ויותר להתחבר אליהן. חשוב שאזכיר לעצמי את העקרונות האלה.
          </p>

          {/* Photo Grid */}
          <div className="bg-[#a89a9e] p-4 mt-8">
            <div className="grid grid-cols-3 gap-4">
              <div className="aspect-[3/4] bg-muted"></div>
              <div className="aspect-[3/4] bg-muted"></div>
              <div className="aspect-[3/4] bg-muted"></div>
            </div>
          </div>

          <div className="bg-muted/30 p-6 rounded-lg mt-8 space-y-2">
            <p className="font-medium">עוד דבר חשוב!</p>
            <p>כל השוואה בין סדר העדיפויות שלי / האופן בו אני מחלקת את הזמן לבין אימהות אחרות מיותר.</p>
            <p>מספיק שיש הבדל אחד, כמו מס׳ הילדים, גילאים, מבנה אישיות (של כל אחד מבני הבית), משרה, עזרה, מצב כלכלי, תפיסות עולם… כל גורם כזה משמעותי ויכול להשפיע על הבחירות שלנו.</p>
          </div>

          <div className="bg-muted/30 p-6 rounded-lg mt-6 space-y-2">
            <p className="font-medium">הזמן שלי הוא לא רק שלי</p>
            <p>ונכון שהבחירה היא שלי, אבל היא מושפעת מהרבה גורמים ומורכבת.</p>
            <p className="font-medium">בחרתי. אני שלמה עם הבחירה שלי</p>
          </div>
        </article>
        </div>
      </main>
      <Newsletter />
      <Footer />
    </div>
  );
};

export default Content2;
