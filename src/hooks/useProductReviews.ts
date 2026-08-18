import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// PGRST205 = PostgREST "table not in schema cache", 42P01 = Postgres
// undefined_table — the reviews migration (20260818130000_reviews.sql) hasn't
// been applied yet. The site degrades to the curated static reviews only.
const TABLE_MISSING_CODES = new Set(['PGRST205', '42P01']);

export interface SiteReview {
  id: string;
  rating: number;
  body: string;
  name: string;
  kids_count: string | null;
  kids_ages: string | null;
  created_at: string;
}

/**
 * Approved reviews of a product, newest first. Returns [] while loading,
 * when there are none, or when the reviews table doesn't exist yet.
 */
export function useApprovedReviews(handle: string | undefined): SiteReview[] {
  const { data } = useQuery({
    queryKey: ['reviews', handle],
    enabled: !!handle,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SiteReview[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, body, name, kids_count, kids_ages, created_at')
        .eq('product_handle', handle!)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) {
        if (TABLE_MISSING_CODES.has(error.code)) return [];
        throw error;
      }
      return data ?? [];
    },
  });
  return data ?? [];
}

export interface ReviewSubmission {
  productId?: string;
  productHandle: string;
  productTitle?: string;
  rating: number;
  body: string;
  name: string;
  kidsCount: string;
  kidsAges: string;
  userId?: string | null;
}

/**
 * Saves a review as 'pending'. RLS allows the public INSERT but pins
 * status='pending', so nothing shows on the site before moderation
 * in /admin/reviews. Throws on failure (e.g. table not migrated yet).
 */
export async function submitReview(review: ReviewSubmission): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    product_id: review.productId ?? null,
    product_handle: review.productHandle,
    product_title: review.productTitle ?? null,
    rating: review.rating,
    body: review.body.trim(),
    name: review.name.trim(),
    kids_count: review.kidsCount.trim() || null,
    kids_ages: review.kidsAges.trim() || null,
    user_id: review.userId ?? null,
    status: 'pending',
  });
  if (error) throw error;
}
