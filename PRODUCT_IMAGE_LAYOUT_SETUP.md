# Product Image Layout Setup Guide

## Overview
This guide explains how to configure custom image layouts for products and add extra carousel sections using Shopify metafields.

## Features Implemented
1. **Flexible Image Layouts** - Configure different grid layouts per product via Shopify metafields
2. **Extra Image Carousels** - Add additional product detail images in carousel format (hardcoded mapping)

---

## Part 1: Shopify Metafield Setup

### Step 1: Create Metafield Definition in Shopify

1. Navigate to **Shopify Admin** → **Settings** → **Custom Data** → **Products**
2. Click **"Add definition"**
3. Fill in the following:
   - **Name**: `Image Layout`
   - **Namespace and key**:
     - Namespace: `custom`
     - Key: `image_layout`
   - **Description**: `JSON configuration for product image layout on detail page`
   - **Type**: Select **"JSON"**
   - **Validation**: None required (optional: can add JSON schema validation)
4. Click **"Save"**

### Step 2: Add Metafield Values to Products

#### For Product: מחברת יום האם לניהול משימות קבועות (handle: p1)

Navigate to: **Products** → **מחברת יום האם לניהול משימות קבועות** → **Metafields** section → **Image Layout**

**JSON Value:**
```json
{
  "type": "grid-2-1-3-2",
  "mainImages": [0, 1, 2, 3, 4, 5, 6, 7],
  "aspectRatios": ["10/7", "10/7", "16/9", "4/3", "4/3", "4/3", "4/3", "4/3"],
  "description": "Task notebook custom layout: 2 large top, 1 medium, 3 small, 2 small bottom"
}
```

#### For Product: לוח משפחתי (handle: p2)

Navigate to: **Products** → **לוח משפחתי** → **Metafields** section → **Image Layout**

**JSON Value:**
```json
{
  "type": "grid-2x2",
  "mainImages": [0, 1, 2, 3],
  "aspectRatios": ["10/7", "10/7", "10/7", "10/7"],
  "description": "Standard 2x2 grid layout"
}
```

#### For Product: לוח משפחתי + מסגרת עץ מגנטית (handle: p8)

Navigate to: **Products** → **לוח משפחתי + מסגרת עץ מגנטית** → **Metafields** section → **Image Layout**

**JSON Value:**
```json
{
  "type": "grid-2x2",
  "mainImages": [0, 1, 2, 3],
  "aspectRatios": ["10/7", "10/7", "10/7", "10/7"],
  "description": "Standard 2x2 grid layout"
}
```

---

## Available Layout Types

### 1. `grid-2x2` (Default)
Standard 2x2 grid with 4 images of equal size.

```json
{
  "type": "grid-2x2",
  "mainImages": [0, 1, 2, 3],
  "aspectRatios": ["10/7", "10/7", "10/7", "10/7"]
}
```

**Visual:**
```
┌─────────┬─────────┐
│ Image 0 │ Image 1 │
├─────────┼─────────┤
│ Image 2 │ Image 3 │
└─────────┴─────────┘
```

### 2. `grid-2-large-2-small`
Two large images on top, two smaller images on bottom.

```json
{
  "type": "grid-2-large-2-small",
  "mainImages": [0, 1, 2, 3],
  "aspectRatios": ["10/7", "10/7", "10/9", "10/9"]
}
```

**Visual:**
```
┌─────────┬─────────┐
│ Large 0 │ Large 1 │
│         │         │
├─────────┼─────────┤
│ Small 2 │ Small 3 │
└─────────┴─────────┘
```

### 3. `grid-hero-bottom`
One large hero image full-width, two smaller images below.

```json
{
  "type": "grid-hero-bottom",
  "mainImages": [0, 1, 2],
  "aspectRatios": ["16/9", "10/7", "10/7"]
}
```

**Visual:**
```
┌───────────────────┐
│   Hero Image 0    │
│                   │
├─────────┬─────────┤
│ Image 1 │ Image 2 │
└─────────┴─────────┘
```

### 4. `grid-3x1`
Three images in a horizontal row.

```json
{
  "type": "grid-3x1",
  "mainImages": [0, 1, 2],
  "aspectRatios": ["10/7", "10/7", "10/7"]
}
```

**Visual:**
```
┌──────┬──────┬──────┐
│Img 0 │Img 1 │Img 2 │
└──────┴──────┴──────┘
```

### 5. `grid-1-2-1`
One full-width top, two in middle, one full-width bottom.

```json
{
  "type": "grid-1-2-1",
  "mainImages": [0, 1, 2, 3],
  "aspectRatios": ["16/9", "10/7", "10/7", "16/9"]
}
```

**Visual:**
```
┌───────────────────┐
│    Image 0        │
├─────────┬─────────┤
│ Image 1 │ Image 2 │
├─────────┴─────────┤
│    Image 3        │
└───────────────────┘
```

### 6. `grid-2-1-3-2`
Eight images: 2 large top, 1 medium full-width, 3 small row, 2 small centered bottom.

```json
{
  "type": "grid-2-1-3-2",
  "mainImages": [0, 1, 2, 3, 4, 5, 6, 7],
  "aspectRatios": ["10/7", "10/7", "16/9", "4/3", "4/3", "4/3", "4/3", "4/3"]
}
```

**Visual:**
```
┌────────────┬────────────┐
│  Large 0   │  Large 1   │
├────────────┴────────────┤
│      Medium 2           │
├─────┬─────┬─────────────┤
│Sm 3 │Sm 4 │    Sm 5     │
├─────┴─────┴─────────────┤
│    ┌──────┬──────┐      │
│    │ Sm 6 │ Sm 7 │      │
│    └──────┴──────┘      │
└─────────────────────────┘
```

### 7. `grid-custom`
Custom layout with flexible aspect ratios. Add `-full` to aspect ratio for full-width.

```json
{
  "type": "grid-custom",
  "mainImages": [0, 1, 2, 3],
  "aspectRatios": ["16/9-full", "10/7", "10/7", "4/3"]
}
```

---

## Part 2: Extra Carousel Setup

### Configuration
Extra carousels are configured in `src/lib/productImageLayouts.ts` in the `PRODUCTS_WITH_EXTRA_CAROUSEL` constant.

**Current Configuration:**
```typescript
export const PRODUCTS_WITH_EXTRA_CAROUSEL: Record<string, ProductExtraCarouselConfig> = {
  // מחברת יום האם לניהול משימות קבועות
  "p1": {
    hasCarousel: true,
    carouselTitle: "כלי מתכנון במחברת",
    carouselImageStartIndex: 8,
    carouselImageEndIndex: 15,
    descriptionText: "המחברת כוללת טבלאות מדויקות שנועדו במיוחד לניהול משימות קבועות ומשימות חוזרות...",
  },

  // לוח משפחתי
  "p2": {
    hasCarousel: true,
    carouselTitle: "הטבלאות בלוח",
    carouselImageStartIndex: 4,
    carouselImageEndIndex: 8,
  },
};
```

### How It Works
- **Product p1 (Task Notebook)**:
  - Images 0-7: Main layout (8 images, grid-2-1-3-2)
  - Images 8-14: Carousel images (7 images)
  - Includes description text above carousel

- **Product p2 (Family Board)**:
  - Images 0-3: Main layout (4 images, grid-2x2)
  - Images 4-7: Carousel images (4 images)
  - No description text

### Adding Extra Carousel Images to Shopify

#### For מחברת יום האם לניהול משימות קבועות (p1):
1. Navigate to: **Shopify Admin** → **Products** → **מחברת יום האם לניהול משימות קבועות**
2. Scroll to **Media** section
3. Upload images in this order:
   - **Images 1-8**: Main product layout (8 images)
   - **Images 9-15**: Carousel images (7 images for "כלי מתכנון במחברת" section)
4. Click **"Save"**

#### For לוח משפחתי (p2):
1. Navigate to: **Shopify Admin** → **Products** → **לוח משפחתי**
2. Scroll to **Media** section
3. Upload images in this order:
   - **Images 1-4**: Main product layout (4 images)
   - **Images 5-8**: Carousel images (4 images for "הטבלאות בלוח" section)
4. Click **"Save"**

### Adding Another Product with Extra Carousel

To add another product with an extra carousel, edit `src/lib/productImageLayouts.ts`:

```typescript
export const PRODUCTS_WITH_EXTRA_CAROUSEL: Record<string, ProductExtraCarouselConfig> = {
  "p2": {
    hasCarousel: true,
    carouselTitle: "הטבלאות בלוח",
    carouselImageStartIndex: 4,
    carouselImageEndIndex: 8,
  },
  "your-product-handle": {
    hasCarousel: true,
    carouselTitle: "Your Hebrew Title",
    carouselImageStartIndex: 4,
    carouselImageEndIndex: 7, // Adjust based on number of carousel images
  },
};
```

---

## Image Index Reference

### Product p1 (Task Notebook) - 15 images total
```
Shopify Product Images (first: 15):
┌──────────────────────────────────────────────────┐
│ Index 0  → Main Layout (Image 1)                 │
│ Index 1  → Main Layout (Image 2)                 │
│ Index 2  → Main Layout (Image 3)                 │
│ Index 3  → Main Layout (Image 4)                 │
│ Index 4  → Main Layout (Image 5)                 │
│ Index 5  → Main Layout (Image 6)                 │
│ Index 6  → Main Layout (Image 7)                 │
│ Index 7  → Main Layout (Image 8)                 │
├──────────────────────────────────────────────────┤
│ Index 8  → Carousel (Image 1) - כלי מתכנון במחברת│
│ Index 9  → Carousel (Image 2)                    │
│ Index 10 → Carousel (Image 3)                    │
│ Index 11 → Carousel (Image 4)                    │
│ Index 12 → Carousel (Image 5)                    │
│ Index 13 → Carousel (Image 6)                    │
│ Index 14 → Carousel (Image 7)                    │
└──────────────────────────────────────────────────┘
```

### Product p2 (Family Board) - 8 images total
```
Shopify Product Images (first: 10):
┌─────────────────────────────────────────────────┐
│ Index 0  → Main Layout (Image 1)                │
│ Index 1  → Main Layout (Image 2)                │
│ Index 2  → Main Layout (Image 3)                │
│ Index 3  → Main Layout (Image 4)                │
├─────────────────────────────────────────────────┤
│ Index 4  → Carousel (Image 1) - הטבלאות בלוח    │
│ Index 5  → Carousel (Image 2)                   │
│ Index 6  → Carousel (Image 3)                   │
│ Index 7  → Carousel (Image 4)                   │
├─────────────────────────────────────────────────┤
│ Index 8  → Reserved                             │
│ Index 9  → Reserved                             │
└─────────────────────────────────────────────────┘
```

---

## Testing

### Local Testing
1. Start dev server: `npm run dev`
2. Navigate to product detail page: `/site/product/p2`
3. Verify:
   - Main images display in correct layout
   - Extra carousel section appears with title "הטבלאות בלוח"
   - Carousel navigation works
   - Images load correctly

### Production Testing
1. Build: `npm run build`
2. Deploy to production
3. Test on actual Shopify product pages
4. Verify metafields are being fetched correctly

---

## Troubleshooting

### Metafield Not Showing in Shopify Admin
- Ensure you created the metafield definition in **Settings** → **Custom Data** → **Products**
- Refresh the product page after creating the definition
- Check that namespace is `custom` and key is `image_layout`

### Layout Not Applying
- Verify JSON syntax is correct (use a JSON validator)
- Check browser console for parsing errors
- Ensure `type` field matches one of the available types
- Verify `mainImages` and `aspectRatios` arrays have correct length

### Carousel Not Showing
- Verify product handle is in `PRODUCTS_WITH_EXTRA_CAROUSEL` constant
- Check that enough images are uploaded to Shopify (at least 5+ images)
- Verify `carouselImageStartIndex` and `carouselImageEndIndex` are correct
- Check browser console for errors

### Images Not Loading
- Verify images are uploaded to Shopify product
- Check that Shopify GraphQL query is fetching 10 images: `images(first: 10)`
- Ensure image indices in configuration don't exceed available images

---

## File Structure

```
src/
├── lib/
│   ├── productImageLayouts.ts        # Configuration and helpers
│   └── shopify.ts                    # GraphQL query (includes metafield)
├── components/
│   ├── ProductImageLayout.tsx        # Layout renderer component
│   └── ProductExtraCarousel.tsx      # Extra carousel component
└── pages/
    └── ProductDetail.tsx             # Product detail page (integrated)
```

---

## Technical Details

### GraphQL Query Enhancement
The `STOREFRONT_PRODUCT_BY_HANDLE_QUERY` now includes:

```graphql
imageLayout: metafield(namespace: "custom", key: "image_layout") {
  value
}
```

### Type Definitions
See `src/lib/productImageLayouts.ts` for:
- `ImageLayoutType` - Available layout types
- `ImageLayoutConfig` - Layout configuration structure
- `ProductExtraCarouselConfig` - Carousel configuration structure

### Component Props
**ProductImageLayout:**
- `images` - Shopify images array
- `productTitle` - Product title for alt text
- `layout` - Parsed layout configuration
- `selectedImageIndex` - Currently selected image
- `onImageClick` - Image click handler

**ProductExtraCarousel:**
- `images` - Shopify images array
- `productTitle` - Product title for alt text
- `config` - Carousel configuration

---

## Future Enhancements

### Potential Improvements
1. **Lightbox/Modal** - Click main image to view full-screen
2. **Image Zoom** - Hover to zoom on product images
3. **Video Support** - Mix videos with images in layout
4. **Mobile Optimization** - Different layouts for mobile vs desktop
5. **Admin UI** - Visual metafield editor instead of JSON

### Scalability
- Currently supports 10 images per product
- Can increase by modifying `images(first: 10)` in GraphQL query
- Consider pagination for products with many images

---

## Support

For questions or issues:
1. Check browser console for errors
2. Verify Shopify metafield configuration
3. Review `PRODUCT_IMAGE_LAYOUT_SETUP.md` (this file)
4. Check `CHANGELOG.md` for version history
5. Refer to `CLAUDE_CODE_HANDOFF.md` for development guidelines

---

**Last Updated**: 2025-12-02
**Version**: 1.3.2
**Author**: Claude Code
