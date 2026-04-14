type ProductImageTransformOptions = {
  width: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

const STORAGE_PUBLIC_SEGMENT = "/storage/v1/object/public/";
const STORAGE_RENDER_SEGMENT = "/storage/v1/render/image/public/";
const PRODUCT_IMAGES_BUCKET_PREFIX = "product-images/";

export const getOptimizedProductImageUrl = (
  src: string | undefined,
  { width, height, quality = 70, resize = "fill" }: ProductImageTransformOptions
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
    if (height) {
      url.searchParams.set("height", String(height));
    }
    url.searchParams.set("quality", String(quality));
    url.searchParams.set("resize", resize);

    return url.toString();
  } catch {
    return src;
  }
};

export const getProductCardImageUrl = (src: string | undefined) =>
  getOptimizedProductImageUrl(src, {
    width: 720,
    height: 900,
    quality: 70,
    resize: "fill",
  });

export const getProductThumbnailImageUrl = (src: string | undefined) =>
  getOptimizedProductImageUrl(src, {
    width: 256,
    height: 256,
    quality: 68,
    resize: "fill",
  });

export const getProductDetailImageUrl = (src: string | undefined) =>
  getOptimizedProductImageUrl(src, {
    width: 1400,
    quality: 78,
    resize: "contain",
  });

export const getProductDetailGridImageUrl = (src: string | undefined) =>
  getOptimizedProductImageUrl(src, {
    width: 1100,
    quality: 76,
    resize: "contain",
  });

export const getProductDetailLightboxImageUrl = (src: string | undefined) =>
  getOptimizedProductImageUrl(src, {
    width: 1800,
    quality: 82,
    resize: "contain",
  });
