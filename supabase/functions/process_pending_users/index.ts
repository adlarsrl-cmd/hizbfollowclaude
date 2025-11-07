import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PendingUserCreation {
  id: string;
  participant_id: string;
  email: string;
  group_id: string;
  created_by: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch pending user creations
    const { data: pendingUsers, error: fetchError } = await supabaseAdmin
      .from("pending_user_creations")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch pending users: ${fetchError.message}`);
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending users to process" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const results = [];

    // Process each pending user
    for (const pending of pendingUsers as PendingUserCreation[]) {
      try {
        // Create user via Admin API with default password "1234"
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: pending.email,
          password: "1234",
          email_confirm: true, // Auto-confirm email
        });

        if (createUserError) {
          throw new Error(`Failed to create user: ${createUserError.message}`);
        }

        // Create password change requirement
        const { error: passwordReqError } = await supabaseAdmin
          .from("user_password_change_required")
          .insert({
            user_id: newUser.user.id,
            must_change_password: true,
          });

        if (passwordReqError) {
          console.error(`Failed to create password requirement: ${passwordReqError.message}`);
        }

        // Link participant to user
        const { error: linkError } = await supabaseAdmin
          .from("participants")
          .update({ user_id: newUser.user.id })
          .eq("id", pending.participant_id);

        if (linkError) {
          throw new Error(`Failed to link participant to user: ${linkError.message}`);
        }

        // Fetch group name for email
        const { data: groupData } = await supabaseAdmin
          .from("groups")
          .select("name")
          .eq("id", pending.group_id)
          .single();

        const groupName = groupData?.name || "votre groupe";

        // Send notification email
        // Note: In production, you'd use a proper email service (SendGrid, Resend, etc.)
        // For now, we'll log the email content
        const emailContent = `
Subject: Vous avez été invité à rejoindre HizbFollow

Bonjour,

Vous avez été ajouté au groupe "${groupName}" sur HizbFollow.

Votre compte a été créé avec l'adresse email : ${pending.email}

⚠️ Contactez l'administrateur du groupe pour obtenir votre mot de passe temporaire.

[Se connecter sur ${supabaseUrl}]

Important : Changez votre mot de passe dès la première connexion pour sécuriser votre compte.

---
L'équipe HizbFollow
        `;

        console.log("Email to send:", emailContent);

        // Mark as completed
        const { error: updateError } = await supabaseAdmin
          .from("pending_user_creations")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
          })
          .eq("id", pending.id);

        if (updateError) {
          console.error(`Failed to mark as completed: ${updateError.message}`);
        }

        results.push({
          id: pending.id,
          email: pending.email,
          status: "success",
          user_id: newUser.user.id,
        });
      } catch (error) {
        // Mark as failed
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        await supabaseAdmin
          .from("pending_user_creations")
          .update({
            status: "failed",
            error_message: errorMessage,
            processed_at: new Date().toISOString(),
          })
          .eq("id", pending.id);

        results.push({
          id: pending.id,
          email: pending.email,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Processing complete",
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing pending users:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});