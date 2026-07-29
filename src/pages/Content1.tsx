import { Link } from "react-router-dom";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import titleUnderline from "@/assets/title-underline.png";
import fourGenerations from "@/assets/blog-four-generations.jpg";
import { LazyImage } from "@/components/LazyImage";
import { ROUTES } from "@/lib/routes";
import { Instagram } from "lucide-react";
import { INSTAGRAM_URL } from "@/lib/siteConfig";
import heartIcon from "@/assets/heart-icon.png";

const Content1 = () => {
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
          <span className="text-sm text-muted-foreground mb-2">פוסט 1</span>
          <h1 className="text-[28px] md:text-3xl text-foreground text-center leading-relaxed">
            האמא של היום היא לא האמא של פעם-
          </h1>
          <h2 className="text-xl md:text-2xl text-foreground text-center">
            והסבתא של היום היא לא הסבתא של פעם.
          </h2>
          <img 
            src={titleUnderline} 
            alt="" 
            className="w-32 md:w-48 mt-2"
          />
        </div>
        
        {/* Blog Content */}
        <article className="space-y-6 text-[17px] leading-[1.7] text-foreground/90">
          <p>
            לא פעם ולא פעמיים שאלתי את עצמי: איך עושים את זה? ולא פעם ולא פעמיים שמעתי את התשובה: ״עושים״, ״כולן עושות״, ״כולן עשו״.
          </p>

          <p>
            אבל האמת היא פשוטה: ההורות של היום היא משימה הרבה יותר מורכבת מההורות של פעם.
          </p>

          <p>
            בעבר הייתה להורים מטרה אחת ברורה- לשרוד. העשייה התמקדה במה צריך כדי להחזיק בית, משפחה, יום־יום. חלוקת התפקידים הייתה ברורה: אמא- בית וילדים. אבא- פרנסה.
          </p>

          <p>
            היום המציאות אחרת. אנחנו האימהות עובדות. יש לנו אינסוף אפשרויות במגוון תפקידים וסוגי משרה: משרת אם, משרה חלקית/ מלאה, קריירה תובענית, עסק עצמאי… למה בחרנו במה שבחרנו? חלום, חינוך, צורך כלכלי, הזדמנות או שילוב של הכול. בכל אופן, אופי העבודה שלנו משפיע ישירות על היום־יום שלנו ועל הזמן שנשאר לנו בבית ועם הילדים. ולכן אין דרך אחת לאימהות. ואין תשובה אחת לשאלה ״איך עושים את זה״.
          </p>

          <p>
            אם אני חונכתי לעצמאות והשכלה, והיום אני אמא קרייריסטית, אבל גדלתי בבית שבו אמא הייתה עקרת בית, או במקרה הפוך, אם אמא שלי הייתה קרייריסטית, ואני בחרתי להתמקד בגידול הילדים וניהול הבית, אין לי באמת מודל מהבית לאיך להיות האמא שאני, או האמא שאני רוצה להיות.
          </p>

          {/* Family Photo — four generations */}
          <figure className="bg-[#a89a9e] p-4">
            <LazyImage
              src={fourGenerations}
              alt="ארבעה דורות של אימהות במשפחה אחת"
              className="w-full aspect-[1185/1300]"
            />
            <figcaption className="text-center text-white/95 text-sm leading-relaxed mt-3 italic">
              סבתא שלי הייתה אמא במשרה מלאה, וחלק משמעותי מהגידול שלנו.
              <br />
              אמא שלי הייתה קרייריסטית שחזרה הביתה בשמונה בערב.
              <br />
              שתיהן, כל אחת בדרכה, הן השראה לאמא שאני.
            </figcaption>
          </figure>

          <p>
            השילוב בין עבודה לבית הוא רק חלק מהמורכבות. אנחנו בעידן אחר, עידן של מודעות. ואנחנו בוודאי מודעות- כי יש המון ספרים, קבוצות אמהות, רשתות חברתיות… אנחנו חשופות לכל כך הרבה מידע כל הזמן.
          </p>

          <section className="mt-8 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">תזונה, למשל.</h3>
            <p>
              זה כבר לא סבבה לתת לילד לאכול מנה חמה או מנה כזו שמחוררים ומחממים צריך בריא, מאוזן, ביתי.
            </p>
            <p className="mt-4">
              הכריך בשקית לבית ספר כבר מזמן הפך לא אקולוגי, והוחלף בקופסא עם פרי וירק. ושוקולד? חס וחלילה.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">ומסכים?</h3>
            <p>
              פעם הייתה רק טלוויזיה וגם אם היה מותר לצפות בלי סוף, לא היה מה לראות. היום- טלפון, טאבלט, מחשב, קונסולות, מסכים ותוכן זמינים בכל זמן ובכל מקום. ואם אנחנו רוצות להגביל, אנחנו צריכות לדאוג לאלטרנטיבה, לתעסוקה.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">חוגים?</h3>
            <p>
              זה כבר לא רק כדורגל ובלט. יש אינסוף אפשרויות: התעמלות אומנותית, היפ הופ, טיפוס, מבוכים ודרקונים, רובוטיקה, אומנות...
            </p>
            <p className="mt-4">
              וגם ההתפתחות הרגשית והחברתית חשובה. לקבוע עם חברים, גם להזמין וגם שיזמינו.
            </p>
            <p className="mt-4">
              ואנחנו רוצות לחשוף, לפתח, לאפשר. בקיצור: דרושה חברת הסעות.
            </p>
          </section>

          <p>
            פעם לא היו כל כך הרבה אנשי מקצוע ומטפלים. היום יש מומחה לכל דבר, וקשת שלמה של אבחונים, טיפולים וריצות בין טיפול לטיפול.
          </p>

          <p>
            הילדים דורשים יותר ואנחנו רוצות יותר בשבילם. המטרה היא כבר לא רק לשרוד, אלא לגדל ילדים מאושרים.
          </p>

          <p>
            אההה, וגם הבית דורש יותר: יותר בגדים, יותר כביסות, יותר משחקים, יותר בלאגן, יותר מה לנקות.
          </p>

          <p>
            אנחנו רוצות הרבה יותר בשביל עצמנו. גם אנחנו רוצות להגשים את עצמנו בתוך כל האפשרויות שנפתחו בפנינו, אנחנו רוצות להראות טוב, גם אנחנו רוצות להיות מאושרות.
          </p>

          <p>
            ולא רק אנחנו, גם האימהות שלנו, הסבתות. יש סבתות שעדיין עובדות וגם הן רוצות להגשים את עצמן, ללכת לקאנטרי, לתאטרון, לטייל בחו"ל. והן לא תמיד זמינות לעזור לנו.
          </p>

          <p>
            מתוך המציאות הזו נולד צורך במערך שלם שתומך בה: צהרונים, בייביסיטר, מנקה, משלוחים, וולט, חלוקת תפקידים עם בן הזוג. מה שמצריך ממך לתפעל, לג׳נגל או בתכלס- לנהל.
          </p>

          <p>
            האמהות של היום הן לא האמהות של פעם! המציאות השתנתה, אנחנו נדרשות לשלב בין כמה תחומים, כשכל תחום בפני עצמו כולל היום הרבה יותר משימות
          </p>

          <div className="bg-muted/30 p-6 rounded-lg mt-8 space-y-2">
            <p className="font-medium">מה לא השתנה?</p>
            <p>יש 7 ימים בשבוע ו 24 שעות ביממה.</p>
            <p>ואימא יש רק אחת.</p>
          </div>

          <div className="bg-muted/30 p-6 rounded-lg mt-6 space-y-2">
            <p className="font-medium">אז איך אני עושה את זה?</p>
            <p>עם הזמן מצאתי בעצמי את התשובה</p>
            <p>והיא- תכנון</p>
            <p>ועל זה אני מתכוונת לכתוב בבלוג- ״רוצה מתכננת עושה״</p>
            <p>וכן, השלב הראשון הוא להבין מה אני רוצה</p>
            <p>על כך כמובן בפרק הבא...</p>
          </div>
        </article>
        </div>

        {/* Next chapter */}
        <div className="mt-10 flex justify-center">
          <Link
            to={ROUTES.content2}
            className="group flex flex-col items-center gap-1 text-center"
          >
            <span className="text-sm text-muted-foreground">הפרק הבא</span>
            <span className="flex items-center gap-2 text-lg text-foreground transition-colors group-hover:text-primary">
              הזמן שלי, כבר לא רק שלי
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

export default Content1;
