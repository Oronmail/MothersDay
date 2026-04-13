import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Link } from "react-router-dom";
import type { CheckoutFormValues } from "@/pages/Checkout";

interface CheckoutContactFormProps {
  form: UseFormReturn<CheckoutFormValues>;
  isLoggedIn: boolean;
  userEmail?: string;
}

export function CheckoutContactForm({ form, isLoggedIn, userEmail }: CheckoutContactFormProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg">פרטי התקשרות</h2>

      {isLoggedIn && userEmail ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">אימייל:</span>
          <span>{userEmail}</span>
        </div>
      ) : (
        <>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>אימייל</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your@email.com" dir="ltr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-sm text-muted-foreground">
            כבר יש לך חשבון?{" "}
            <Link to="/auth" className="underline hover:text-foreground">
              התחבר/י
            </Link>
          </p>
        </>
      )}

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>טלפון</FormLabel>
            <FormControl>
              <Input type="tel" placeholder="050-123-4567" dir="ltr" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
}
