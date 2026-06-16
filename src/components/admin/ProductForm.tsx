import { useEffect, useRef, useState } from 'react';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRight, Trash2, Upload, Plus } from 'lucide-react';

const productSchema = z.object({
  title: z.string().min(1, 'שדה חובה'),
  handle: z.string().min(1, 'שדה חובה'),
  description_html: z.string().optional().default(''),
  price: z.coerce.number().min(0, 'מחיר לא תקין'),
  compare_at_price: z.coerce.number().nullable().optional(),
  status: z.enum(['active', 'draft']),
  // מכירות
  sku: z.string().optional().nullable(),
  inventory_quantity: z.string().optional().nullable(),
  // מאפיינים
  page_quantity: z.string().optional().nullable(),
  page_size: z.string().optional().nullable(),
  page_weight: z.string().optional().nullable(),
  color_pattern: z.string().optional().nullable(),
  paper_type: z.string().optional().nullable(),
  image_layout: z.string().optional().nullable(),
  // משלוח
  weight_grams: z.string().optional().nullable(),
  package_length_cm: z.string().optional().nullable(),
  package_width_cm: z.string().optional().nullable(),
  package_height_cm: z.string().optional().nullable(),
  // מדיה
  video_url: z.string().optional().nullable(),
  // אחר
  tags: z.string().optional().default(''),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface VariantRow {
  id: string; // real uuid, or `new-<n>` for unsaved rows
  title: string;
  price: string;
  compare_at_price: string;
  sku: string;
  available_for_sale: boolean;
}

const IMAGE_LAYOUTS = [
  { value: 'grid-2x2', label: '2x2 רגיל' },
  { value: 'grid-2-large-2-small', label: '2 גדולות + 2 קטנות' },
  { value: 'grid-hero-bottom', label: 'ראשי + 2 למטה' },
  { value: 'grid-3x1', label: '3 בשורה' },
  { value: 'grid-1-2-1', label: '1-2-1 (אנכי)' },
  { value: 'grid-2-1-3-2', label: '2-1-3-2 (8 תמונות)' },
  { value: 'grid-2-2-4', label: '2-2-4 (8 תמונות)' },
  { value: 'grid-2-left-1-right', label: '2 שמאל + 1 ימין' },
  { value: 'grid-1-2-right', label: '1 שמאל + 2 ימין' },
  { value: 'grid-2-stacked', label: '2 זה מעל זה' },
  { value: 'grid-2-left-carousel-right', label: '2 שמאל + קרוסלה ימין' },
  { value: 'grid-custom', label: 'מותאם אישית' },
];

/**
 * Convert a (possibly legacy HTML) description into plain text for editing.
 * Descriptions are now plain text, but existing products may still hold `<p>…</p>`
 * markup — this strips it so the admin only ever shows/edits the text itself.
 */
function htmlToText(input: string): string {
  if (!input) return '';
  // No tags? Already plain text — return as-is.
  if (!/<[a-z][\s\S]*>/i.test(input)) return input;
  const text = input
    .replace(/>\s+</g, '><') // drop formatting whitespace between tags (avoids double blank lines)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/ /g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
  const lines = text.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim());
  const collapsed: string[] = [];
  for (const line of lines) {
    if (line === '' && (collapsed.length === 0 || collapsed[collapsed.length - 1] === '')) continue;
    collapsed.push(line);
  }
  while (collapsed.length && collapsed[collapsed.length - 1] === '') collapsed.pop();
  return collapsed.join('\n');
}

function toKebab(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^֐-׿a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Convert an optional numeric text field to number | null for the DB.
const numOrNull = (v?: string | null) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// PostgREST signals an unknown column (i.e. the migration isn't applied yet)
// with PGRST204 / 42703 / a "could not find … column" message.
const isMissingColumnError = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST204' || e.code === '42703' || /could not find|column/i.test(e.message || ''));

export const ProductForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<Array<{ id: string; url: string; position: number }>>([]);
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const newVariantCounter = useRef(0);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      handle: '',
      description_html: '',
      price: 0,
      compare_at_price: null,
      status: 'draft',
      sku: null,
      inventory_quantity: null,
      page_quantity: null,
      page_size: null,
      page_weight: null,
      color_pattern: null,
      paper_type: null,
      image_layout: null,
      weight_grams: null,
      package_length_cm: null,
      package_width_cm: null,
      package_height_cm: null,
      video_url: null,
      tags: '',
      seo_title: null,
      seo_description: null,
    },
  });

  const { data: existingProduct, isLoading: loadingProduct } = useQuery({
    queryKey: ['admin', 'product', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(id, url, alt_text, position), product_variants(id, title, price, compare_at_price, available_for_sale, sku, sort_order)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // All collections, for the assignment checklist.
  const { data: allCollections } = useQuery({
    queryKey: ['admin', 'collections-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('id, title')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Which collections this product currently belongs to.
  const { data: productCollectionIds } = useQuery({
    queryKey: ['admin', 'product-collections', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_products')
        .select('collection_id')
        .eq('product_id', id!);
      if (error) throw error;
      return (data ?? []).map((r) => r.collection_id as string);
    },
  });

  useEffect(() => {
    if (existingProduct) {
      const ep = existingProduct as Record<string, any>;
      form.reset({
        title: ep.title ?? '',
        handle: ep.handle ?? '',
        description_html: htmlToText(ep.description_html ?? ''),
        price: ep.price ?? 0,
        compare_at_price: ep.compare_at_price ?? null,
        status: ep.status ?? 'draft',
        sku: ep.sku ?? null,
        inventory_quantity: ep.inventory_quantity != null ? String(ep.inventory_quantity) : null,
        page_quantity: ep.page_quantity ?? null,
        page_size: ep.page_size ?? null,
        page_weight: ep.page_weight ?? null,
        color_pattern: ep.color_pattern ?? null,
        paper_type: ep.paper_type ?? null,
        image_layout: ep.image_layout ?? null,
        weight_grams: ep.weight_grams != null ? String(ep.weight_grams) : null,
        package_length_cm: ep.package_length_cm != null ? String(ep.package_length_cm) : null,
        package_width_cm: ep.package_width_cm != null ? String(ep.package_width_cm) : null,
        package_height_cm: ep.package_height_cm != null ? String(ep.package_height_cm) : null,
        video_url: ep.video_url ?? null,
        tags: Array.isArray(ep.tags) ? ep.tags.join(', ') : '',
        seo_title: ep.seo_title ?? null,
        seo_description: ep.seo_description ?? null,
      });
      setImages(
        (ep.product_images ?? [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((img: any) => ({ id: img.id, url: img.url, position: img.position }))
      );
      setVariants(
        (ep.product_variants ?? [])
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((v: any) => ({
            id: v.id,
            title: v.title ?? '',
            price: v.price != null ? String(v.price) : '',
            compare_at_price: v.compare_at_price != null ? String(v.compare_at_price) : '',
            sku: v.sku ?? '',
            available_for_sale: v.available_for_sale ?? true,
          }))
      );
    }
  }, [existingProduct, form]);

  useEffect(() => {
    if (productCollectionIds) setCollectionIds(productCollectionIds);
  }, [productCollectionIds]);

  // Auto-generate handle from title (new products only)
  const watchTitle = form.watch('title');
  useEffect(() => {
    if (!isEdit && watchTitle) {
      form.setValue('handle', toKebab(watchTitle));
    }
  }, [watchTitle, isEdit, form]);

  // ---- variant editor helpers ----
  const addVariant = () => {
    newVariantCounter.current += 1;
    setVariants((prev) => [
      ...prev,
      { id: `new-${newVariantCounter.current}`, title: '', price: '', compare_at_price: '', sku: '', available_for_sale: true },
    ]);
  };
  const updateVariant = (rowId: string, patch: Partial<VariantRow>) =>
    setVariants((prev) => prev.map((v) => (v.id === rowId ? { ...v, ...patch } : v)));
  const removeVariant = (rowId: string) =>
    setVariants((prev) => prev.filter((v) => v.id !== rowId));

  const toggleCollection = (cid: string, checked: boolean) =>
    setCollectionIds((prev) => (checked ? [...new Set([...prev, cid])] : prev.filter((c) => c !== cid)));

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const tagsArray = values.tags
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      // Columns that have always existed.
      const corePayload = {
        title: values.title,
        handle: values.handle,
        description_html: values.description_html || '',
        price: values.price,
        compare_at_price: values.compare_at_price || null,
        status: values.status,
        is_bundle: false,
        page_quantity: values.page_quantity || null,
        page_size: values.page_size || null,
        page_weight: values.page_weight || null,
        color_pattern: values.color_pattern || null,
        paper_type: values.paper_type || null,
        image_layout: values.image_layout || null,
        tags: tagsArray,
        seo_title: values.seo_title || null,
        seo_description: values.seo_description || null,
      };

      // Columns added by the 20260611170000 migration. Saved best-effort so the
      // form keeps working even before that migration is applied to the DB.
      const newPayload = {
        sku: values.sku || null,
        inventory_quantity: numOrNull(values.inventory_quantity),
        weight_grams: numOrNull(values.weight_grams),
        package_length_cm: numOrNull(values.package_length_cm),
        package_width_cm: numOrNull(values.package_width_cm),
        package_height_cm: numOrNull(values.package_height_cm),
        video_url: values.video_url || null,
      };

      let productId = id;

      if (isEdit) {
        let { error } = await supabase
          .from('products')
          .update({ ...corePayload, ...newPayload })
          .eq('id', id!);
        if (isMissingColumnError(error)) {
          toast.info('שדות חדשים (מלאי/משקל/מידות/וידאו/מק"ט) יישמרו לאחר עדכון מסד הנתונים');
          ({ error } = await supabase.from('products').update(corePayload).eq('id', id!));
        }
        if (error) throw error;
      } else {
        let res = await supabase
          .from('products')
          .insert({ ...corePayload, ...newPayload })
          .select('id')
          .single();
        if (isMissingColumnError(res.error)) {
          toast.info('שדות חדשים (מלאי/משקל/מידות/וידאו/מק"ט) יישמרו לאחר עדכון מסד הנתונים');
          res = await supabase.from('products').insert(corePayload).select('id').single();
        }
        if (res.error) throw res.error;
        productId = res.data!.id;

        // Persist temp images for the new product.
        const tempImages = images.filter((img) => img.id.startsWith('temp-'));
        if (tempImages.length > 0) {
          const { error: imgError } = await supabase
            .from('product_images')
            .insert(tempImages.map((img) => ({ product_id: productId, url: img.url, position: img.position })));
          if (imgError) {
            console.error('Failed to persist images:', imgError);
            toast.error('המוצר נוצר אך חלק מהתמונות לא נשמרו');
          }
        }
      }

      // ---- sync variants ----
      const origVariantIds = ((existingProduct as any)?.product_variants ?? []).map((v: any) => v.id);
      const keptIds = variants.filter((v) => !v.id.startsWith('new-')).map((v) => v.id);
      const toDelete = origVariantIds.filter((vid: string) => !keptIds.includes(vid));
      if (toDelete.length) {
        const { error } = await supabase.from('product_variants').delete().in('id', toDelete);
        if (error) throw error;
      }
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const row = {
          product_id: productId,
          title: v.title.trim() || 'ברירת מחדל',
          price: Number(v.price) || 0,
          compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
          sku: v.sku.trim() || null,
          available_for_sale: v.available_for_sale,
          sort_order: i,
        };
        if (v.id.startsWith('new-')) {
          const { error } = await supabase.from('product_variants').insert(row);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('product_variants').update(row).eq('id', v.id);
          if (error) throw error;
        }
      }

      // ---- sync collection membership ----
      const origCollections = productCollectionIds ?? [];
      const toAdd = collectionIds.filter((c) => !origCollections.includes(c));
      const toRemove = origCollections.filter((c) => !collectionIds.includes(c));
      if (toRemove.length) {
        const { error } = await supabase
          .from('collection_products')
          .delete()
          .eq('product_id', productId!)
          .in('collection_id', toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase
          .from('collection_products')
          .insert(toAdd.map((cid) => ({ product_id: productId, collection_id: cid, position: 999 })));
        if (error) throw error;
      }

      return productId!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product-collections', id] });
      toast.success(isEdit ? 'המוצר עודכן בהצלחה' : 'המוצר נוצר בהצלחה');
      navigate('/admin/products');
    },
    onError: (err: any) => {
      toast.error(`שגיאה בשמירת המוצר: ${err.message}`);
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const productId = id ?? 'new';
    const ext = file.name.split('.').pop();
    const path = `${productId}/${Date.now()}.${ext}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);

      if (isEdit && id) {
        const newPosition = images.length;
        const { data: imgData, error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: id,
            url: urlData.publicUrl,
            position: newPosition,
          })
          .select('id, url, position')
          .single();
        if (insertError) throw insertError;
        setImages((prev) => [...prev, imgData]);
      } else {
        setImages((prev) => [
          ...prev,
          { id: `temp-${Date.now()}`, url: urlData.publicUrl, position: prev.length },
        ]);
      }
      toast.success('התמונה הועלתה בהצלחה');
    } catch (err: any) {
      toast.error(`שגיאה בהעלאת תמונה: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (imageId.startsWith('temp-')) {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      return;
    }
    try {
      const { error } = await supabase.from('product_images').delete().eq('id', imageId);
      if (error) throw error;
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('התמונה נמחקה');
    } catch {
      toast.error('שגיאה במחיקת התמונה');
    }
  };

  const onSubmit = (values: ProductFormValues) => {
    saveMutation.mutate(values);
  };

  if (isEdit && loadingProduct) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/products')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? 'עריכת מוצר' : 'מוצר חדש'}</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* פרטים בסיסיים */}
        <Card>
          <CardHeader>
            <CardTitle>פרטים בסיסיים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">שם המוצר</Label>
              <Input id="title" {...form.register('title')} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Handle (כתובת URL)</Label>
              <Input id="handle" {...form.register('handle')} dir="ltr" />
              {form.formState.errors.handle && (
                <p className="text-sm text-destructive">{form.formState.errors.handle.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_html">תיאור</Label>
              <Textarea
                id="description_html"
                {...form.register('description_html')}
                rows={8}
                dir="rtl"
                placeholder="כתבי טקסט חופשי. כל שורה חדשה תוצג כשורה נפרדת בדף המוצר."
              />
              <p className="text-xs text-muted-foreground">טקסט רגיל בלבד — אין צורך בתגיות HTML.</p>
            </div>

            <div className="flex items-center gap-4">
              <Label htmlFor="status">סטטוס</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="status"
                  checked={form.watch('status') === 'active'}
                  onCheckedChange={(checked) =>
                    form.setValue('status', checked ? 'active' : 'draft')
                  }
                />
                <span className="text-sm">
                  {form.watch('status') === 'active' ? 'פעיל' : 'טיוטה'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* מכירות */}
        <Card>
          <CardHeader>
            <CardTitle>מכירות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">מחיר (₪)</Label>
                <Input id="price" type="number" step="0.01" {...form.register('price')} />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_at_price">מחיר השוואה (₪)</Label>
                <Input id="compare_at_price" type="number" step="0.01" {...form.register('compare_at_price')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">מק"ט</Label>
                <Input id="sku" {...form.register('sku')} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory_quantity">מלאי (כמות במלאי)</Label>
                <Input id="inventory_quantity" type="number" step="1" {...form.register('inventory_quantity')} placeholder="ריק = לא נמדד" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* וריאנטים */}
        <Card>
          <CardHeader>
            <CardTitle>וריאנטים (אפשרויות מוצר)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.length === 0 && (
              <p className="text-sm text-muted-foreground">
                אין וריאנטים. למוצר עם אפשרות אחת אין צורך — הוסיפי וריאנטים רק כשיש בחירה (למשל "כולל מסגרת / ריפיל").
              </p>
            )}
            {variants.map((v, i) => (
              <div key={v.id} className="border border-border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">וריאנט {i + 1}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeVariant(v.id)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">שם הוריאנט</Label>
                    <Input value={v.title} onChange={(e) => updateVariant(v.id, { title: e.target.value })} placeholder="למשל: כולל מסגרת עץ" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">מחיר (₪)</Label>
                    <Input type="number" step="0.01" value={v.price} onChange={(e) => updateVariant(v.id, { price: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">מחיר השוואה (₪)</Label>
                    <Input type="number" step="0.01" value={v.compare_at_price} onChange={(e) => updateVariant(v.id, { compare_at_price: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">מק"ט</Label>
                    <Input dir="ltr" value={v.sku} onChange={(e) => updateVariant(v.id, { sku: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={v.available_for_sale} onCheckedChange={(c) => updateVariant(v.id, { available_for_sale: c })} />
                    <span className="text-sm">{v.available_for_sale ? 'זמין למכירה' : 'לא זמין'}</span>
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף וריאנט
            </Button>
          </CardContent>
        </Card>

        {/* מאפיינים */}
        <Card>
          <CardHeader>
            <CardTitle>מאפיינים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="page_size">גודל דף</Label>
                <Input id="page_size" {...form.register('page_size')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page_quantity">כמות דפים</Label>
                <Input id="page_quantity" {...form.register('page_quantity')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page_weight">עובי דף</Label>
                <Input id="page_weight" {...form.register('page_weight')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color_pattern">דוגמת צבע</Label>
                <Input id="color_pattern" {...form.register('color_pattern')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paper_type">סוג נייר</Label>
                <Input id="paper_type" {...form.register('paper_type')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_layout">פריסת תמונות</Label>
                <Select
                  value={form.watch('image_layout') ?? ''}
                  onValueChange={(val) => form.setValue('image_layout', val || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פריסה" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_LAYOUTS.map((layout) => (
                      <SelectItem key={layout.value} value={layout.value}>
                        {layout.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* משלוח */}
        <Card>
          <CardHeader>
            <CardTitle>משלוח</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight_grams">משקל (גרם)</Label>
              <Input id="weight_grams" type="number" step="1" {...form.register('weight_grams')} />
            </div>
            <div className="space-y-2">
              <Label>מידות אריזה (ס"מ)</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input type="number" step="0.1" {...form.register('package_length_cm')} placeholder="אורך" />
                <Input type="number" step="0.1" {...form.register('package_width_cm')} placeholder="רוחב" />
                <Input type="number" step="0.1" {...form.register('package_height_cm')} placeholder="גובה" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">שדות אלה נשמרים לאחר עדכון מסד הנתונים (מיגרציה).</p>
          </CardContent>
        </Card>

        {/* מדיה */}
        <Card>
          <CardHeader>
            <CardTitle>מדיה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {images.map((img, i) => (
                <div key={img.id} className="relative group">
                  <img src={img.url} alt={`תמונה ${i + 1}`} className="w-full h-32 object-cover rounded" />
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    {i + 1}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteImage(img.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 ml-2" />
                )}
                העלה תמונה
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video_url">וידאו מוצר (קישור)</Label>
              <Input id="video_url" {...form.register('video_url')} dir="ltr" placeholder="https://…" />
            </div>
          </CardContent>
        </Card>

        {/* קולקציות */}
        <Card>
          <CardHeader>
            <CardTitle>קולקציות</CardTitle>
          </CardHeader>
          <CardContent>
            {(allCollections ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">אין קולקציות.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(allCollections ?? []).map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={collectionIds.includes(c.id)}
                      onCheckedChange={(checked) => toggleCollection(c.id, !!checked)}
                    />
                    <span className="text-sm">{c.title}</span>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* תגיות */}
        <Card>
          <CardHeader>
            <CardTitle>תגיות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="tags">תגיות (מופרדות בפסיק)</Label>
              <Input id="tags" {...form.register('tags')} placeholder="תגית1, תגית2, תגית3" />
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seo_title">כותרת SEO</Label>
              <Input id="seo_title" {...form.register('seo_title')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo_description">תיאור SEO</Label>
              <Textarea id="seo_description" {...form.register('seo_description')} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            {isEdit ? 'עדכן מוצר' : 'צור מוצר'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>
            ביטול
          </Button>
        </div>
      </form>
    </div>
  );
};
