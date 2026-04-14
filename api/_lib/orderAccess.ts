import { createHmac, timingSafeEqual } from "crypto";

const normalizeOwnerRef = (ownerRef: string) => ownerRef.trim().toLowerCase();

export const getOrderAccessSecret = () => {
  const secret = process.env.ORDER_ACCESS_SECRET || process.env.SUPABASE_Secret_KEY;

  if (!secret) {
    throw new Error("Missing ORDER_ACCESS_SECRET or SUPABASE_Secret_KEY");
  }

  return secret;
};

export const createOrderAccessToken = (
  orderId: string,
  ownerRef: string,
  secret: string
) =>
  createHmac("sha256", secret)
    .update(`${orderId}:${normalizeOwnerRef(ownerRef)}`)
    .digest("base64url");

export const isValidOrderAccessToken = (
  orderId: string,
  ownerRef: string,
  providedToken: string,
  secret: string
) => {
  const expectedToken = createOrderAccessToken(orderId, ownerRef, secret);
  const expectedBuffer = Buffer.from(expectedToken);
  const providedBuffer = Buffer.from(providedToken);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
};
