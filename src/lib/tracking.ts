import { CartItem } from "@/lib/types";

/**
 * Central e-commerce event tracking.
 *
 * Every funnel event goes through here so analytics (GA4) and ad platforms
 * (Meta Pixel for Instagram/Facebook, once VITE_META_PIXEL_ID is set) receive
 * the same signal from the same call site. Without a pixel id the Meta side
 * is a no-op and GA4 keeps working alone.
 *
 * GA4 event names/shapes follow the official ecommerce schema
 * (developers.google.com/analytics/devguides/collection/ga4/ecommerce);
 * Meta events follow the standard-events list. Purchase passes the order id
 * as the Meta eventID so a future server-side Conversions API event for the
 * same order deduplicates instead of double-counting.
 */

const CURRENCY = "ILS";

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

export const initMetaPixel = () => {
  if (import.meta.env.MODE !== "production" || !META_PIXEL_ID || window.fbq) {
    return;
  }

  // The standard fbevents bootstrap: queue calls until the script loads.
  const fbq: MetaPixel = (...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue?.push(args);
    }
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = window._fbq || fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
};

const gtagEvent = (name: string, params?: Record<string, unknown>) => {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
};

const fbqTrack = (
  name: string,
  params?: Record<string, unknown>,
  eventId?: string
) => {
  if (typeof window.fbq === "function") {
    if (eventId) {
      window.fbq("track", name, params ?? {}, { eventID: eventId });
    } else {
      window.fbq("track", name, params ?? {});
    }
  }
};

export interface TrackedItem {
  item_id: string;
  item_name: string;
  item_variant?: string;
  price: number;
  quantity: number;
}

export const cartItemToTracked = (item: CartItem): TrackedItem => ({
  item_id: item.variantId,
  item_name: item.product.node.title,
  item_variant: item.variantTitle !== "Default Title" ? item.variantTitle : undefined,
  price: parseFloat(item.price.amount),
  quantity: item.quantity,
});

const itemsValue = (items: TrackedItem[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const contentIds = (items: TrackedItem[]) => items.map((item) => item.item_id);

export const trackPageView = (path: string) => {
  gtagEvent("page_view", { page_path: path });
  fbqTrack("PageView");
};

export const trackViewItem = (item: TrackedItem) => {
  gtagEvent("view_item", { currency: CURRENCY, value: item.price, items: [item] });
  fbqTrack("ViewContent", {
    content_ids: [item.item_id],
    content_type: "product",
    content_name: item.item_name,
    value: item.price,
    currency: CURRENCY,
  });
};

export const trackAddToCart = (item: TrackedItem) => {
  const value = item.price * item.quantity;
  gtagEvent("add_to_cart", { currency: CURRENCY, value, items: [item] });
  fbqTrack("AddToCart", {
    content_ids: [item.item_id],
    content_type: "product",
    content_name: item.item_name,
    value,
    currency: CURRENCY,
  });
};

export const trackRemoveFromCart = (item: TrackedItem) => {
  gtagEvent("remove_from_cart", {
    currency: CURRENCY,
    value: item.price * item.quantity,
    items: [item],
  });
};

export const trackAddToWishlist = (productId: string) => {
  gtagEvent("add_to_wishlist", { items: [{ item_id: productId }] });
  fbqTrack("AddToWishlist", { content_ids: [productId], content_type: "product" });
};

export const trackBeginCheckout = (items: TrackedItem[]) => {
  gtagEvent("begin_checkout", {
    currency: CURRENCY,
    value: itemsValue(items),
    items,
  });
  fbqTrack("InitiateCheckout", {
    content_ids: contentIds(items),
    content_type: "product",
    value: itemsValue(items),
    currency: CURRENCY,
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  });
};

/** Fired when the customer is handed over to the PayPlus hosted page. */
export const trackAddPaymentInfo = (items: TrackedItem[]) => {
  gtagEvent("add_payment_info", {
    currency: CURRENCY,
    value: itemsValue(items),
    items,
  });
  fbqTrack("AddPaymentInfo", {
    content_ids: contentIds(items),
    content_type: "product",
    value: itemsValue(items),
    currency: CURRENCY,
  });
};

export const trackPurchase = (order: {
  orderId: string;
  value: number;
  currency?: string | null;
  shipping?: number | null;
  items: TrackedItem[];
}) => {
  gtagEvent("purchase", {
    transaction_id: order.orderId,
    value: order.value,
    currency: order.currency || CURRENCY,
    shipping: order.shipping ?? 0,
    items: order.items,
  });
  // eventID = order id: a server-side Conversions API Purchase for the same
  // order will deduplicate against this browser event.
  fbqTrack(
    "Purchase",
    {
      content_ids: contentIds(order.items),
      content_type: "product",
      value: order.value,
      currency: order.currency || CURRENCY,
    },
    order.orderId
  );
};
