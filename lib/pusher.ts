import PusherServer from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher instance (used in API routes only)
export function getPusherServer(): PusherServer {
  return new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
  });
}

// Client-side singleton
let clientInstance: PusherClient | null = null;
export function getPusherClient(): PusherClient {
  if (!clientInstance) {
    clientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return clientInstance;
}

// Channel naming helpers
export const storeChannel = (storeSlug: string) => `store-${storeSlug}`;
export const vendorChannel = (vendorId: string) => `private-vendor-${vendorId}`;

// Event names
export const EVENTS = {
  STOCK_UPDATED: "stock-updated",   // { variantId, productId, newStock }
  ORDER_PAID:    "order-paid",      // { orderId, reference, totalAmount }
  ORDER_FULFILLED: "order-fulfilled", // { orderId }
} as const;
