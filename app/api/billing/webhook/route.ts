import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook endpoint to handle subscription events and update user metadata.
 * 
 * Events handled:
 * - checkout.session.completed: New subscription created
 * - customer.subscription.created: Subscription confirmed
 * - customer.subscription.updated: Plan changes, status updates
 * - customer.subscription.deleted: Cancellation
 * - invoice.payment_succeeded: Successful payment
 * - invoice.payment_failed: Failed payment
 * 
 * Note: This endpoint must receive the raw request body for signature verification.
 * Next.js App Router automatically provides this via request.text()
 */
export const runtime = "nodejs"; // Ensure we're using Node.js runtime for crypto operations

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET not configured");
        return NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 500 }
        );
      }
      verifyWebhookSignature(body, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the event
    const event = JSON.parse(body);

    console.log(`Processing Stripe webhook event: ${event.type}`, {
      id: event.id,
      type: event.type,
    });

    // Process the event based on type
    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(event.data.object, supabase);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object, supabase);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        await handleInvoiceEvent(event.data.object, event.type, supabase);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 * This fires when a customer successfully completes checkout
 */
async function handleCheckoutSessionCompleted(
  session: {
    id: string;
    customer?: string | null;
    customer_email?: string | null;
    subscription?: string | null;
    client_reference_id?: string | null;
    metadata?: Record<string, string>;
  },
  supabase: ReturnType<typeof createAdminClient>
) {
  const userId = session.client_reference_id || session.metadata?.supabase_user_id;
  const checkoutEmail = session.customer_email || session.metadata?.checkout_email;

  // If we have a user ID, update their metadata
  if (userId && session.customer) {
    if (session.subscription) {
      // We'll handle subscription details in the subscription.created event
      // Just update customer ID here
      await updateUserMetadata(supabase, userId, {
        stripe_customer_id: session.customer,
      });
    }
    return;
  }

  // If no user ID but we have email, this is a new user checkout
  // The user will create an account later and we'll link the subscription then
  if (!userId && checkoutEmail) {
    console.log("Checkout completed for new user (no account yet)", {
      sessionId: session.id,
      email: checkoutEmail,
      customerId: session.customer,
    });
    // Subscription will be linked when user signs up (see subscription.created handler)
  } else {
    console.warn("No user ID or email found in checkout session", {
      sessionId: session.id,
    });
  }
}

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionUpdated(
  subscription: {
    id: string;
    customer: string;
    status: string;
    metadata?: Record<string, string>;
    items?: {
      data?: Array<{
        price?: {
          id?: string;
          nickname?: string | null;
          metadata?: Record<string, string>;
        };
      }>;
    };
  },
  supabase: ReturnType<typeof createAdminClient>
) {
  const userId = subscription.metadata?.supabase_user_id;

  // If no user ID in metadata, this subscription is for a user who hasn't created an account yet
  // The subscription will be linked when the user signs up with the same email
  // (We store the email in checkout_email metadata during checkout)
  if (!userId) {
    console.log("No user ID in subscription metadata, will link when user signs up", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });
    // The subscription is active in Stripe, but not linked to a Supabase user yet
    // When the user signs up, they can link their subscription via email matching
    return;
  }

  // Extract plan name from price metadata or nickname
  let planName = "Premium"; // default
  if (subscription.items?.data?.[0]?.price?.metadata?.plan_name) {
    planName = subscription.items.data[0].price.metadata.plan_name;
  } else if (subscription.items?.data?.[0]?.price?.nickname) {
    planName = subscription.items.data[0].price.nickname;
  }

  // Map Stripe subscription status to our status
  const subscriptionStatus = mapSubscriptionStatus(subscription.status);

  await updateUserMetadata(supabase, userId, {
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    subscription_status: subscriptionStatus,
    plan: planName,
  });

  console.log(`Updated subscription for user ${userId}`, {
    status: subscriptionStatus,
    plan: planName,
  });
}

/**
 * Handle subscription deleted event (cancellation)
 */
async function handleSubscriptionDeleted(
  subscription: {
    id: string;
    customer: string;
    metadata?: Record<string, string>;
  },
  supabase: ReturnType<typeof createAdminClient>
) {
  const userId = subscription.metadata?.supabase_user_id;

  if (!userId) {
    // If no user ID, subscription might not be linked yet
    // This can happen if checkout happened before account creation
    console.log("No user ID found in subscription metadata for deletion", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });
    return;
  }

  await updateUserMetadata(supabase, userId, {
    subscription_status: "cancelled",
    stripe_subscription_id: subscription.id,
    // Keep customer ID and plan for reference
  });

  console.log(`Cancelled subscription for user ${userId}`);
}

/**
 * Handle invoice payment events
 */
async function handleInvoiceEvent(
  invoice: {
    id: string;
    customer: string;
    subscription?: string | null;
    paid: boolean;
    status?: string | null;
    metadata?: Record<string, string>;
  },
  eventType: string,
  supabase: ReturnType<typeof createAdminClient>
) {
  // For invoice events, we get customer ID, but we need user ID
  // If subscription exists, we'll get the update from subscription.updated
  // So we mainly log these for reference
  console.log(`Invoice event: ${eventType}`, {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    paid: invoice.paid,
  });

  // If payment failed and we want to update status immediately,
  // we could fetch the subscription here, but subscription.updated will handle it
}

/**
 * Map Stripe subscription status to our internal status
 */
function mapSubscriptionStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "cancelled",
    cancelled: "cancelled",
    unpaid: "unpaid",
    incomplete: "incomplete",
    incomplete_expired: "incomplete_expired",
    paused: "paused",
  };

  return statusMap[stripeStatus.toLowerCase()] || stripeStatus.toLowerCase();
}

/**
 * Update user metadata in Supabase Auth
 */
async function updateUserMetadata(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  metadata: Record<string, string>
) {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: metadata,
    });

    if (error) {
      console.error(`Failed to update user metadata for ${userId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error updating user metadata for ${userId}:`, error);
    throw error;
  }
}

