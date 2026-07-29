import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HeroNewsletterCard } from "@/components/HeroNewsletterCard";
import { BrandMission } from "@/components/BrandMission";
import { ProductTabs } from "@/components/ProductTabs";
import { CollectionsBanner } from "@/components/CollectionsBanner";
import { VideoCarousel } from "@/components/VideoCarousel";
import { VideoTitle } from "@/components/VideoTitle";
import { Testimonials } from "@/components/Testimonials";
import { FounderStory } from "@/components/FounderStory";
import { ContentSquares } from "@/components/ContentSquares";
import { Newsletter } from "@/components/Newsletter";
import { Footer } from "@/components/Footer";
import { SEO, getOrganizationStructuredData, getWebsiteStructuredData } from "@/components/SEO";

const Index = () => {
  // Combine structured data for homepage
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      getOrganizationStructuredData(),
      getWebsiteStructuredData(),
    ],
  };

  return (
    <>
      <SEO
        description="לוחות, מחברות ובלוקי תכנון מעוצבים, שעוזרים לאימהות לדייק את היום, את השבוע ואת הזמן שלהן."
        keywords="תכנון, אימהות, לוח משפחתי, בלוק תכנון, מחברת, מוצרי נייר, ארגון, ניהול זמן"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-background">
        <AnnouncementBanner />
        <Header />
        <Hero />
        <HeroNewsletterCard />
        <BrandMission />
        <ProductTabs />
        <div className="w-full pt-12 md:hidden">
          <CollectionsBanner />
        </div>
        <VideoTitle />
        <VideoCarousel />
        {/* קרוסלת "אימהות מספרות" — התוכן ב-Testimonials.tsx עדיין placeholder,
            אז היא מוצגת בפיתוח המקומי בלבד ולא באתר החי. כשיגיעו 7 חוות הדעת
            האמיתיות מקבוצת המיקוד: להחליף את הטקסטים שם ולהסיר את התנאי הזה. */}
        {import.meta.env.DEV && <Testimonials />}
        <FounderStory />
        <ContentSquares />
        <Newsletter />
        <Footer />
      </div>
    </>
  );
};
export default Index;