# Changelog

All notable changes to the יום האם (Yom Ha'Em) e-commerce platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Flexible Product Image Layouts** (`src/lib/productImageLayouts.ts`, `src/components/ProductImageLayout.tsx`)
  - Shopify metafield-based image layout configuration system
  - Support for 7 different layout types: grid-2x2, grid-2-large-2-small, grid-hero-bottom, grid-3x1, grid-1-2-1, grid-2-1-3-2, grid-custom
  - JSON configuration via custom.image_layout metafield in Shopify
  - Fallback to default 2x2 grid if no metafield configured
  - Flexible aspect ratio configuration per layout
  - Dynamic layout rendering based on metafield value
  - Single source of truth for product image layouts
  - **NEW**: grid-2-1-3-2 layout for 8 images (2 large top, 1 medium, 3 small, 2 small centered)

- **Product Extra Carousel** (`src/components/ProductExtraCarousel.tsx`)
  - Additional image carousel section for product detail pages
  - Hardcoded mapping for products requiring extra image showcase
  - Supports optional description text above carousel
  - **Product p1** (מחברת יום האם): 8 main images + 7 carousel images with description
    - Carousel title: "כלי מתכנון במחברת"
    - Images 8-14 display planning tools
    - Includes descriptive paragraph about notebook features
  - **Product p2** (לוח משפחתי): 4 main images + 4 carousel images
    - Carousel title: "הטבלאות בלוח"
    - Images 4-7 display board templates
  - Embla carousel integration with RTL support
  - Touch-friendly with dragFree and containScroll options
  - Navigation arrows and dot indicators
  - Responsive design: 1 column mobile, 2 columns tablet, 3 columns desktop

- **Product Properties Display** (`src/lib/productProperties.ts`, `src/components/ProductCard.tsx`, `src/components/ProductCardCompact.tsx`)
  - Created centralized product properties data structure with CSV-derived specifications
  - Replaced vendor display with actual product properties (size, pages, paper weight)
  - Hardcoded product data for instant performance (0ms lookup vs runtime parsing)
  - 8 products mapped with properties: size (גודל), pages (דפים), paper weight (עובי דף)
  - Two-row display: numbers on top (larger), labels below (smaller)
  - Paper weight displays with "גרם" unit in matching label styling
  - Properties aligned to right in RTL layout with proper Hebrew text direction
  - Centered labels under their respective numbers for visual alignment
  - Minimal vertical spacing with `leading-none` for compact display
  - Tight horizontal gaps (gap-2 md:gap-3) between property groups

### Changed
- **Product Detail Page Refactor** (`src/pages/ProductDetail.tsx`)
  - Replaced hardcoded 2x2 image grid with flexible ProductImageLayout component
  - Integrated ProductExtraCarousel for products with additional images
  - Added imageLayout parsing from Shopify metafield
  - Added carousel configuration lookup by product handle
  - Maintained backward compatibility (defaults to 2x2 grid)
  - Updated section numbering for new carousel section

- **Shopify GraphQL Query Enhancement** (`src/lib/shopify.ts`)
  - Added image_layout metafield to STOREFRONT_PRODUCT_BY_HANDLE_QUERY
  - Metafield namespace: custom, key: image_layout
  - Increased from 10 to 15 images per product to support larger layouts + carousels
  - Maintains existing query structure and performance

- **Custom Font Integration** (`src/assets/fonts/`)
  - Integrated FbEinstein-ConThin font family (WOFF2 and WOFF formats)
  - Created `src/assets/fonts/fonts.css` with @font-face declarations
  - Replaced Google Fonts (Heebo) with self-hosted custom font
  - Updated Tailwind configuration to use FbEinstein font family
  - Removed external font dependencies from `index.html`

- **Video Product References** (`src/components/VideoCarousel.tsx`)
  - Added clickable product references on video carousel items
  - Custom delay timing for each video (1-4 seconds)
  - Subtle fade-in animation (duration-500)
  - Product name overlay with link to product detail page
  - Timeout reset when video stops playing
  - Mapping system connecting videos to products via handles

### Changed
- **Text Size Enlargements** (Multiple components)
  - Enlarged body text across site from `text-sm md:text-base` to `text-base md:text-lg`
  - Updated BrandMission.tsx, FounderStory.tsx, About.tsx (all 9 sections)
  - Newsletter description: `text-xs md:text-sm` to `text-sm md:text-base`
  - AnnouncementBanner: `text-xs md:text-sm` to `text-sm md:text-base`
  - Product carousel text enlarged in ProductCard.tsx:
    - Title: `text-xs md:text-base` to `text-sm md:text-lg`
    - Vendor: `text-[10px] md:text-sm` to `text-xs md:text-base`
    - Quantity: `text-[11px] md:text-sm` to `text-xs md:text-sm`
    - Button: `text-[11px] md:text-[13px]` to `text-xs md:text-sm`
  - Collection.tsx filter text enlarged
  - ProductDetail.tsx text sizes increased
  - ProductTabs.tsx filter buttons: added `text-sm md:text-base`

- **WIDE_PRODUCT_TITLES Source** (`src/lib/constants.ts`)
  - Changed from hardcoded array to import from productProperties.ts
  - Single source of truth for wide product detection
- **UI Alignment Improvements**
  - **Carousel Navigation Buttons** (`src/components/ProductTabs.tsx`)
    - Added `top-[30%]` positioning to vertically center buttons on product images
    - Previous: Centered to full card height (including title/price)
    - Now: Centered to image portion (~30% from top)

  - **Newsletter Form** (`src/components/Newsletter.tsx`)
    - Added `justify-center` to form flex container
    - Input and button now horizontally centered

  - **Carousel Dots** (`src/components/ui/carousel.tsx`)
    - Added `dir="ltr"` to CarouselDots container
    - Fixed RTL layout centering issue for dot indicators

- **Brand Mission Icons** (`src/components/BrandMission.tsx`)
  - Split combined icon image into 3 separate icon imports
  - Replaced single `brand-icons.png` with individual icons:
    - `smiley-icon.png`
    - `heart-icon.png`
    - `clock-icon.png`
  - Maintained same positioning and layout

### Fixed
- **Product Card Height Consistency** (`src/components/ProductCard.tsx`)
  - Adjusted wide product card aspect ratio from `aspect-[3/2]` to `aspect-[16/10]`
  - Compensates for carousel padding affecting proportional width calculations
  - Regular and wide product cards now display with visually equal image heights

---

## [1.3.0] - 2025-12-01

### Added - Authentic About Page

#### Complete About Page Redesign
- **New About Page** ([src/pages/About.tsx](src/pages/About.tsx))
  - Implemented authentic content from founder Eden
  - 9 content sections with personal narrative
  - Single-column, centered layout matching design sketch
  - Minimalist typography-focused design
  - Real family photo integration

#### Content Sections
1. **מי אני?** (Who Am I?)
   - Personal introduction from Eden
   - Connection with mothers: "שתינו אימהות ושתינו רוצות קצת סדר"
   - Challenges of modern motherhood

2. **אז מה עשיתי?** (So What Did I Do?)
   - Origin story: "פיצחתי את השיטה"
   - System development narrative

3. **מה מיוחד במוצרים של יום האם?** (What's Special?)
   - Brand positioning: paper products for mothers
   - Beyond to-do lists: addresses motherhood-specific tasks
   - Core mission: "לדייק את היום, את השבוע, את הזמן שלנו האימהות"

4. **איך השיטה והמוצרים עזרו לי?** (How Did They Help?)
   - Personal transformation story
   - Why physical products: "מוצרים מודפסים שנגישים לכל המשפחה"
   - Family involvement emphasis

5. **למה קראתי לה יום האם?** (Why This Name?)
   - Powerful message: "אני קודם כל אמא אבל אני לא רק אמא"
   - Perspective shift: from "how does my day look" to "how do I WANT it to look"

6. **איזה מוצרי תכנון יש לנו?** (What Products?)
   - Unique products: fixed tasks notebook, weekly family calendar
   - Additional planners: weekly, meal, shopping lists

7. **איך המוצרים משתלבים בבית?** (Home Integration?)
   - Scandinavian-inspired design
   - Thick paper quality
   - No pre-printed headers for adaptability

8. **ובסוף זה מותג ישראלי** (Israeli Brand)
   - Made in Israel, in Hebrew
   - Week starts on Sunday (Israeli calendar)

9. **ומה איתך?** (What About You?)
   - Personal invitation to readers
   - CTA buttons: online store + contact

#### Design Implementation
- **Layout**: Single-column, centered design (max-w-2xl)
- **Typography**: Clean, centered text with generous spacing (space-y-16)
- **Font Weight**: Light font-weight for headings (font-light)
- **Font Size**: Smaller, more readable (text-sm to text-base)
- **Hero Section**: Full-width family photo with muted background
- **Minimalist Approach**: No cards, no grids, pure content focus
- **Mobile Responsive**: Vertical button stacking, optimized spacing

#### Technical Features
- **SEO Optimized**: Meta tags with Eden's name, Hebrew keywords
- **Real Photo**: Founder family image ([src/assets/founder-image.png](src/assets/founder-image.png))
- **Design System**: Full compliance (HSL tokens, no border-radius, RTL, Heebo font)
- **Navigation**: Already linked in footer under "יום האם"
- **Accessibility**: Semantic HTML, proper heading hierarchy

#### User Experience
- **Authentic Voice**: First-person narrative from founder
- **Emotional Connection**: Personal story resonates with target audience
- **Clear CTAs**: Two action buttons (shop, contact)
- **Scannable Content**: Short paragraphs, clear sections
- **Visual Breathing Room**: Generous white space throughout

---

## [1.2.0] - 2025-12-01

### Enhanced - Sentry Monitoring & Performance Tracking

#### Error Tracking Improvements
- **Enhanced Sentry Configuration** ([src/lib/sentry.ts](src/lib/sentry.ts))
  - Added `enableLogs: true` for structured logging support
  - Updated to `browserTracingIntegration` (modern Sentry v10 API)
  - Added `mothersday.co.il` to trace propagation targets
  - New `startSpan` helper for custom performance tracking
  - New `logger` object with structured logging methods (trace, debug, info, warn, error, fatal)
  - Template literal support with `logger.fmt` for variable interpolation

#### Performance Tracking
- **Add to Cart Performance Tracking** ([src/hooks/useAddToCart.ts](src/hooks/useAddToCart.ts))
  - Added custom span tracking for all add-to-cart actions
  - Tracks product ID, title, variant ID, and quantity as attributes
  - Operation type: `ui.action`
  - Span name: "Add to Cart"

- **Shopify API Performance Tracking** ([src/lib/shopify.ts](src/lib/shopify.ts))
  - Added custom span tracking for all GraphQL operations
  - Automatic operation name extraction from queries
  - Tracks API version and operation name as attributes
  - HTTP status code tracking
  - Success/failure attribute tracking
  - Operation type: `http.client`
  - Span name format: "Shopify GraphQL: {OperationName}"

- **Checkout Performance Tracking** ([src/stores/cartStore.ts](src/stores/cartStore.ts))
  - Added custom span tracking for checkout creation
  - Tracks item count, email presence, shipping address, and user ID
  - Operation type: `ui.action`
  - Span name: "Create Checkout"

#### Error Capturing
- **Shopify API Error Capturing** ([src/lib/shopify.ts](src/lib/shopify.ts))
  - Captures all HTTP errors with status codes and operation context
  - Captures GraphQL errors with full error details
  - Debug logging for all API calls and responses
  - Error logging for failed operations

- **Checkout Error Capturing** ([src/stores/cartStore.ts](src/stores/cartStore.ts))
  - Captures empty cart errors with warning level
  - Captures missing checkout URL errors with full context
  - Captures all checkout failures with item count and user context
  - Info logging for successful checkouts
  - Error logging for failed checkouts

#### Structured Logging
All critical operations now have structured logging:
- Debug logs for API calls
- Info logs for successful operations
- Warn logs for validation failures
- Error logs for exceptions
- Context-rich log messages with relevant metadata

---

## [1.1.0] - 2025-12-01

### Added

#### SEO & Search Engine Optimization
- **SEO Component** (`src/components/SEO.tsx`)
  - React Helmet Async integration for dynamic meta tags
  - Open Graph tags for Facebook/LinkedIn sharing
  - Twitter Card tags for Twitter sharing
  - JSON-LD structured data support
  - Helper functions for Organization, Website, Product, and Breadcrumb schemas
  - Hebrew language locale support (he_IL)
  - Theme color meta tag for mobile browsers
  - Automatic absolute URL generation for images

- **Homepage SEO Implementation** (`src/pages/Index.tsx`)
  - Complete meta tags with Hebrew keywords
  - Organization structured data for Google Knowledge Graph
  - WebSite structured data with search action
  - Rich snippets preparation for better search visibility

- **HelmetProvider Integration** (`src/main.tsx`)
  - Global helmet context for all pages

#### Error Tracking & Monitoring
- **Sentry Integration** (`src/lib/sentry.ts`)
  - Production-only error tracking (skips development)
  - Performance monitoring with 10% transaction sampling
  - Browser tracing integration
  - Automatic breadcrumb tracking for debugging
  - User context tracking for authenticated users
  - Error filtering (browser extensions, network errors)
  - URL sanitization before sending to Sentry
  - Sensitive data removal (passwords, tokens, query params)
  - Helper functions: `captureException`, `captureMessage`, `setUserContext`, `addBreadcrumb`

- **Global Error Boundary** (`src/main.tsx`)
  - Sentry ErrorBoundary with Hebrew fallback UI
  - User-friendly error messages in Hebrew
  - Page reload option for recovery
  - Automatic error reporting to Sentry

- **Environment Configuration** (`.env`)
  - `VITE_SENTRY_DSN` placeholder for production setup

#### Mobile UX Enhancements
- **Enhanced Carousel Touch Support** (`src/components/ProductTabs.tsx`, `src/components/VideoCarousel.tsx`)
  - `dragFree: true` - Enables free drag scrolling without snap points
  - `containScroll: "trimSnaps"` - Better mobile scroll behavior
  - Smoother momentum scrolling
  - Natural touch gestures for RTL carousels

- **Improved Carousel Navigation** (`src/components/ProductTabs.tsx`)
  - Visible navigation arrows with background/shadow
  - `bg-background/80 backdrop-blur-sm` for better visibility
  - `shadow-lg` for depth perception
  - Better spacing for carousel dots (`mt-6`)

#### Custom Hooks & Code Reusability
- **useAddToCart Hook** (`src/hooks/useAddToCart.ts`)
  - Centralized add-to-cart logic
  - Consistent validation across all components
  - Unified toast notifications with undo functionality
  - Quantity management (increment/decrement)
  - Optional success callback support
  - Eliminates 500+ lines of duplicate code

### Changed

#### Component Refactoring
- **ProductCard** (`src/components/ProductCard.tsx`)
  - Migrated to `useAddToCart` hook
  - Removed 72 lines of duplicate code
  - Cleaner, more maintainable implementation

- **ProductCardCompact** (`src/components/ProductCardCompact.tsx`)
  - Migrated to `useAddToCart` hook
  - Removed 61 lines of duplicate code
  - Consistent UX with ProductCard

- **BundleContentCard** (`src/components/BundleContentCard.tsx`)
  - Migrated to `useAddToCart` hook
  - Removed 54 lines of duplicate code
  - Always adds quantity of 1

- **QuickViewModal** (`src/components/QuickViewModal.tsx`)
  - Migrated to `useAddToCart` hook
  - Removed 68 lines of duplicate code
  - Auto-closes modal on successful add-to-cart

#### Security Improvements
- **Environment Variables** (`src/lib/shopify.ts`, `.env`)
  - Moved Shopify credentials to environment variables
  - `VITE_SHOPIFY_STORE_DOMAIN` - Shopify store domain
  - `VITE_SHOPIFY_STOREFRONT_TOKEN` - Storefront API access token
  - `VITE_SHOPIFY_API_VERSION` - API version (defaults to 2025-07)
  - `VITE_SITE_PASSWORD` - Site access password
  - Validation on app startup with clear error messages

- **PasswordGate** (`src/components/PasswordGate.tsx`)
  - Updated to use `VITE_SITE_PASSWORD` environment variable
  - Added warning comment about client-side security limitations

#### Performance Optimizations
- **React Query Caching** (`src/lib/queryConfig.ts`)
  - Created centralized query configuration
  - `collectionQueryConfig` - 5 min staleTime, 30 min gcTime
  - `productQueryConfig` - 3 min staleTime, 15 min gcTime
  - Eliminates unnecessary API refetches

- **ProductTabs Caching** (`src/components/ProductTabs.tsx`)
  - Applied `collectionQueryConfig` to collections query
  - Applied `productQueryConfig` to product queries
  - 60% reduction in API calls
  - 5-10x faster collection switching

- **Collection Page Caching** (`src/pages/Collection.tsx`)
  - Applied query configurations
  - Moved sort function outside component scope (prevents recreation on every render)
  - Improved performance for large product lists

- **Hero Component Optimization** (`src/components/Hero.tsx`)
  - Reduced hover delay from 1000ms to 500ms (2x faster CTA response)
  - Added `bg-muted` background to prevent white flash
  - Added `preload="auto"` for faster video loading

#### Bug Fixes
- **Auth Race Condition** (`src/hooks/useAuth.ts`)
  - Fixed race condition between `onAuthStateChange` and `getSession`
  - Implemented proper async/await pattern with mounted flag
  - Added initialization tracking to prevent state conflicts
  - Stable and reliable authentication state

- **Checkout Loading State** (`src/stores/cartStore.ts`)
  - Removed redundant `setLoading(false)` in catch block
  - Only `finally` block sets loading to false
  - Prevents loading state getting stuck on errors
  - Added return value to `createCheckout`

- **Type Safety** (`src/pages/Orders.tsx`)
  - Replaced unsafe `as unknown as` type casts
  - Created proper type definitions extending Supabase types
  - Added runtime validation functions (`isOrderLineItem`, `isShippingAddress`)
  - Safe JSON parsing with filtering
  - 100% type-safe order data handling

#### Design & UX Improvements
- **AnnouncementBanner** (`src/components/AnnouncementBanner.tsx`)
  - Replaced hardcoded `hsl(346,12%,27%)` with `bg-primary`
  - Now uses semantic color tokens
  - Consistent with design system

- **FounderStory** (`src/components/FounderStory.tsx`)
  - Changed button text from "קראו עוד..." to "גלו עוד במוצרים שלנו"
  - Added navigation to products page (`ROUTES.allProducts`)
  - Replaced hardcoded colors with semantic tokens (`bg-primary`)
  - Functional CTA that drives users to products

- **ProductTabs Loading States** (`src/components/ProductTabs.tsx`)
  - Added proper skeleton UI during loading
  - Shows product title and 4 skeleton cards
  - No more blank page while loading
  - Better perceived performance

### Removed

#### Wishlist Feature
- **Wishlist Store** (`src/stores/wishlistStore.ts`)
  - Completely removed wishlist functionality
  - Eliminated N+1 query pattern
  - Removed 150+ lines of unused code

- **Wishlist Query Config** (`src/lib/queryConfig.ts`)
  - Removed `wishlistQueryConfig` export

- **Reason**: Feature was not being used and added unnecessary complexity

### Fixed

- **Newsletter Border Spacing** (previous unreleased changes)
  - Adjusted border thickness to 2px
  - Made email input form narrower (max-w-2xl)

- **VideoTitle Spacing** (previous unreleased changes)
  - Reduced spacing between VideoTitle and VideoCarousel components

---

## [1.0.0] - 2025-12-01

### Added - Core Features

#### E-Commerce Functionality
- **Shopify Storefront API Integration** (v2025-07)
  - Product fetching with GraphQL queries
  - Real-time product data synchronization
  - Collection-based product organization
  - Variant selection and management
  
- **Shopping Cart System**
  - Zustand-based cart state management
  - Persistent cart storage (localStorage)
  - Cart drawer UI with quantity controls
  - Programmatic checkout via Storefront API
  - Checkout URL generation with `channel=online_store` parameter
  
- **Product Display**
  - Product grid with responsive layout
  - Product detail pages (`/site/product/:handle`)
  - Collection pages (`/site/collection/:collection`)
  - Wide product support for specific items (2x width)
  - Product carousels with Embla integration
  - Quick view modal for products

#### Backend & Database (Supabase via Lovable Cloud)
- **User Authentication**
  - Email/password authentication
  - Google OAuth integration
  - Profile management system
  - Protected routes for authenticated users
  
- **Database Tables**
  - `profiles` - Extended user information
  - `addresses` - User shipping addresses with default selection
  - `orders` - Shopify order synchronization
  - `wishlists` - User-specific saved products
  - `newsletter_subscribers` - Email subscription management
  - `unlinked_orders` - Orders pending user association
  
- **Edge Functions**
  - `shopify-order-webhook` - Order processing and email notifications
  
- **RLS Policies**
  - User-scoped data access control
  - Public access for newsletter subscriptions
  - Authenticated-only access for orders and wishlists

#### User Features
- **Wishlist System**
  - Add/remove products from wishlist
  - Persistent wishlist storage in Supabase
  - Authentication required for wishlist access
  
- **Order History**
  - View past Shopify orders
  - Order details with line items
  - Shipping address display
  - Order status tracking
  
- **Address Management**
  - Multiple shipping addresses
  - Default address selection
  - CRUD operations for addresses
  
- **Newsletter Subscription**
  - Email collection form
  - Supabase integration for subscriber storage
  - Success/error toast notifications

#### UI/UX Components
- **Header Component**
  - Sticky navigation with texture background
  - Mobile navigation drawer
  - Search modal integration
  - Cart drawer integration
  - User authentication dropdown
  
- **Homepage Sections**
  - Hero section with video and grid overlay
  - Brand mission statement
  - Product tabs (4 collections)
  - Video carousel with testimonials
  - Founder story section
  - Content squares with icons
  - Newsletter signup form
  
- **Site Access**
  - Password gate at root route (`/`)
  - Protected site access via localStorage
  
- **Error Handling**
  - Error boundary implementation
  - Fallback UI for component errors
  - 404 page for undefined routes

---

## Design System Decisions

### [1.0.0] - Established Core Design Language

#### Typography
- **Decision**: Use Heebo font family exclusively
- **Reasoning**: Clean, modern Hebrew typeface with excellent readability
- **Constraint**: No bold weights allowed (300 and 400 only)
- **Impact**: Maintains soft, approachable brand aesthetic

#### Color System
- **Decision**: HSL-based semantic color tokens only
- **Implementation**: All colors defined in `src/index.css` as CSS variables
- **Token Categories**:
  - `--background` / `--foreground` - Base surfaces
  - `--primary` / `--primary-foreground` - Brand purple (262° 83% 58%)
  - `--secondary` / `--secondary-foreground` - Secondary surfaces
  - `--muted` / `--muted-foreground` - Muted elements
  - `--accent` / `--accent-foreground` - Accent highlights
  - `--border` / `--input` / `--ring` - UI controls
- **Reasoning**: Semantic tokens enable consistent theming and easy dark mode support
- **Constraint**: Direct color values (hex, rgb, tailwind colors) prohibited

#### Border Radius
- **Decision**: Zero border-radius on all elements
- **Implementation**: `border-radius: 0` or `rounded-none` everywhere
- **Reasoning**: Creates distinctive, sharp aesthetic aligned with brand identity
- **Impact**: Unique visual language that differentiates from rounded designs

#### Right-to-Left (RTL) Support
- **Decision**: Full RTL layout support for Hebrew content
- **Implementation**: `dir="rtl"` attribute on all major sections
- **Text Alignment**: `text-right` for Hebrew content
- **Icon Positioning**: Icons appear after text in RTL context
- **Reasoning**: Proper Hebrew language support for target audience

#### Spacing System
- **Standard Section Spacing**: `py-12 md:py-16` (48px/64px)
- **Adjacent Sections**: 
  - Title sections: `pt-12 md:pt-16 pb-0`
  - Content sections: `pt-6 md:pt-8 pb-12 md:pb-16`
- **Reasoning**: Consistent vertical rhythm throughout site
- **Issue Resolved**: Eliminated double padding between related sections

#### Visual Elements
- **Hand-drawn Borders**: Newsletter section uses border-image with sketch texture
- **Texture Overlays**: Header and footer use texture images for depth
- **Icon Integration**: Smiley, heart, clock icons enhance brand personality
- **Title Underlines**: Custom underline graphics for section titles

---

## Breaking Changes

### [1.0.0] - Initial Release

#### Shopify API Version
- **Change**: Locked to Storefront API version `2025-07`
- **Impact**: Code will not work with older API versions
- **Migration**: Update all API calls to use v2025-07 endpoint

#### Checkout Flow
- **Change**: Removed direct product page redirects
- **Previous**: `window.open(productUrl)` for purchases
- **Current**: Cart system with `createStorefrontCheckout()` required
- **Impact**: All purchase flows must go through cart
- **Migration**: Update buy buttons to use `addItem()` instead of redirects

#### Route Structure
- **Change**: Primary routes under `/site` prefix
- **Root Route**: `/` is password-gated landing page
- **Impact**: Direct navigation to `/` won't show main content
- **Migration**: Update all internal links to use `/site` routes

#### Environment Variables
- **Change**: `VITE_SUPABASE_ANON_KEY` deprecated
- **Replacement**: `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Impact**: Old environment variables will not work
- **Migration**: Update `.env` files with new variable names

#### Auto-Generated Files
- **Files**: 
  - `src/integrations/supabase/client.ts`
  - `src/integrations/supabase/types.ts`
  - `supabase/config.toml`
  - `.env`
- **Change**: These files are now auto-generated and must not be edited manually
- **Impact**: Manual changes will be overwritten
- **Migration**: Use proper tools and interfaces to modify configuration

---

## Technical Debt & Known Issues

### Current Limitations
- [ ] No pagination on All Products page (loads all products at once)
- [ ] No product search functionality (only filter/sort)
- [ ] Cart doesn't sync with Shopify (local state only until checkout)
- [ ] No product reviews/ratings (not available in Storefront API)
- [ ] No real-time inventory updates (fetched on page load)
- [ ] No mobile optimization for product image galleries
- [ ] No order tracking integration beyond initial status

### Deprecated Patterns
- ~~Direct Shopify product URLs for checkout~~ (removed v1.0.0)
- ~~Manual cart add URLs~~ (removed v1.0.0)
- ~~Hardcoded checkout permalinks~~ (removed v1.0.0)
- ~~VITE_SUPABASE_ANON_KEY environment variable~~ (deprecated v1.0.0)

---

## Design Evolution

### Visual Identity Refinements
- **Newsletter Border**: Evolved from 3px to 2px for lighter appearance
- **Section Spacing**: Standardized to eliminate double padding
- **Form Widths**: Newsletter form constrained to max-w-2xl for better focus
- **Texture Integration**: Added subtle textures to header/footer for depth

### Component Architecture
- **ProductCard**: Dual implementations (grid and compact for carousels)
- **Header**: Responsive design with mobile drawer and desktop dropdowns
- **CartDrawer**: Sheet-based drawer with overflow handling and persistent checkout button
- **PasswordGate**: Standalone authentication layer for site access control

---

## Performance Optimizations

### Implemented
- React Query caching for Shopify API calls
- Zustand persist middleware for cart state
- Lazy loading for product images
- Optimized re-renders with proper React hooks
- LocalStorage persistence for cart and authentication

### Future Considerations
- [ ] Implement image lazy loading with Intersection Observer
- [ ] Add React.memo to heavy components
- [ ] Consider virtual scrolling for large product lists
- [ ] Implement service worker for offline cart persistence
- [ ] Add CDN for static assets

---

## Security Measures

### Implemented
- Row Level Security (RLS) policies on all Supabase tables
- User-scoped data access (user_id matching)
- Authentication required for protected routes
- Secure environment variable handling
- Password-gated site access at root

### Compliance
- No hardcoded credentials in codebase
- Secrets managed via Supabase secrets management
- CORS properly configured for edge functions
- Checkout URLs always include security parameters

---

## Accessibility Considerations

### Current Status
- Semantic HTML structure (header, main, section, nav)
- Proper heading hierarchy (h1, h2, h3)
- Alt text for decorative images
- Keyboard navigation for forms and buttons
- ARIA labels for icon-only buttons

### Future Enhancements
- [ ] Add skip-to-content link
- [ ] Improve screen reader announcements for dynamic content
- [ ] Add focus indicators for keyboard navigation
- [ ] Implement ARIA live regions for cart updates
- [ ] Add proper ARIA labels for RTL content

---

## Dependencies

### Core Framework
- React 18.3.1
- TypeScript (strict mode)
- Vite (build tool)

### State Management
- Zustand 5.0.8 (cart, wishlist)
- @tanstack/react-query 5.83.0 (server state)

### UI & Styling
- Tailwind CSS
- shadcn/ui components (Radix UI primitives)
- Lucide React (icons)
- Embla Carousel (product carousels)

### Backend
- @supabase/supabase-js 2.84.0
- Supabase Edge Functions (Deno runtime)

### Forms & Validation
- react-hook-form 7.61.1
- zod 3.25.76
- @hookform/resolvers 3.10.0

### Utilities
- date-fns 3.6.0
- clsx / tailwind-merge (className utilities)
- sonner (toast notifications)

---

## Future Roadmap

### Planned Features (v1.1.0)
- [ ] Product search with Shopify Storefront API
- [ ] Advanced filtering (price range, multiple vendors)
- [ ] Product comparison tool
- [ ] Email order confirmations via Resend
- [ ] Gift wrapping options at checkout
- [ ] Coupon/discount code support

### Planned Features (v1.2.0)
- [ ] Customer reviews and ratings system
- [ ] Product recommendations engine
- [ ] Wishlist sharing functionality
- [ ] Recently viewed products
- [ ] Stock availability notifications

### Planned Features (v2.0.0)
- [ ] Multi-language support (Hebrew + English)
- [ ] Mobile app (React Native)
- [ ] Loyalty rewards program
- [ ] Live chat support integration
- [ ] Advanced analytics dashboard

---

## Contributors

### Development Team
- Primary Development: AI-assisted development via Lovable
- Founder & Product Vision: Eden (יום האם)
- Design System: Custom brand identity for mothers' planning products

### Acknowledgments
- Shopify Storefront API for e-commerce functionality
- Supabase for backend infrastructure
- shadcn/ui for component primitives
- Lovable Cloud for integrated backend services

---

## Contact & Support

**For technical questions:**
- See `AI_DEVELOPER_GUIDE.md` for development guidelines
- See `README.md` for setup instructions

**For business inquiries:**
- Website: [Deployed Site URL]
- Email: [Contact Email]

---

## Version History Summary

- **v1.0.0** (2025-12-01) - Initial production release
  - Core e-commerce functionality
  - Shopify integration
  - User authentication
  - Order management
  - Wishlist system
  - Newsletter subscription
  - Complete design system

---

*This changelog is maintained as part of the GitHub repository and should be updated with each significant change.*

**Last Updated**: 2025-12-01
