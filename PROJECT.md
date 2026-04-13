# PROJECT DOCUMENTATION

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Site Structure & Routing](#site-structure--routing)
4. [Component Architecture](#component-architecture)
5. [Data Flow](#data-flow)
6. [Design System](#design-system)
7. [Coding Conventions](#coding-conventions)
8. [Integrations](#integrations)
9. [Development Guidelines](#development-guidelines)

---

## Project Overview

### Purpose
E-commerce website for Hebrew-speaking mothers selling planning products (planners, organizers, stationery).

### Target Audience
- Israeli mothers
- Hebrew language speakers
- Users interested in organization and planning products

### Business Model
- Shopify-powered e-commerce
- Direct product sales
- Bundle offerings
- Password-protected site access (Password: "mt")

### Key Features
- Hebrew RTL support
- Shopify product catalog
- Shopping cart with checkout
- User authentication and profiles
- Order history
- Address management
- Collection-based product browsing
- Product recommendations

---

## Tech Stack

### Frontend Framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library (Radix UI primitives)
- **Custom Design System** - Defined in `index.css` and `tailwind.config.ts`
- **Heebo Font** - Primary Hebrew/Latin font

### State Management
- **Zustand** - Cart state management with localStorage persistence
- **React Query (@tanstack/react-query)** - Server state and data fetching

### Routing
- **React Router v6** - Client-side routing

### Backend & Data
- **Lovable Cloud (Supabase)** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
- **Shopify Storefront API** - Product catalog and checkout

### UI Components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **Embla Carousel** - Product carousels

---

## Site Structure & Routing

### Route Architecture

```
/ (root)
├── / → UnderConstruction page (public landing)
├── /auth → Authentication page
└── /site → SiteAccess wrapper (password gate: "mt")
    ├── /site → Index (home page)
    ├── /site/profile → User profile
    ├── /site/addresses → Address management
    ├── /site/orders → Order history
    ├── /site/product/:handle → Product detail
    ├── /site/collection/:handle → Collection view
    ├── /site/about → About page
    ├── /site/contact → Contact page
    ├── /site/faq → FAQ page
    ├── /site/shipping → Shipping info
    ├── /site/privacy → Privacy policy
    ├── /site/terms → Terms of service
    ├── /site/returns → Returns policy
    └── /site/support → Support page
```

### Centralized Routes
All routes are defined in `src/lib/routes.ts` for type safety and consistency:

```typescript
// Route constants
export const ROUTES = {
  root: '/',
  auth: '/auth',
  home: '/site',
  profile: '/site/profile',
  // ... etc
}

// Collection handles
export const COLLECTION_HANDLES = {
  mothersPlanning: 'frontpage',
  weeklyPlanning: 'מוצרי-תכנון-שבועיים',
  complementaryPlanning: 'מוצרי-תכנון-משלימים',
  bundles: 'מארזים',
}

// Dynamic route builders
export const buildProductPath = (handle: string): string => 
  `/site/product/${handle}`;

export const buildCollectionPath = (handle: string): string => 
  `/site/collection/${handle}`;
```

### Password Gate
- Implemented in `src/components/PasswordGate.tsx`
- Wraps `/site/*` routes via `SiteAccess.tsx`
- Password stored in session: "mt"
- Uses session storage to persist authentication

---

## Component Architecture

### Layout Components

#### Header (`src/components/Header.tsx`)
- Site logo
- Navigation menu
- Search, cart, user profile icons
- Aligned to the right (no right padding)
- Responsive mobile menu

#### Footer (`src/components/Footer.tsx`)
- Newsletter subscription
- Company information
- Quick links
- Social media links
- Bottom credits

#### Hero (`src/components/Hero.tsx`)
- Homepage hero section
- Call-to-action buttons
- Background images

### Product Components

#### ProductCard (`src/components/ProductCard.tsx`)
- Individual product display
- Image, title, price
- Add to cart functionality
- Quick view option

#### ProductGrid (`src/components/ProductGrid.tsx`)
- Collection of products in carousel format
- Loading and error states
- Main collection display

#### ProductTabs (`src/components/ProductTabs.tsx`)
- Tab-based collection navigation
- Dynamic collection loading
- Product carousel per collection
- Wide product support for special products

#### RelatedProductCard (`src/components/RelatedProductCard.tsx`)
- Similar to ProductCard but for recommendations
- Used in product detail pages

#### BundleProductCard (`src/components/BundleProductCard.tsx`)
- Specialized card for bundle products
- Multiple images support

#### BundleContentCard (`src/components/BundleContentCard.tsx`)
- Shows what's included in a bundle
- Used on product detail pages

### Feature Components

#### CartDrawer (`src/components/CartDrawer.tsx`)
- Side drawer for shopping cart
- Item quantity management
- Total price calculation
- Checkout button

#### SearchModal (`src/components/SearchModal.tsx`)
- Full-screen search interface
- Product search functionality

#### QuickViewModal (`src/components/QuickViewModal.tsx`)
- Quick product preview modal
- Add to cart without leaving page

#### WishlistButton (`src/components/WishlistButton.tsx`)
- ⚠️ REMOVED from all components per user request
- Previously used for saving favorite products

### Utility Components

#### Collections (`src/components/Collections.tsx`)
- Collection buttons/tabs
- Used in ProductTabs

#### ContentSquares (`src/components/ContentSquares.tsx`)
- Homepage content sections
- Feature highlights

#### VideoCarousel (`src/components/VideoCarousel.tsx`)
- Video content display
- Supabase storage integration

#### SectionDivider (`src/components/SectionDivider.tsx`)
- Visual section separators

#### AnnouncementBanner (`src/components/AnnouncementBanner.tsx`)
- Top banner for announcements

#### Breadcrumbs (`src/components/Breadcrumbs.tsx`)
- Navigation breadcrumb trail

#### MobileNav (`src/components/MobileNav.tsx`)
- Mobile navigation menu

#### NavLink (`src/components/NavLink.tsx`)
- Navigation link component

### shadcn/ui Components
All located in `src/components/ui/`:
- accordion, alert-dialog, alert, aspect-ratio, avatar
- badge, breadcrumb, button, calendar, card, carousel, chart
- checkbox, collapsible, command, context-menu, dialog, drawer
- dropdown-menu, form, hover-card, input-otp, input, label
- menubar, navigation-menu, pagination, popover, progress
- radio-group, resizable, scroll-area, select, separator
- sheet, sidebar, skeleton, slider, sonner, switch, table
- tabs, textarea, toast, toaster, toggle-group, toggle, tooltip

---

## Data Flow

### Shopify Integration (`src/lib/shopify.ts`)

#### Configuration
```typescript
SHOPIFY_API_VERSION = '2025-07'
SHOPIFY_STORE_DOMAIN = 'lovable-project-mrc80.myshopify.com'
STOREFRONT_TOKEN = '944d8f74c990ae0bcbaef8ecdf255745'
MAIN_COLLECTION_HANDLE = 'הכל' // Main collection for all products
```

#### GraphQL Queries
- `STOREFRONT_PRODUCTS_QUERY` - Fetch products with filters
- `STOREFRONT_PRODUCT_BY_HANDLE_QUERY` - Single product details
- `STOREFRONT_PRODUCT_RECOMMENDATIONS_QUERY` - Related products
- `STOREFRONT_COLLECTIONS_QUERY` - Fetch collections
- `STOREFRONT_COLLECTION_PRODUCTS_QUERY` - Products by collection
- `CART_CREATE_MUTATION` - Create checkout cart

#### Data Types
```typescript
interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    tags: string[];
    vendor: string;
    priceRange: { minVariantPrice: { amount, currencyCode } };
    images: { edges: Array<{ node: { url, altText } }> };
    variants: { edges: Array<{ node: { id, title, price, ... } }> };
    options: Array<{ name, values }>;
  }
}

interface CartItem {
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: { amount, currencyCode };
  quantity: number;
  selectedOptions: Array<{ name, value }>;
}
```

### Cart Management (`src/stores/cartStore.ts`)

#### Zustand Store
- **Persistence**: localStorage via `zustand/middleware`
- **Storage Key**: 'shopify-cart'

#### State
```typescript
{
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
}
```

#### Actions
- `addItem(item)` - Add or increment item quantity
- `updateQuantity(variantId, quantity)` - Update item quantity
- `removeItem(variantId)` - Remove item from cart
- `clearCart()` - Empty cart
- `createCheckout()` - Generate Shopify checkout URL

### React Query
- **QueryClient** - Configured in `App.tsx`
- **Data Fetching** - Used in ProductGrid, ProductTabs, ProductDetail, Collection
- **Caching** - Automatic query result caching
- **Error Handling** - Centralized error states

### Lovable Cloud (Supabase) Database

#### Tables
1. **profiles** - User profile information
   - id (uuid, pk)
   - full_name, phone
   - RLS: Users can view/update own profile

2. **addresses** - User shipping addresses
   - id (uuid, pk)
   - user_id, full_name, street, city, postal_code, phone
   - is_default, label
   - RLS: Users can manage own addresses

3. **orders** - Order history from Shopify webhooks
   - id (uuid, pk)
   - user_id, shopify_order_id, shopify_order_number
   - total_price, currency_code
   - line_items (jsonb), shipping_address (jsonb)
   - order_status, financial_status, fulfillment_status
   - RLS: Users can view own orders

4. **wishlists** - ⚠️ DEPRECATED (removed from UI)
   - Still exists in database but not used

5. **newsletter_subscribers** - Newsletter signups
   - id, email, subscribed_at, is_active
   - RLS: Public insert only

#### Authentication
- Email/password authentication
- Profiles created automatically on signup
- Auto-confirm email enabled (non-production)

---

## Design System

### Color Palette (HSL Values)

#### Light Mode
```css
--background: 40 20% 96%;        /* Cream background */
--foreground: 25 15% 35%;        /* Dark warm gray text */
--primary: 345 13% 26%;          /* #4d3c40 - Brand color */
--primary-foreground: 0 0% 100%; /* White on primary */
--secondary: 28 35% 72%;         /* Warm Tan */
--muted: 30 8% 90%;              /* Light Gray */
--accent: 30 12% 62%;            /* Warm Taupe */
--hero-button: 39 7% 60%;        /* #a19c93 - Hero CTA */
--border: 30 15% 85%;
```

#### Dark Mode
```css
--background: 25 15% 12%;        /* Dark background */
--foreground: 25 10% 95%;        /* Light text */
--primary: 345 13% 26%;          /* Same brand color */
--secondary: 28 30% 35%;         /* Darker tan */
--muted: 25 20% 25%;             /* Dark gray */
```

### Typography
- **Font Family**: Heebo (sans-serif) - Excellent Hebrew support
- **No Bold Text**: Per user preference, avoid `font-bold` and `font-semibold`
- **Font Weights**: Use normal weight throughout

### Layout Principles
1. **RTL Support**: Full Hebrew right-to-left layout
2. **Container Width**: Most sections use 95% width (0.95)
3. **Spacing**: Consistent padding and margins using Tailwind
4. **Responsive**: Mobile-first design with breakpoints
5. **No Border Radius**: All components use sharp corners (`radius: 0`)

### Design System Usage
**CRITICAL RULE**: Always use semantic tokens from `index.css` and `tailwind.config.ts`.

✅ **CORRECT**:
```tsx
<div className="bg-background text-foreground">
<Button variant="primary">Click Me</Button>
<div className="text-secondary">Secondary text</div>
```

❌ **WRONG**:
```tsx
<div className="bg-white text-black">      // Direct colors
<div className="bg-[#ffffff]">             // Hex colors
<Button className="text-white">           // Overriding with direct colors
```

### Component Styling
- Use shadcn/ui component variants
- Customize variants in component files (e.g., `button.tsx`)
- Never override with direct color classes
- Leverage Tailwind semantic tokens

---

## Coding Conventions

### File Organization
```
src/
├── components/        # React components
│   ├── ui/           # shadcn/ui components (don't edit directly)
│   └── [Feature].tsx # Feature components (PascalCase)
├── pages/            # Route pages (PascalCase)
├── lib/              # Utilities and configurations
│   ├── shopify.ts    # Shopify API client
│   ├── routes.ts     # Route constants
│   └── utils.ts      # Helper functions
├── stores/           # Zustand stores
│   └── cartStore.ts  # Cart state
├── hooks/            # Custom React hooks
├── integrations/     # Third-party integrations
│   └── supabase/     # Supabase client (auto-generated)
├── assets/           # Images, fonts, static files
└── main.tsx          # App entry point
```

### Naming Conventions
- **Components**: PascalCase (e.g., `ProductCard.tsx`)
- **Utilities**: camelCase (e.g., `shopify.ts`, `cartStore.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAIN_COLLECTION_HANDLE`)
- **CSS Classes**: kebab-case via Tailwind utilities

### TypeScript Usage
- Always define interfaces for props
- Use type imports from Shopify types
- Leverage type safety in routes (`src/lib/routes.ts`)
- No `any` types - use proper typing

### Import Patterns
```typescript
// Absolute imports using @ alias
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ROUTES } from "@/lib/routes";

// Relative imports for local files
import ProductCard from "./ProductCard";
```

### Component Structure
```tsx
// 1. Imports
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Types/Interfaces
interface ProductCardProps {
  product: ShopifyProduct;
  onAddToCart: (item: CartItem) => void;
}

// 3. Component
const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  // 4. Hooks
  const [quantity, setQuantity] = React.useState(1);
  
  // 5. Handlers
  const handleAddToCart = () => {
    onAddToCart({...});
  };
  
  // 6. Render
  return (
    <div className="bg-card text-card-foreground">
      {/* Component JSX */}
    </div>
  );
};

// 7. Export
export default ProductCard;
```

---

## Integrations

### Shopify Storefront API
- **Purpose**: Product catalog, cart, checkout
- **Authentication**: Storefront Access Token
- **API Version**: 2025-07
- **GraphQL Endpoint**: `https://lovable-project-mrc80.myshopify.com/api/2025-07/graphql.json`
- **Token Storage**: Hardcoded in `src/lib/shopify.ts`

#### Key Operations
1. Fetch products by collection
2. Get product details by handle
3. Get product recommendations
4. Create checkout cart
5. Redirect to Shopify checkout

### Lovable Cloud (Supabase)
- **Purpose**: User data, authentication, orders
- **Project ID**: wgokqxbncdnbohtczmcm
- **Client**: Auto-generated in `src/integrations/supabase/client.ts`

#### Secrets (Environment Variables)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `SHOPIFY_ACCESS_TOKEN`
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`

#### Authentication Flow
1. User signs up/logs in via `/auth`
2. Profile auto-created via database trigger
3. RLS policies enforce data access
4. Session managed by Supabase Auth

#### Edge Functions
- `shopify-order-webhook` - Syncs orders from Shopify to Supabase

### Storage Buckets
- **videos**: Public bucket for video content
- Used by VideoCarousel component

---

## Development Guidelines

### Getting Started
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup
- `.env` file is auto-managed by Lovable Cloud
- Never edit `.env` manually
- Never commit secrets to version control

### Making Changes

#### Frontend Changes
1. Edit components in `src/components/` or pages in `src/pages/`
2. Use semantic tokens from design system
3. Test in preview mode
4. Deploy via "Update" button in Lovable

#### Backend Changes
1. Database changes: Use Lovable Cloud UI or migrations
2. Edge functions: Edit in `supabase/functions/`
3. Deploy automatically on save

### Design System Changes
1. Edit `src/index.css` for color tokens
2. Update `tailwind.config.ts` for theme extensions
3. Create component variants in `src/components/ui/`
4. Never use direct colors

### Adding New Routes
1. Add route constant to `src/lib/routes.ts`
2. Create page component in `src/pages/`
3. Add route to `src/App.tsx`
4. Update navigation in Header/Footer

### Adding New Components
1. Create component file in `src/components/`
2. Use TypeScript interfaces for props
3. Import semantic tokens for styling
4. Keep components focused and reusable

### State Management Guidelines
- **Local state**: Use React `useState` for component-specific state
- **Cart state**: Use `useCartStore` from Zustand
- **Server state**: Use React Query `useQuery`
- **Form state**: Use React Hook Form if needed

### Performance Optimization
- React Query handles caching automatically
- Zustand persists cart to localStorage
- Lazy load images with native `loading="lazy"`
- Use Vite code splitting for routes

---

## Known Limitations & Notes

### Current State
1. **Wishlist Removed**: Wishlist feature removed from UI but table still exists in database
2. **Password Gate**: Site protected with password "mt" at `/site/*` routes
3. **Under Construction**: Root `/` shows "Under Construction" page
4. **No Bold Text**: User preference - avoid bold text throughout site

### Shopify Integration
- Checkout redirects to Shopify hosted checkout
- Order sync via webhook to Supabase
- Cart managed client-side until checkout

### Hebrew/RTL Considerations
- Heebo font provides excellent Hebrew support
- RTL layout handled by browser/Tailwind
- All content should support RTL text flow

---

## Future Development Notes

### Potential Features
- Complete wishlist removal (database cleanup)
- Enhanced search functionality
- Product reviews and ratings
- Advanced filtering and sorting
- Customer support chat
- Email notifications
- Mobile app version

### Optimization Opportunities
- Image optimization and CDN
- Server-side rendering consideration
- Enhanced caching strategies
- Performance monitoring
- SEO improvements

### Maintenance Tasks
- Regular dependency updates
- Shopify API version upgrades
- Security audits
- Database cleanup (remove unused tables)

---

## Quick Reference

### Important Files
- `src/App.tsx` - Route configuration
- `src/lib/routes.ts` - Route constants
- `src/lib/shopify.ts` - Shopify API client
- `src/stores/cartStore.ts` - Cart state management
- `src/index.css` - Design system tokens
- `tailwind.config.ts` - Tailwind theme
- `src/integrations/supabase/client.ts` - Supabase client (auto-generated)

### Common Tasks
```typescript
// Navigate to a product
import { buildProductPath } from '@/lib/routes';
navigate(buildProductPath('product-handle'));

// Add item to cart
import { useCartStore } from '@/stores/cartStore';
const addItem = useCartStore(state => state.addItem);
addItem(cartItem);

// Fetch products
import { storefrontApiRequest, STOREFRONT_PRODUCTS_QUERY } from '@/lib/shopify';
const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, { first: 20 });

// Access Supabase
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.from('profiles').select('*');
```

---

## Contact & Support
- **Platform**: Lovable
- **Documentation**: https://docs.lovable.dev/
- **Project**: Hebrew Mothers Planning Products E-commerce

---

*Last Updated: 2025-11-27*
*Version: 1.0*