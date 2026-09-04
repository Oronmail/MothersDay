import { Outlet } from "react-router-dom";
import { AccountSync } from "@/components/AccountSync";
import { HeroNewsletterCard } from "@/components/HeroNewsletterCard";

// The 10% signup card is mounted here so it can rise on ANY store page —
// most new visitors land on product pages (Google/Instagram), not the
// homepage. It skips checkout, and its own visit/subscribe rules still apply.
const SiteAccess = () => {
  return (
    <>
      <AccountSync />
      <HeroNewsletterCard />
      <Outlet />
    </>
  );
};

export default SiteAccess;
