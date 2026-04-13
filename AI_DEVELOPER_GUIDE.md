# AI Developer Guide - יום האם (Yom Ha'Em) E-Commerce Platform

> **Critical Context**: This guide enables seamless development handoff between Lovable and external AI models using GitHub as the source of truth.

---

## 🎯 Quick Reference

### Project Overview
- **Business**: Israeli e-commerce for mothers' planning products
- **Brand**: יום האם (Yom Ha'Em / Mother's Day)
- **Mission**: "To refine our day, our week, and our time as mothers"
- **Language**: Hebrew (RTL)
- **Founder**: Eden (mother, creator of planning solutions)

### Tech Stack
```
Frontend: React 18 + TypeScript + Vite
Styling: Tailwind CSS (HSL semantic tokens)
State: Zustand (cart, wishlist)
Data: React Query (@tanstack/react-query)
E-commerce: Shopify Storefront API (2025-07)
Backend: Supabase (via Lovable Cloud)
Router: React Router v6
UI: shadcn/ui components
```

### Key Facts
- **Primary Route**: `/site` (not `/`)
- **Root Route**: `/` is password-gated landing
- **Text Direction**: RTL (Hebrew)
- **No Border Radius**: `border-radius: 0` everywhere
- **Font**: Heebo (no bold weights used)
- **API Version**: Shopify Storefront 2025-07

---

## ⚠️ CRITICAL RULES - DO NOT BREAK

### 1. Design System (HSL Colors Only)
```css
/* ✅ CORRECT */
className="bg-primary text-primary-foreground"
className="text-foreground bg-background"

/* ❌ WRONG */
className="bg-purple-500 text-white"
className="text-black bg-white"
```

**All colors MUST use semantic tokens from `src/index.css`:**
- `--background` / `--foreground`
- `--primary` / `--primary-foreground`
- `--secondary` / `--secondary-foreground`
- `--muted` / `--muted-foreground`
- `--accent` / `--accent-foreground`
- `--border`

### 2. Typography Rules
```css
/* ✅ CORRECT - Use regular weights only */
font-family: 'Heebo', sans-serif;
font-weight: 400; /* normal */
font-weight: 300; /* light */

/* ❌ WRONG - Never use bold */
font-weight: 700;
font-weight: bold;
className="font-bold"
```

### 3. Border Radius = 0
```css
/* ✅ CORRECT */
border-radius: 0;
className="rounded-none"

/* ❌ WRONG */
className="rounded-lg rounded-md rounded"
border-radius: 8px;
```

### 4. RTL (Right-to-Left)
```tsx
/* ✅ CORRECT - All sections need dir="rtl" */
<section dir="rtl" className="...">
  <div className="flex justify-end"> {/* Right align for RTL */}
    <p className="text-right">טקסט בעברית</p>
  </div>
</section>

/* ❌ WRONG */
<section> {/* Missing dir="rtl" */}
  <p className="text-left">טקסט בעברית</p>
</section>
```

### 5. Section Spacing Standard
```tsx
/* ✅ CORRECT - Default section spacing */
<section className="py-12 md:py-16">

/* Adjacent sections with titles */
<section className="pt-12 md:pt-16 pb-0"> {/* Title section */}
<section className="pt-6 md:pt-8 pb-12 md:pb-16"> {/* Content section */}
```

---

## 📁 File Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (customized)
│   ├── Header.tsx       # Main nav (sticky, password check)
│   ├── Hero.tsx         # Homepage hero (video, grid)
│   ├── ProductTabs.tsx  # Collection tabs (4 categories)
│   ├── ProductCard.tsx  # Grid product card
│   ├── ProductCardCompact.tsx  # Carousel product card
│   ├── CartDrawer.tsx   # Cart sidebar (Zustand)
│   ├── VideoCarousel.tsx  # Video testimonials
│   ├── Newsletter.tsx   # Email subscription (Supabase)
│   └── ...
├── pages/
│   ├── Index.tsx        # Homepage (/site)
│   ├── AllProducts.tsx  # All products page
│   ├── Collection.tsx   # Collection pages
│   ├── ProductDetail.tsx # Single product
│   ├── Auth.tsx         # Login/Signup
│   ├── Profile.tsx      # User profile
│   ├── Orders.tsx       # Order history
│   ├── SiteAccess.tsx   # Password gate (/)
│   └── ...
├── stores/
│   ├── cartStore.ts     # Zustand cart (persistent)
│   └── wishlistStore.ts # Zustand wishlist (Supabase)
├── lib/
│   ├── shopify.ts       # Shopify API (queries, types, checkout)
│   ├── routes.ts        # Route constants
│   ├── constants.ts     # Wide product titles
│   └── utils.ts         # cn() utility
├── hooks/
│   └── useAuth.ts       # Supabase auth hook
├── integrations/supabase/
│   ├── client.ts        # ⚠️ AUTO-GENERATED - DO NOT EDIT
│   └── types.ts         # ⚠️ AUTO-GENERATED - DO NOT EDIT
├── assets/              # Images (logo, textures, etc.)
├── index.css            # 🎨 Design system (HSL tokens)
└── main.tsx             # App entry

supabase/
├── functions/
│   └── shopify-order-webhook/  # Order processing
└── config.toml          # ⚠️ AUTO-GENERATED - DO NOT EDIT
```

---

## 🎨 Design System Values

### Colors (HSL from `src/index.css`)
```css
:root {
  --background: 0 0% 100%;           /* White */
  --foreground: 240 10% 3.9%;        /* Near-black */
  
  --primary: 262 83% 58%;            /* Purple */
  --primary-foreground: 0 0% 98%;    /* Off-white */
  
  --secondary: 240 4.8% 95.9%;       /* Light gray */
  --secondary-foreground: 240 5.9% 10%; /* Dark gray */
  
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 262 83% 58%;               /* Purple */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... dark mode tokens */
}
```

### Typography
```css
font-family: 'Heebo', sans-serif;
/* Available weights: 300, 400 (NEVER 700/bold) */
```

### Spacing Scale
```css
/* Standard section spacing */
py-12 md:py-16  /* 48px / 64px */

/* Reduced adjacent spacing */
pt-12 md:pt-16 pb-0  /* Top only */
pt-6 md:pt-8 pb-12 md:pb-16  /* Reduced top, full bottom */
```

---

## 🛍️ Shopify Integration

### Configuration (`src/lib/shopify.ts`)
```typescript
const SHOPIFY_API_VERSION = '2025-07'; // ⚠️ ALWAYS use this version
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'xxx.myshopify.com'; // Get from tool
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'xxx'; // Get from tool
const MAIN_COLLECTION_HANDLE = 'frontpage'; // All products
```

### Key Types
```typescript
interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    handle: string;
    description: string;
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: { edges: Array<{ node: { url: string; altText: string | null } }> };
    variants: { edges: Array<{ node: VariantNode }> };
  };
}

interface CartItem {
  product: ShopifyProduct;
  variantId: string; // GraphQL ID: "gid://shopify/ProductVariant/123"
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
}
```

### Checkout Flow Rules
```typescript
// ✅ CORRECT - Always use Storefront API
const checkoutUrl = await createStorefrontCheckout(items, userEmail, shippingAddress, userId);
window.open(checkoutUrl, '_blank'); // Opens in new tab

// ❌ WRONG - Never use direct URLs
window.open(`https://${DOMAIN}/products/${handle}`, '_blank');
window.open(`https://${DOMAIN}/cart/add?id=${variantId}`, '_blank');
```

**Critical Checkout Requirements:**
1. Always add to cart first (`useCartStore.addItem()`)
2. Use `createStorefrontCheckout()` from `src/lib/shopify.ts`
3. Checkout URL must include `?channel=online_store`
4. Always open in new tab with `window.open(url, '_blank')`

### Wide Products (`src/lib/constants.ts`)
```typescript
export const WIDE_PRODUCT_TITLES = [
  "לוח משפחתי",
  "לוח שבועי",
  "מחברת לניהול משימות קבועות",
  "רשימת קניות / סידורים",
];
// These products display 2x width in grid layouts
```

---

## 💾 Supabase Backend

### Tables
```sql
-- profiles (extends auth.users)
id: uuid (FK to auth.users.id)
full_name: text
phone: text
created_at: timestamp
updated_at: timestamp

-- addresses (user shipping addresses)
id: uuid
user_id: uuid (FK to auth.users.id)
full_name: text
phone: text
street: text
city: text
postal_code: text
is_default: boolean
label: text ('home', 'work', etc.)

-- orders (Shopify orders)
id: uuid
user_id: uuid (FK to auth.users.id)
shopify_order_id: text (unique)
shopify_order_number: text
total_price: text
currency_code: text
order_status: text
financial_status: text
fulfillment_status: text
line_items: jsonb
shipping_address: jsonb
created_at: timestamp

-- wishlists (user saved products)
id: uuid
user_id: uuid (FK to auth.users.id)
product_handle: text
product_title: text
product_image: text
product_price: text
created_at: timestamp

-- newsletter_subscribers
id: uuid
email: text (unique)
is_active: boolean
subscribed_at: timestamp

-- unlinked_orders (orders without user match)
id: uuid
shopify_order_id: text (unique)
order_email: text
order_data: jsonb
resolved: boolean
```

### Client Usage
```typescript
import { supabase } from "@/integrations/supabase/client";

// ✅ CORRECT - Use the auto-generated client
const { data, error } = await supabase
  .from('wishlists')
  .select('*')
  .eq('user_id', userId);

// ❌ WRONG - Never create custom client
import { createClient } from '@supabase/supabase-js';
const customClient = createClient(url, key); // DON'T DO THIS
```

### Auth Hook
```typescript
import { useAuth } from "@/hooks/useAuth";

const { user, loading } = useAuth(); // Returns current user or null
```

### RLS Policies
- All tables have RLS enabled
- Users can only access their own data (user_id match)
- `newsletter_subscribers` is public insert
- `orders` and `wishlists` require authentication

---

## 🗺️ Routing System

### Route Constants (`src/lib/routes.ts`)
```typescript
import { ROUTES, buildProductPath, buildCollectionPath } from "@/lib/routes";

// ✅ CORRECT - Use constants
navigate(ROUTES.home); // '/site'
navigate(buildProductPath(product.handle)); // '/site/product/handle'
navigate(buildCollectionPath('frontpage')); // '/site/collection/frontpage'

// ❌ WRONG - Hardcoded strings
navigate('/site');
navigate(`/site/product/${handle}`);
```

### Collection Handles
```typescript
export const COLLECTION_HANDLES = {
  mothersPlanning: 'frontpage',           // לוח אימהות
  weeklyPlanning: 'מוצרי-תכנון-שבועיים',  // Weekly planning
  complementaryPlanning: 'מוצרי-תכנון-משלימים', // Complementary
  bundles: 'מארזים',                      // Bundles
};
```

### Route Structure
```
/ → SiteAccess (password gate)
/auth → Auth (login/signup)
/site → Index (homepage)
/site/products → AllProducts
/site/product/:handle → ProductDetail
/site/collection/:collection → Collection
/site/profile → Profile (auth required)
/site/orders → Orders (auth required)
/site/about → About
/site/contact → Contact
/site/faq → FAQ
/site/shipping → Shipping
/site/returns → Returns
/site/privacy → Privacy
/site/terms → Terms
```

---

## 🧩 Component Patterns

### Standard Section Structure
```tsx
<section className="py-12 md:py-16 bg-background" dir="rtl">
  <div className="container mx-auto px-4">
    {/* Section content */}
  </div>
</section>
```

### Product Card (Grid)
```tsx
<ProductCard 
  product={product} 
  isWide={isWideProduct(product)} 
  className="col-span-1 md:col-span-2" // if wide
/>
```

### Product Card (Carousel)
```tsx
<ProductCardCompact 
  product={product} 
  isWide={isWideProduct(product)}
/>
```

### Add to Cart
```tsx
import { useCartStore } from "@/stores/cartStore";

const addItem = useCartStore(state => state.addItem);

const handleAddToCart = () => {
  addItem({
    product,
    variantId: selectedVariant.id, // Full GraphQL ID
    variantTitle: selectedVariant.title,
    price: selectedVariant.price,
    quantity: 1,
    selectedOptions: selectedVariant.selectedOptions,
  });
  
  toast.success("המוצר נוסף לסל", {
    description: product.node.title,
  });
};
```

### Hebrew Text Alignment
```tsx
{/* ✅ CORRECT - Right align for Hebrew */}
<div dir="rtl" className="text-right">
  <h1 className="text-4xl">כותרת בעברית</h1>
  <p className="text-lg">תיאור בעברית</p>
</div>

{/* Icon positioning in RTL */}
<div className="flex items-center gap-2" dir="rtl">
  <span>טקסט</span>
  <Icon className="w-4 h-4" /> {/* Icon after text in RTL */}
</div>
```

---

## ⚠️ Known Gotchas

### 1. Deprecated Environment Variables
```bash
# ❌ DEPRECATED - Don't use these
VITE_SUPABASE_ANON_KEY

# ✅ CORRECT - Use these
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

### 2. Auto-Generated Files (Never Edit)
```
⚠️ DO NOT MODIFY:
- src/integrations/supabase/client.ts
- src/integrations/supabase/types.ts
- supabase/config.toml
- .env
```

### 3. Password Gate
- Site is password-protected at root (`/`)
- Password stored in localStorage: `site_access_granted`
- Users must authenticate to access `/site` routes
- `PasswordGate` component checks password on mount

### 4. Shopify Product Reviews
```typescript
// ❌ NEVER add fake reviews
// Shopify products don't have reviews in Storefront API
// Don't mock review data or ratings
```

### 5. Cart Persistence
```typescript
// Cart state persists to localStorage automatically
// Key: 'shopify-cart'
// Clear cart: useCartStore.getState().clearCart()
```

### 6. Wishlist Authentication
```typescript
// Wishlist requires user authentication
// Returns false if not authenticated
const success = await addToWishlist(product);
if (!success) {
  toast.error("יש להתחבר כדי להוסיף למועדפים");
  navigate(ROUTES.auth);
}
```

### 7. Border Image Syntax
```tsx
{/* Newsletter border (hand-drawn sketch) */}
<div style={{
  border: '2px solid transparent',
  borderImage: `url(${newsletterBorder}) 20 stretch`,
  borderImageSlice: '20',
  borderImageWidth: '2px'
}}>
```

---

## 🇮🇱 Hebrew Reference

### Common UI Terms
```
English          → Hebrew
---------------------------------
Cart             → סל קניות
Add to Cart      → הוסף לסל
Checkout         → תשלום
Product          → מוצר
Products         → מוצרים
Collection       → קולקציה
Price            → מחיר
Description      → תיאור
Login            → התחברות
Sign Up          → הרשמה
Profile          → פרופיל
Orders           → הזמנות
Address          → כתובת
Shipping         → משלוח
Total            → סה"כ
Quantity         → כמות
Size             → גודל
Color            → צבע
Available        → זמין
Out of Stock     → אזל מהמלאי
Home             → בית
About            → אודות
Contact          → צור קשר
FAQ              → שאלות נפוצות
Newsletter       → ניוזלטר
Subscribe        → הירשם
Email            → אימייל
Phone            → טלפון
Save             → שמור
Cancel           → ביטול
Edit             → ערוך
Delete           → מחק
Search           → חיפוש
Filter           → סנן
Sort             → מיון
Wishlist         → מועדפים
```

### Brand-Specific Text
```
"בית תכנון שגרה" - Planning Routine House
"לעדן את היום, את השבוע, ואת הזמן שלנו כאימהות" - To refine our day, our week, and our time as mothers
"תכנון עבור אימהות ולמען אימהות" - Planning for mothers and by mothers
"בלוקי תכנון" - Planning blocks
"לוח אימהות" - Mothers board
"לוח שבועי" - Weekly board
"מארזים" - Bundles
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Lint
npm run lint
```

---

## ✅ Pre-Commit Checklist

Before pushing code, verify:

### Design System
- [ ] All colors use HSL semantic tokens (no direct colors)
- [ ] No bold fonts used (`font-bold`, `font-weight: 700`)
- [ ] No border-radius used (all `rounded-none` or `border-radius: 0`)
- [ ] All Hebrew sections have `dir="rtl"`
- [ ] Section spacing follows standard (`py-12 md:py-16`)

### Shopify Integration
- [ ] API version is `2025-07`
- [ ] Checkout uses `createStorefrontCheckout()` (no manual URLs)
- [ ] Checkout URL includes `?channel=online_store`
- [ ] Checkout opens in new tab (`window.open(url, '_blank')`)
- [ ] Cart items use full GraphQL variant IDs

### Supabase
- [ ] Using auto-generated client from `@/integrations/supabase/client`
- [ ] No modifications to auto-generated files
- [ ] RLS policies considered for new tables

### RTL & Hebrew
- [ ] All text sections have `dir="rtl"`
- [ ] Text alignment is `text-right` for Hebrew
- [ ] Icons positioned correctly in RTL context
- [ ] Flexbox/Grid respects RTL layout

### Routing
- [ ] Using route constants from `src/lib/routes.ts`
- [ ] No hardcoded route strings
- [ ] Product/Collection paths use builder functions

### TypeScript
- [ ] No TypeScript errors
- [ ] Proper types imported from `src/lib/shopify.ts`
- [ ] Supabase types from auto-generated `types.ts`

### Testing
- [ ] Test in both light and dark modes
- [ ] Test RTL layout
- [ ] Test cart persistence (localStorage)
- [ ] Test authentication flows
- [ ] Test Shopify checkout flow end-to-end

---

## 📚 Additional Resources

- **Shopify Storefront API**: https://shopify.dev/docs/api/storefront/2025-07
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Query**: https://tanstack.com/query/latest
- **Zustand**: https://docs.pmnd.rs/zustand/getting-started/introduction
- **shadcn/ui**: https://ui.shadcn.com/

---

## 🔄 Syncing with Lovable

This project uses **bidirectional GitHub sync**:
- Changes in Lovable → Auto-push to GitHub
- Changes in GitHub → Auto-sync to Lovable
- **No manual git commands needed** when working in Lovable

When working externally:
1. Clone from GitHub
2. Make changes
3. Push to default branch
4. Changes sync to Lovable automatically

---

## 📋 Maintaining Project History

### CHANGELOG.md
**Critical**: All significant changes MUST be documented in `CHANGELOG.md`

This project follows [Keep a Changelog](https://keepachangelog.com/) format and [Semantic Versioning](https://semver.org/).

**When to update CHANGELOG.md:**
- Adding new features or functionality
- Making breaking changes
- Changing design system rules
- Modifying Shopify integration
- Adding/removing dependencies
- Fixing critical bugs
- Performance optimizations

**How to update:**
1. Add entry under `[Unreleased]` section
2. Use categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
3. Include technical details and impact
4. Reference related files or components

**Example entry:**
```markdown
## [Unreleased]

### Added
- Product comparison feature on collection pages
- New `CompareProducts` component in `src/components/`
- Compare button added to `ProductCard` component

### Changed
- Updated product detail page layout for better mobile UX
- Modified `ProductDetail.tsx` grid system (lines 45-67)
```

---

## 📝 Notes for AI Models

### When Adding Features
1. **Check design system first** - Use existing tokens
2. **Follow RTL patterns** - Hebrew requires `dir="rtl"` and `text-right`
3. **Maintain spacing standards** - Use standard section padding
4. **No border-radius** - This is a strict design rule
5. **No bold fonts** - Heebo 300/400 only
6. **Shopify checkout** - Always use Storefront API, never manual URLs

### When Fixing Bugs
1. **Check console logs** - Use browser DevTools
2. **Verify auth state** - Use `useAuth()` hook
3. **Check cart state** - Use `useCartStore()` in DevTools
4. **Test RTL layout** - Hebrew text issues are common
5. **Validate types** - TypeScript errors often point to real issues

### When Refactoring
1. **Don't break design system** - Colors, typography, borders
2. **Preserve RTL** - Don't remove `dir="rtl"` attributes
3. **Keep routing centralized** - Use `src/lib/routes.ts`
4. **Maintain Shopify patterns** - Checkout flow is critical
5. **Update this guide** - Document significant changes

---

## 🚨 Emergency Troubleshooting

### Cart Checkout Fails
```typescript
// Verify these in console:
console.log(useCartStore.getState().items);
console.log(SHOPIFY_STOREFRONT_TOKEN);
console.log(SHOPIFY_API_VERSION); // Must be '2025-07'
```

### Products Not Loading
```typescript
// Check API configuration:
console.log(SHOPIFY_STOREFRONT_URL);
console.log(SHOPIFY_STORE_PERMANENT_DOMAIN);
// Verify Storefront API access in Shopify admin
```

### Auth Not Working
```typescript
// Check Supabase client:
import { supabase } from "@/integrations/supabase/client";
const { data: { session } } = await supabase.auth.getSession();
console.log(session);
```

### RTL Layout Broken
```tsx
// Ensure section has dir attribute:
<section dir="rtl"> {/* REQUIRED */}
  <div className="text-right"> {/* Hebrew text */}
    ...
  </div>
</section>
```

---

**Last Updated**: 2025-12-01  
**Version**: 1.0.0  
**Maintained By**: AI Development Team

---

*This guide is maintained in the GitHub repository and should be updated whenever significant architectural or design changes are made.*
