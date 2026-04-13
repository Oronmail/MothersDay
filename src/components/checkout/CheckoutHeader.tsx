import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import logo from "@/assets/logo-new.png";

export function CheckoutHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between" dir="rtl">
        <Link
          to={ROUTES.home}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לחנות
        </Link>
        <img src={logo} alt="יום האם" className="h-8" />
        <div className="w-[88px]" /> {/* Spacer to center logo */}
      </div>
    </header>
  );
}
