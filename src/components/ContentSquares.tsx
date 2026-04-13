import { Link } from "react-router-dom";
import contentSquare1 from "@/assets/content-square-1.png";
import contentSquare2 from "@/assets/content-square-2.png";
import contentSquare3 from "@/assets/content-square-3.png";
import titleUnderline from "@/assets/title-underline.png";
import { ROUTES } from "@/lib/routes";
import { LazyImage } from "./LazyImage";
export const ContentSquares = ({
  className
}: {
  className?: string;
}) => {
  const squares = [{
    id: 1,
    image: contentSquare3,
    link: ROUTES.content1,
    title: "האמא של היום היא לא האמא של פעם,",
    subtitle: ["והסבתא של היום היא לא הסבתא של פעם"]
  }, {
    id: 2,
    image: contentSquare2,
    link: ROUTES.content2,
    title: "חלוקת זמן לאימהות"
  }, {
    id: 3,
    image: contentSquare1,
    link: ROUTES.content3,
    title: "תכנון ביום האם"
  }];
  return <section className={`pt-12 md:pt-16 pb-0 md:pb-16 bg-background ${className || ""}`} dir="rtl">
      <div className="container mx-auto px-4">
        {/* Title with underline */}
        <div className="flex flex-col items-center mb-4 md:mb-6">
           <h2 className="text-[28px] md:text-4xl lg:text-5xl font-normal text-foreground">
            בלוג
          </h2>
          <img src={titleUnderline} alt="" className="w-48 md:w-72 lg:w-80 -mt-1" />
        </div>

        {/* Grid of content squares */}
        <div className="grid grid-cols-3 gap-2 md:gap-6">
          {squares.map(square => <Link key={square.id} to={square.link} className="flex flex-col hover:opacity-90 transition-opacity group">
              {/* Image with overlay text */}
              <div className="aspect-square overflow-hidden relative mb-4">
                <LazyImage src={square.image} alt="" className="group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  
                </div>
              </div>
              
              {/* Text content */}
              <div className="text-center space-y-1">
                <p className="text-lg font-normal text-foreground">
                  {square.title}
                </p>
                {square.subtitle && square.subtitle.map((line, idx) => <p key={idx} className="text-lg font-normal text-foreground">
                    {line}
                  </p>)}
              </div>
            </Link>)}
        </div>
      </div>
    </section>;
};