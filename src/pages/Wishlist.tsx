import { Link, useNavigate } from 'react-router-dom';
import { useWishlistItems } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { ROUTES, buildProductPath } from '@/lib/routes';
import { LazyImage } from '@/components/LazyImage';
import { useEffect } from 'react';
import { getProductCardImageUrl } from '@/lib/imageTransforms';
import heartIcon from '@/assets/heart-icon.png';
import titleUnderline from '@/assets/title-underline.png';

export default function Wishlist() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { items, isLoading, remove } = useWishlistItems();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(ROUTES.auth);
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        {/* Branded header */}
        <div className="text-center mb-14">
          <img src={heartIcon} alt="" className="w-10 h-10 mx-auto mb-3" />
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            רשימת המשאלות
          </h1>
          <img
            src={titleUnderline}
            alt=""
            className="mx-auto h-4 w-56 object-contain mt-1 mb-5"
          />
          <p className="text-foreground/70 max-w-md mx-auto leading-relaxed">
            כל המוצרים שאהבת, שמורים במקום אחד.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 space-y-5">
            <img src={heartIcon} alt="" className="w-16 h-16 mx-auto opacity-50" />
            <p className="text-foreground/70 text-lg">
              רשימת המשאלות שלך ריקה
            </p>
            <Button
              variant="outline"
              className="rounded-none hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
              onClick={() => navigate(ROUTES.allProducts)}
            >
              גלי את המוצרים שלנו
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-12 md:gap-x-6 md:gap-y-16">
            {items.map((item) => {
              const image = item.product.product_images
                ?.sort((a, b) => a.position - b.position)[0];

              return (
                <article key={item.id} className="group">
                  {/* Image */}
                  <div className="relative aspect-[4/5] bg-secondary/20 overflow-hidden">
                    <Link
                      to={buildProductPath(item.product.handle)}
                      aria-label={`עבור לעמוד המוצר ${item.product.title}`}
                      className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {image ? (
                        <LazyImage
                          src={getProductCardImageUrl(image.url)}
                          alt={item.product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          אין תמונה
                        </div>
                      )}
                    </Link>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="absolute top-2 left-2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all hover:scale-110"
                      aria-label="הסר מרשימת המשאלות"
                    >
                      <Trash2 className="w-4 h-4 text-foreground/70" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="pt-3 text-center space-y-1">
                    <Link
                      to={buildProductPath(item.product.handle)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <h3 className="font-display text-lg leading-tight line-clamp-2 text-foreground hover:text-primary transition-colors">
                        {item.product.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-foreground/60">
                      {item.product.price.toFixed(0)} ש״ח
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
