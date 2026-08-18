import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { submitReview } from "@/hooks/useProductReviews";
import { useAuth } from "@/hooks/useAuth";
import heartFilled from "@/assets/heart-filled.png";
import heartOutline from "@/assets/heart-icon.png";

// טופס שליחת חוות דעת. נשמרת ב-Supabase (טבלת reviews) בסטטוס "ממתינה",
// עוברת מודרציה ב-/admin/reviews, ורק חוות דעת מאושרת מוצגת בעמוד המוצר.

interface ReviewFormProps {
  productId?: string;
  productHandle?: string;
  productTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HeartMask = ({ filled, className = "" }: { filled: boolean; className?: string }) => (
  <span
    aria-hidden="true"
    className={`inline-block h-8 w-8 ${filled ? "bg-[#4d3c40]" : "bg-muted-foreground/40"} ${className}`}
    style={{
      WebkitMaskImage: `url(${filled ? heartFilled : heartOutline})`,
      maskImage: `url(${filled ? heartFilled : heartOutline})`,
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    }}
  />
);

export const ReviewForm = ({
  productId,
  productHandle,
  productTitle,
  open,
  onOpenChange,
}: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [kidsCount, setKidsCount] = useState("");
  const [kidsAges, setKidsAges] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid =
    rating > 0 && body.trim() && name.trim() && kidsCount.trim() && kidsAges.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting || !productHandle) return;
    setSubmitting(true);
    try {
      await submitReview({
        productId,
        productHandle,
        productTitle,
        rating,
        body,
        name,
        kidsCount,
        kidsAges,
        userId: user?.id ?? null,
      });
      setSubmitted(true);
    } catch {
      toast.error("משהו השתבש ולא הצלחנו לשמור, נסי שוב בעוד רגע");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setRating(0); setHover(0); setBody(""); setName("");
    setKidsCount(""); setKidsAges(""); setSubmitted(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 200); }}
    >
      <DialogContent className="max-w-lg" dir="rtl">
        {submitted ? (
          // מסך תודה אחרי שליחה
          <div className="py-6 text-center">
            <HeartMask filled className="h-12 w-12 mx-auto" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">תודה ששיתפת!</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              חוות הדעת שלך התקבלה ותפורסם לאחר בדיקה קצרה.
            </p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>סגירה</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="text-right sm:text-right pr-8">
              <DialogTitle className="text-xl">שתפי אותנו בחוויה שלך</DialogTitle>
              <p className="text-xs text-muted-foreground">* שדות חובה</p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 text-right">
              {/* דירוג בלבבות */}
              <div>
                <Label className="text-sm">דרגי את החוויה שלך *</Label>
                <div className="mt-2 flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i)}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${i} מתוך 5`}
                      className="p-0.5"
                    >
                      <HeartMask filled={i <= (hover || rating)} />
                    </button>
                  ))}
                </div>
              </div>

              {/* גוף חוות הדעת */}
              <div>
                <Label htmlFor="rf-body" className="text-sm">כתבי לנו *</Label>
                <Textarea
                  id="rf-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="איך המוצר השפיע על יום האם שלך?"
                  className="mt-2 min-h-[120px] text-right"
                  dir="rtl"
                />
              </div>

              {/* שם */}
              <div>
                <Label htmlFor="rf-name" className="text-sm">שמך *</Label>
                <Input
                  id="rf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 text-right"
                  dir="rtl"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  יופיע באופן פומבי עם חוות הדעת שלך
                </p>
              </div>

              {/* אמא ל־ : מספר ילדים + גילאים */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rf-kids" className="text-sm">אמא למספר ילדים *</Label>
                  <Input
                    id="rf-kids"
                    value={kidsCount}
                    onChange={(e) => setKidsCount(e.target.value)}
                    placeholder="למשל 2"
                    className="mt-2 text-right"
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="rf-ages" className="text-sm">גילאי הילדים *</Label>
                  <Input
                    id="rf-ages"
                    value={kidsAges}
                    onChange={(e) => setKidsAges(e.target.value)}
                    placeholder="למשל 3 ו-6"
                    className="mt-2 text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <Button type="submit" disabled={!isValid || submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "שליחה"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
