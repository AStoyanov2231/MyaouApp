import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// Helper to get period end from subscription items
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number {
  const item = subscription.items.data[0];
  return item?.current_period_end ?? Math.floor(Date.now() / 1000);
}

function getSubscriptionPeriodStart(subscription: Stripe.Subscription): number {
  const item = subscription.items.data[0];
  return item?.current_period_start ?? Math.floor(Date.now() / 1000);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      let userId: string | undefined;

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        userId = subscription.metadata.supabase_user_id;

        if (userId) {
          const periodEnd = getSubscriptionPeriodEnd(subscription);

          await supabase
            .from("profiles")
            .update({
              is_premium: true,
              premium_until: new Date(periodEnd * 1000).toISOString(),
              stripe_subscription_id: subscription.id,
            })
            .eq("id", userId);

          const periodStart = getSubscriptionPeriodStart(subscription);

          // Create subscription record
          await supabase.from("subscriptions").insert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            current_period_start: new Date(periodStart * 1000).toISOString(),
            current_period_end: new Date(periodEnd * 1000).toISOString(),
          });
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.supabase_user_id;

      if (userId) {
        const isActive = subscription.status === "active";
        const periodEnd = getSubscriptionPeriodEnd(subscription);

        await supabase
          .from("profiles")
          .update({
            is_premium: isActive,
            premium_until: isActive
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq("id", userId);

        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.supabase_user_id;

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            is_premium: false,
            premium_until: null,
            stripe_subscription_id: null,
          })
          .eq("id", userId);

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
