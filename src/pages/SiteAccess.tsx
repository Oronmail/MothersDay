import { Outlet } from "react-router-dom";

// The homepage shows the hero signup card (HeroNewsletterCard, rendered from Index.tsx);
// no other pages show a newsletter popup.
const SiteAccess = () => {
  return <Outlet />;
};

export default SiteAccess;
