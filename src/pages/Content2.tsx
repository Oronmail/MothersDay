import { Link } from "react-router-dom";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import titleUnderline from "@/assets/title-underline.png";
import bike2016 from "@/assets/blog2-bike-2016.jpg";
import bike2017 from "@/assets/blog2-bike-2017.jpg";
import bike2022 from "@/assets/blog2-bike-2022.jpg";
import { LazyImage } from "@/components/LazyImage";
import { ROUTES } from "@/lib/routes";
import { Instagram } from "lucide-react";
import { INSTAGRAM_URL } from "@/lib/siteConfig";
import heartIcon from "@/assets/heart-icon.png";

const GroupHeading = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-10 flex flex-col items-center">
    <h2 className="text-xl md:text-2xl font-medium text-foreground text-center">{children}</h2>
    <div className="w-12 h-px bg-[#b79aa1] mt-2" />
  </div>
);

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
            בפרק הקודם העליתי את בעיה מס׳ 1- האימהות של היום היא לא האימהות של פעם. היא יותר מורכבת ואין ספר הדרכה. אנחנו נדרשות לשלב בין כמה תחומים כשכל תחום בפני עצמו כולל המון משימות.
          </p>

          <p className="font-medium">הפיתרון- תכנון הזמן</p>

          <p>
            בפרק הזה, מתנצלת, אני מעלה בעיה נוספת. ברגע שהפכתי להיות אמא, הזמן שלי הוא כבר לא רק שלי. אני יכולה להיות הכי מסודרת ומאורגנת שיש, אבל תכנון הזמן מורכב יותר. זה לא איזה מבחן בתואר שיש לו תאריך ואני מנהלת את תוכנית הלימודים וההצלחה תלויה רק בי. למעשה, כשמדובר בהורות, הרבה פעמים אני אפילו לא יודעת את החומר.
          </p>

          <p>
            העבודה, הבית, הילדים, הזוגיות, אני… איך אני מחלקת את הזמן? כמה מהזמן שלי מוקדש לעבודה? כמה לבית? לילדים, לזוגיות? כמה לעצמי?
          </p>

          <p className="font-medium">והאם זה באמת מה שאני רוצה?</p>

          <p>
            אלה הם העקרונות שמנחים אותי בחלוקת הזמן, והם הבסיס להבין מה עומד מאחורי הבחירות שלי (במקרו ובמיקרו)
          </p>

          <GroupHeading>הבחירה</GroupHeading>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">1. אני בוחרת איך לחלק את הזמן שלי מתוך סדר העדיפויות שלי.</h3>
            <p className="mb-2">מה חשוב לי כרגע?</p>
            <ul className="list-none space-y-2 mr-4 [&>li]:before:content-['■'] [&>li]:before:ml-2 [&>li]:before:text-foreground/70 [&>li]:before:text-[10px]">
              <li>כסף? כי זה הזמן לבסס מעמד, להתקדם בעבודה ובקריירה.</li>
              <li>הילדים? כי בשנים הראשונות הם צריכים אותי, ולאמא אין תחליף. כשיגדלו- יהיה לי זמן.</li>
              <li>בית נקי? כשהבית מסודר יש לי הרגשה טובה, ואני פנויה לחשוב ולדברים אחרים.</li>
              <li>אווירה? חשוב לי בית שמח- לא להיות שוטר. ואין לי בעיה עם בלאגן ולכלוך.</li>
              <li>בריאות? תזונה? חשוב לי לבשל בעצמי, שהאוכל יהיה מזין… ובכלל, אני אוהבת לבשל.</li>
              <li>אני? כי כשלי טוב- לכולם טוב. ספורט, יוגה, אוכל בריא, קצת פינוק וזמן לעצמי.</li>
              <li>זוגיות? כי בסוף הילדים גדלים ועוזבים את הבית, ונשארים רק אני והוא.</li>
            </ul>
            <p className="mt-4 font-medium">מה חשוב לי? מה הכי חשוב לי? אני בוחרת, אני מתעדפת.</p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">2. מה שמגדיר אותי הוא לא תחום אחד או עיסוק מסוים וכמה אני טובה בו, אלא הערכים שלי, על פיהם בחרתי את סדר העדיפויות שלי.</h3>
            <p>
              למשל אם בחרתי לעבוד חצי משרה, ליד הבית, לא העבודה מגדירה אותי, אלא מה שעומד מאחורי הבחירה שלי.
            </p>
          </section>

          <GroupHeading>המחיר</GroupHeading>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">3. אי אפשר הכל.</h3>
            <p>
              כשהכל חשוב לי אני לא מגיעה לכלום. אי אפשר לתת 100% בעבודה 100% לילדים 100% לעצמי ו-100% בבית.... כשהכל חשוב לי, יש לזה מחירים. באיכות, בהספק ובעיקר באנרגיות שלי.
            </p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">4. אנרגיה.</h3>
            <p>
              זה לא רק הזמן שמתחלק, אלא גם האנרגיה שלי. יש משימות ששואבות ממני אנרגיה, ויש משימות שממלאות אותי.
            </p>
            <p className="mt-4">
              למשל לארח- לארח זו השקעה מטורפת: קניות, בישולים, עריכה, אבל כשהאורחים באים וכולם יחד סביב השולחן, צוחקים, מדברים, זה ממלא אותי פי כמה וכמה ביחס לאנרגיות שהשקעתי בהכנות. ואם גרפתי כמה מחמאות, בכלל…
            </p>
            <p className="mt-4">
              כך גם לגבי פעילות גופנית- אני יוצאת עייפה וחוזרת מרוצה.
            </p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">5. אין מושלם ולבחירות יש השלכות.</h3>
            <p>
              יכול להיות שאבחר להיות עצמאית ולהגשים את עצמי, אבל זה ידרוש ממני לעבוד גם אחרי שעות העבודה ויבוא על חשבון הבית או הילדים.
            </p>
          </section>

          <GroupHeading>התמונה הגדולה</GroupHeading>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">6. אין שחור ולבן.</h3>
            <p>
              יכול להיות מצב שבו כאשר אני משקיעה בתחום אחד, אני תורמת בתחומים אחרים. למשל, כאשר אני עובדת ומגשימה את עצמי, אני משמשת דוגמא לילדים שלי. כשאני עובדת הרבה שעות, אני מרוויחה יותר ובכך דואגת לעתיד ילדיי. כשאני עובדת הרבה שעות ולא נמצאת, מבלי לשים לב אני מעודדת את הילדים שלי להסתדר בכוחות עצמם, לפתור בעיות, לסמוך על עצמם ובכך מעודדת עצמאות.
            </p>
          </section>

          <section className="mt-8 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">7. החיים הם דינמיים ומשתנים כל הזמן.</h3>
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
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">8. פרופורציות.</h3>
            <p>
              כשאני בוחנת בחירה מסוימת בחלוקת הזמן שלי, חשוב שאבחן אותה לפרק זמן ארוך, לתקופה. ולא באופן נקודתי. למשל יכול להיות שהרגשתי שהיום לא הייתי עם הילדים בכלל, אבל בשבוע האחרון? או בחודש האחרון?
            </p>
          </section>

          {/* Family-in-motion photos: 2016 + 2017 small on top, 2022 large below */}
          <figure className="bg-[#a89a9e] p-4 mt-8">
            {/* top row: 2016 (right) + 2017 (left) */}
            <div className="grid grid-cols-2 gap-4 items-start">
              <div>
                <LazyImage src={bike2016} alt="ילד אחד רוכב על טרייק, 2016" className="w-full aspect-[3/4]" />
                <p className="text-center text-white/90 text-sm mt-2">2016</p>
              </div>
              <div>
                <LazyImage src={bike2017} alt="שני ילדים רוכבים, 2017" className="w-full aspect-[3/4]" />
                <p className="text-center text-white/90 text-sm mt-2">2017</p>
              </div>
            </div>
            {/* 2022 large */}
            <div className="mt-4">
              <LazyImage src={bike2022} alt="שלושה ילדים ואמא רוכבים יחד, 2022" className="w-full aspect-[3/2]" />
              <p className="text-center text-white/90 text-sm mt-2">2022</p>
            </div>
            <figcaption className="text-center text-white/95 leading-relaxed mt-4">
              <span className="text-base font-medium">משפחה בתנועה</span>
              <br />
              <span className="text-sm italic text-white/90">הצרכים משתנים, סדרי העדיפויות משתנים</span>
            </figcaption>
          </figure>

          <p className="font-medium mt-8">
            לסיכום: השורה התחתונה היא שהבחירה היא שלי, שאין מושלם, שתמיד יש איזה מחיר. אבל כשיש סיבה לבחירות שלי, שאני מבינה את הסיבה וכשאני שלמה איתה, אדע לעמוד מאחוריהן ויותר להתחבר אליהן. חשוב שאזכיר לעצמי את העקרונות האלה.
          </p>

          <div className="bg-muted/30 p-6 rounded-lg mt-8 space-y-2">
            <p className="font-medium">עוד דבר חשוב!</p>
            <p>כל השוואה בין סדר העדיפויות שלי / האופן בו אני מחלקת את הזמן לבין אימהות אחרות מיותרת.</p>
            <p>מספיק שיש הבדל אחד, כמו מס׳ הילדים, גילאים, מבנה אישיות (של כל אחד מבני הבית), משרה, עזרה, מצב כלכלי, תפיסות עולם… כל גורם כזה משמעותי ויכול להשפיע על הבחירות שלנו.</p>
          </div>

          <div className="bg-muted/30 p-6 rounded-lg mt-6 space-y-2">
            <p className="font-medium">הזמן שלי הוא לא רק שלי</p>
            <p>ונכון שהבחירה היא שלי, אבל היא מושפעת מהרבה גורמים ומורכבת.</p>
            <p className="font-medium">בחרתי. אני שלמה עם הבחירה שלי</p>
          </div>
        </article>
        </div>

        {/* Next chapter */}
        <div className="mt-10 flex justify-center">
          <Link
            to={ROUTES.content3}
            className="group flex flex-col items-center gap-1 text-center"
          >
            <span className="text-sm text-muted-foreground">הפרק הבא</span>
            <span className="flex items-center gap-2 text-lg text-foreground transition-colors group-hover:text-primary">
              תכנון ביום האם
              <span className="transition-transform group-hover:-translate-x-1">←</span>
            </span>
          </Link>
        </div>

        {/* Soft invitations — tools + Instagram */}
        <div className="mt-10 pt-8 border-t border-muted-foreground/15 flex flex-col items-center gap-4 text-center">
          <Link
            to={ROUTES.allProducts}
            className="group inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary"
          >
            <img src={heartIcon} alt="" className="w-5 h-5" />
            בואי להכיר את הכלים שאיתם אני מתכננת
            <span className="transition-transform group-hover:-translate-x-1">←</span>
          </Link>
          {INSTAGRAM_URL && (
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Instagram size={16} />
              עקבי אחריי באינסטגרם, שם אני משתפת על יום האם שלי
            </a>
          )}
        </div>
      </main>
      <Newsletter />
      <Footer />
    </div>
  );
};

export default Content2;
