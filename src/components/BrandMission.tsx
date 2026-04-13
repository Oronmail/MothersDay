import smileyIcon from "@/assets/smiley-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import clockIcon from "@/assets/clock-icon.png";

export const BrandMission = () => {
  return <section className="py-2 md:py-16 bg-background" dir="rtl">
      <div className="container mx-auto px-4 text-center max-w-4xl">
        {/* Top icons */}
        <div className="flex justify-center gap-4 mb-1 md:mb-6">
          <img src={smileyIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={heartIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={clockIcon} alt="" className="h-6 md:h-8 w-auto" />
        </div>
        
        {/* First text line */}
        <p className="text-lg md:text-xl font-normal mb-2 text-foreground">
          יום האם הוא מותג מוצרי תכנון עם מטרה ברורה!
        </p>

        {/* Second text line */}
        <p className="text-lg md:text-xl font-normal mb-8 text-foreground">
          לדייק את היום, את השבוע ואת הזמן שלנו האימהות.
        </p>

        {/* Third text line - first part */}
        <p className="text-lg md:text-xl font-normal mb-2 text-foreground">
          הגיע הזמן שבמקום שתשאלי איך נראה היום שלך,
        </p>

        {/* Third text line - second part */}
        <p className="text-lg md:text-xl font-normal mb-1 md:mb-6 text-foreground">
          תשאלי איך היית רוצה שיראה היום שלך.
        </p>
        
        {/* Bottom icons */}
        <div className="flex justify-center gap-4">
          <img src={smileyIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={heartIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={clockIcon} alt="" className="h-6 md:h-8 w-auto" />
        </div>
      </div>
    </section>;
};