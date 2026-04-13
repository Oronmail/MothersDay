import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import aboutHero from "@/assets/about-hero.png";
import titleUnderline from "@/assets/title-underline.png";
import smileyIcon from "@/assets/smiley-icon.png";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      
      {/* Hero Section */}
      <section className="bg-background pt-12 md:pt-14 pb-1 md:pb-2">
        <div className="max-w-7xl mx-auto px-4 text-center" dir="rtl">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] md:text-4xl font-normal">
                מאחורי יום האם יש אימא
              </h1>
              <img src={smileyIcon} alt="" className="w-8 h-8" />
            </div>
            <img 
              src={titleUnderline} 
              alt="" 
              className="h-2 md:h-3 -mt-1 w-auto max-w-[200px] md:max-w-[300px]"
            />
          </div>
        </div>
      </section>

      {/* Founder Image */}
      <div className="w-full">
        <img 
          src={aboutHero} 
          alt="המייסדת" 
          className="w-full h-auto"
        />
      </div>

      <main className="max-w-[680px] mx-auto px-4 sm:px-6 py-12 md:py-16 [&_br+br]:hidden md:[&_br+br]:block" dir="rtl">
        {/* Q&A Sections */}
        <div className="space-y-8 md:space-y-[72px] text-center [&_h2]:after:content-[''] [&_h2]:after:block [&_h2]:after:w-16 [&_h2]:after:h-[1px] [&_h2]:after:bg-foreground/30 [&_h2]:after:mx-auto [&_h2]:after:mt-2 [&_h2]:mb-2">
          
          {/* מי אני */}
          <section>
            <h2 className="text-[24px] font-medium text-foreground mb-4">מי אני?</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7]">
              הי, נעים מאוד
              <br /><br />
              אני עדן, ואם את כאן יש לנו לפחות 2 דברים במשותף- שתינו אימהות ושתינו רוצות קצת סדר.
              <br /><br />
              תכנון, סדר וארגון תמיד היו חלק מחיי
              <br /><br />
              כשהפכתי להיות אמא המשימה הזו הלכה ונהייתה הרבה יותר קשה-
              <br /><br />
              הילדים, הבית, העבודה, הזוגיות המשפחה, אני!
              <br /><br />
              כל אחד מביא אתו כל כך הרבה משימות, שגם אם לא אני זו שעושה אותם, אני צריכה לנהל ולפקח עליהן.
            </p>
          </section>

          {/* אז מה עשיתי */}
          <section>
            <h2 className="text-[24px] font-medium text-foreground mb-4">אז מה עשיתי?</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7]">
              הרגשתי שאני צריכה לעצור רגע ולעשות סדר.
              <br /><br />
              לקח לי זמן אבל פיצחתי את השיטה.
              <br /><br />
              וידעתי שהיא תוכל לעזור גם לאימהות ולמשפחות אחרות.
            </p>
          </section>

          {/* מה מיוחד במוצרים */}
          <section>
            <h2 className="text-[24px] font-medium text-foreground mb-4">מה מיוחד במוצרים של יום האם?</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7]">
              יום האם הוא מותג מוצרי נייר לאימהות שמנהלות את הבית, ששואפות לסדר וארגון בחיי היומיום המשפחתי.
              <br /><br />
              מה שמייחד את המוצרים של יום האם, זה שהם פונים ספציפית לאימהות ומתייחסים לריבוי התחומים והמשימות שאנחנו עוסקות בהן.
              <br /><br />
              יום האם הוא לא עוד לוח שבועי או to do list שבו אני משבצת את המשימות שלי,
              <br /><br />
              כי כאמא יש לי הרבה משימות שהן כלל לא מהסוג שאפשר לסמן עליהן וי- 
              <br /><br />
              כמו הורות, כמו זוגיות, כמו משפחתיות.
            </p>
          </section>

          {/* איך השיטה עזרה */}
          <section>
            <h2 className="text-[24px] font-medium text-foreground mb-4">איך השיטה והמוצרים עזרו לי?</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7]">
              המוצרים של יום האם עזרו לי להיות האמא שאני רוצה להיות,
              <br /><br />
              לתעדף, לתכנן להיות בשליטה, לנהל את הזמן בדרך שמתאימה לי,
              <br /><br />
              ולחבר את את בני הבית להיות שותפים ומעורבים בחיי היומיום המשפחתי,
              <br /><br />
              לכן זה גם לא פתרון דיגיטלי, אלא מוצרים מודפסים שנגישים לכל המשפחה.
            </p>
          </section>

          {/* למה קראתי לה */}
          <section>
            <h2 className="text-[24px] font-medium text-foreground mb-4">למה קראתי לה יום האם?</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7]">
              כי ברגע שהפכתי להיות אמא- אני קודם כל אמא
              <br /><br />
              אבל אני לא רק אמא
              <br /><br />
              והגיע הזמן שבמקום שאשאל את עצמי איך נראה היום שלי,
              <br /><br />
              אשאל איך הייתי רוצה שיראה היום שלי.
            </p>
          </section>

          {/* איזה מוצרי תכנון */}
          <section>
            <h2 className="text-[24px] font-medium text-foreground mb-4">איזה מוצרי תכנון יש לנו?</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7]">
              בין המוצרים תמצאי את המוצרים הייחודיים ליום האם,-
              <br /><br />
              מחברת לניהול משימות קבועות ולוח משפחתי שבועי,
              <br /><br />
              לצד מוצרי תכנון נוספים שמקלים על השבוע שלך כמו: תכנון שבועי, לוח ארוחות ורשימת קניות וסידורים.
            </p>
          </section>

          {/* איך המוצרים משתלבים */}
          <section>
            <h2 className="text-[24px] font-medium text-foreground mb-4">איך המוצרים משתלבים בבית?</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7]">
              כל המוצרים בעיצוב קלאסי, נקי ושקט בהשראה מהעיצוב הסקנדינבי שיכול להשתלב בחלל המרכזי של הבית.
              <br /><br />
              המוצרים מודפסים על נייר עבה, נעים לכתיבה,ללא כותרות. 
              <br /><br />
              כך שיכולים להתאים לצורך של כל אמא ומשפחה.
            </p>
          </section>

          {/* מותג ישראלי */}
          <section>
            <h2 className="text-[24px] font-medium text-foreground mb-4">ובסוף זה מותג ישראלי</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7]">
              מיוצר בישראל, בעברית,
              <br /><br />
              ומתחיל את השבוע ביום ראשון
            </p>
          </section>

          {/* ומה איתך */}
          <section>
            <h2 className="text-[24px] font-medium text-foreground mb-4">ומה איתך?</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7]">
              השיטה של יום האם עזרה לי לעשות סדר
              <br /><br />
              ואני מאמינה שהיא יכולה לעזור גם לך
              <br /><br />
              בדרך שמתאימה לך ולמשפחה שלך.
            </p>
          </section>

        </div>
      </main>

      <Newsletter />
      <Footer />
    </div>
  );
};

export default About;
