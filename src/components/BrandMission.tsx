import smileyIcon from "@/assets/smiley-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import clockIcon from "@/assets/clock-icon.png";

export const BrandMission = () => {
  return <section className="pt-12 pb-0 md:py-16 bg-background" dir="rtl">
      <div className="container mx-auto px-4 text-center max-w-4xl">
        {/* Top icons */}
        <div className="flex justify-center gap-4 mb-1 md:mb-6">
          <img src={smileyIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={heartIcon} alt="" className="h-6 md:h-8 w-auto" />
          <img src={clockIcon} alt="" className="h-6 md:h-8 w-auto" />
        </div>
        
        {/* First text line */}
        <p className="text-base md:text-xl font-normal mb-2 leading-relaxed text-foreground">
          יום האם הוא מותג מוצרי תכנון עם מטרה ברורה:
        </p>

        {/* Second text line */}
        <p className="text-base md:text-xl font-normal mb-8 leading-relaxed text-foreground">
          לעזור לאימהות לדייק את היום, את השבוע ואת הזמן.
        </p>

        {/* Third text line - first part */}
        <p className="text-base md:text-xl font-normal mb-2 leading-relaxed text-foreground">
          כי במקום לשאול איך נראה היום שלך,
        </p>

        {/* Third text line - second part */}
        <p className="text-base md:text-xl font-normal mb-1 md:mb-6 leading-relaxed text-foreground">
          מגיע לך לשאול איך היית רוצה שייראה.
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