import { Link } from "react-router-dom";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import titleUnderline from "@/assets/title-underline.png";
import contentSquare1 from "@/assets/content-square-1.png";
import contentSquare2 from "@/assets/content-square-2.png";
import contentSquare3 from "@/assets/content-square-3.png";
import { ROUTES } from "@/lib/routes";
import { LazyImage } from "@/components/LazyImage";

const blogPosts = [
  {
    id: 1,
    image: contentSquare3,
    link: ROUTES.content1,
    title: "האמא של היום היא לא האמא של פעם,",
    subtitle: "והסבתא של היום היא לא הסבתא של פעם",
    excerpt: "לא פעם ולא פעמיים שאלתי את עצמי: איך עושים את זה? ולא פעם ולא פעמיים שמעתי את התשובה: ״עושים״, ״כולן עושות״...",
    label: "פוסט 1",
  },
  {
    id: 2,
    image: contentSquare2,
    link: ROUTES.content2,
    title: "חלוקת זמן לאימהות",
    subtitle: "הזמן שלי, כבר לא רק שלי",
    excerpt: "ברגע שהפכתי להיות אמא, הזמן שלי הוא כבר לא רק שלי. אני יכולה להיות הכי מסודרת ומאורגנת שיש...",
    label: "פרק 2",
  },
  {
    id: 3,
    image: contentSquare1,
    link: ROUTES.content3,
    title: "תכנון ביום האם",
    subtitle: "להיות אמא מתוכננת",
    excerpt: "ההבדל בין להיות אדם מתוכנן, מסודר ומאורגן לבין אדם לא מתוכנן, לא מסודר ולא מאורגן, הוא די ברור...",
    label: "פרק 3",
  },
];

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBanner />
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16" dir="rtl">
        {/* Page Title */}
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-normal text-foreground">
            בלוג
          </h1>
          <img src={titleUnderline} alt="" className="w-32 md:w-48 -mt-1" />
          <p className="text-muted-foreground mt-4 text-center max-w-xl">
            רוצה מתכננת עושה- הבלוג של יום האם לתכנון וניהול זמן לאימהות
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid gap-8">
          {blogPosts.map((post) => (
            <Link
              key={post.id}
              to={post.link}
              className="group border border-muted-foreground/20 rounded-sm bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="md:w-1/3 aspect-square md:aspect-auto overflow-hidden">
                  <LazyImage
                    src={post.image}
                    alt={post.title}
                    className="group-hover:scale-105 transition-transform duration-300 h-full"
                  />
                </div>
                
                {/* Content */}
                <div className="md:w-2/3 p-6 flex flex-col justify-center">
                  <span className="text-sm text-muted-foreground mb-2">{post.label}</span>
                  <h2 className="text-xl md:text-2xl text-foreground mb-1">
                    {post.title}
                  </h2>
                  {post.subtitle && (
                    <h3 className="text-lg text-foreground/80 mb-3">
                      {post.subtitle}
                    </h3>
                  )}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="text-primary mt-4 text-sm font-medium group-hover:underline">
                    קרא עוד ←
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Newsletter />
      <Footer />
    </div>
  );
};

export default Blog;
