import { Outlet, useLocation } from "react-router-dom";
import { NewsletterPopup } from "@/components/NewsletterPopup";

const SiteAccess = () => {
  const { pathname } = useLocation();
  const isCheckout = pathname.startsWith("/checkout");
  // The homepage has its own hero signup card, so suppress the global popup there
  // (avoids two newsletter popups firing on the same page).
  const isHome = pathname === "/";

  return (
    <>
      {!isCheckout && !isHome && <NewsletterPopup />}
      <Outlet />
    </>
  );
};

export default SiteAccess;
