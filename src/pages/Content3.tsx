import { Link } from "react-router-dom";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import titleUnderline from "@/assets/title-underline.png";
import soccerCake from "@/assets/blog3-soccer-cake.jpg";
import { LazyImage } from "@/components/LazyImage";
import { ROUTES } from "@/lib/routes";
import { Instagram } from "lucide-react";
import { INSTAGRAM_URL } from "@/lib/siteConfig";
import heartIcon from "@/assets/heart-icon.png";

const Content3 = () => {
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
          <span className="text-sm text-muted-foreground mb-2">פרק 3</span>
          <h1 className="text-[28px] md:text-3xl text-foreground text-center leading-relaxed">
            תכנון ביום האם
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
            ההבדל בין להיות אדם מתוכנן, מסודר ומאורגן לבין אדם לא מתוכנן, לא מסודר ולא מאורגן, הוא די ברור.
          </p>
          <p>זה כמו ההבדל בין ארון מסודר למבולגן.</p>
          <p>כמו ההבדל בין לקנות דברים שאני רוצה לבין דברים שאני באמת צריכה.</p>
          <p>כמו ההבדל בין להגיע בזמן לבין לאחר.</p>
          <p>כמו ההבדל בין לזכור לבין לשכוח.</p>

          <div className="my-8" />

          <p>
            ההבדל בין להיות אמא מתוכננת, מסודרת ומאורגנת לבין אמא שלא,<br />
            הוא גם כל אלה.<br />
            אבל הוא גם מעבר.
          </p>

          <p>
            כמו ההבדל בין לפתוח את המקרר, לבהות בו ולנסות להחליט מה להכין לארוחת ערב, ב-19:00, אחרי שחזרתי מאיסופים מחוגים וכולם רעבים,<br />
            לבין שיש לי מרק ירקות מזין שרק צריך לחמם בדיוק ליום כזה.
          </p>

          <p>
            זה כמו ההבדל בין להגיד לילד שלי ״אולי מספיק עם הטלוויזיה״,<br />
            לבין זה שהוא יודע בדיוק מה כן עושים עכשיו כי הכנתי לו מראש משחק שהוא אוהב על השטיח בסלון, ויש אצלנו זמנים ברורים למסך.
          </p>

          <p>
            זה כמו ההבדל בין שהילדה שלי מתקשרת אחרי בי״ס, מבקשת ללכת לחברה ומתבאסת כשאני אומרת לה ״לא״,<br />
            לבין זה שהיא יודעת בדיוק באיזה ימים היא יכולה ללכת לחברה, כי אין לה חוג או התחייבות אחרת, ושהיא רק צריכה להודיע לי.
          </p>

          <p>
            זה כמו ההבדל בין להגיד לעצמי ״איך הייתי רוצה לשבת ולעשות יצירות/ לשחק משחק קופסא/ לקרוא ספר עם הילד הקטן״,<br />
            לבין לעשות את זה, כי שיבצתי לעצמי זמן בלו״ז.
          </p>

          <div className="bg-muted/30 p-6 rounded-lg mt-8 space-y-2">
            <p className="font-medium">בעצם</p>
            <p>להיות אמא מתוכננת מאפשר לי לקבוע גבולות,</p>
            <p>לתאם ציפיות עם שאר בני הבית,</p>
            <p>לייצר שגרה</p>
            <p>ולהשרות וודאות, ביטחון ושקט.</p>
          </div>

          {/* Soccer-field cake — planning = boundaries & goals */}
          <figure className="bg-[#a89a9e] p-4 mt-8">
            <LazyImage
              src={soccerCake}
              alt="עוגת יום הולדת בצורת מגרש כדורגל עם קווים ושערים"
              className="w-full aspect-[4/3]"
            />
            <figcaption className="text-center text-white/95 text-sm mt-3 italic">
              לכל עוגה מתכון, לכל משחק כללים ומטרות.
            </figcaption>
          </figure>

          <p className="font-medium mt-8">איזה משמעויות נוספות יש לתכנון ביום האם?</p>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">1. בראש ובראשונה להיות מוכנה.</h3>
            <p>כשאני יודעת מה צפוי לי היום, גם אם זה יום עמוס במיוחד, אני ניגשת אליו אחרת.</p>
          </section>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">2. צעד חשוב בלגרום למשהו לקרות הוא לתכנן אותו.</h3>
            <p>אחרי שאני מבינה שאני רוצה שמשהו יקרה, אני שואלת ״איך? ומתי?״ ומכינה תוכנית אפשרית.</p>
          </section>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">3. תזמון- להתאים את המשימה לזמן הנכון.</h3>
            <p>למה אומרים להכין בגדים מהערב, ולא בבוקר? במיוחד עם ילדים התזמון הוא קריטי.</p>
          </section>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">4. יעול זמן- כשאני מתכננת נכון, אני מנצלת את הזמן בצורה הרבה יותר יעילה.</h3>
            <p>למשל אני יכולה לעשות קניות online בזמן שאני מחכה שהבת שלי תסיים את החוג, במקום סתם לגלול.</p>
          </section>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">5. תכנון עוזר לי להבין את המגבלות שלי.</h3>
            <p>להיות מציאותית. לתכנן משהו שאכן אפשרי במסגרת המגבלות.</p>
            <p className="mt-2">גם עייפות היא מגבלה, ולכן לתכנן להספיק ״הכל״ אחרי שהילדים הולכים לישון, זה לא תמיד ריאלי.</p>
          </section>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">6. תכנון עוזר לי להתמקד ולא להתפזר.</h3>
            <p>תכננתי לעשות עכשיו משהו- אם מישהו יפנה אלי, אוכל להגיד בביטחון, ״כרגע אני לא פנויה״/ ״אני עסוקה כרגע״.</p>
          </section>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">7. כשאני מתכננת, אני מציבה לעצמי מטרות.</h3>
            <p>וכשאני עומדת בתוכנית (משיגה את המטרות) אני מרגישה הצלחה. במקום להרגיש שאני לא מספיקה, אני מרגישה שאני כן מספיקה ואפילו הרבה.</p>
            <p className="mt-2">מטרות קטנות שאני מסוגלת לעמוד בהן מייצרות מוטיבציה ותחושת מסוגלות.</p>
          </section>

          <section className="mt-6 mb-6">
            <h3 className="text-[17px] font-medium font-sans text-foreground mb-4">8. וכמובן! כדי לא לשכוח.</h3>
          </section>

          <div className="bg-muted/30 p-6 rounded-lg mt-8 space-y-2">
            <p>בים המשימות של יום האם, התכנון עלול להרגיש כמו עוד משימה שדורשת ממני זמן,</p>
            <p className="font-medium">אבל למעשה התכנון הוא הגלגל הצלה שלי.</p>
            <p>נכון, התכנון דורש השקעה, מחשבה וזמן.</p>
            <p>אבל די מהר הוא עוזר לי לייעל את הזמן שלי, ואת מה שאני עושה בזמן שלי.</p>
          </div>

          <div className="mt-8 space-y-2">
            <p>ואם אני מדייקת את זה עוד קצת,</p>
            <p>התכנון הוא לא גלגל ההצלה בים המשימות שלי,</p>
            <p className="font-medium">הוא פשוט עוזר לי לשחות.</p>
            <p>ולא פחות חשוב, להוביל את שאר בני הבית.</p>
          </div>

          <div className="bg-muted/30 p-6 rounded-lg mt-8">
            <p className="font-medium">ואיך מתכננים? online או נייר?</p>
            <p className="mt-2">לכל אחת הדרך שלה. אצלי זה תמיד היה נייר — יש משהו בכתיבה ביד שמחייב אותי לעצור, ומאפשר לי לראות את כל השבוע במבט אחד.</p>
          </div>
        </article>
        </div>

        {/* Back to all chapters */}
        <div className="mt-10 flex justify-center">
          <Link
            to={ROUTES.blog}
            className="group flex items-center gap-2 text-lg text-foreground transition-colors hover:text-primary"
          >
            <span className="transition-transform group-hover:translate-x-1">→</span>
            חזרה לכל הפרקים
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

export default Content3;