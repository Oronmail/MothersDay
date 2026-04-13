import { useNavigate } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import { MobileNav } from "./MobileNav";
import { SearchModal } from "./SearchModal";
import { ChevronDown, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import headerTexture from "@/assets/header-texture.png";
import logo from "@/assets/logo-new.png";
import userIcon from "@/assets/user-icon.png";
import homeIcon from "@/assets/home-icon.png";
import { ROUTES, COLLECTION_HANDLES, PRODUCT_HANDLES, buildCollectionPath, buildProductPath } from "@/lib/routes";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "שגיאה",
        description: "נכשל לצאת מהחשבון. נסה שוב.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "יצאת מהחשבון",
        description: "יצאת בהצלחה מהחשבון שלך.",
      });
      navigate(ROUTES.auth);
    }
  };
  return <header className="sticky top-0 z-50 backdrop-blur shadow-sm relative" style={{
    backgroundImage: `url(${headerTexture})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }}>
      {/* Logo - Centered to screen, overlapping downward into content */}
      <button
        onClick={() => navigate(ROUTES.home)}
        className="cursor-pointer absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-[25%] z-[60]"
        style={{ direction: 'ltr' }}
      >
        <img src={logo} alt="יום האם" className="h-14 md:h-[72px]" />
      </button>

      <div className="max-w-7xl mx-auto px-4 md:px-6">

        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between h-12" dir="rtl">
          <div className="flex items-center gap-0">
            <MobileNav />
            <button onClick={() => navigate(ROUTES.home)} className="p-1">
              <img src={homeIcon} alt="בית" className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center gap-0">
            <SearchModal />
            <CartDrawer />
          </div>
        </div>

        <div className="hidden md:flex items-center justify-between h-16" dir="rtl">
          <div className="flex items-center gap-6">
            <div className="flex items-end gap-2">
              <button onClick={() => navigate(ROUTES.home)} className="hover:opacity-80 transition-opacity mb-1">
                <img src={homeIcon} alt="בית" className="h-8 w-8" />
              </button>
              <SearchModal />
            </div>
            <nav className="flex items-center gap-6 text-base">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hover:text-primary transition-colors flex items-center gap-1">
                    מוצרים
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background z-[100]">
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(ROUTES.allProducts)}>
                    כל המוצרים
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(buildCollectionPath(COLLECTION_HANDLES.mothersPlanning))}>
                    מוצרי תכנון לאימהות
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(buildCollectionPath(COLLECTION_HANDLES.weeklyPlanning))}>
                    מוצרי תכנון שבועיים
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(buildCollectionPath(COLLECTION_HANDLES.complementaryPlanning))}>
                    מוצרי תכנון משלימים
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hover:text-primary transition-colors flex items-center gap-1">
                    מארזים
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background z-[100]">
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(ROUTES.allSets)}>
                    כל המארזים
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.planningBundle))}>
                    מארז תכנון
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.powderBundle))}>
                    מארז פודרה
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.wineBundle))}>
                    מארז יין
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.stoneBundle))}>
                    מארז אבן
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.blocksBundle))}>
                    מארז בלוקים
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.notebooksBundle))}>
                    מארז מחברות
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button 
                onClick={() => navigate(ROUTES.blog)}
                className="hover:text-primary transition-colors"
              >
                בלוג
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hover:text-primary transition-colors flex items-center gap-1">
                    עוד
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background z-[100]">
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(ROUTES.about)}>
                    על יום האם
                  </DropdownMenuItem>
                  <DropdownMenuItem dir="rtl" onClick={() => navigate(ROUTES.support)}>
                    שירות לקוחות
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            <CartDrawer />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="p-0">
                    <img src={userIcon} alt="משתמש" className="h-[30px] w-[30px]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-sm text-muted-foreground" disabled>
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(ROUTES.profile)}>
                    <img src={userIcon} alt="" className="ml-2 h-4 w-4" />
                    פרופיל
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="ml-2 h-4 w-4" />
                    התנתק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" className="p-0" onClick={() => navigate(ROUTES.auth)}>
                <img src={userIcon} alt="משתמש" className="h-[30px] w-[30px]" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>;
};