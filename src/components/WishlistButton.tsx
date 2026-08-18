import { Heart } from 'lucide-react';
import { useWishlistToggle } from '@/hooks/useWishlist';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  className?: string;
  /** Size of the heart icon in pixels (default 20) */
  size?: number;
}

/**
 * A heart-shaped toggle button that adds/removes a product from the wishlist.
 * Guests get a local (browser) wishlist; logged-in users save to the account.
 */
export function WishlistButton({ productId, className, size = 20 }: WishlistButtonProps) {
  const { isInWishlist, toggle, isLoading } = useWishlistToggle(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    await toggle();

    if (!isInWishlist) {
      toast.success('נוסף לרשימת המשאלות');
    } else {
      toast.info('הוסר מרשימת המשאלות');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isInWishlist ? 'הסר מרשימת המשאלות' : 'הוסף לרשימת המשאלות'}
      className={cn(
        'p-1.5 rounded-full transition-all duration-200',
        'hover:scale-110 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      <Heart
        className={cn(
          'transition-colors duration-200',
          isInWishlist
            ? 'fill-primary text-primary'
            : 'fill-transparent text-gray-500 hover:text-primary',
        )}
        style={{ width: size, height: size }}
      />
    </button>
  );
}
