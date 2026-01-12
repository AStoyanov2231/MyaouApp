import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  // Validate price ID early
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId) {
    console.error("STRIPE_PREMIUM_PRICE_ID is not configured");
    return NextResponse.json(
      { error: "Payment configuration error" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or create Stripe customer
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id, username, is_premium")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Failed to fetch profile:", profileError);
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.is_premium) {
    return NextResponse.json({ error: "Already premium" }, { status: 400 });
  }

  let customerId = profile.stripe_customer_id;

  try {
    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?payment=canceled`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
      // Enable wallet payment methods (Google Pay, Apple Pay)
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
