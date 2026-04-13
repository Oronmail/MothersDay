import { useNavigate } from 'react-router-dom';
import { useWishlistItems } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, Trash2, ArrowRight } from 'lucide-react';
import { ROUTES, buildProductPath } from '@/lib/routes';
import { LazyImage } from '@/components/LazyImage';
import { useEffect } from 'react';

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
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-medium">רשימת המשאלות</h1>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground text-lg">
                רשימת המשאלות שלך ריקה
              </p>
              <Button variant="outline" onClick={() => navigate(ROUTES.allProducts)}>
                גלה את המוצרים שלנו
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const image = item.product.product_images
                  ?.sort((a, b) => a.position - b.position)[0];

                return (
                  <div
                    key={item.id}
                    className="group border border-border rounded-lg overflow-hidden bg-background hover:shadow-lg transition-shadow"
                  >
                    {/* Image */}
                    <div
                      className="relative aspect-[4/5] bg-secondary/30 cursor-pointer overflow-hidden"
                      onClick={() => navigate(buildProductPath(item.product.handle))}
                    >
                      {image ? (
                        <LazyImage
                          src={image.url}
                          alt={item.product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          אין תמונה
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(item.id);
                        }}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all hover:scale-110"
                        aria-label="הסר מרשימת המשאלות"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <h3
                        className="font-medium text-base leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(buildProductPath(item.product.handle))}
                      >
                        {item.product.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.product.price.toFixed(0)} ש״ח
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
