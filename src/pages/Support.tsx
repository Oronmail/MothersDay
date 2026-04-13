import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Phone } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import titleUnderline from "@/assets/title-underline.png";
const faqItems = [
  {
    question: "כמה זמן לוקחת המשלוח?",
    answer: "משלוחים בדואר רשום מגיעים תוך 3-5 ימי עסקים. משלוחים עם שליח עד הבית מגיעים תוך 1-3 ימי עסקים."
  },
  {
    question: "האם אפשר להחזיר מוצר?",
    answer: "בהחלט! ניתן להחזיר מוצרים תוך 14 יום מקבלת ההזמנה, כל עוד המוצר לא נפתח ולא נעשה בו שימוש. לפרטים נוספים ראי את מדיניות ההחזרות שלנו."
  },
  {
    question: "איך אני יודעת איזה מוצר מתאים לי?",
    answer: "כל מוצר בחנות כולל תיאור מפורט והסבר על השימוש בו. אם את עדיין לא בטוחה, שלחי לנו הודעה בוואטסאפ ונשמח לעזור לך לבחור את המוצר המתאים למשפחה שלך."
  },
  {
    question: "האם המוצרים מתאימים לכל סוגי העטים?",
    answer: "כן! המוצרים שלנו מודפסים על נייר עבה ואיכותי שמתאים לכתיבה בכל סוגי העטים - כדורי, ג'ל, מרקרים ואפילו עפרונות."
  },
  {
    question: "האם יש הנחה על הזמנה גדולה?",
    answer: "כן, אנחנו מציעים הנחות על הזמנות מרובות ועל חבילות מוצרים. בדקי את החבילות שלנו בחנות או צרי קשר לקבלת הצעה מותאמת אישית."
  },
  {
    question: "מתי הלוח השבועי מתחיל?",
    answer: "כל המוצרים שלנו מתחילים את השבוע ביום ראשון - בדיוק כמו שאנחנו רגילות בישראל!"
  },
  {
    question: "האם אפשר לקבל חשבונית?",
    answer: "בוודאי! חשבונית נשלחת אוטומטית למייל לאחר ביצוע ההזמנה. אם את צריכה חשבונית מס, צרי איתנו קשר עם פרטי העסק."
  },
  {
    question: "איך אפשר לעקוב אחרי ההזמנה שלי?",
    answer: "לאחר שליחת ההזמנה תקבלי מייל עם מספר מעקב. ניתן לעקוב אחרי המשלוח דרך אתר דואר ישראל או חברת השליחויות."
  }
];

const Support = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12" dir="rtl">
          <h1 className="text-4xl text-foreground">תמיכה</h1>
          <img 
            src={titleUnderline} 
            alt="" 
            className="mx-auto h-4 w-64 object-contain -mt-1 mb-4" 
          />
          <p className="text-muted-foreground">
            אנחנו כאן לעזור! בחרי את הדרך הנוחה לך ליצור קשר
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-16" dir="rtl">
          <div className="bg-card p-8 border border-border text-center">
            <div className="bg-muted p-4 rounded-full w-fit mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-foreground" />
            </div>
            <h2 className="text-xl mb-2 text-foreground">וואטסאפ</h2>
            <p className="text-foreground/70 mb-4">
              הדרך הכי מהירה לקבל מענה
            </p>
            <Button variant="outline" className="w-full rounded-none hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors" asChild>
              <a href="https://wa.me/972541234567" target="_blank" rel="noopener noreferrer">
                שלחי הודעה
              </a>
            </Button>
          </div>
          
          <div className="bg-card p-8 border border-border text-center">
            <div className="bg-muted p-4 rounded-full w-fit mx-auto mb-4">
              <Mail className="h-8 w-8 text-foreground" />
            </div>
            <h2 className="text-xl mb-2 text-foreground">אימייל</h2>
            <p className="text-foreground/70 mb-4">
              נחזור אליך תוך 24 שעות
            </p>
            <Button variant="outline" className="w-full rounded-none hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors" asChild>
              <a href="mailto:hello@yomhaem.co.il">
                שלחי מייל
              </a>
            </Button>
          </div>
          
          <div className="bg-card p-8 border border-border text-center">
            <div className="bg-muted p-4 rounded-full w-fit mx-auto mb-4">
              <Phone className="h-8 w-8 text-foreground" />
            </div>
            <h2 className="text-xl mb-2 text-foreground">טלפון</h2>
            <p className="text-foreground/70 mb-4">
              א׳-ה׳ 9:00-17:00
            </p>
            <Button variant="outline" className="w-full rounded-none hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors" asChild>
              <a href="tel:+972541234567">
                התקשרי אלינו
              </a>
            </Button>
          </div>
        </div>

        {/* FAQ Section */}
        <div dir="rtl">
          <h2 className="text-2xl text-foreground text-center mb-8">שאלות נפוצות</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-right text-[17px] hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[16px] leading-[1.7]">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-12 bg-secondary/20 rounded-2xl p-8 text-center" dir="rtl">
          <h2 className="text-xl mb-4">לא מצאת תשובה?</h2>
          <p className="text-muted-foreground mb-6">
            שלחי לנו הודעה ונחזור אליך בהקדם
          </p>
          <Button asChild>
            <a href="https://wa.me/972541234567" target="_blank" rel="noopener noreferrer">
              דברי איתנו בוואטסאפ
            </a>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
