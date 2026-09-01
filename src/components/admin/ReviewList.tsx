import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Trash2, ExternalLink, Heart } from 'lucide-react';
import { AdminErrorState } from './AdminErrorState';

// מודרציה של חוות דעת מהאתר: כל שליחה נשמרת כ"ממתינה" ומוצגת בעמוד המוצר
// רק אחרי אישור כאן. דחייה משאירה את החוות דעת בארכיון; מחיקה היא לצמיתות.

// PGRST205 / 42P01 — טבלת reviews עדיין לא קיימת (המיגרציה לא הורצה בפרודקשן)
const TABLE_MISSING_CODES = new Set(['PGRST205', '42P01']);

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface AdminReview {
  id: string;
  product_handle: string;
  product_title: string | null;
  rating: number;
  body: string;
  name: string;
  kids_count: string | null;
  kids_ages: string | null;
  status: ReviewStatus;
  created_at: string;
}

const STATUS_BADGE: Record<ReviewStatus, { label: string; variant: 'outline' | 'default' | 'secondary' }> = {
  pending: { label: 'ממתינה', variant: 'outline' },
  approved: { label: 'מאושרת', variant: 'default' },
  rejected: { label: 'נדחתה', variant: 'secondary' },
};

const FILTERS: Array<{ value: ReviewStatus | 'all'; label: string }> = [
  { value: 'pending', label: 'ממתינות' },
  { value: 'approved', label: 'מאושרות' },
  { value: 'rejected', label: 'נדחו' },
  { value: 'all', label: 'הכל' },
];

const Hearts = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} מתוך 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Heart
        key={i}
        className={`h-4 w-4 ${i <= rating ? 'fill-current text-[#4d3c40]' : 'text-muted-foreground/30'}`}
      />
    ))}
  </div>
);

export const ReviewList = () => {
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('pending');
  const queryClient = useQueryClient();

  // null = הטבלה חסרה (המיגרציה עוד לא הורצה)
  const { data: reviews, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: async (): Promise<AdminReview[] | null> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, product_handle, product_title, rating, body, name, kids_count, kids_ages, status, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        if (TABLE_MISSING_CODES.has(error.code)) return null;
        throw error;
      }
      return data ?? [];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
  };

  const setStatus = async (review: AdminReview, status: ReviewStatus) => {
    const { error } = await supabase
      .from('reviews')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', review.id);
    if (error) {
      toast.error('העדכון נכשל, נסי שוב');
      return;
    }
    toast.success(status === 'approved' ? 'חוות הדעת אושרה ותוצג בעמוד המוצר' : 'חוות הדעת נדחתה');
    refresh();
  };

  const remove = async (review: AdminReview) => {
    if (!window.confirm('למחוק את חוות הדעת לצמיתות?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', review.id);
    if (error) {
      toast.error('המחיקה נכשלה, נסי שוב');
      return;
    }
    toast.success('חוות הדעת נמחקה');
    refresh();
  };

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">חוות דעת</h1>
        <AdminErrorState
          error={error}
          onRetry={() => refetch()}
          title="לא הצלחנו לטעון את חוות הדעת"
        />
      </div>
    );
  }

  if (isLoading || reviews === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // המיגרציה עוד לא הורצה בסופאבייס
  if (reviews === null) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">חוות דעת</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">טבלת חוות הדעת עדיין לא קיימת בסופאבייס.</p>
            <p className="text-sm">
              יש להריץ את המיגרציה
              {' '}<code dir="ltr">supabase/migrations/20260818130000_reviews.sql</code>{' '}
              ב-SQL Editor של Supabase, ואז לרענן את העמוד.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const counts = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    rejected: reviews.filter((r) => r.status === 'rejected').length,
  };
  const filtered = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">חוות דעת</h1>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => setFilter(value)}
          >
            {label} ({counts[value]})
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {filter === 'pending' ? 'אין חוות דעת שממתינות לאישור' : 'אין חוות דעת להצגה'}
          </CardContent>
        </Card>
      ) : (
        filtered.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_BADGE[review.status].variant}>
                    {STATUS_BADGE[review.status].label}
                  </Badge>
                  <a
                    href={`/product/${review.product_handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm font-medium hover:underline"
                  >
                    {review.product_title || review.product_handle}
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Hearts rating={review.rating} />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(review.created_at), 'dd/MM/yy HH:mm', { locale: he })}
                  </span>
                </div>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-line">{review.body}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{review.name}</span>
                  {review.kids_count && <span> · אמא ל-{review.kids_count} ילדים</span>}
                  {review.kids_ages && <span> · גילאי {review.kids_ages}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {review.status !== 'approved' && (
                    <Button size="sm" onClick={() => setStatus(review, 'approved')}>
                      <Check className="h-4 w-4 ml-1" />
                      אישור
                    </Button>
                  )}
                  {review.status !== 'rejected' && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(review, 'rejected')}>
                      <X className="h-4 w-4 ml-1" />
                      דחייה
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(review)}>
                    <Trash2 className="h-4 w-4 ml-1" />
                    מחיקה
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
