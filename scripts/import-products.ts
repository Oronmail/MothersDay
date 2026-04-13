import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yptpcpxyefboptosfxkh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY env var is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.resolve(__dirname, '..', 'products_export_1.csv');

const BUCKET = 'product-images';

// ---------------------------------------------------------------------------
// Known data
// ---------------------------------------------------------------------------
const COLLECTIONS = [
  { handle: 'הכל', title: 'הכל' },
  { handle: 'frontpage', title: 'מוצרי תכנון לאמא' },
  { handle: 'מוצרי-תכנון-שבועיים', title: 'מוצרי תכנון שבועיים' },
  { handle: 'מוצרי-תכנון-משלימים', title: 'מוצרי תכנון משלימים' },
  { handle: 'מארזים', title: 'מארזים' },
];

// Tag text -> collection handle
const TAG_TO_COLLECTION: Record<string, string> = {
  'מוצרי תכנון לאימהות': 'frontpage',
  'מוצרי תכנון שבועיים': 'מוצרי-תכנון-שבועיים',
  'מוצרי תכנון משלימים': 'מוצרי-תכנון-משלימים',
};

const BUNDLE_MAPPINGS: Record<string, string[]> = {
  'מארז-תכנון': ['לוח-שבועי', 'תכנון-ארוחות-משפחתי-שבועי', 'רשימת-קניות-סידורים'],
  'מארז-פודרה': ['לוח-שבועי', 'מחברת-שורות-בינונית', 'בלוק-תכנון-בינוני'],
  'מארז-אבן': ['רשימת-קניות-סידורים', 'מחברת-שורות-קטנה', 'בלוק-תכנון-קטן'],
  'מארז-יין': ['תכנון-ארוחות-משפחתי-שבועי', 'בלוק-תכנון-גדול'],
  'מארז-בלוקים-1': ['בלוק-תכנון-קטן', 'בלוק-תכנון-בינוני', 'בלוק-תכנון-גדול'],
  'מארז-מחברות': ['מחברת-שורות-בינונית', 'מחברת-שורות-קטנה'],
};

// Map the bundle-item handle references (which may not exist in CSV) to
// their product title so we can resolve them from the DB later.
const HANDLE_TO_TITLE: Record<string, string> = {
  'לוח-שבועי': 'לוח שבועי',
  'תכנון-ארוחות-משפחתי-שבועי': 'תכנון ארוחות משפחתי שבועי',
  'רשימת-קניות-סידורים': 'רשימת קניות / סידורים',
  'מחברת-שורות-בינונית': 'מחברת שורות בינונית',
  'בלוק-תכנון-בינוני': 'בלוק תכנון בינוני',
  'מחברת-שורות-קטנה': 'מחברת שורות קטנה',
  'בלוק-תכנון-קטן': 'בלוק תכנון קטן',
  'בלוק-תכנון-גדול': 'בלוק תכנון גדול',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CsvRow {
  Handle: string;
  Title: string;
  'Body (HTML)': string;
  Vendor: string;
  Status: string;
  Published: string;
  Tags: string;
  'Option1 Name': string;
  'Option1 Value': string;
  'Variant SKU': string;
  'Variant Price': string;
  'Variant Compare At Price': string;
  'Image Src': string;
  'Image Position': string;
  'Image Alt Text': string;
  'SEO Title': string;
  'SEO Description': string;
  'Page Quantity (product.metafields.custom.page_quantity)': string;
  'Page size (product.metafields.custom.page_size)': string;
  'page weight (product.metafields.custom.page_weight)': string;
  'Color (product.metafields.shopify.color-pattern)': string;
  'Paper type (product.metafields.shopify.paper-type)': string;
  [key: string]: string;
}

interface ProductGroup {
  handle: string;
  rows: CsvRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group CSV rows by Handle */
function groupByHandle(rows: CsvRow[]): Map<string, CsvRow[]> {
  const map = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const h = row.Handle;
    if (!map.has(h)) map.set(h, []);
    map.get(h)!.push(row);
  }
  return map;
}

/** Download a file from a URL and return the buffer */
async function downloadImage(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Get file extension from Shopify CDN URL */
function getExtFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop() || 'png';
    return ext;
  } catch {
    return 'png';
  }
}

/** Upload buffer to Supabase Storage and return the public URL */
async function uploadToStorage(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });
  if (error) throw new Error(`Storage upload failed for ${storagePath}: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Product Import Script ===\n');

  // -----------------------------------------------------------------------
  // 1. Parse CSV
  // -----------------------------------------------------------------------
  console.log('1. Parsing CSV...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const allRows: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  console.log(`   Total CSV rows: ${allRows.length}`);

  const grouped = groupByHandle(allRows);
  console.log(`   Unique handles: ${grouped.size}`);

  // -----------------------------------------------------------------------
  // 2. Filter: active + published only
  // -----------------------------------------------------------------------
  console.log('\n2. Filtering active + published products...');
  const activeProducts: ProductGroup[] = [];
  const draftProducts: ProductGroup[] = [];

  for (const [handle, rows] of grouped) {
    const first = rows[0];
    if (first.Status === 'active' && first.Published === 'true') {
      activeProducts.push({ handle, rows });
    } else if (first.Status === 'draft') {
      draftProducts.push({ handle, rows });
    }
  }
  console.log(`   Active + published: ${activeProducts.length}`);
  console.log(`   Draft (for price reference): ${draftProducts.length}`);

  // Build draft title -> price map (for bundles with 0 price)
  const draftTitleToPrice = new Map<string, number>();
  for (const { rows } of draftProducts) {
    const title = rows[0].Title?.trim();
    const price = parseFloat(rows[0]['Variant Price']) || 0;
    if (title && price > 0) {
      draftTitleToPrice.set(title, price);
    }
  }

  // -----------------------------------------------------------------------
  // 3. Determine bundle handles
  // -----------------------------------------------------------------------
  const bundleHandles = new Set(Object.keys(BUNDLE_MAPPINGS));

  // -----------------------------------------------------------------------
  // 4. Insert collections
  // -----------------------------------------------------------------------
  console.log('\n3. Inserting collections...');
  for (const col of COLLECTIONS) {
    const { error } = await supabase
      .from('collections')
      .upsert(
        { handle: col.handle, title: col.title },
        { onConflict: 'handle' },
      );
    if (error) {
      console.error(`   Failed to insert collection ${col.handle}:`, error.message);
    } else {
      console.log(`   Collection: ${col.title}`);
    }
  }

  // Fetch collection IDs
  const { data: collectionsData } = await supabase.from('collections').select('id, handle');
  const collectionIdByHandle = new Map<string, string>();
  for (const c of collectionsData || []) {
    collectionIdByHandle.set(c.handle, c.id);
  }

  // -----------------------------------------------------------------------
  // 5. Process each product
  // -----------------------------------------------------------------------
  console.log('\n4. Processing products...\n');

  let productCount = 0;
  let imageCount = 0;
  let variantCount = 0;

  for (const { handle, rows } of activeProducts) {
    const first = rows[0];
    const title = first.Title?.trim() || handle;
    const isBundle = bundleHandles.has(handle);

    // Determine price: use draft price for zero-price bundles
    let price = parseFloat(first['Variant Price']) || 0;
    if (isBundle && price === 0) {
      const draftPrice = draftTitleToPrice.get(title);
      if (draftPrice) {
        price = draftPrice;
        console.log(`   Bundle "${title}": using draft price ${price}`);
      }
    }

    const compareAtPrice = parseFloat(first['Variant Compare At Price']) || null;

    // Parse tags
    const tagsRaw = first.Tags?.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    // Metafields
    const pageQuantity = first['Page Quantity (product.metafields.custom.page_quantity)']?.trim() || null;
    const pageSize = first['Page size (product.metafields.custom.page_size)']?.trim() || null;
    const pageWeight = first['page weight (product.metafields.custom.page_weight)']?.trim() || null;
    const colorPattern = first['Color (product.metafields.shopify.color-pattern)']?.trim() || null;
    const paperType = first['Paper type (product.metafields.shopify.paper-type)']?.trim() || null;

    const seoTitle = first['SEO Title']?.trim() || null;
    const seoDescription = first['SEO Description']?.trim() || null;

    // ---------------------------------------------------------------
    // 5a. Upsert product
    // ---------------------------------------------------------------
    const productPayload = {
      handle,
      title,
      description_html: first['Body (HTML)'] || '',
      vendor: first.Vendor || 'MothersDay',
      status: 'active' as const,
      is_bundle: isBundle,
      price,
      compare_at_price: compareAtPrice,
      tags,
      page_quantity: pageQuantity,
      page_size: pageSize,
      page_weight: pageWeight,
      color_pattern: colorPattern,
      paper_type: paperType,
      seo_title: seoTitle,
      seo_description: seoDescription,
      sort_order: productCount,
    };

    const { data: upsertedProduct, error: productError } = await supabase
      .from('products')
      .upsert(productPayload, { onConflict: 'handle' })
      .select('id')
      .single();

    if (productError) {
      console.error(`   FAILED to upsert product "${title}" (${handle}):`, productError.message);
      continue;
    }

    const productId = upsertedProduct.id;
    productCount++;
    console.log(`   [${productCount}] ${title} (${handle}) - ${price} ILS`);

    // ---------------------------------------------------------------
    // 5b. Download and upload images
    // ---------------------------------------------------------------
    const imageRows = rows.filter((r) => r['Image Src']?.trim());

    // Delete existing images for this product (in case of re-run)
    await supabase.from('product_images').delete().eq('product_id', productId);

    for (const imgRow of imageRows) {
      const imgUrl = imgRow['Image Src'].trim();
      const position = parseInt(imgRow['Image Position']) || 0;
      const altText = imgRow['Image Alt Text']?.trim() || null;
      const ext = getExtFromUrl(imgUrl);
      // Use product UUID for storage path (Hebrew handles are invalid storage keys)
      const storagePath = `${productId}/${position}.${ext}`;
      const contentType = ext === 'jpg' ? 'image/jpeg' : 'image/png';

      try {
        const buffer = await downloadImage(imgUrl);
        const publicUrl = await uploadToStorage(storagePath, buffer, contentType);

        const { error: imgError } = await supabase.from('product_images').insert({
          product_id: productId,
          url: publicUrl,
          alt_text: altText,
          position,
          is_variant_image: false,
        });

        if (imgError) {
          console.error(`      Image ${position} insert failed:`, imgError.message);
        } else {
          imageCount++;
        }
      } catch (err: any) {
        console.error(`      Image ${position} failed: ${err.message}`);
      }

      // Small delay to avoid rate-limiting
      await sleep(50);
    }
    console.log(`      ${imageRows.length} images processed`);

    // ---------------------------------------------------------------
    // 5c. Insert variants
    // ---------------------------------------------------------------
    // Delete existing variants for this product
    await supabase.from('product_variants').delete().eq('product_id', productId);

    // Collect variant rows (rows that have Option1 Value set)
    const variantRows = rows.filter(
      (r) => r['Option1 Value']?.trim() && r['Variant Price']?.trim(),
    );
    const option1Name = first['Option1 Name']?.trim() || 'Title';

    if (
      option1Name === 'Title' &&
      variantRows.length <= 1 &&
      first['Option1 Value']?.trim() === 'Default Title'
    ) {
      // Default variant (no real options)
      const { data: variantData, error: variantError } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          title: 'Default Title',
          price,
          compare_at_price: compareAtPrice,
          available_for_sale: true,
          sku: first['Variant SKU']?.trim() || null,
          sort_order: 0,
        })
        .select('id')
        .single();

      if (variantError) {
        console.error(`      Default variant insert failed:`, variantError.message);
      } else {
        variantCount++;
      }
    } else {
      // Real variants
      let sortOrder = 0;
      for (const vRow of variantRows) {
        const variantTitle = vRow['Option1 Value']?.trim() || 'Default Title';
        const variantPrice = parseFloat(vRow['Variant Price']) || price;
        const variantCompare = parseFloat(vRow['Variant Compare At Price']) || null;
        const sku = vRow['Variant SKU']?.trim() || null;

        const { data: variantData, error: variantError } = await supabase
          .from('product_variants')
          .insert({
            product_id: productId,
            title: variantTitle,
            price: variantPrice,
            compare_at_price: variantCompare,
            available_for_sale: true,
            sku,
            sort_order: sortOrder,
          })
          .select('id')
          .single();

        if (variantError) {
          console.error(`      Variant "${variantTitle}" insert failed:`, variantError.message);
        } else {
          variantCount++;

          // Insert variant option
          if (option1Name !== 'Title') {
            await supabase.from('variant_options').insert({
              variant_id: variantData.id,
              name: option1Name,
              value: variantTitle,
            });
          }
        }
        sortOrder++;
      }
    }

    // ---------------------------------------------------------------
    // 5d. Assign to collections
    // ---------------------------------------------------------------
    // All products go into "הכל"
    const allCollectionId = collectionIdByHandle.get('הכל');
    if (allCollectionId) {
      await supabase
        .from('collection_products')
        .upsert(
          { collection_id: allCollectionId, product_id: productId, position: productCount },
          { onConflict: 'collection_id,product_id' },
        );
    }

    // Bundles go into "מארזים"
    if (isBundle) {
      const bundlesCollectionId = collectionIdByHandle.get('מארזים');
      if (bundlesCollectionId) {
        await supabase
          .from('collection_products')
          .upsert(
            { collection_id: bundlesCollectionId, product_id: productId, position: productCount },
            { onConflict: 'collection_id,product_id' },
          );
      }
    }

    // Tag-based collections
    for (const tag of tags) {
      const colHandle = TAG_TO_COLLECTION[tag];
      if (colHandle) {
        const colId = collectionIdByHandle.get(colHandle);
        if (colId) {
          await supabase
            .from('collection_products')
            .upsert(
              { collection_id: colId, product_id: productId, position: productCount },
              { onConflict: 'collection_id,product_id' },
            );
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // 6. Insert bundle_items
  // -----------------------------------------------------------------------
  console.log('\n5. Inserting bundle items...');

  // Fetch all products to resolve handle/title -> id
  const { data: allProducts } = await supabase.from('products').select('id, handle, title');
  const productByHandle = new Map<string, string>();
  const productByTitle = new Map<string, string>();
  for (const p of allProducts || []) {
    productByHandle.set(p.handle, p.id);
    productByTitle.set(p.title, p.id);
  }

  // Helper to resolve a bundle item handle to a product ID
  function resolveProductId(itemHandle: string): string | null {
    // Try direct handle match first
    const byHandle = productByHandle.get(itemHandle);
    if (byHandle) return byHandle;
    // Try matching by title
    const title = HANDLE_TO_TITLE[itemHandle];
    if (title) {
      const byTitle = productByTitle.get(title);
      if (byTitle) return byTitle;
    }
    return null;
  }

  for (const [bundleHandle, itemHandles] of Object.entries(BUNDLE_MAPPINGS)) {
    const bundleId = productByHandle.get(bundleHandle);
    if (!bundleId) {
      console.error(`   Bundle "${bundleHandle}" not found in DB`);
      continue;
    }

    let position = 0;
    for (const itemHandle of itemHandles) {
      const itemProductId = resolveProductId(itemHandle);
      if (!itemProductId) {
        console.error(`   Bundle item "${itemHandle}" not found in DB`);
        continue;
      }

      const { error } = await supabase
        .from('bundle_items')
        .upsert(
          {
            bundle_id: bundleId,
            product_id: itemProductId,
            quantity: 1,
            position,
          },
          { onConflict: 'bundle_id,product_id' },
        );

      if (error) {
        console.error(`   bundle_item ${bundleHandle} -> ${itemHandle} failed:`, error.message);
      }
      position++;
    }
    console.log(`   Bundle "${bundleHandle}": ${itemHandles.length} items`);
  }

  // -----------------------------------------------------------------------
  // 7. Summary
  // -----------------------------------------------------------------------
  console.log('\n=== Import Complete ===');
  console.log(`   Products: ${productCount}`);
  console.log(`   Images: ${imageCount}`);
  console.log(`   Variants: ${variantCount}`);
  console.log(`   Collections: ${COLLECTIONS.length}`);
  console.log(`   Bundle mappings: ${Object.keys(BUNDLE_MAPPINGS).length}`);

  // -----------------------------------------------------------------------
  // 8. Verify
  // -----------------------------------------------------------------------
  console.log('\n=== Verification ===');
  const { count: prodCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  const { count: imgCount } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true });
  const { count: varCount } = await supabase
    .from('product_variants')
    .select('*', { count: 'exact', head: true });
  const { count: colCount } = await supabase
    .from('collections')
    .select('*', { count: 'exact', head: true });
  const { count: colProdCount } = await supabase
    .from('collection_products')
    .select('*', { count: 'exact', head: true });
  const { count: bundleCount } = await supabase
    .from('bundle_items')
    .select('*', { count: 'exact', head: true });

  console.log(`   products: ${prodCount}`);
  console.log(`   product_images: ${imgCount}`);
  console.log(`   product_variants: ${varCount}`);
  console.log(`   collections: ${colCount}`);
  console.log(`   collection_products: ${colProdCount}`);
  console.log(`   bundle_items: ${bundleCount}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
