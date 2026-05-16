import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/db";
import { routeError } from "@/server/errors";
import { requireUser } from "@/server/session";
import { appOrigin, assertStripeCheckoutConfigured } from "@/server/stripe";

export async function POST(request: NextRequest) {
  try {
    const jwt = requireUser(request);
    const { stripe, priceId } = assertStripeCheckoutConfigured();
    const origin = appOrigin();

    const { data: row } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", jwt.id)
      .maybeSingle();

    const customerId =
      typeof row?.stripe_customer_id === "string" && row.stripe_customer_id.length > 0
        ? row.stripe_customer_id
        : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancel`,
      client_reference_id: jwt.id,
      metadata: { user_id: jwt.id },
      subscription_data: { metadata: { user_id: jwt.id } },
      ...(customerId ? { customer: customerId } : {})
    });

    if (!session.url) {
      return NextResponse.json({ error: "Не удалось создать сессию оплаты" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return routeError(error);
  }
}
