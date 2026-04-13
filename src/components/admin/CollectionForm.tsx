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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowRight } from 'lucide-react';

const collectionSchema = z.object({
  title: z.string().min(1, 'שדה חובה'),
  handle: z.string().min(1, 'שדה חובה'),
  description: z.string().optional().default(''),
  published: z.boolean().default(false),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

interface ProductAssignment {
  productId: string;
  title: string;
  selected: boolean;
  position: number;
}

function toKebab(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const CollectionForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [productAssignments, setProductAssignments] = useState<ProductAssignment[]>([]);

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

  // Fetch products in collection
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
        published: existingCollection.published ?? false,
      });
    }
  }, [existingCollection, form]);

  // Build product assignments list
  useEffect(() => {
    if (allProducts) {
      const cpMap = new Map<string, number>();
      (collectionProducts ?? []).forEach((cp: any, i: number) => {
        cpMap.set(cp.product_id, cp.position ?? i);
      });

      const assignments: ProductAssignment[] = allProducts.map((p: any) => ({
        productId: p.id,
        title: p.title,
        selected: cpMap.has(p.id),
        position: cpMap.get(p.id) ?? 999,
      }));

      // Sort selected ones first by position, then unselected alphabetically
      assignments.sort((a, b) => {
        if (a.selected && !b.selected) return -1;
        if (!a.selected && b.selected) return 1;
        if (a.selected && b.selected) return a.position - b.position;
        return 0;
      });

      setProductAssignments(assignments);
    }
  }, [allProducts, collectionProducts]);

  // Auto-generate handle
  const watchTitle = form.watch('title');
  useEffect(() => {
    if (!isEdit && watchTitle) {
      form.setValue('handle', toKebab(watchTitle));
    }
  }, [watchTitle, isEdit, form]);

  const toggleProduct = (productId: string) => {
    setProductAssignments((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, selected: !p.selected } : p
      )
    );
  };

  const updatePosition = (productId: string, position: number) => {
    setProductAssignments((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, position } : p
      )
    );
  };

  const saveMutation = useMutation({
    mutationFn: async (values: CollectionFormValues) => {
      const payload = {
        title: values.title,
        handle: values.handle,
        description: values.description || null,
        published: values.published,
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

      // Save product assignments
      await supabase.from('collection_products').delete().eq('collection_id', collectionId);

      const selectedProducts = productAssignments
        .filter((p) => p.selected)
        .sort((a, b) => a.position - b.position);

      if (selectedProducts.length > 0) {
        const { error: insertError } = await supabase.from('collection_products').insert(
          selectedProducts.map((p, i) => ({
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
      toast.success(isEdit ? 'הקולקציה עודכנה בהצלחה' : 'הקולקציה נוצרה בהצלחה');
      navigate('/admin/collections');
    },
    onError: (err: any) => {
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/collections')}>
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
          <CardContent>
            {productAssignments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">טוען מוצרים...</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {productAssignments.map((product) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={product.selected}
                        onCheckedChange={() => toggleProduct(product.productId)}
                      />
                      <span className={product.selected ? 'font-medium' : 'text-muted-foreground'}>
                        {product.title}
                      </span>
                    </div>
                    {product.selected && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">סדר:</Label>
                        <Input
                          type="number"
                          min={0}
                          value={product.position}
                          onChange={(e) =>
                            updatePosition(product.productId, parseInt(e.target.value) || 0)
                          }
                          className="w-16 h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
