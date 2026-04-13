import founderImage from "@/assets/founder-image.png";
import titleUnderline from "@/assets/title-underline.png";
import smileyIcon from "@/assets/smiley-icon.png";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
export const FounderStory = () => {
  const navigate = useNavigate();
  return <section className="pt-12 md:pt-16 pb-0 md:pb-16 bg-background" dir="rtl">
      <div className="container mx-auto px-4">
        {/* Title with icon and underline */}
        <div className="flex flex-col items-center mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-[28px] md:text-4xl lg:text-5xl font-normal text-foreground">
              מאחורי יום האם יש אימא
            </h2>
            <img src={smileyIcon} alt="" className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <img src={titleUnderline} alt="" className="w-48 md:w-72 lg:w-80 -mt-1" />
        </div>

        {/* Full width image */}
        <div className="max-w-xs md:max-w-sm lg:max-w-md mx-auto mb-8 md:mb-12">
          <img src={founderImage} alt="Behind Mothers Day there is a mother" className="w-full h-auto object-cover" />
        </div>

        {/* Text content */}
        <div className="max-w-3xl mx-auto text-center space-y-4 md:space-y-6">
          <h3 className="text-2xl md:text-2xl font-normal text-foreground">מי אני?</h3>
          
          <div className="space-y-1 md:space-y-3 text-lg text-foreground leading-relaxed">
            <p>
              הי, נעים מאוד אני עדן,
            </p>
            <p>
              ואם את כאן יש לנו לפחות 2 דברים במשותף- שתינו אימהות ושתינו רוצות קצת סדר.
            </p>
            <p>
              תכנון, סדר וארגון תמיד היו חלק מחיי
            </p>
            <p>
              כשהפכתי להיות אמא המשימה הזו הלכה ונהייתה הרבה יותר קשה-
            </p>
            <p>
              הילדים, הבית, העבודה, הזוגיות המשפחה, אני!
            </p>
            <p>
              כל אחד מביא אתו כל כך הרבה משימות, שגם אם לא אני זו שעושה אותם, אני צריכה לנהל ולפקח עליהן.
            </p>
          </div>

          {/* Call to action */}
          <div className="pt-1 md:pt-8">
            <h4 className="text-lg md:text-xl font-normal text-foreground mb-4">
              אז מה עשיתי?
            </h4>
            <Button variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base" onClick={() => navigate(ROUTES.about)}>
              קראי עוד... 
            </Button>
          </div>
        </div>
      </div>
    </section>;
};
