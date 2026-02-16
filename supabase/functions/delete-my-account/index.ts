import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-MY-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !userData.user) {
      throw new Error("Invalid token");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get the user's company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, stripe_customer_id, stripe_subscription_id, plan_status")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (companyError) {
      throw new Error(`Error fetching company: ${companyError.message}`);
    }

    if (!company) {
      throw new Error("No company found for this user");
    }

    logStep("Company found", { companyId: company.id, planStatus: company.plan_status });

    // CRITICAL: Cancel Stripe subscription IMMEDIATELY before deletion
    // Using cancel_at_period_end: false to cancel immediately and prevent future charges
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && company.stripe_customer_id) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        
        // First, list all active subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: company.stripe_customer_id,
          status: "active",
        });
        
        // Cancel all active subscriptions immediately
        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id, {
            prorate: true,
            invoice_now: false,
          });
          logStep("Stripe subscription cancelled immediately", { subscriptionId: subscription.id });
        }
        
        // Also check for subscriptions pending cancellation
        const pendingCancelSubs = await stripe.subscriptions.list({
          customer: company.stripe_customer_id,
        });
        
        for (const subscription of pendingCancelSubs.data) {
          if (subscription.status !== "canceled") {
            try {
              await stripe.subscriptions.cancel(subscription.id, {
                prorate: true,
                invoice_now: false,
              });
              logStep("Additional subscription cancelled", { subscriptionId: subscription.id });
            } catch (e) {
              logStep("Could not cancel subscription (may already be cancelled)", { subscriptionId: subscription.id });
            }
          }
        }
        
        logStep("All Stripe subscriptions cancelled for customer", { customerId: company.stripe_customer_id });
      } catch (stripeError) {
        logStep("Error cancelling Stripe subscriptions", { error: String(stripeError) });
        // We MUST NOT continue if we can't cancel the subscription for active plans
        if (company.plan_status === "active") {
          throw new Error("Não foi possível cancelar a assinatura no Stripe. Por favor, cancele a assinatura antes de excluir a conta.");
        }
        // For non-active plans, we can continue
      }
    }

    const companyId = company.id;
    const ownerUserId = user.id;

    logStep(`Starting deletion cascade for company ${companyId}`);

    // Delete related data in order (respecting foreign keys)
    // 1. Get all units for this company
    const { data: units } = await supabaseAdmin
      .from("units")
      .select("id")
      .eq("company_id", companyId);

    const unitIds = units?.map(u => u.id) || [];

    if (unitIds.length > 0) {
      // Delete appointments
      await supabaseAdmin.from("appointments").delete().in("unit_id", unitIds);
      
      // Delete appointment_deletions
      await supabaseAdmin.from("appointment_deletions").delete().in("unit_id", unitIds);
      
      // Delete cancellation_history
      await supabaseAdmin.from("cancellation_history").delete().in("unit_id", unitIds);
      
      // Delete client_dependents
      await supabaseAdmin.from("client_dependents").delete().in("unit_id", unitIds);
      
      // Delete clients
      await supabaseAdmin.from("clients").delete().in("unit_id", unitIds);
      
      // Delete product_sales
      await supabaseAdmin.from("product_sales").delete().in("unit_id", unitIds);
      
      // Delete products
      await supabaseAdmin.from("products").delete().in("unit_id", unitIds);
      
      // Delete expenses
      await supabaseAdmin.from("expenses").delete().in("unit_id", unitIds);
      
      // Delete services
      await supabaseAdmin.from("services").delete().in("unit_id", unitIds);
      
      // Delete barbers
      await supabaseAdmin.from("barbers").delete().in("unit_id", unitIds);
      
      // Delete units
      await supabaseAdmin.from("units").delete().in("id", unitIds);
    }

    // Delete company-level data
    await supabaseAdmin.from("automation_logs").delete().eq("company_id", companyId);
    
    // Delete marketing campaigns and logs
    const { data: campaigns } = await supabaseAdmin
      .from("marketing_campaigns")
      .select("id")
      .eq("company_id", companyId);
    
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id);
      await supabaseAdmin.from("campaign_message_logs").delete().in("campaign_id", campaignIds);
      await supabaseAdmin.from("marketing_campaigns").delete().in("id", campaignIds);
    }
    
    // Delete partnership_terms and term_acceptances
    const { data: terms } = await supabaseAdmin
      .from("partnership_terms")
      .select("id")
      .eq("company_id", companyId);
    
    if (terms && terms.length > 0) {
      const termIds = terms.map(t => t.id);
      await supabaseAdmin.from("term_acceptances").delete().in("term_id", termIds);
      await supabaseAdmin.from("partnership_terms").delete().in("id", termIds);
    }
    
    // Delete feedbacks
    await supabaseAdmin.from("feedbacks").delete().eq("company_id", companyId);

    // Delete user-level data
    await supabaseAdmin.from("business_settings").delete().eq("user_id", ownerUserId);
    await supabaseAdmin.from("business_hours").delete().eq("user_id", ownerUserId);
    await supabaseAdmin.from("holidays").delete().eq("user_id", ownerUserId);
    await supabaseAdmin.from("message_templates").delete().eq("user_id", ownerUserId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", ownerUserId);

    // Delete the company
    const { error: deleteCompanyError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (deleteCompanyError) {
      throw new Error(`Error deleting company: ${deleteCompanyError.message}`);
    }

    logStep("Company deleted");

    // Finally, delete the auth user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
    
    if (deleteUserError) {
      logStep("Error deleting auth user (company already deleted)", { error: deleteUserError });
    }

    logStep(`Successfully deleted account for user ${ownerUserId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    // Only expose safe user-facing messages
    const safeMessage = errorMessage.includes("cancelar a assinatura")
      ? errorMessage
      : "Erro ao excluir a conta. Tente novamente.";
    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
