import { NextResponse } from "next/server";
import { getCityCatalog } from "@/server/cityCatalog";
import { getStripe } from "@/server/stripe";

export async function GET() {
  const cities = await getCityCatalog();
  const stripeReady = !!(getStripe() && process.env.STRIPE_PRICE_ID?.trim());
  const donateUrl = process.env.NEXT_PUBLIC_DONATE_URL?.trim() ?? "";

  return NextResponse.json({
    cities,
    billing: { stripeCheckout: stripeReady },
    donateUrl
  });
}
