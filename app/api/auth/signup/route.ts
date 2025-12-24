import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { z } from "zod";

const SignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  const response = NextResponse.json({});

  try {
    const body = await request.json();
    const validationResult = SignUpSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
        // Auto-confirm email in development (remove in production)
        // In production, users must verify their email before accessing the app
      },
    });

    if (error) {
      console.error("Signup error:", error);
      return NextResponse.json(
        { error: error.message },
        {
          status: 400,
          headers: response.headers,
        }
      );
    }

    if (!data.user) {
      console.error("Signup succeeded but no user returned");
      return NextResponse.json(
        { error: "User creation failed. Please try again." },
        {
          status: 500,
          headers: response.headers,
        }
      );
    }

    console.log("User created successfully:", {
      id: data.user.id,
      email: data.user.email,
      emailConfirmed: data.user.email_confirmed_at !== null,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        message: data.user.email_confirmed_at
          ? "Account created successfully. You can now sign in."
          : "Account created successfully. Please check your email to verify your account.",
        requiresEmailVerification: !data.user.email_confirmed_at,
      },
      {
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      {
        status: 500,
        headers: response.headers,
      }
    );
  }
}

