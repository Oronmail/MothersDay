import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, ArrowRight, GripVertical, X, Plus } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const collectionSchema = z.object({
  title: z.string().min(1, 'שדה חובה'),
  handle: z.string().min(1, 'שדה חובה'),
  description: z.string().optional().default(''),
  published: z.boolean().default(false),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

interface SelectedProduct {
  productId: string;
  title: string;
}

function toKebab(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^֐-׿a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// A single product row inside the collection: drag handle + position number + remove.
type SortableProductRowProps = {
  product: SelectedProduct;
  position: number;
  onRemove: () => void;
};

const SortableProductRow = ({ product, position, onRemove }: SortableProductRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.productId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center justify-between gap-2 p-2 rounded-md border bg-card ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground shrink-0"
          aria-label="גרור לסידור"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-muted-foreground tabular-nums w-6 text-center shrink-0">
          {position}
        </span>
        <span className="font-medium truncate">{product.title}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="הסר מהקולקציה"
        className="shrink-0"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>
  );
};

export const CollectionForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Products in the collection, kept in display/persist order.
  const [selectedItems, setSelectedItems] = useState<SelectedProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      title: '',
      handle: '',
      description: '',
      published: false,
    },
  });

  // Fetch all products for assignment
  const { data: allProducts } = useQuery({
    queryKey: ['admin', 'all-products-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch existing collection
  const { data: existingCollection, isLoading: loadingCollection } = useQuery({
    queryKey: ['admin', 'collection', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch products in collection (ordered)
  const { data: collectionProducts } = useQuery({
    queryKey: ['admin', 'collection-products', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_products')
        .select('product_id, position')
        .eq('collection_id', id!)
        .order('position');
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (existingCollection) {
      form.reset({
        title: existingCollection.title ?? '',
        handle: existingCollection.handle ?? '',
        description: existingCollection.description ?? '',
        published: existingCollection.is_published ?? false,
      });
    }
  }, [existingCollection, form]);

  // Build the ordered selected-products list once products + memberships are loaded.
  useEffect(() => {
    if (!allProducts) return;
    const titleMap = new Map<string, string>(allProducts.map((p) => [p.id, p.title]));

    if (isEdit) {
      if (!collectionProducts) return; // wait for memberships
      const ordered: SelectedProduct[] = [...collectionProducts]
        .filter((cp) => titleMap.has(cp.product_id))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((cp) => ({ productId: cp.product_id, title: titleMap.get(cp.product_id)! }));
      setSelectedItems(ordered);
    } else {
      setSelectedItems([]);
    }
  }, [allProducts, collectionProducts, isEdit]);

  // Auto-generate handle from title for new collections
  const watchTitle = form.watch('title');
  useEffect(() => {
    if (!isEdit && watchTitle) {
      form.setValue('handle', toKebab(watchTitle));
    }
  }, [watchTitle, isEdit, form]);

  const selectedIds = new Set(selectedItems.map((s) => s.productId));
  const availableProducts = (allProducts ?? [])
    .filter((p) => !selectedIds.has(p.id))
    .filter((p) => p.title?.toLowerCase().includes(productSearch.trim().toLowerCase()));

  const addProduct = (product: { id: string; title: string }) => {
    setSelectedItems((prev) =>
      prev.some((s) => s.productId === product.id)
        ? prev
        : [...prev, { productId: product.id, title: product.title }]
    );
  };

  const removeProduct = (productId: string) => {
    setSelectedItems((prev) => prev.filter((s) => s.productId !== productId));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSelectedItems((prev) => {
      const oldIndex = prev.findIndex((s) => s.productId === active.id);
      const newIndex = prev.findIndex((s) => s.productId === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: CollectionFormValues) => {
      const payload = {
        title: values.title,
        handle: values.handle,
        description: values.description || null,
        is_published: values.published,
      };

      let collectionId: string;

      if (isEdit) {
        const { error } = await supabase
          .from('collections')
          .update(payload)
          .eq('id', id!);
        if (error) throw error;
        collectionId = id!;
      } else {
        const { data, error } = await supabase
          .from('collections')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        collectionId = data.id;
      }

      // Replace product assignments, persisting the dragged order as position 0..N-1.
      await supabase.from('collection_products').delete().eq('collection_id', collectionId);

      if (selectedItems.length > 0) {
        const { error: insertError } = await supabase.from('collection_products').insert(
          selectedItems.map((p, i) => ({
            collection_id: collectionId,
            product_id: p.productId,
            position: i,
          }))
        );
        if (insertError) throw insertError;
      }

      return collectionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'collection-products', id] });
      toast.success(isEdit ? 'הקולקציה עודכנה בהצלחה' : 'הקולקציה נוצרה בהצלחה');
      navigate('/admin/collections');
    },
    onError: (err) => {
      toast.error(`שגיאה בשמירת הקולקציה: ${err.message}`);
    },
  });

  const onSubmit = (values: CollectionFormValues) => {
    saveMutation.mutate(values);
  };

  if (isEdit && loadingCollection) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="חזרה לרשימת הקולקציות"
          onClick={() => navigate('/admin/collections')}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? 'עריכת קולקציה' : 'קולקציה חדשה'}</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>פרטי קולקציה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">שם הקולקציה</Label>
              <Input id="title" {...form.register('title')} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Handle (כתובת URL)</Label>
              <Input id="handle" {...form.register('handle')} dir="ltr" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">תיאור</Label>
              <Textarea id="description" {...form.register('description')} rows={4} />
            </div>

            <div className="flex items-center gap-4">
              <Label htmlFor="published">פרסום</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={form.watch('published')}
                  onCheckedChange={(checked) => form.setValue('published', checked)}
                />
                <span className="text-sm">
                  {form.watch('published') ? 'מפורסם' : 'טיוטה'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>מוצרים בקולקציה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selected products — ordered, draggable */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                בקולקציה ({selectedItems.length}) — גרור כדי לשנות את הסדר
              </Label>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
                  עדיין אין מוצרים בקולקציה. הוסף מהרשימה למטה.
                </p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={selectedItems.map((s) => s.productId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedItems.map((product, index) => (
                        <SortableProductRow
                          key={product.productId}
                          product={product}
                          position={index + 1}
                          onRemove={() => removeProduct(product.productId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Available products — add to collection */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">הוסף מוצרים</Label>
              <Input
                placeholder="חיפוש מוצר..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {allProducts == null ? (
                  <p className="text-center text-muted-foreground py-4">טוען מוצרים...</p>
                ) : availableProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">אין מוצרים נוספים להוספה</p>
                ) : (
                  availableProducts.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded-md hover:bg-accent/50 text-right"
                    >
                      <span className="text-muted-foreground truncate">{p.title}</span>
                      <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            {isEdit ? 'עדכן קולקציה' : 'צור קולקציה'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/collections')}>
            ביטול
          </Button>
        </div>
      </form>
    </div>
  );
};
