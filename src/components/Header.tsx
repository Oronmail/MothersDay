import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import { MobileNav } from "./MobileNav";
import { SearchModal } from "./SearchModal";
import { AuthDialog } from "./AuthDialog";
import { ChevronDown, Heart, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import headerTexture from "@/assets/header-texture.png";
import logo from "@/assets/logo-new.png";
import userIcon from "@/assets/user-icon.png";
import homeIcon from "@/assets/home-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import { ROUTES, COLLECTION_HANDLES, PRODUCT_HANDLES, buildCollectionPath, buildProductPath } from "@/lib/routes";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const Header = () => {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const desktopNavTriggerClassName =
    "relative flex items-center gap-1 pb-1 text-foreground/90 transition-colors hover:text-primary data-[state=open]:text-primary after:absolute after:-bottom-0.5 after:right-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-primary/35 after:transition-transform after:duration-200 hover:after:scale-x-100 data-[state=open]:after:scale-x-100";
  const desktopNavMenuStyle = {
    backgroundImage: `linear-gradient(rgba(247, 242, 239, 0.96), rgba(247, 242, 239, 0.96)), url(${headerTexture})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as const;
  const desktopNavMenuClassName =
    "z-[100] min-w-[220px] rounded-none border border-primary/10 p-2 text-right shadow-[0_24px_48px_rgba(77,60,64,0.14)] backdrop-blur-sm";
  const desktopNavMenuItemClassName =
    "block w-full rounded-none px-4 py-3 text-right text-[15px] text-foreground/85 transition-colors hover:text-primary focus:bg-white/70 focus:text-primary data-[highlighted]:bg-white/70 data-[highlighted]:text-primary cursor-pointer";

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
      navigate(ROUTES.home);
    }
  };
  // Wishlist + account entry points — same markup on mobile and desktop.
  const wishlistButton = (
    <button
      onClick={() => navigate(ROUTES.wishlist)}
      aria-label="רשימת המשאלות"
      className="flex items-center px-1 hover:opacity-80 transition-opacity"
    >
      <span
        aria-hidden="true"
        className="block h-7 w-7 bg-[#3c2a2e] relative top-[2px]"
        style={{
          WebkitMaskImage: `url(${heartIcon})`,
          maskImage: `url(${heartIcon})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
    </button>
  );

  const accountMenu = user ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="p-0" aria-label="האזור האישי">
          <img src={userIcon} alt="משתמש" className="h-6 w-6" />
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
        <DropdownMenuItem onClick={() => navigate(ROUTES.wishlist)}>
          <Heart className="ml-2 h-4 w-4" />
          רשימת משאלות
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="ml-2 h-4 w-4" />
          התנתק
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      className="p-0"
      aria-label="האזור האישי"
      onClick={() => setIsAuthDialogOpen(true)}
    >
      <img src={userIcon} alt="משתמש" className="h-6 w-6" />
    </Button>
  );

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

          {/* רק חיפוש וסל נשארים בחוץ. האיזור האישי ורשימת המשאלות
              יושבים בתוך תפריט ההמבורגר, כדי לא לעמיס את ההדר במובייל. */}
          <div className="flex items-center gap-0">
            <SearchModal />
            <CartDrawer />
          </div>
        </div>

        <div className="hidden md:flex items-center justify-between h-16" dir="rtl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(ROUTES.home)} className="hover:opacity-80 transition-opacity">
                <img src={homeIcon} alt="בית" className="h-6 w-6" />
              </button>
              <SearchModal />
            </div>
            <nav className="flex items-center gap-6 text-lg font-display">
              {/* dir="rtl" lives on the DropdownMenu root (Radix passes it down to the
                  rendered content); the Content component doesn't accept a dir prop. */}
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <button className={desktopNavTriggerClassName}>
                    מוצרים
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={14}
                  className={desktopNavMenuClassName}
                  style={desktopNavMenuStyle}
                >
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(ROUTES.allProducts)}
                  >
                    כל המוצרים
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(buildCollectionPath(COLLECTION_HANDLES.mothersPlanning))}
                  >
                    מוצרי תכנון לאימהות
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(buildCollectionPath(COLLECTION_HANDLES.weeklyPlanning))}
                  >
                    מוצרי תכנון שבועיים
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(buildCollectionPath(COLLECTION_HANDLES.complementaryPlanning))}
                  >
                    מוצרי תכנון משלימים
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <button className={desktopNavTriggerClassName}>
                    מארזים
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={14}
                  className={desktopNavMenuClassName}
                  style={desktopNavMenuStyle}
                >
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(ROUTES.allSets)}
                  >
                    כל המארזים
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.planningBundle))}
                  >
                    מארז תכנון
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.powderBundle))}
                  >
                    מארז פודרה
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.wineBundle))}
                  >
                    מארז יין
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.stoneBundle))}
                  >
                    מארז אבן
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.blocksBundle))}
                  >
                    מארז בלוקים
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(buildProductPath(PRODUCT_HANDLES.notebooksBundle))}
                  >
                    מארז מחברות
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => navigate(ROUTES.blog)}
                className={desktopNavTriggerClassName}
              >
                בלוג
              </button>
              
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <button className={desktopNavTriggerClassName}>
                    עוד
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={14}
                  className={desktopNavMenuClassName}
                  style={desktopNavMenuStyle}
                >
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(ROUTES.about)}
                  >
                    על יום האם
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    dir="rtl"
                    className={desktopNavMenuItemClassName}
                    onClick={() => navigate(ROUTES.support)}
                  >
                    שירות לקוחות
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {wishlistButton}
            <CartDrawer />
            {accountMenu}
          </div>
        </div>
      </div>
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </header>;
};
