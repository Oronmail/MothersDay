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
import { Loader2, ArrowRight, Trash2, Upload, Plus, X } from 'lucide-react';

const bundleSchema = z.object({
  title: z.string().min(1, 'שדה חובה'),
  handle: z.string().min(1, 'שדה חובה'),
  description_html: z.string().optional().default(''),
  price: z.coerce.number().min(0, 'מחיר לא תקין'),
  compare_at_price: z.coerce.number().nullable().optional(),
  status: z.enum(['active', 'draft']),
  tags: z.string().optional().default(''),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  image_layout: z.string().optional().nullable(),
});

type BundleFormValues = z.infer<typeof bundleSchema>;

interface BundleItemEntry {
  productId: string;
  productTitle: string;
  productPrice: number;
  quantity: number;
}

const IMAGE_LAYOUTS = [
  { value: 'grid-2x2', label: 'Grid 2x2' },
  { value: 'grid-2-left-1-right', label: 'Grid 2 Left 1 Right' },
  { value: 'grid-1-left-2-right', label: 'Grid 1 Left 2 Right' },
  { value: 'grid-3x1', label: 'Grid 3x1' },
  { value: 'single', label: 'Single' },
  { value: 'carousel', label: 'Carousel' },
];

function toKebab(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);

export const BundleForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<Array<{ id: string; url: string; position: number }>>([]);
  const [uploading, setUploading] = useState(false);
  const [bundleItems, setBundleItems] = useState<BundleItemEntry[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const form = useForm<BundleFormValues>({
    resolver: zodResolver(bundleSchema),
    defaultValues: {
      title: '',
      handle: '',
      description_html: '',
      price: 0,
      compare_at_price: null,
      status: 'draft',
      tags: '',
      seo_title: null,
      seo_description: null,
      image_layout: null,
    },
  });

  // Fetch available non-bundle products
  const { data: availableProducts } = useQuery({
    queryKey: ['admin', 'products-for-bundle'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price')
        .eq('is_bundle', false)
        .eq('status', 'active')
        .order('title');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch existing bundle data
  const { data: existingBundle, isLoading: loadingBundle } = useQuery({
    queryKey: ['admin', 'bundle', id],
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

  // Fetch existing bundle items
  const { data: existingBundleItems } = useQuery({
    queryKey: ['admin', 'bundle-items', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bundle_items')
        .select('product_id, quantity, position')
        .eq('bundle_id', id!)
        .order('position');
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (existingBundle) {
      form.reset({
        title: existingBundle.title ?? '',
        handle: existingBundle.handle ?? '',
        description_html: existingBundle.description_html ?? '',
        price: existingBundle.price ?? 0,
        compare_at_price: existingBundle.compare_at_price ?? null,
        status: existingBundle.status ?? 'draft',
        tags: Array.isArray(existingBundle.tags) ? existingBundle.tags.join(', ') : '',
        seo_title: existingBundle.seo_title ?? null,
        seo_description: existingBundle.seo_description ?? null,
        image_layout: existingBundle.image_layout ?? null,
      });
      setImages(
        (existingBundle.product_images ?? [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((img: any) => ({ id: img.id, url: img.url, position: img.position }))
      );
    }
  }, [existingBundle, form]);

  // Populate bundle items once both lists are loaded
  useEffect(() => {
    if (existingBundleItems && availableProducts && bundleItems.length === 0 && existingBundleItems.length > 0) {
      const items: BundleItemEntry[] = existingBundleItems.map((bi: any) => {
        const product = availableProducts.find((p: any) => p.id === bi.product_id);
        return {
          productId: bi.product_id,
          productTitle: product?.title ?? 'מוצר לא נמצא',
          productPrice: product?.price ?? 0,
          quantity: bi.quantity,
        };
      });
      setBundleItems(items);
    }
  }, [existingBundleItems, availableProducts, bundleItems.length]);

  // Auto-generate handle from title
  const watchTitle = form.watch('title');
  useEffect(() => {
    if (!isEdit && watchTitle) {
      form.setValue('handle', toKebab(watchTitle));
    }
  }, [watchTitle, isEdit, form]);

  const addBundleItem = () => {
    if (!selectedProductId) return;
    if (bundleItems.some((item) => item.productId === selectedProductId)) {
      toast.error('מוצר זה כבר נמצא במארז');
      return;
    }
    const product = availableProducts?.find((p: any) => p.id === selectedProductId);
    if (!product) return;
    setBundleItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productTitle: product.title,
        productPrice: product.price ?? 0,
        quantity: 1,
      },
    ]);
    setSelectedProductId('');
  };

  const removeBundleItem = (productId: string) => {
    setBundleItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateBundleItemQuantity = (productId: string, quantity: number) => {
    setBundleItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const totalItemsValue = bundleItems.reduce(
    (sum, item) => sum + item.productPrice * item.quantity,
    0
  );

  const saveMutation = useMutation({
    mutationFn: async (values: BundleFormValues) => {
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
        is_bundle: true,
        tags: tagsArray,
        seo_title: values.seo_title || null,
        seo_description: values.seo_description || null,
        image_layout: values.image_layout || null,
      };

      let bundleId: string;

      if (isEdit) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', id!);
        if (error) throw error;
        bundleId = id!;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        bundleId = data.id;
      }

      // Save bundle items
      await supabase.from('bundle_items').delete().eq('bundle_id', bundleId);
      if (bundleItems.length > 0) {
        const { error: itemsError } = await supabase.from('bundle_items').insert(
          bundleItems.map((item, i) => ({
            bundle_id: bundleId,
            product_id: item.productId,
            quantity: item.quantity,
            position: i,
          }))
        );
        if (itemsError) throw itemsError;
      }

      return bundleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bundles'] });
      toast.success(isEdit ? 'המארז עודכן בהצלחה' : 'המארז נוצר בהצלחה');
      navigate('/admin/bundles');
    },
    onError: (err: any) => {
      toast.error(`שגיאה בשמירת המארז: ${err.message}`);
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const productId = id ?? 'new-bundle';
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

  const onSubmit = (values: BundleFormValues) => {
    saveMutation.mutate(values);
  };

  if (isEdit && loadingBundle) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/bundles')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? 'עריכת מארז' : 'מארז חדש'}</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>פרטים בסיסיים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">שם המארז</Label>
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
              <Label htmlFor="description_html">תיאור (HTML)</Label>
              <Textarea id="description_html" {...form.register('description_html')} rows={5} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">מחיר המארז (\u20AA)</Label>
                <Input id="price" type="number" step="0.01" {...form.register('price')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_at_price">מחיר השוואה (\u20AA)</Label>
                <Input id="compare_at_price" type="number" step="0.01" {...form.register('compare_at_price')} />
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

        {/* Bundle Contents */}
        <Card>
          <CardHeader>
            <CardTitle>תכולת המארז</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="בחר מוצר להוספה" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts
                    ?.filter((p: any) => !bundleItems.some((bi) => bi.productId === p.id))
                    .map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} - {formatCurrency(p.price ?? 0)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addBundleItem} disabled={!selectedProductId}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {bundleItems.length > 0 ? (
              <div className="space-y-2">
                {bundleItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-medium">{item.productTitle}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(item.productPrice)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">כמות:</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateBundleItemQuantity(item.productId, parseInt(e.target.value) || 1)
                        }
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBundleItem(item.productId)}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="font-medium">שווי פריטים:</span>
                  <span className="text-lg">{formatCurrency(totalItemsValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">מחיר מארז:</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(form.watch('price') ?? 0)}
                  </span>
                </div>
                {totalItemsValue > 0 && form.watch('price') > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="font-medium">חיסכון:</span>
                    <span>
                      {formatCurrency(totalItemsValue - (form.watch('price') ?? 0))} (
                      {Math.round(((totalItemsValue - (form.watch('price') ?? 0)) / totalItemsValue) * 100)}
                      %)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                לא נבחרו מוצרים למארז
              </p>
            )}
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

        {/* Layout */}
        <Card>
          <CardHeader>
            <CardTitle>פריסה ותגיות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            {isEdit ? 'עדכן מארז' : 'צור מארז'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/bundles')}>
            ביטול
          </Button>
        </div>
      </form>
    </div>
  );
};
