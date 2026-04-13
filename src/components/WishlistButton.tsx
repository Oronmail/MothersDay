import { Heart } from 'lucide-react';
import { useWishlistToggle } from '@/hooks/useWishlist';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  className?: string;
  /** Size of the heart icon in pixels (default 20) */
  size?: number;
}

/**
 * A heart-shaped toggle button that adds/removes a product from the
 * authenticated user's wishlist. Redirects to /auth if not logged in.
 */
export function WishlistButton({ productId, className, size = 20 }: WishlistButtonProps) {
  const { isInWishlist, toggle, isLoading, isLoggedIn } = useWishlistToggle(productId);
  const navigate = useNavigate();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }

    await toggle();

    if (!isInWishlist) {
      toast.success('נוסף לרשימת המשאלות');
    } else {
      toast.info('הוסר מרשימת המשאלות');
    }
  };

  return (
    <button
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
            ? 'fill-red-500 text-red-500'
            : 'fill-transparent text-gray-500 hover:text-red-400',
        )}
        style={{ width: size, height: size }}
      />
    </button>
  );
}
