import Stripe from "stripe";
import { HttpError } from "@/server/errors";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) stripeSingleton = new Stripe(key);
  return stripeSingleton;
}

export function assertStripeCheckoutConfigured() {
  const stripe = getStripe();
  const price = process.env.STRIPE_PRICE_ID?.trim();
  if (!stripe || !price) {
    throw new HttpError(
      503,
      "Онлайн-оплата не настроена. Используйте ссылку поддержки проекта или задайте STRIPE_SECRET_KEY и STRIPE_PRICE_ID."
    );
  }
  return { stripe, priceId: price };
}

export function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
