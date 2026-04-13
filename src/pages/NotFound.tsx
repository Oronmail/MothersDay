import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { ROUTES } from "@/lib/routes";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AnnouncementBanner />
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-6" dir="rtl">
          <div className="text-8xl text-primary/20">404</div>
          <h1 className="text-2xl md:text-3xl text-foreground">
            אופס! העמוד לא נמצא
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            נראה שהעמוד שחיפשת לא קיים או הועבר למקום אחר.
          </p>
          <Button onClick={() => navigate(ROUTES.home)} className="gap-2">
            <Home className="h-4 w-4" />
            חזרה לדף הבית
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
