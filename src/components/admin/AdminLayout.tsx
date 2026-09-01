import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AdminSidebar, AdminSidebarContent } from './AdminSidebar';
import logoNew from '@/assets/logo-new.png';

export const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the drawer after navigating.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Desktop: the fixed sidebar, unchanged */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>

      {/* Mobile: a top bar with a hamburger that opens the same nav in a drawer */}
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-2 h-14 px-3 bg-card border-b border-border">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="פתיחת תפריט הניהול">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          {/* the close X sits at the physical right by default — move it left so it
              doesn't land on the logo in this RTL panel */}
          <SheetContent
            side="right"
            dir="rtl"
            aria-describedby={undefined}
            className="w-64 p-0 [&>button]:right-auto [&>button]:left-4"
          >
            <SheetTitle className="sr-only">תפריט הניהול</SheetTitle>
            <AdminSidebarContent onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <img src={logoNew} alt="MothersDay" className="h-7 w-auto" />
        <span className="text-sm font-semibold text-muted-foreground">Admin</span>
      </header>

      <main className="md:mr-56 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
};
