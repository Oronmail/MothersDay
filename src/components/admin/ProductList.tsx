import { useState, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Search, Loader2, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: 'פעיל', variant: 'default' },
  draft: { label: 'טיוטה', variant: 'secondary' },
};

const getThumbnail = (product: any) => {
  const images = product.product_images ?? [];
  const sorted = [...images].sort((a: any, b: any) => a.position - b.position);
  return sorted[0]?.url ?? null;
};

type ProductRowProps = {
  product: any;
  position: number;
  draggable: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

const ProductRow = ({ product, position, draggable, onEdit, onDelete }: ProductRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
    disabled: !draggable,
  });

  const thumb = getThumbnail(product);
  const statusConfig = STATUS_MAP[product.status] ?? STATUS_MAP.draft;

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-50 bg-muted' : ''}
    >
      <TableCell className="w-16">
        <div className="flex items-center gap-1">
          {draggable && (
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
              aria-label="גרור לסידור"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <span className="text-sm font-medium text-muted-foreground tabular-nums">{position}</span>
        </div>
      </TableCell>
      <TableCell>
        {thumb ? (
          <img src={thumb} alt={product.title} className="w-12 h-12 object-cover rounded" />
        ) : (
          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
            ---
          </div>
        )}
      </TableCell>
      <TableCell className="font-medium">{product.title}</TableCell>
      <TableCell>{product.price != null ? `${product.price} ₪` : '---'}</TableCell>
      <TableCell>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const ProductList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, handle, title, price, status, is_bundle, product_images(id, url, position)')
        .eq('is_bundle', false)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Keep local order state in sync with fetched data
  useEffect(() => {
    if (products) setItems(products);
  }, [products]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success('המוצר נמחק בהצלחה');
      setDeleteId(null);
    },
    onError: () => {
      toast.error('שגיאה במחיקת המוצר');
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isSearching = search.trim().length > 0;
  const filtered = isSearching
    ? items.filter((p: any) => p.title?.toLowerCase().includes(search.toLowerCase()))
    : items;

  const persistOrder = async (ordered: any[], from: number, to: number) => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const updates = [];
    for (let i = lo; i <= hi; i++) {
      updates.push(supabase.from('products').update({ sort_order: i }).eq('id', ordered[i].id));
    }
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed) {
      toast.error('שגיאה בשמירת הסדר');
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    } else {
      toast.success('הסדר נשמר');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((p) => p.id === active.id);
    const newIndex = items.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered); // optimistic
    persistOrder(reordered, oldIndex, newIndex);
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
        <h1 className="text-2xl font-bold">מוצרים</h1>
        <Button onClick={() => navigate('/admin/products/new')}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף מוצר
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
          {isSearching && (
            <p className="text-xs text-muted-foreground mt-2">
              גרירה לסידור זמינה כשתיבת החיפוש ריקה.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין מוצרים</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-16">#</TableHead>
                    <TableHead className="text-right">תמונה</TableHead>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">מחיר</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={filtered.map((p: any) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filtered.map((product: any, index: number) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        position={index + 1}
                        draggable={!isSearching}
                        onEdit={() => navigate(`/admin/products/${product.id}`)}
                        onDelete={() => setDeleteId(product.id)}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מוצר</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המוצר? פעולה זו לא ניתנת לביטול.
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
