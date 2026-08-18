import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";

/**
 * The one marketing-consent sentence, shared by every opt-in checkbox on the
 * site (the 10% hero popup, the personal-area auth card). Keeping it in a
 * single component guarantees the club is named the same way everywhere and
 * that the wording can't drift between forms.
 */
export const MarketingConsentText = () => (
  <span>
    אשמח להצטרף למועדון ״רוצה מתכננת עושה״ ולקבל תכנים והטבות, בהתאם{" "}
    <Link to={ROUTES.privacy} className="underline hover:text-foreground">
      למדיניות הפרטיות
    </Link>{" "}
    שלנו. ניתן להסיר בכל עת.
  </span>
);
