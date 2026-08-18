import { Outlet } from "react-router-dom";
import { AccountSync } from "@/components/AccountSync";

// The homepage shows the hero signup card (HeroNewsletterCard, rendered from Index.tsx);
// no other pages show a newsletter popup.
const SiteAccess = () => {
  return (
    <>
      <AccountSync />
      <Outlet />
    </>
  );
};

export default SiteAccess;
