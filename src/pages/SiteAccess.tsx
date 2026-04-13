import { Outlet, useLocation } from "react-router-dom";
import { NewsletterPopup } from "@/components/NewsletterPopup";

const SiteAccess = () => {
  const { pathname } = useLocation();
  const isCheckout = pathname.startsWith("/checkout");

  return (
    <>
      {!isCheckout && <NewsletterPopup />}
      <Outlet />
    </>
  );
};

export default SiteAccess;
