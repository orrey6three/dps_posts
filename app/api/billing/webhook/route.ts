import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/server/db";
import { getStripe } from "@/server/stripe";

export const runtime = "nodejs";

async function syncSubscriptionForUser(userId: string, stripe: NonNullable<ReturnType<typeof getStripe>>) {
  const { data: row } = await supabaseAdmin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  const cid = row?.stripe_customer_id as string | undefined;
  if (!cid) return;

  const subs = await stripe.subscriptions.list({ customer: cid, status: "active", limit: 3 });
  const active = subs.data.find((s) => s.status === "active");
  if (!active) {
    await supabaseAdmin.from("users").update({ subscription_until: null }).eq("id", userId);
    return;
  }
  const until = new Date(active.current_period_end * 1000).toISOString();
  await supabaseAdmin.from("users").update({ subscription_until: until }).eq("id", userId);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook не настроен" }, { status: 503 });
  }

  const body = await request.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Нет подписи Stripe" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Подпись webhook недействительна" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId = session.metadata?.user_id ?? session.client_reference_id;
        if (!userId || typeof userId !== "string") break;

        const subRef = session.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        const customerRaw = session.customer;
        const customerId =
          typeof customerRaw === "string" ? customerRaw : customerRaw?.id ?? null;

        if (customerId) {
          await supabaseAdmin.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
        }

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const until = new Date(sub.current_period_end * 1000).toISOString();
          await supabaseAdmin.from("users").update({ subscription_until: until }).eq("id", userId);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        let userId = sub.metadata?.user_id;
        if (!userId && typeof sub.customer === "string") {
          const { data: u } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("stripe_customer_id", sub.customer)
            .maybeSingle();
          userId = u?.id;
        }
        if (!userId || typeof userId !== "string") break;

        if (
          event.type === "customer.subscription.deleted" ||
          sub.status === "canceled" ||
          sub.status === "unpaid" ||
          sub.status === "incomplete_expired"
        ) {
          await syncSubscriptionForUser(userId, stripe);
        } else if (sub.status === "active" || sub.status === "trialing") {
          const until = new Date(sub.current_period_end * 1000).toISOString();
          await supabaseAdmin.from("users").update({ subscription_until: until }).eq("id", userId);
        } else {
          await syncSubscriptionForUser(userId, stripe);
        }
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const subRef = inv.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        let userId = sub.metadata?.user_id;
        if (!userId && typeof sub.customer === "string") {
          const { data: u } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("stripe_customer_id", sub.customer)
            .maybeSingle();
          userId = u?.id;
        }
        if (!userId || typeof userId !== "string") break;
        const until = new Date(sub.current_period_end * 1000).toISOString();
        await supabaseAdmin.from("users").update({ subscription_until: until }).eq("id", userId);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: "Ошибка обработки события" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
