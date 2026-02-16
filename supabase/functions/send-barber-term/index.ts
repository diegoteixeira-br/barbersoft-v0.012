import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { barber_id, term_id } = body;

    if (!barber_id) {
      return new Response(JSON.stringify({ error: "barber_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get barber info
    const { data: barber, error: barberErr } = await supabase
      .from("barbers")
      .select("*, units(name)")
      .eq("id", barber_id)
      .single();

    if (barberErr || !barber) {
      return new Response(JSON.stringify({ error: "Profissional não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!barber.email) {
      return new Response(JSON.stringify({ error: "Profissional não possui email cadastrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the active term for the company
    let term;
    if (term_id) {
      const { data, error } = await supabase
        .from("partnership_terms")
        .select("*")
        .eq("id", term_id)
        .single();
      if (error) throw error;
      term = data;
    } else {
      const { data, error } = await supabase
        .from("partnership_terms")
        .select("*")
        .eq("company_id", barber.company_id)
        .eq("is_active", true)
        .single();
      if (error || !data) {
        return new Response(JSON.stringify({ error: "Nenhum termo ativo encontrado para esta empresa" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      term = data;
    }

    // Generate a unique term_token and save it on the barber
    const termToken = crypto.randomUUID();
    const { error: updateErr } = await supabase
      .from("barbers")
      .update({ term_token: termToken })
      .eq("id", barber_id);

    if (updateErr) {
      console.error("Error saving term_token:", updateErr);
      throw new Error("Erro ao gerar token de aceite");
    }

    // Replace variables in content
    const unitName = barber.units?.name || "Unidade";
    const content = term.content
      .replace(/\{\{nome\}\}/g, barber.name)
      .replace(/\{\{comissao\}\}/g, `${barber.commission_rate}%`)
      .replace(/\{\{unidade\}\}/g, unitName);

    // Format content for HTML
    const htmlContent = content.replace(/\n/g, '<br/>');

    // Build acceptance URL
    const siteUrl = "https://barbersoft.com.br";
    const acceptUrl = `${siteUrl}/termo-profissional/${termToken}`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "BarberSoft <noreply@barbersoft.com.br>",
        to: [barber.email],
        subject: `${term.title} - BarberSoft`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FF6B00; text-align: center;">BarberSoft</h1>
            <h2 style="text-align: center;">${term.title}</h2>
            <p>Olá, <strong>${barber.name}</strong>!</p>
            <p>Segue abaixo o termo de parceria da sua barbearia. Para formalizar sua participação, leia o termo e clique no botão abaixo para aceitar.</p>
            <div style="background-color: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #eee;">
              <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Versão ${term.version}</p>
              <div style="font-size: 14px; line-height: 1.6;">
                ${htmlContent}
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" 
                 style="display: inline-block; background-color: #FF6B00; color: #ffffff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px; letter-spacing: 0.5px;">
                ✅ Aceitar Termo de Parceria
              </a>
            </div>
            
            <p style="font-size: 13px; color: #666; text-align: center;">
              Ao clicar no botão acima, você será direcionado para a página de aceite digital do termo.
            </p>

            <p style="font-size: 13px; color: #666;">
              <strong>Importante:</strong> Sua comissão acordada é de <strong>${barber.commission_rate}%</strong>.
              O aceite do termo é necessário para ativar sua agenda no sistema.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 11px; text-align: center;">
              BarberSoft - Sistema de Gestão para Barbearias
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Erro ao enviar email", details: errBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Email enviado com sucesso" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
