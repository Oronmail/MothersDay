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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRight, Trash2, Upload } from 'lucide-react';

const productSchema = z.object({
  title: z.string().min(1, 'שדה חובה'),
  handle: z.string().min(1, 'שדה חובה'),
  description_html: z.string().optional().default(''),
  price: z.coerce.number().min(0, 'מחיר לא תקין'),
  compare_at_price: z.coerce.number().nullable().optional(),
  status: z.enum(['active', 'draft']),
  page_quantity: z.string().optional().nullable(),
  page_size: z.string().optional().nullable(),
  page_weight: z.string().optional().nullable(),
  color_pattern: z.string().optional().nullable(),
  paper_type: z.string().optional().nullable(),
  image_layout: z.string().optional().nullable(),
  tags: z.string().optional().default(''),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
});

type ProductFormValues = z.infer<typeof productSchema>;

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

function toKebab(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const ProductForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<Array<{ id: string; url: string; position: number }>>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      handle: '',
      description_html: '',
      price: 0,
      compare_at_price: null,
      status: 'draft',
      page_quantity: null,
      page_size: null,
      page_weight: null,
      color_pattern: null,
      paper_type: null,
      image_layout: null,
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
        .select('*, product_images(id, url, alt_text, position)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingProduct) {
      form.reset({
        title: existingProduct.title ?? '',
        handle: existingProduct.handle ?? '',
        description_html: existingProduct.description_html ?? '',
        price: existingProduct.price ?? 0,
        compare_at_price: existingProduct.compare_at_price ?? null,
        status: existingProduct.status ?? 'draft',
        page_quantity: existingProduct.page_quantity ?? null,
        page_size: existingProduct.page_size ?? null,
        page_weight: existingProduct.page_weight ?? null,
        color_pattern: existingProduct.color_pattern ?? null,
        paper_type: existingProduct.paper_type ?? null,
        image_layout: existingProduct.image_layout ?? null,
        tags: Array.isArray(existingProduct.tags) ? existingProduct.tags.join(', ') : '',
        seo_title: existingProduct.seo_title ?? null,
        seo_description: existingProduct.seo_description ?? null,
      });
      setImages(
        (existingProduct.product_images ?? [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((img: any) => ({ id: img.id, url: img.url, position: img.position }))
      );
    }
  }, [existingProduct, form]);

  // Auto-generate handle from title
  const watchTitle = form.watch('title');
  useEffect(() => {
    if (!isEdit && watchTitle) {
      form.setValue('handle', toKebab(watchTitle));
    }
  }, [watchTitle, isEdit, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const tagsArray = values.tags
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const payload = {
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

      if (isEdit) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', id!);
        if (error) throw error;
        return id!;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;

        // Persist temp images for new product
        const tempImages = images.filter(img => img.id.startsWith('temp-'));
        if (tempImages.length > 0) {
          const { error: imgError } = await supabase
            .from('product_images')
            .insert(tempImages.map(img => ({
              product_id: data.id,
              url: img.url,
              position: img.position,
            })));
          if (imgError) {
            console.error('Failed to persist images:', imgError);
            toast.error('המוצר נוצר אך חלק מהתמונות לא נשמרו');
          }
        }

        return data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
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
        // For new products, store temporarily with a placeholder id
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
        {/* Basic Info */}
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
              <Label htmlFor="description_html">תיאור (HTML)</Label>
              <Textarea id="description_html" {...form.register('description_html')} rows={5} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">מחיר (\u20AA)</Label>
                <Input id="price" type="number" step="0.01" {...form.register('price')} />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_at_price">מחיר השוואה (\u20AA)</Label>
                <Input
                  id="compare_at_price"
                  type="number"
                  step="0.01"
                  {...form.register('compare_at_price')}
                />
              </div>
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

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>תמונות</CardTitle>
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
          </CardContent>
        </Card>

        {/* Metafields */}
        <Card>
          <CardHeader>
            <CardTitle>מאפיינים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="page_quantity">כמות דפים</Label>
                <Input id="page_quantity" {...form.register('page_quantity')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page_size">גודל דף</Label>
                <Input id="page_size" {...form.register('page_size')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page_weight">משקל דף</Label>
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

        {/* Tags */}
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
