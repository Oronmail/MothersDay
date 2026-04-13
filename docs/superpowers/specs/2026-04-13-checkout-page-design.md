# Checkout Page — Design Spec

**Date:** 2026-04-13
**Status:** Draft

---

## 1. Goal

Build a dedicated checkout page at `/site/checkout` that replaces the cart drawer's inline checkout flow. The page collects shipping details, displays order summary, and provides a payment integration point (Hyp iframe). Matches the existing site design pixel-for-pixel.

## 2. Design Language

Follows the existing mothersdayil design system:
- **Background:** #f4ede7 (warm cream)
- **Text:** #5a4340 (warm brown)
- **Primary:** #4d3c40 (dusty mauve) — buttons, active states
- **Secondary:** #d9c8b3 (warm tan) — hover states
- **Border:** #ede3d9 (light warm gray)
- **Accent/muted:** #a19c93 (taupe) — secondary text
- **Font:** FbEinstein / Heebo
- **Border radius:** 0 (sharp corners throughout)
- **Direction:** RTL Hebrew

## 3. Page Layout

Single-page checkout (no multi-step wizard). Two-column layout on desktop, single column on mobile.

**Desktop (>768px):**
- Right column (RTL main): form sections stacked vertically
- Left column (RTL sidebar): sticky order summary

**Mobile (<768px):**
- Order summary on top (collapsible)
- Form sections below

## 4. Sections (top to bottom)

### 4.1 Header Bar

Simplified checkout header (not the full site header):
- "חזרה לחנות" (back to store) link on the right
- "יום האם" logo centered
- No navigation, no cart icon — focused checkout experience

### 4.2 Contact Info (פרטי התקשרות)

**For guest users (not logged in):**
- Email input (required)
- "כבר יש לך חשבון? התחבר/י" link to auth page
- Phone input (required, Israeli format)

**For logged-in users:**
- Show email (from auth) — read-only with "change" link
- Phone from profile (editable)

### 4.3 Shipping Address (כתובת למשלוח)

**For logged-in users with saved addresses:**
- Radio list of saved addresses (name, street, city, phone)
- Default address pre-selected
- "+ הוסף כתובת חדשה" link expands the new address form

**For guests or new address:**
Address form with **Israeli address autocomplete** (data.gov.il API):

| Field | Type | Required | Autocomplete |
|-------|------|----------|-------------|
| שם מלא (Full name) | text | Yes | No |
| עיר (City) | search-as-you-type | Yes | data.gov.il cities API (~1,300 cities) |
| רחוב (Street) | search-as-you-type | Yes | data.gov.il streets API, filtered by selected city |
| מספר בית (House number) | text | Yes | No |
| דירה (Apartment) | text | No | No |
| מיקוד (Postal code) | text | No | Auto-fill from city+street if available |
| טלפון (Phone) | tel, dir="ltr" | Yes | No |

**Address autocomplete implementation:**

API endpoint: `https://data.gov.il/api/3/action/datastore_search`

- **Cities:** `resource_id=b7cf8f14-64a2-4b33-8d4b-edb286fdbd37`, search with `q` parameter
- **Streets:** resource from dataset/321, filtered by city code (`city_code` from selected city)
- Debounced search (300ms) — fires after user types 2+ characters
- Dropdown shows top 10 matches
- Keyboard navigation (arrow keys + enter)
- Hebrew text, RTL dropdown

### 4.4 Order Notes (הערות להזמנה)

Optional textarea for special instructions, delivery notes.

### 4.5 Payment (תשלום)

**Payment method tabs:**
- כרטיס אשראי (Credit card) — default
- Apple Pay
- Bit

**Payment form area:**
- Placeholder box with "טופס תשלום מאובטח" (secure payment form)
- When Hyp is integrated: iframe embeds here
- For now: order is created as `pending`, no payment collected

### 4.6 Order Summary Sidebar (סיכום הזמנה)

Sticky on desktop, collapsible on mobile.

- List of cart items with:
  - Product thumbnail image
  - Product title
  - Variant info (if applicable)
  - Quantity
  - Line price (₪)
- Subtotal (סכום ביניים)
- Shipping cost (משלוח) — "חינם" (free) or calculated
- **Total (סה״כ)** — bold, large
- CTA button: "אישור ותשלום — ₪{total}"
- "🔒 תשלום מאובטח ומוצפן" security note
- "עריכת העגלה" (edit cart) link back to cart

## 5. User Flow

```
Cart drawer → "מעבר לתשלום" button
    → /site/checkout page loads
    → Cart items shown in summary sidebar
    → User fills contact + shipping
    → Address autocomplete helps with city/street
    → User clicks "אישור ותשלום"
    → Order created in Supabase (financial_status: 'pending')
    → [Future: Hyp payment iframe processes card]
    → Redirect to /site/checkout/confirmation/:orderId
    → Confirmation page with order number + details
```

## 6. Order Confirmation Page

Route: `/site/checkout/confirmation/:orderId`

Shows:
- "ההזמנה התקבלה!" (Order received!) heading
- Order number
- Order items summary
- Shipping address
- "המשך לקנות" (Continue shopping) button
- For logged-in users: "צפה בהזמנות שלך" (View your orders) link

## 7. Cart Drawer Update

The cart drawer's checkout button changes:
- **Before:** Collects email/address inline, calls `createOrder()` directly
- **After:** Simply navigates to `/site/checkout`

The cart drawer remains for adding/removing items and quick view. Checkout happens on the dedicated page.

## 8. Components

| Component | File | Purpose |
|-----------|------|---------|
| `CheckoutPage` | `src/pages/Checkout.tsx` | Main checkout page orchestrator |
| `CheckoutSummary` | `src/components/checkout/CheckoutSummary.tsx` | Order summary sidebar |
| `CheckoutContactForm` | `src/components/checkout/CheckoutContactForm.tsx` | Email + phone for guests |
| `CheckoutShippingForm` | `src/components/checkout/CheckoutShippingForm.tsx` | Address form with autocomplete |
| `CheckoutPayment` | `src/components/checkout/CheckoutPayment.tsx` | Payment method tabs + iframe placeholder |
| `AddressAutocomplete` | `src/components/checkout/AddressAutocomplete.tsx` | Reusable city/street autocomplete input |
| `CheckoutConfirmation` | `src/pages/CheckoutConfirmation.tsx` | Post-order confirmation page |

## 9. Data Flow

```
CartStore (items) ──→ CheckoutPage
useAuth (user)    ──→ CheckoutPage
                      ├── CheckoutContactForm (email, phone)
                      ├── CheckoutShippingForm (address, autocomplete)
                      ├── CheckoutPayment (placeholder)
                      └── CheckoutSummary (items, totals)
                              │
                              ▼ "אישור ותשלום"
                      createOrder() from api.ts
                              │
                              ▼
                      Navigate to /site/checkout/confirmation/:orderId
```

## 10. Address Autocomplete Component

Reusable `AddressAutocomplete` component:

```typescript
interface AddressAutocompleteProps {
  type: 'city' | 'street';
  cityCode?: number; // required when type='street'
  value: string;
  onChange: (value: string, code?: number) => void;
  placeholder: string;
}
```

- Debounced fetch (300ms, min 2 chars)
- Dropdown with max 10 results
- Click or Enter to select
- Clears street when city changes
- Caches API responses in React Query

## 11. Validation

All validation via Zod + React Hook Form:

- Email: valid email format (required for guests)
- Phone: Israeli phone format (starts with 0, 10 digits)
- Full name: min 2 chars
- City: must be selected from autocomplete (not free text)
- Street: must be selected from autocomplete
- House number: required, non-empty

Error messages in Hebrew.

## 12. Mobile Considerations

- Order summary collapses to a single "סה״כ ₪440 — הצג פרטים" bar at top
- Tapping expands the full summary
- All form fields stack vertically
- Sticky CTA button at bottom of screen (like the product page add-to-cart bar)
- Address autocomplete dropdown positioned above input on mobile if near bottom of screen

## 13. Out of Scope

- Discount codes / promo codes (v2)
- Shipping method selection (single method for now)
- Shipping cost calculation (free shipping for v1)
- Actual payment processing (Hyp integration separate task)
- Order email notifications
