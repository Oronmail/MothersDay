import clockIcon from "@/assets/clock-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import smileyIcon from "@/assets/smiley-icon.png";
import titleUnderline from "@/assets/title-underline.png";

export const VideoTitle = () => {
  return (
    <section className="pt-12 md:pt-16 pb-2 md:pb-4 bg-background" dir="rtl">
      <div className="container mx-auto px-4 flex flex-col items-center">
        <div className="flex items-center justify-center gap-1.5 md:gap-6">
          <img src={heartIcon} alt="" className="w-6 h-6 md:w-8 md:h-8" />
          <span className="text-[28px] md:text-4xl lg:text-5xl font-normal text-foreground">בית</span>
          <img src={smileyIcon} alt="" className="w-6 h-6 md:w-8 md:h-8" />
          <span className="text-[28px] md:text-4xl lg:text-5xl font-normal text-foreground">תכנון</span>
          <img src={clockIcon} alt="" className="w-6 h-6 md:w-8 md:h-8" />
          <span className="text-[28px] md:text-4xl lg:text-5xl font-normal text-foreground">שגרה</span>
          <img src={heartIcon} alt="" className="w-6 h-6 md:w-8 md:h-8" />
        </div>
        <img 
          src={titleUnderline} 
          alt="" 
          className="w-full max-w-[320px] md:max-w-[500px] lg:max-w-[600px] -mt-1"
        />
      </div>
    </section>
  );
};
