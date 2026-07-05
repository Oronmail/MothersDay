import { Link } from "react-router-dom";
import titleUnderline from "@/assets/title-underline.png";
import categoryMothers from "@/assets/category-mothers.png";
import categoryWeekly from "@/assets/category-weekly.png";
import categoryComplementary from "@/assets/category-complementary.png";
import categorySets from "@/assets/category-sets.png";
import { buildCollectionPath, COLLECTION_HANDLES, ROUTES } from "@/lib/routes";

const categories = [
  { text: "מוצרי תכנון לאימהות", image: categoryMothers, href: buildCollectionPath(COLLECTION_HANDLES.mothersPlanning) },
  { text: "מוצרי תכנון שבועיים", image: categoryWeekly, href: buildCollectionPath(COLLECTION_HANDLES.weeklyPlanning) },
  { text: "מוצרי תכנון משלימים", image: categoryComplementary, href: buildCollectionPath(COLLECTION_HANDLES.complementaryPlanning) },
  { text: "מארזים", image: categorySets, href: ROUTES.allSets },
];

export const CollectionsBanner = () => {
  return (
    <div className="w-full" dir="rtl">
      <div className="flex flex-col items-center mb-4">
        <h2 className="text-[28px] font-normal text-center text-foreground">
          הקולקציות
        </h2>
        <img src={titleUnderline} alt="" className="w-48 -mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-1">
        {categories.map((category) => (
          <Link
            key={category.text}
            to={category.href}
            className="group relative block aspect-square overflow-hidden"
          >
            <img
              src={category.image}
              alt={category.text}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-background/85 py-2">
              <span className="text-sm text-foreground font-normal">
                {category.text}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
