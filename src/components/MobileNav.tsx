import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, User, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import logo from "@/assets/logo.png";
import { ROUTES, COLLECTION_HANDLES, PRODUCT_HANDLES, buildCollectionPath, buildProductPath } from "@/lib/routes";

export const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [bundlesOpen, setBundlesOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "התנתקות מוצלחת",
        description: "התנתקת בהצלחה מהמערכת.",
      });
      setIsOpen(false);
      navigate(ROUTES.auth);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "ההתנתקות נכשלה. אנא נסה שוב.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex justify-center">
            <img src={logo} alt="יום האם" className="h-10" />
          </SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col p-4 text-lg" dir="rtl">
          {/* Products Collapsible */}
          <Collapsible open={productsOpen} onOpenChange={setProductsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-3 text-right font-medium hover:text-primary transition-colors">
              <span>מוצרים</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${productsOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pr-4 space-y-1">
              <button
                onClick={() => handleNavigate(ROUTES.allProducts)}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                כל המוצרים
              </button>
              <button
                onClick={() => handleNavigate(buildCollectionPath(COLLECTION_HANDLES.mothersPlanning))}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                מוצרי תכנון לאימהות
              </button>
              <button
                onClick={() => handleNavigate(buildCollectionPath(COLLECTION_HANDLES.weeklyPlanning))}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                מוצרי תכנון שבועיים
              </button>
              <button
                onClick={() => handleNavigate(buildCollectionPath(COLLECTION_HANDLES.complementaryPlanning))}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                מוצרי תכנון משלימים
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Bundles Collapsible */}
          <Collapsible open={bundlesOpen} onOpenChange={setBundlesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-3 text-right font-medium hover:text-primary transition-colors">
              <span>מארזים</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${bundlesOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pr-4 space-y-1">
              <button
                onClick={() => handleNavigate(ROUTES.allSets)}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                כל המארזים
              </button>
              <button
                onClick={() => handleNavigate(buildProductPath(PRODUCT_HANDLES.planningBundle))}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                מארז תכנון
              </button>
              <button
                onClick={() => handleNavigate(buildProductPath(PRODUCT_HANDLES.powderBundle))}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                מארז פודרה
              </button>
              <button
                onClick={() => handleNavigate(buildProductPath(PRODUCT_HANDLES.wineBundle))}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                מארז יין
              </button>
              <button
                onClick={() => handleNavigate(buildProductPath(PRODUCT_HANDLES.stoneBundle))}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                מארז אבן
              </button>
              <button
                onClick={() => handleNavigate(buildProductPath(PRODUCT_HANDLES.blocksBundle))}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                מארז בלוקים
              </button>
              <button
                onClick={() => handleNavigate(buildProductPath(PRODUCT_HANDLES.notebooksBundle))}
                className="block w-full py-2 text-right text-muted-foreground hover:text-primary transition-colors"
              >
                מארז מחברות
              </button>
            </CollapsibleContent>
          </Collapsible>

          <div className="h-px bg-border my-2" />

          <button
            onClick={() => handleNavigate(ROUTES.about)}
            className="py-3 text-right font-medium hover:text-primary transition-colors"
          >
            אודות
          </button>
          
          <button
            onClick={() => handleNavigate(ROUTES.support)}
            className="py-3 text-right font-medium hover:text-primary transition-colors"
          >
            צור קשר
          </button>
          
          <button
            onClick={() => handleNavigate(ROUTES.content2)}
            className="py-3 text-right font-medium hover:text-primary transition-colors"
          >
            שאלות נפוצות
          </button>

          <div className="h-px bg-border my-2" />

          {user ? (
            <>
              <button
                onClick={() => handleNavigate(ROUTES.profile)}
                className="flex items-center gap-2 py-3 text-right font-medium hover:text-primary transition-colors"
              >
                <User className="h-4 w-4" />
                <span>הפרופיל שלי</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 py-3 text-right font-medium hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>התנתק</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleNavigate(ROUTES.auth)}
              className="py-3 text-right font-medium hover:text-primary transition-colors"
            >
              התחבר
            </button>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};
