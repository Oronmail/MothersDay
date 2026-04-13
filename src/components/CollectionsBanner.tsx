import { Link } from "react-router-dom";
import collectionsBanner from "@/assets/collections-banner.png";
import titleUnderline from "@/assets/title-underline.png";
import { buildCollectionPath, COLLECTION_HANDLES, ROUTES } from "@/lib/routes";

const labels = [
  { text: "מוצרי תכנון לאימהות", top: "0", right: "0", left: "auto", labelTop: "40%", href: buildCollectionPath(COLLECTION_HANDLES.mothersPlanning) },
  { text: "מוצרי תכנון שבועיים", top: "0", right: "auto", left: "0", labelTop: "40%", href: buildCollectionPath(COLLECTION_HANDLES.weeklyPlanning) },
  { text: "מוצרי תכנון משלימים", top: "50%", right: "0", left: "auto", labelBottom: "0", href: buildCollectionPath(COLLECTION_HANDLES.complementaryPlanning) },
  { text: "מארזים", top: "50%", right: "auto", left: "0", labelBottom: "0", href: ROUTES.allSets },
];

export const CollectionsBanner = () => {
  return (
    <div className="w-full" dir="rtl">
      <div className="flex flex-col items-center mb-4 md:mb-6">
        <h2 className="text-[28px] md:text-4xl lg:text-5xl font-normal text-center text-foreground">
          המוצרים של יום האם
        </h2>
        <img src={titleUnderline} alt="" className="w-48 md:w-72 lg:w-80 -mt-1" />
      </div>
      <div className="relative w-full">
        <img
          src={collectionsBanner}
          alt="קולקציות יום האם"
          className="w-full h-auto block"
        />
        {/* Clickable quadrant overlays */}
        {labels.map((label) => (
          <Link
            key={label.text}
            to={label.href}
            className="absolute hover:opacity-80 transition-opacity"
            style={{
              top: label.top,
              right: label.right,
              left: label.left,
              height: "50%",
              width: "50%",
            }}
          />
        ))}
        {/* Text labels */}
        {labels.map((label) => (
          <div
            key={`label-${label.text}`}
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              top: label.labelTop ? label.labelTop : undefined,
              bottom: label.labelBottom ? label.labelBottom : undefined,
              right: label.right,
              left: label.left,
              height: "10%",
              width: "50%",
            }}
          >
            <div className="w-full h-full bg-background/60 flex items-center justify-center">
              <span className="text-lg md:text-xl lg:text-2xl text-foreground font-normal">
                {label.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
