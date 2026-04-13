import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const settingsSchema = z.object({
  shipping_cost: z.coerce.number().min(0, 'מחיר לא תקין'),
  free_shipping_threshold: z.coerce.number().min(0, 'סכום לא תקין'),
  shipping_enabled: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export const StoreSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useStoreSettings();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      shipping_cost: 35,
      free_shipping_threshold: 350,
      shipping_enabled: true,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        shipping_cost: settings.shipping_cost,
        free_shipping_threshold: settings.free_shipping_threshold,
        shipping_enabled: settings.shipping_enabled,
      });
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      const entries = [
        { key: 'shipping_cost', value: values.shipping_cost },
        { key: 'free_shipping_threshold', value: values.free_shipping_threshold },
        { key: 'shipping_enabled', value: values.shipping_enabled },
      ];

      for (const entry of entries) {
        const { error } = await supabase
          .from('store_settings')
          .upsert({ key: entry.key, value: entry.value, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast.success('ההגדרות נשמרו בהצלחה');
    },
    onError: (err: any) => {
      toast.error(`שגיאה בשמירת ההגדרות: ${err.message}`);
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    saveMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">הגדרות חנות</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>הגדרות משלוח</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="shipping_enabled">חיוב משלוח</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="shipping_enabled"
                  checked={form.watch('shipping_enabled')}
                  onCheckedChange={(checked) => form.setValue('shipping_enabled', checked)}
                />
                <span className="text-sm">
                  {form.watch('shipping_enabled') ? 'פעיל' : 'כבוי (משלוח חינם לכולם)'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipping_cost">עלות משלוח (₪)</Label>
                <Input
                  id="shipping_cost"
                  type="number"
                  step="1"
                  {...form.register('shipping_cost')}
                  disabled={!form.watch('shipping_enabled')}
                />
                {form.formState.errors.shipping_cost && (
                  <p className="text-sm text-destructive">{form.formState.errors.shipping_cost.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="free_shipping_threshold">משלוח חינם מעל (₪)</Label>
                <Input
                  id="free_shipping_threshold"
                  type="number"
                  step="1"
                  {...form.register('free_shipping_threshold')}
                  disabled={!form.watch('shipping_enabled')}
                />
                {form.formState.errors.free_shipping_threshold && (
                  <p className="text-sm text-destructive">{form.formState.errors.free_shipping_threshold.message}</p>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {form.watch('shipping_enabled')
                ? `משלוח בעלות ₪${form.watch('shipping_cost')} | חינם בהזמנות מעל ₪${form.watch('free_shipping_threshold')}`
                : 'משלוח חינם לכל ההזמנות'}
            </p>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
          שמור הגדרות
        </Button>
      </form>
    </div>
  );
};
