import type { User } from "@supabase/supabase-js";

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
  const errorPayload = data as { error?: { message?: string } };

  if (!response.ok) {
    const error = new StripeApiError(
      errorPayload?.error?.message ||
        `Stripe request failed with status ${response.status}`
    );
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
    console.warn("Stripe metadata search failed, falling back to email lookup", {
      error,
    });
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

export async function createCheckoutSession(user: User, origin: string) {
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    throw new StripeConfigError(
      "Missing STRIPE_PRICE_ID. Set it in your environment to enable upgrades."
    );
  }

  const customerId = await getOrCreateCustomerId(user);
  const body = buildFormBody({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    success_url: `${origin}/dashboard?billing=success`,
    cancel_url: `${origin}/dashboard?billing=cancelled`,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "subscription_data[metadata][supabase_user_id]": user.id,
    "metadata[supabase_user_id]": user.id,
    customer_email: user.email ?? undefined,
  });

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
