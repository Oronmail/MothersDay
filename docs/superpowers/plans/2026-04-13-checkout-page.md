# Checkout Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page checkout at `/site/checkout` with contact info, Israeli address autocomplete, order summary sidebar, payment placeholder, and order confirmation page.

**Architecture:** The checkout page lives outside the main site layout (no full Header/Footer — uses its own simplified checkout header). It reads cart items from the Zustand cart store, collects shipping info via React Hook Form + Zod, calls the existing `createOrder()` from `cartStore`, and redirects to a confirmation page. The cart drawer's checkout button changes from inline order creation to a simple navigate to `/site/checkout`.

**Tech Stack:** React 18, TypeScript, React Hook Form + Zod, Zustand (cart store), React Router v6, Tailwind CSS, shadcn/ui, data.gov.il API (address autocomplete), Supabase

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/Checkout.tsx` | Create | Main checkout page — orchestrates all sections, manages form state, handles order submission |
| `src/pages/CheckoutConfirmation.tsx` | Create | Post-order confirmation page with order details |
| `src/components/checkout/CheckoutHeader.tsx` | Create | Simplified header with logo + back link |
| `src/components/checkout/CheckoutSummary.tsx` | Create | Order summary sidebar — cart items, totals, CTA button |
| `src/components/checkout/CheckoutContactForm.tsx` | Create | Contact info section — email + phone fields |
| `src/components/checkout/CheckoutShippingForm.tsx` | Create | Shipping address form with city/street autocomplete |
| `src/components/checkout/CheckoutPayment.tsx` | Create | Payment method tabs + placeholder for Hyp iframe |
| `src/components/checkout/AddressAutocomplete.tsx` | Create | Reusable autocomplete input for data.gov.il city/street search |
| `src/lib/routes.ts` | Modify | Add `checkout` and `checkoutConfirmation` route constants |
| `src/App.tsx` | Modify | Add checkout and confirmation routes |
| `src/components/CartDrawer.tsx` | Modify | Replace inline checkout with navigate to `/site/checkout` |
| `src/lib/types.ts` | Modify | Extend `ShippingAddress` with `house_number` and `apartment` fields |

---

### Task 1: Extend Types + Add Routes

**Files:**
- Modify: `src/lib/types.ts:93-99`
- Modify: `src/lib/routes.ts:4-27`

- [ ] **Step 1: Extend ShippingAddress type**

In `src/lib/types.ts`, replace the `ShippingAddress` interface (lines 93-99) with:

```typescript
export interface ShippingAddress {
  full_name: string;
  city: string;
  street: string;
  house_number: string;
  apartment?: string;
  postal_code?: string;
  phone?: string;
}
```

- [ ] **Step 2: Add route constants**

In `src/lib/routes.ts`, add two new entries inside the `ROUTES` object (after the `support` line, before `} as const`):

```typescript
  checkout: '/site/checkout',
  checkoutConfirmation: '/site/checkout/confirmation',
```

- [ ] **Step 3: Verify no type errors from ShippingAddress change**

Run: `npx tsc --noEmit 2>&1 | head -30`

The `house_number` field is new and required, so the existing `AddressManager.tsx` and `CartDrawer.tsx` will have type errors. That's expected — we'll fix `CartDrawer` in Task 8 (it will no longer create orders). For `AddressManager`, the `street` field currently holds the full street+number, and the `createOrder` API in `api.ts` accepts inline types not the interface directly, so the actual breakage is minimal. Check what errors appear and note them.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/routes.ts
git commit -m "feat(checkout): extend ShippingAddress type and add checkout route constants"
```

---

### Task 2: AddressAutocomplete Component

**Files:**
- Create: `src/components/checkout/AddressAutocomplete.tsx`

- [ ] **Step 1: Create the AddressAutocomplete component**

```typescript
import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface AutocompleteResult {
  name: string;
  code: number;
}

interface AddressAutocompleteProps {
  type: "city" | "street";
  cityCode?: number;
  value: string;
  onChange: (value: string, code?: number) => void;
  placeholder: string;
  disabled?: boolean;
}

const CITIES_RESOURCE_ID = "b7cf8f14-64a2-4b33-8d4b-edb286fdbd37";
const STREETS_RESOURCE_ID = "a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3";
const API_BASE = "https://data.gov.il/api/3/action/datastore_search";

export function AddressAutocomplete({
  type,
  cityCode,
  value,
  onChange,
  placeholder,
  disabled = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchResults = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      if (type === "street" && !cityCode) {
        setResults([]);
        return;
      }

      try {
        const params = new URLSearchParams({
          resource_id: type === "city" ? CITIES_RESOURCE_ID : STREETS_RESOURCE_ID,
          q: searchQuery,
          limit: "10",
        });

        if (type === "street" && cityCode) {
          params.set("filters", JSON.stringify({ city_code: cityCode }));
        }

        const response = await fetch(`${API_BASE}?${params}`);
        const data = await response.json();

        if (data.success && data.result?.records) {
          const mapped: AutocompleteResult[] = data.result.records.map(
            (record: Record<string, unknown>) => {
              if (type === "city") {
                return {
                  name: (record["שם_ישוב"] as string)?.trim(),
                  code: record["סמל_ישוב"] as number,
                };
              }
              return {
                name: (record["שם_רחוב"] as string)?.trim(),
                code: record["סמל_רחוב"] as number,
              };
            }
          );
          setResults(mapped.filter((r) => r.name));
        }
      } catch {
        setResults([]);
      }
    },
    [type, cityCode]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // update parent with raw text (no code = not selected from list)
    setHighlightedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val), 300);
  };

  const handleSelect = (result: AutocompleteResult) => {
    setQuery(result.name);
    onChange(result.name, result.code);
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown when results arrive
  useEffect(() => {
    if (results.length > 0) setIsOpen(true);
  }, [results]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-background border border-border shadow-lg max-h-48 overflow-y-auto">
          {results.map((result, index) => (
            <li
              key={`${result.code}-${result.name}`}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === highlightedIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onMouseDown={() => handleSelect(result)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {result.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/checkout/AddressAutocomplete.tsx
git commit -m "feat(checkout): add AddressAutocomplete component with data.gov.il integration"
```

---

### Task 3: CheckoutHeader Component

**Files:**
- Create: `src/components/checkout/CheckoutHeader.tsx`

- [ ] **Step 1: Create the CheckoutHeader component**

```typescript
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import logo from "@/assets/logo-new.png";

export function CheckoutHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between" dir="rtl">
        <Link
          to={ROUTES.home}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לחנות
        </Link>
        <img src={logo} alt="יום האם" className="h-8" />
        <div className="w-[88px]" /> {/* Spacer to center logo */}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/checkout/CheckoutHeader.tsx
git commit -m "feat(checkout): add simplified CheckoutHeader component"
```

---

### Task 4: CheckoutContactForm Component

**Files:**
- Create: `src/components/checkout/CheckoutContactForm.tsx`

- [ ] **Step 1: Create the CheckoutContactForm component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/checkout/CheckoutContactForm.tsx
git commit -m "feat(checkout): add CheckoutContactForm component"
```

---

### Task 5: CheckoutShippingForm Component

**Files:**
- Create: `src/components/checkout/CheckoutShippingForm.tsx`

- [ ] **Step 1: Create the CheckoutShippingForm component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/checkout/CheckoutShippingForm.tsx
git commit -m "feat(checkout): add CheckoutShippingForm with address autocomplete"
```

---

### Task 6: CheckoutPayment Component

**Files:**
- Create: `src/components/checkout/CheckoutPayment.tsx`

- [ ] **Step 1: Create the CheckoutPayment component**

```typescript
import { Lock } from "lucide-react";

export function CheckoutPayment() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg">תשלום</h2>

      {/* Payment method tabs — placeholder for Hyp integration */}
      <div className="flex gap-2 border-b border-border">
        <button className="px-4 py-2 text-sm border-b-2 border-primary text-foreground">
          כרטיס אשראי
        </button>
        <button className="px-4 py-2 text-sm text-muted-foreground" disabled>
          Apple Pay
        </button>
        <button className="px-4 py-2 text-sm text-muted-foreground" disabled>
          Bit
        </button>
      </div>

      {/* Placeholder for Hyp iframe */}
      <div className="border border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 bg-muted/30">
        <Lock className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          טופס תשלום מאובטח
        </p>
        <p className="text-xs text-muted-foreground text-center">
          אזור זה יכיל את טופס התשלום של Hyp
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        תשלום מאובטח ומוצפן
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/checkout/CheckoutPayment.tsx
git commit -m "feat(checkout): add CheckoutPayment placeholder component"
```

---

### Task 7: CheckoutSummary Component

**Files:**
- Create: `src/components/checkout/CheckoutSummary.tsx`

- [ ] **Step 1: Create the CheckoutSummary component**

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Lock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { CartItem } from "@/lib/types";
import { LazyImage } from "@/components/LazyImage";

interface CheckoutSummaryProps {
  items: CartItem[];
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function CheckoutSummary({ items, isSubmitting, onSubmit }: CheckoutSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalPrice = items.reduce(
    (sum, item) => sum + parseFloat(item.price.amount) * item.quantity,
    0
  );

  return (
    <div className="space-y-4">
      {/* Mobile: collapsible summary bar */}
      <button
        type="button"
        className="md:hidden w-full flex items-center justify-between p-3 bg-muted/50 border border-border"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm">
          {isExpanded ? "הסתר פרטים" : "הצג פרטי הזמנה"}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-medium">&#8362;{totalPrice.toFixed(2)}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Items list — always visible on desktop, collapsible on mobile */}
      <div className={`space-y-3 ${isExpanded ? "block" : "hidden md:block"}`}>
        <h2 className="text-lg hidden md:block">סיכום הזמנה</h2>

        {items.map((item) => (
          <div key={item.variantId} className="flex gap-3">
            <div className="w-14 h-14 bg-muted overflow-hidden flex-shrink-0 relative">
              {item.product.node.images?.edges?.[0]?.node && (
                <LazyImage
                  src={item.product.node.images.edges[0].node.url}
                  alt={item.product.node.title}
                />
              )}
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{item.product.node.title}</p>
              {item.selectedOptions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {item.selectedOptions.map((o) => o.value).join(" / ")}
                </p>
              )}
            </div>
            <p className="text-sm flex-shrink-0">
              &#8362;{(parseFloat(item.price.amount) * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">סכום ביניים</span>
            <span>&#8362;{totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">משלוח</span>
            <span>חינם</span>
          </div>
          <div className="flex justify-between text-lg pt-2 border-t border-border">
            <span>סה״כ</span>
            <span>&#8362;{totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* CTA button */}
      <Button
        type="button"
        onClick={onSubmit}
        className="w-full"
        size="lg"
        disabled={items.length === 0 || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            יוצר הזמנה...
          </>
        ) : (
          <>אישור ותשלום — &#8362;{totalPrice.toFixed(2)}</>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        תשלום מאובטח ומוצפן
      </p>

      <Link
        to={ROUTES.home}
        className="block text-center text-sm text-muted-foreground underline hover:text-foreground"
      >
        עריכת העגלה
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/checkout/CheckoutSummary.tsx
git commit -m "feat(checkout): add CheckoutSummary sidebar component"
```

---

### Task 8: Main Checkout Page

**Files:**
- Create: `src/pages/Checkout.tsx`

- [ ] **Step 1: Create the Checkout page**

```typescript
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";
import { toast } from "sonner";
import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { CheckoutContactForm } from "@/components/checkout/CheckoutContactForm";
import { CheckoutShippingForm } from "@/components/checkout/CheckoutShippingForm";
import { CheckoutPayment } from "@/components/checkout/CheckoutPayment";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { Footer } from "@/components/Footer";

const checkoutSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z
    .string()
    .min(1, "מספר טלפון נדרש")
    .regex(/^0\d{8,9}$/, "מספר טלפון ישראלי לא תקין (10 ספרות, מתחיל ב-0)"),
  full_name: z.string().min(2, "שם מלא נדרש (לפחות 2 תווים)"),
  city: z.string().min(2, "יש לבחור עיר"),
  street: z.string().min(2, "יש לבחור רחוב"),
  house_number: z.string().min(1, "מספר בית נדרש"),
  apartment: z.string().optional(),
  postal_code: z.string().optional(),
  notes: z.string().optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, isLoading, createOrder } = useCartStore();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email || "",
      phone: "",
      full_name: "",
      city: "",
      street: "",
      house_number: "",
      apartment: "",
      postal_code: "",
      notes: "",
    },
  });

  // Redirect to home if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate(ROUTES.home, { replace: true });
    }
  }, [items.length, navigate]);

  // Pre-fill email when user logs in
  useEffect(() => {
    if (user?.email && !form.getValues("email")) {
      form.setValue("email", user.email);
    }
  }, [user?.email, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const email = user?.email || data.email;

    const streetFull = data.apartment
      ? `${data.street} ${data.house_number}, דירה ${data.apartment}`
      : `${data.street} ${data.house_number}`;

    const shippingAddress = {
      full_name: data.full_name,
      city: data.city,
      street: streetFull,
      house_number: data.house_number,
      apartment: data.apartment,
      postal_code: data.postal_code,
      phone: data.phone,
    };

    try {
      const { orderId, orderNumber } = await createOrder(email, shippingAddress, user?.id);

      toast.success("ההזמנה נוצרה בהצלחה!", {
        description: `מספר הזמנה: ${orderNumber}`,
      });

      navigate(`${ROUTES.checkoutConfirmation}/${orderId}`, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("network")
          ? "בעיית תקשורת. בדוק את החיבור לאינטרנט"
          : "אנא נסה שנית";

      toast.error("יצירת ההזמנה נכשלה", { description: message });
    }
  });

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <CheckoutHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <FormProvider {...form}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Right column (RTL main): form sections */}
            <div className="flex-1 space-y-8">
              <CheckoutContactForm
                form={form}
                isLoggedIn={!!user}
                userEmail={user?.email}
              />
              <CheckoutShippingForm form={form} />
              <CheckoutPayment />
            </div>

            {/* Left column (RTL sidebar): order summary */}
            <div className="w-full md:w-[360px] flex-shrink-0">
              <div className="md:sticky md:top-8">
                <CheckoutSummary
                  items={items}
                  isSubmitting={isLoading}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          </div>
        </FormProvider>
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Checkout.tsx
git commit -m "feat(checkout): add main Checkout page with form validation and order creation"
```

---

### Task 9: CheckoutConfirmation Page

**Files:**
- Create: `src/pages/CheckoutConfirmation.tsx`

- [ ] **Step 1: Create the CheckoutConfirmation page**

```typescript
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase";
import { Order } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { CheckCircle, Loader2 } from "lucide-react";
import { LazyImage } from "@/components/LazyImage";

export default function CheckoutConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (!error && data) {
        setOrder(data as Order);
      }
      setLoading(false);
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <CheckoutHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <CheckoutHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">ההזמנה לא נמצאה</p>
            <Button asChild>
              <Link to={ROUTES.home}>חזרה לחנות</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <CheckoutHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        <div className="text-center space-y-4 mb-8">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          <h1 className="text-2xl">ההזמנה התקבלה!</h1>
          <p className="text-muted-foreground">
            מספר הזמנה: <span className="font-medium text-foreground">{order.order_number}</span>
          </p>
        </div>

        {/* Order items */}
        <div className="border border-border p-4 space-y-3 mb-6">
          <h2 className="text-sm text-muted-foreground">פרטי ההזמנה</h2>
          {order.line_items.map((item, index) => (
            <div key={index} className="flex gap-3 items-center">
              <div className="w-12 h-12 bg-muted overflow-hidden flex-shrink-0">
                {item.image && <LazyImage src={item.image} alt={item.title} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">כמות: {item.quantity}</p>
              </div>
              <p className="text-sm">&#8362;{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
            </div>
          ))}
          <div className="border-t border-border pt-3 flex justify-between">
            <span>סה״כ</span>
            <span className="font-medium">&#8362;{order.total_price.toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping address */}
        {order.shipping_address && (
          <div className="border border-border p-4 mb-6">
            <h2 className="text-sm text-muted-foreground mb-2">כתובת למשלוח</h2>
            <p className="text-sm">{order.shipping_address.full_name}</p>
            <p className="text-sm">{order.shipping_address.street}</p>
            <p className="text-sm">{order.shipping_address.city}</p>
            {order.shipping_address.phone && (
              <p className="text-sm">טלפון: {order.shipping_address.phone}</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to={ROUTES.home}>המשך לקנות</Link>
          </Button>
          {user && (
            <Button asChild variant="outline">
              <Link to={ROUTES.orders}>צפה בהזמנות שלך</Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/CheckoutConfirmation.tsx
git commit -m "feat(checkout): add CheckoutConfirmation page"
```

---

### Task 10: Wire Up Routes in App.tsx

**Files:**
- Modify: `src/App.tsx:10-31` (lazy imports) and `src/App.tsx:64-83` (routes)

- [ ] **Step 1: Add lazy imports**

Add these two lines after line 31 (`const Wishlist = ...`):

```typescript
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutConfirmation = lazy(() => import("./pages/CheckoutConfirmation"));
```

- [ ] **Step 2: Add route definitions**

Add these two routes inside the `<Route path="/site" element={<SiteAccess />}>` block, after the `support` route (after line 82):

```typescript
                <Route path="checkout" element={<Checkout />} />
                <Route path="checkout/confirmation/:orderId" element={<CheckoutConfirmation />} />
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit 2>&1 | head -40`

Fix any type errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(checkout): wire up checkout and confirmation routes"
```

---

### Task 11: Update CartDrawer to Navigate to Checkout

**Files:**
- Modify: `src/components/CartDrawer.tsx`

- [ ] **Step 1: Replace the checkout handler and simplify imports**

Replace the entire `CartDrawer.tsx` file. The key changes:
- Remove `handleCheckout` function that calls `createOrder` directly
- Remove `userEmail`/`defaultAddress` state and the `useEffect` that fetches them
- Remove `supabase` and `ShippingAddress` imports
- Button navigates to `/site/checkout` instead
- Keep cart item display and quantity controls unchanged

In the imports section at the top, replace:

```typescript
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Minus, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import shoppingBagIcon from "@/assets/shopping-bag-icon.png";
import { useCartStore } from "@/stores/cartStore";
import { supabase } from "@/lib/supabase";
import { ShippingAddress } from "@/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { LazyImage } from "./LazyImage";
```

with:

```typescript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Minus, Plus, Trash2, ExternalLink } from "lucide-react";
import shoppingBagIcon from "@/assets/shopping-bag-icon.png";
import { useCartStore } from "@/stores/cartStore";
import { ROUTES } from "@/lib/routes";
import { LazyImage } from "./LazyImage";
```

Replace the component body (everything inside `export const CartDrawer = () => {` before `return`) with:

```typescript
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const {
    items,
    updateQuantity,
    removeItem,
  } = useCartStore();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + parseFloat(item.price.amount) * item.quantity, 0);

  const handleCheckout = () => {
    setIsOpen(false);
    navigate(ROUTES.checkout);
  };
```

Replace the checkout button at the bottom (the `<Button onClick={handleCheckout}...>` block) with:

```typescript
                <Button onClick={handleCheckout} className="w-full" size="lg" disabled={items.length === 0}>
                  <ExternalLink className="w-4 h-4 ml-2" />
                  מעבר לתשלום
                </Button>
```

- [ ] **Step 2: Verify the app compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/CartDrawer.tsx
git commit -m "refactor(checkout): CartDrawer navigates to checkout page instead of inline order creation"
```

---

### Task 12: Fix Type Errors + Dev Server Smoke Test

**Files:**
- Possibly modify: `src/lib/api.ts`, `src/components/AddressManager.tsx` (if type errors from ShippingAddress change)

- [ ] **Step 1: Run TypeScript compiler**

Run: `npx tsc --noEmit`

Check for any errors. The `ShippingAddress` type was extended with `house_number` (required) — but `api.ts:createOrder` uses an inline type (not the interface), and `AddressManager.tsx` uses its own Zod schema. So there may be no breakage. If there are errors, fix them:

- If `api.ts` references `ShippingAddress` type and breaks: update the inline type to include `house_number: string` and `apartment?: string`
- If `AddressManager.tsx` breaks: it uses its own `addressSchema` zod type, not `ShippingAddress`, so it likely won't break

- [ ] **Step 2: Start dev server and verify**

Run: `npm run dev`

Open the browser and:
1. Add an item to cart
2. Click "מעבר לתשלום" in the cart drawer
3. Verify it navigates to `/site/checkout`
4. Verify the checkout page renders with all sections
5. Test the city autocomplete (type "תל" and verify results appear)
6. Fill the form and submit
7. Verify redirect to confirmation page

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(checkout): resolve type errors and verify checkout flow"
```

---

## Spec Coverage Checklist

| Spec Section | Task |
|-------------|------|
| 4.1 Header Bar | Task 3 — CheckoutHeader |
| 4.2 Contact Info | Task 4 — CheckoutContactForm |
| 4.3 Shipping Address + autocomplete | Task 5 + Task 2 — CheckoutShippingForm + AddressAutocomplete |
| 4.4 Order Notes | Task 5 — notes field in CheckoutShippingForm |
| 4.5 Payment | Task 6 — CheckoutPayment placeholder |
| 4.6 Order Summary Sidebar | Task 7 — CheckoutSummary |
| 5. User Flow | Task 8 — Checkout page orchestrates the full flow |
| 6. Confirmation Page | Task 9 — CheckoutConfirmation |
| 7. Cart Drawer Update | Task 11 — navigate instead of inline checkout |
| 10. Address Autocomplete | Task 2 — AddressAutocomplete component |
| 11. Validation (Zod) | Task 8 — checkoutSchema in Checkout.tsx |
| 12. Mobile considerations | Task 7 — collapsible summary, responsive layout in Task 8 |
| 13. Out of scope | Confirmed: no discount codes, no shipping selection, no payment processing, no email notifications |
