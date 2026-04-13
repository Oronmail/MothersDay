import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { BrandMission } from "@/components/BrandMission";
import { ProductTabs } from "@/components/ProductTabs";
import { CollectionsBanner } from "@/components/CollectionsBanner";
import { VideoCarousel } from "@/components/VideoCarousel";
import { VideoTitle } from "@/components/VideoTitle";
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
        title="דף הבית"
        description="יום האם - מוצרי תכנון איכותיים לאימהות. בלוקי תכנון, לוחות משפחתיים, מחברות ומארזים מיוחדים. תכנון פשוט ויעיל עם עיצוב נקי ונעים בנייר באיכות פרימיום."
        keywords="תכנון, אימהות, לוח משפחתי, בלוק תכנון, מחברת, מוצרי נייר, ארגון, ניהול זמן"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-background">
        <AnnouncementBanner />
        <Header />
        <Hero />
        <BrandMission />
        <div className="w-full pt-12 md:hidden">
          <CollectionsBanner />
        </div>
        <ProductTabs />
        <VideoTitle />
        <VideoCarousel />
        <FounderStory />
        <ContentSquares />
        <Newsletter />
        <Footer />
      </div>
    </>
  );
};
export default Index;