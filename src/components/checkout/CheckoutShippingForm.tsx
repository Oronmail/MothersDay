import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { AddressAutocomplete, findCityCode } from "./AddressAutocomplete";
import type { CheckoutFormValues } from "@/pages/Checkout";

interface CheckoutShippingFormProps {
  form: UseFormReturn<CheckoutFormValues>;
}

export function CheckoutShippingForm({ form }: CheckoutShippingFormProps) {
  const [cityCode, setCityCode] = useState<number | undefined>();
  const [isResolvingCityCode, setIsResolvingCityCode] = useState(false);
  const [streetLookupFailed, setStreetLookupFailed] = useState(false);
  const cityValue = form.watch("city") || "";

  // The street autocomplete needs the city code. When the city arrives as
  // text (prefilled saved address, or typed fully without picking a
  // suggestion), resolve the code by exact name so the street suggestions work.
  useEffect(() => {
    if (!cityValue || cityCode) return;
    let active = true;
    setIsResolvingCityCode(true);
    findCityCode(cityValue).then((code) => {
      if (!active) return;
      if (code) setCityCode(code);
      setIsResolvingCityCode(false);
    });
    return () => { active = false; };
  }, [cityValue, cityCode]);

  // data.gov.il is a third party. When we can't resolve the city (service down,
  // or a city name that isn't in the dataset) the street field stays open for
  // free text rather than blocking the order. The hint only appears once she
  // actually starts typing a street, so it doesn't flicker while typing a city.
  const streetValue = form.watch("street") || "";
  const showManualStreetHint =
    !streetLookupFailed &&
    !cityCode &&
    !isResolvingCityCode &&
    cityValue.trim().length >= 2 &&
    streetValue.trim().length > 0;

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
              <Input {...field} />
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
                onLookupError={setStreetLookupFailed}
              />
            </FormControl>
            {showManualStreetHint && (
              <p className="text-xs text-muted-foreground">
                לא הצלחנו לטעון את רשימת הרחובות לעיר הזו — אפשר להקליד את שם הרחוב ידנית
              </p>
            )}
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
                <Input {...field} />
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
                <Input {...field} />
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
              <Input dir="ltr" {...field} />
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
