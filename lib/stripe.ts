import type { User } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2024-06-20";

type StripeCustomer = {
  id: string;
  email?: string | null;
  metadata?: Record<string, string>;
};

type StripeCheckoutSession = {
  id: string;
  url?: string | null;
};

type StripePortalSession = {
  url?: string | null;
};

class StripeConfigError extends Error {}

class StripeApiError extends Error {
  status?: number;
}

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new StripeConfigError(
      "Missing STRIPE_SECRET_KEY. Add it to your environment to enable billing."
    );
  }

  return key;
}

function buildFormBody(
  params: Record<string, string | number | null | undefined>
) {
  const form = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });

  return form;
}

async function stripeRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: URLSearchParams;
  } = {}
): Promise<T> {
  const secretKey = getStripeSecretKey();

  // Validate API key format
  if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
    throw new StripeConfigError(
      "Invalid Stripe API key format. Must start with 'sk_test_' or 'sk_live_'"
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    "Stripe-Version": STRIPE_API_VERSION,
  };

  if (options.body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: options.method ?? "POST",
    headers,
    body: options.method === "GET" ? undefined : options.body,
  });

  const data = (await response.json()) as unknown;
  const errorPayload = data as {
    error?: { message?: string; type?: string; code?: string };
  };

  if (!response.ok) {
    // Log detailed error information
    console.error("Stripe API error:", {
      status: response.status,
      statusText: response.statusText,
      path,
      error: errorPayload?.error,
    });

    const errorMessage =
      errorPayload?.error?.message ||
      `Stripe request failed with status ${response.status}`;

    const error = new StripeApiError(errorMessage);
    error.status = response.status;
    throw error;
  }

  return data as T;
}

async function findCustomer(user: User): Promise<StripeCustomer | null> {
  try {
    const metadataQuery = encodeURIComponent(
      `metadata['supabase_user_id']:"${user.id}"`
    );
    const byMetadata = await stripeRequest<{ data: StripeCustomer[] }>(
      `/customers/search?query=${metadataQuery}&limit=1`,
      { method: "GET" }
    );

    if (byMetadata.data?.[0]) {
      return byMetadata.data[0];
    }
  } catch (error) {
    console.warn(
      "Stripe metadata search failed, falling back to email lookup",
      {
        error,
      }
    );
  }

  if (user.email) {
    const byEmail = await stripeRequest<{ data: StripeCustomer[] }>(
      `/customers?email=${encodeURIComponent(user.email)}&limit=1`,
      { method: "GET" }
    );

    if (byEmail.data?.[0]) {
      return byEmail.data[0];
    }
  }

  return null;
}

async function createCustomer(user: User): Promise<StripeCustomer> {
  const body = buildFormBody({
    email: user.email ?? undefined,
    "metadata[supabase_user_id]": user.id,
  });

  return stripeRequest<StripeCustomer>("/customers", { body });
}

async function ensureCustomerHasMetadata(
  customer: StripeCustomer,
  user: User
): Promise<void> {
  const hasUserMetadata =
    customer.metadata && customer.metadata["supabase_user_id"] === user.id;

  if (hasUserMetadata) {
    return;
  }

  const body = buildFormBody({
    "metadata[supabase_user_id]": user.id,
  });

  await stripeRequest(`/customers/${customer.id}`, { body });
}

export async function getOrCreateCustomerId(user: User): Promise<string> {
  const existingCustomer = await findCustomer(user);

  if (existingCustomer) {
    await ensureCustomerHasMetadata(existingCustomer, user);
    return existingCustomer.id;
  }

  const newCustomer = await createCustomer(user);
  return newCustomer.id;
}

function getBillingPortalReturnUrl(origin: string) {
  return (
    process.env.STRIPE_BILLING_PORTAL_RETURN_URL ??
    `${origin}/dashboard?tab=create`
  );
}

/**
 * Create a Stripe checkout session
 * @param options - Either a User object (for authenticated users) or an email string (for new users)
 * @param origin - The origin URL for redirects
 * @param priceId - The Stripe price ID for the subscription
 */
export async function createCheckoutSession(
  options: User | { email: string },
  origin: string,
  priceId?: string
): Promise<string> {
  // Use provided priceId or fall back to environment variable for backward compatibility
  const finalPriceId = priceId || process.env.STRIPE_PRICE_ID;

  if (!finalPriceId) {
    throw new StripeConfigError(
      "Missing price ID. Provide a priceId parameter or set STRIPE_PRICE_ID in your environment."
    );
  }

  // Check if we have a User object or just an email
  const isUser = "id" in options && "email" in options;
  const user = isUser ? (options as User) : null;
  const email = isUser
    ? (options as User).email
    : (options as { email: string }).email;

  if (!email) {
    throw new StripeConfigError("Email is required for checkout session");
  }

  // Build form body parameters
  const formParams: Record<string, string | number | null | undefined> = {
    mode: "subscription",
    success_url: user
      ? `${origin}/dashboard?billing=success`
      : `${origin}/auth/signup?email=${encodeURIComponent(
          email
        )}&billing=success`,
    cancel_url: `${origin}/dashboard?billing=cancelled`,
    "line_items[0][price]": finalPriceId,
    "line_items[0][quantity]": "1",
    "subscription_data[trial_period_days]": "14",
    customer_email: email,
  };

  // If we have a user, link the customer and add user ID to metadata
  if (user) {
    const customerId = await getOrCreateCustomerId(user);
    formParams.customer = customerId;
    formParams.client_reference_id = user.id;
    formParams["subscription_data[metadata][supabase_user_id]"] = user.id;
    formParams["metadata[supabase_user_id]"] = user.id;
  } else {
    // For new users, store email in metadata so we can link it after account creation
    formParams["metadata[checkout_email]"] = email;
  }

  const body = buildFormBody(formParams);

  const session = await stripeRequest<StripeCheckoutSession>(
    "/checkout/sessions",
    { body }
  );

  if (!session.url) {
    throw new StripeApiError(
      "Stripe did not return a checkout URL. Please verify your price ID."
    );
  }

  return session.url;
}

export async function createBillingPortalSession(
  user: User,
  origin: string
): Promise<string> {
  const customerId = await getOrCreateCustomerId(user);
  const body = buildFormBody({
    customer: customerId,
    return_url: getBillingPortalReturnUrl(origin),
  });

  const portalSession = await stripeRequest<StripePortalSession>(
    "/billing_portal/sessions",
    { body }
  );

  if (!portalSession.url) {
    throw new StripeApiError(
      "Stripe did not return a billing portal URL. Please try again."
    );
  }

  return portalSession.url;
}

/**
 * Verifies the Stripe webhook signature to ensure the request is authentic.
 * @param payload - The raw request body as a string
 * @param signature - The stripe-signature header value
 * @param secret - The webhook signing secret from Stripe
 * @returns true if signature is valid, throws error if invalid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const elements = signature.split(",");
  const signatureHash = elements
    .find((element) => element.startsWith("v1="))
    ?.split("=")[1];

  if (!signatureHash) {
    throw new Error("Unable to extract signature hash from header");
  }

  // Extract timestamp
  const timestamp = elements
    .find((element) => element.startsWith("t="))
    ?.split("=")[1];
  if (!timestamp) {
    throw new Error("Unable to extract timestamp from header");
  }

  // Reconstruct the signed payload
  const signedPayload = `${timestamp}.${payload}`;

  // Compute the expected signature
  const expectedSignature = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  // Compare signatures using timing-safe comparison
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(signatureHash, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    throw new Error("Invalid signature length");
  }

  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error("Invalid webhook signature");
  }

  // Optional: Check timestamp to prevent replay attacks (recommended: 5 minutes)
  const timestampMs = parseInt(timestamp, 10) * 1000;
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  if (timestampMs < fiveMinutesAgo) {
    throw new Error("Webhook timestamp too old");
  }

  return true;
}
