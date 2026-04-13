import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: 'פעיל', variant: 'default' },
  draft: { label: 'טיוטה', variant: 'secondary' },
};

export const BundleList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: bundles, isLoading } = useQuery({
    queryKey: ['admin', 'bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, handle, title, price, status, is_bundle, product_images(id, url, position)')
        .eq('is_bundle', true)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete bundle items first
      await supabase.from('bundle_items').delete().eq('bundle_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bundles'] });
      toast.success('המארז נמחק בהצלחה');
      setDeleteId(null);
    },
    onError: () => {
      toast.error('שגיאה במחיקת המארז');
    },
  });

  const filtered = bundles?.filter((p: any) =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const getThumbnail = (product: any) => {
    const images = product.product_images ?? [];
    const sorted = [...images].sort((a: any, b: any) => a.position - b.position);
    return sorted[0]?.url ?? null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">מארזים</h1>
        <Button onClick={() => navigate('/admin/bundles/new')}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף מארז
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין מארזים</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">תמונה</TableHead>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">מחיר</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((bundle: any) => {
                  const thumb = getThumbnail(bundle);
                  const statusConfig = STATUS_MAP[bundle.status] ?? STATUS_MAP.draft;
                  return (
                    <TableRow key={bundle.id}>
                      <TableCell>
                        {thumb ? (
                          <img src={thumb} alt={bundle.title} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            ---
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{bundle.title}</TableCell>
                      <TableCell>{bundle.price != null ? `${bundle.price} \u20AA` : '---'}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/bundles/${bundle.id}`)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(bundle.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מארז</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המארז? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
