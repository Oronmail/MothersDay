import { Outlet } from "react-router-dom";
import PasswordGate from "@/components/PasswordGate";
import { NewsletterPopup } from "@/components/NewsletterPopup";

const SiteAccess = () => {
  return (
    <PasswordGate>
      <NewsletterPopup />
      <Outlet />
    </PasswordGate>
  );
};

export default SiteAccess;
