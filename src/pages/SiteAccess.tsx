import { Outlet } from "react-router-dom";
import { NewsletterPopup } from "@/components/NewsletterPopup";

const SiteAccess = () => {
  return (
    <>
      <NewsletterPopup />
      <Outlet />
    </>
  );
};

export default SiteAccess;
