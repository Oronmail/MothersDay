type ProductImageTransformOptions = {
  width: number;
  quality?: number;
};

const STORAGE_PUBLIC_SEGMENT = "/storage/v1/object/public/";
const STORAGE_RENDER_SEGMENT = "/storage/v1/render/image/public/";
const PRODUCT_IMAGES_BUCKET_PREFIX = "product-images/";

export const getOptimizedProductImageUrl = (
  src: string | undefined,
  { width, quality = 70 }: ProductImageTransformOptions
) => {
  if (!src) return "";

  try {
    const url = new URL(src);
    const bucketPath = url.pathname.split(STORAGE_PUBLIC_SEGMENT)[1];

    if (!bucketPath?.startsWith(PRODUCT_IMAGES_BUCKET_PREFIX)) {
      return src;
    }

    url.pathname = url.pathname.replace(
      STORAGE_PUBLIC_SEGMENT,
      STORAGE_RENDER_SEGMENT
    );
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality));

    return url.toString();
  } catch {
    return src;
  }
};

export const getProductCardImageUrl = (src: string | undefined) =>
  getOptimizedProductImageUrl(src, { width: 720, quality: 70 });

export const getProductThumbnailImageUrl = (src: string | undefined) =>
  getOptimizedProductImageUrl(src, { width: 256, quality: 68 });
