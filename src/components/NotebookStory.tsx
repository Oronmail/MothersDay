import { useEffect, useState } from "react";
import "./NotebookStory.css";
import heartIcon from "@/assets/heart-icon.png";
import clockIcon from "@/assets/clock-icon.png";
import smileyIcon from "@/assets/smiley-icon.png";

/**
 * Editorial "story" sections for the anchor product מחברת יום האם (handle p1).
 * Renders below the standard product buy-block: domains → tables → "הרבה יותר ממחברת".
 * Texts are final (in Eden's voice). Images come from the product gallery by position:
 *   domains   = positions 5–9 (lifestyle domain photos incl. the זוגיות candle shot)
 *   tables    = positions 10–16 (the inner page templates)
 */

type ImageEdge = { node: { url: string; altText?: string | null } };

// Icons follow a smiley → heart → clock cadence (repeated ×3) so the same icon
// never lands next to another — vertically or horizontally, in 1 or 2 columns.
// Each label keeps the icon it originally had.
const TOOLS = [
  { icon: smileyIcon, label: "ארגון סדרי עדיפויות" },
  { icon: heartIcon, label: "שגרת בוקר / צהריים / ערב" },
  { icon: clockIcon, label: "לוח שבועי אישי ומשפחתי" },
  { icon: smileyIcon, label: "משימות לפי תחומים" },
  { icon: heartIcon, label: "חלוקת אחריות בין בני הבית" },
  { icon: clockIcon, label: "ליווי לכל אורך הדרך" },
  { icon: smileyIcon, label: "משימות לפי תדירות" },
  { icon: heartIcon, label: "השראה והעצמה" },
  { icon: clockIcon, label: "משימות לפי סטטוס" },
];

function RotatingImages({
  urls,
  className,
  intervalMs,
  baseIndex,
  onImageClick,
}: {
  urls: string[];
  className: string;
  intervalMs: number;
  baseIndex: number;
  onImageClick?: (index: number) => void;
}) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (urls.length <= 1) return;
    const t = window.setInterval(
      () => setActive((p) => (p + 1) % urls.length),
      intervalMs
    );
    return () => window.clearInterval(t);
  }, [urls.length, intervalMs]);
  return (
    <div
      className={className}
      onClick={onImageClick ? () => onImageClick(baseIndex + active) : undefined}
      style={onImageClick ? { cursor: "zoom-in" } : undefined}
    >
      {urls.map((u, i) => (
        <img key={u} src={u} alt="" className={i === active ? "on" : undefined} />
      ))}
    </div>
  );
}

export const NotebookStory = ({
  images,
  onImageClick,
}: {
  images: ImageEdge[];
  onImageClick?: (index: number) => void;
}) => {
  const domainUrls = images.slice(5, 10).map((e) => e.node.url).filter(Boolean);
  const tableUrls = images.slice(10, 17).map((e) => e.node.url).filter(Boolean);

  return (
    <div className="nbstory" dir="rtl">
      {/* ===== להפוך עומס לסדר (תחומים) — image right / text left ===== */}
      <section className="nb-section">
        <div className="nb-split">
          {domainUrls.length > 0 && (
            <div className="nb-vis">
              <RotatingImages urls={domainUrls} className="nb-domslider" intervalMs={2600} baseIndex={5} onImageClick={onImageClick} />
            </div>
          )}
          <div className="nb-txt">
            <h2>להפוך עומס לסדר</h2>
            <p>
              הילדים, הבית, העבודה, הזוגיות, המשפחה, אני!
              <br />
              כל תחום אחריות מביא איתו כל כך הרבה משימות, שגם אם לא את זו שעושה אותן, את מנהלת ומפקחת עליהן.
            </p>
            <p>
              כשיש תחושת עומס, קשה לדעת מאיפה להתחיל, והיא לא פעם מובילה לדחיינות, גם כשיש רצון לעשות.
              <br />
              המחברת מחולקת לתחומים שהופכים את רשימת המשימות הארוכה לתמונה ברורה ומסודרת, ובעיקר אפשרית. ופתאום, את יודעת בדיוק מאיפה להתחיל.
            </p>
            <p className="nb-domlist">אני · משפחה · זוגיות · ילדים · בית · פרויקטים</p>
          </div>
        </div>
      </section>

      {/* ===== לדייק את הזמן שלך (טבלאות) — text right / image left ===== */}
      <section className="nb-section">
        <div className="nb-split">
          <div className="nb-txt">
            <h2>לדייק את הזמן שלך</h2>
            <p>
              בעזרת שאלות מנחות וכלים פרקטיים, תוכלי לדייק את השגרה שלך, היומית והשבועית, ולתכנן את הלוח השבועי המשפחתי ואת הלוח האישי שלך.
            </p>
          </div>
          {tableUrls.length > 0 && (
            <div className="nb-vis">
              {/* Mobile: swipeable carousel through all table templates */}
              <div className="nb-tablecarousel" dir="rtl">
                {tableUrls.map((u, i) => (
                  <button
                    type="button"
                    key={u}
                    className="nb-tableslide"
                    onClick={onImageClick ? () => onImageClick(10 + i) : undefined}
                    aria-label={`פתחי טבלה ${i + 1} מתוך ${tableUrls.length}`}
                  >
                    <img src={u} alt="" />
                  </button>
                ))}
              </div>
              {/* Desktop: single auto-rotating page */}
              <RotatingImages urls={tableUrls} className="nb-tableslider" intervalMs={3100} baseIndex={10} onImageClick={onImageClick} />
            </div>
          )}
        </div>
      </section>

      {/* ===== הרבה יותר ממחברת (ערך) — tools panel right / text left ===== */}
      <section className="nb-section">
        <div className="nb-split">
          <ul className="nb-vis nb-toollist">
            {TOOLS.map((t) => (
              <li className="nb-tool" key={t.label}>
                <span className="nb-mark" aria-hidden="true">
                  <img src={t.icon} alt="" />
                </span>
                <h3>{t.label}</h3>
              </li>
            ))}
          </ul>
          <div className="nb-txt">
            <h2>הרבה יותר ממחברת</h2>
            <p>המחברת היא מעבר לדף שבו את משבצת משימות.</p>
            <p>
              היא עוזרת לך לתעדף, לתכנן ולנהל את הזמן בדרך שמתאימה לך, להיות בטוחה באימהות שלך, ולראות את מה שפחות עובד כדי לפתור אותו.
            </p>
            <p>
              וחשוב לא פחות, לחבר גם את שאר בני הבית, שיהיו שותפים ומעורבים בשגרה המשפחתית.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
