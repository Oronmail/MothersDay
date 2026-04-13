import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { AddressAutocomplete } from "./AddressAutocomplete";
import type { CheckoutFormValues } from "@/pages/Checkout";

interface CheckoutShippingFormProps {
  form: UseFormReturn<CheckoutFormValues>;
}

export function CheckoutShippingForm({ form }: CheckoutShippingFormProps) {
  const [cityCode, setCityCode] = useState<number | undefined>();

  return (
    <section className="space-y-4">
      <h2 className="text-lg">כתובת למשלוח</h2>

      <FormField
        control={form.control}
        name="full_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>שם מלא</FormLabel>
            <FormControl>
              <Input placeholder="ישראל ישראלי" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>עיר</FormLabel>
            <FormControl>
              <AddressAutocomplete
                type="city"
                value={field.value}
                onChange={(value, code) => {
                  field.onChange(value);
                  setCityCode(code);
                  // Clear street when city changes
                  form.setValue("street", "");
                }}
                placeholder="הקלד/י שם עיר..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="street"
        render={({ field }) => (
          <FormItem>
            <FormLabel>רחוב</FormLabel>
            <FormControl>
              <AddressAutocomplete
                type="street"
                cityCode={cityCode}
                value={field.value}
                onChange={(value) => field.onChange(value)}
                placeholder="הקלד/י שם רחוב..."
                disabled={!cityCode}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="house_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>מספר בית</FormLabel>
              <FormControl>
                <Input placeholder="12" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="apartment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>דירה (אופציונלי)</FormLabel>
              <FormControl>
                <Input placeholder="4" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="postal_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>מיקוד (אופציונלי)</FormLabel>
            <FormControl>
              <Input placeholder="1234567" dir="ltr" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>הערות להזמנה (אופציונלי)</FormLabel>
            <FormControl>
              <Textarea placeholder="הוראות מיוחדות, הערות למשלוח..." rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
}
