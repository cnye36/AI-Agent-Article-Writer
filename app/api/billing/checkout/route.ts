import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createCheckoutSession } from "@/lib/stripe";
import { isExemptEmail } from "@/lib/config";
import { z } from "zod";

const CheckoutSchema = z.object({
  priceId: z.string().min(1, "priceId is required"),
  email: z.string().email("Invalid email address").optional(),
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({});

  try {
    const body = await request.json();
    const validationResult = CheckoutSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        {
          status: 400,
          headers: response.headers,
        }
      );
    }

    const { priceId, email } = validationResult.data;

    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set in environment variables");
      return NextResponse.json(
        { error: "Stripe is not configured. Please contact support." },
        {
          status: 500,
          headers: response.headers,
        }
      );
    }

    // Create Supabase client with proper cookie handling for route handlers
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options: CookieOptions;
            }[]
          ) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.delete(name);
            response.cookies.set(name, "", { ...options, maxAge: 0 });
          },
        },
      }
    );

    // Try to get the user if authenticated
    let user = null;
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      // Only use the user if there's no error and user exists
      // Ignore "user_not_found" errors as that's expected for new users
      if (!authError && authUser) {
        user = authUser;
      } else if (authError && (authError as any)?.code !== "user_not_found") {
        // Clear invalid sessions (except for user_not_found which is expected)
        console.warn("Auth error in checkout (non-fatal):", {
          error: authError,
          code: (authError as any)?.code,
        });
        if ((authError as any)?.code !== "invalid_token") {
          await supabase.auth.signOut();
        }
      }
    } catch (error) {
      // If getting user fails, continue without user (for new users)
      console.warn(
        "Could not get user, proceeding with email-only checkout:",
        error
      );
    }

    // Determine the email to use
    const checkoutEmail = email || user?.email;

    if (!checkoutEmail) {
      return NextResponse.json(
        {
          error: "Email required",
          details: "Please provide an email address or sign in to continue",
        },
        {
          status: 400,
          headers: response.headers,
        }
      );
    }

    // Check if email is exempt (exempt emails don't need checkout, but we'll still allow it)
    // This check is mainly for future use in other parts of the app
    if (isExemptEmail(checkoutEmail)) {
      console.log(`Exempt email attempting checkout: ${checkoutEmail}`);
      // Still allow checkout, but we could redirect exempt users differently if needed
    }

    // Create checkout session with either user object or email
    const checkoutUrl = await createCheckoutSession(
      user || { email: checkoutEmail },
      request.nextUrl.origin,
      priceId
    );

    return NextResponse.json(
      { url: checkoutUrl },
      {
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error("Stripe checkout session error:", error);

    // Provide more detailed error information
    const errorMessage = getErrorMessage(error);
    const isStripeError =
      error instanceof Error &&
      (error.message.includes("Stripe") || error.message.includes("stripe"));

    return NextResponse.json(
      {
        error: errorMessage,
        details: isStripeError
          ? "Check your Stripe API key and price ID configuration"
          : undefined,
      },
      {
        status: 500,
        headers: response.headers,
      }
    );
  }
}
