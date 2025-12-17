import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Request validation schemas
const CreateSiteSchema = z.object({
  name: z.string().min(1).max(100),
  base_path: z.string().url().refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid HTTP/HTTPS URL" }
  ),
});

const UpdateSiteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  base_path: z.string().url().optional(),
});

// GET - List user's publishing sites
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: sites, error } = await supabase
      .from("publishing_sites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ sites: sites || [] });
  } catch (error) {
    console.error("Error fetching publishing sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch publishing sites" },
      { status: 500 }
    );
  }
}

// POST - Create a new publishing site
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = CreateSiteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, base_path } = validationResult.data;

    // Normalize base_path (remove trailing slash)
    const normalizedBasePath = base_path.replace(/\/$/, "");

    // Check for duplicate base_path for this user
    const { data: existing } = await supabase
      .from("publishing_sites")
      .select("id")
      .eq("user_id", user.id)
      .eq("base_path", normalizedBasePath)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A site with this base path already exists" },
        { status: 409 }
      );
    }

    const { data: site, error: insertError } = await supabase
      .from("publishing_sites")
      .insert({
        user_id: user.id,
        name,
        base_path: normalizedBasePath,
      } as any)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, site });
  } catch (error) {
    console.error("Error creating publishing site:", error);
    return NextResponse.json(
      { error: "Failed to create publishing site" },
      { status: 500 }
    );
  }
}

// PUT - Update a publishing site
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = UpdateSiteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { id, name, base_path } = validationResult.data;

    // Verify ownership
    const { data: existing } = await supabase
      .from("publishing_sites")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Site not found or access denied" },
        { status: 404 }
      );
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (base_path !== undefined) {
      updateData.base_path = base_path.replace(/\/$/, "");
    }

    // Check for duplicate base_path if updating
    if (base_path) {
      const { data: duplicate } = await supabase
        .from("publishing_sites")
        .select("id")
        .eq("user_id", user.id)
        .eq("base_path", updateData.base_path)
        .neq("id", id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: "A site with this base path already exists" },
          { status: 409 }
        );
      }
    }

    const { data: site, error: updateError } = await supabase
      .from("publishing_sites")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, site });
  } catch (error) {
    console.error("Error updating publishing site:", error);
    return NextResponse.json(
      { error: "Failed to update publishing site" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a publishing site
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("publishing_sites")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Site not found or access denied" },
        { status: 404 }
      );
    }

    // Delete site (cascade will delete article_publications)
    const { error: deleteError } = await supabase
      .from("publishing_sites")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: "Site deleted" });
  } catch (error) {
    console.error("Error deleting publishing site:", error);
    return NextResponse.json(
      { error: "Failed to delete publishing site" },
      { status: 500 }
    );
  }
}

