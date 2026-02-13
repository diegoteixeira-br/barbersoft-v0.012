import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, Loader2, AlertCircle, Copy } from "lucide-react";
import DOMPurify from "dompurify";

export default function InfluencerTermAcceptance() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [influencer, setInfluencer] = useState<any>(null);
  const [termTemplate, setTermTemplate] = useState<any>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!token) { setError("Token inválido"); setLoading(false); return; }

      // Fetch influencer by term_token via secure RPC
      const { data: infData, error: infErr } = await supabase
        .rpc("get_influencer_by_token" as any, { p_token: token });

      if (infErr || !infData) {
        setError("Link inválido ou expirado.");
        setLoading(false);
        return;
      }

      if (infData.term_accepted_at) {
        setAccepted(true);
        setInfluencer(infData);
        setLoading(false);
        return;
      }

      // Fetch active term template
      const { data: tmpl } = await supabase
        .from("influencer_term_templates" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!tmpl) {
        setError("Nenhum termo de parceria configurado.");
        setLoading(false);
        return;
      }

      setInfluencer(infData);
      setTermTemplate(tmpl as any);
      setLoading(false);
    }
    loadData();
  }, [token]);

  // Scroll detection
  useEffect(() => {
    if (!termTemplate) return;
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollTop + clientHeight >= scrollHeight - 50) setHasScrolledToEnd(true);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [termTemplate]);

  const getProcessedContent = () => {
    if (!termTemplate || !influencer) return "";
    const referralLink = `${window.location.origin}/auth?tab=signup&ref=${influencer.referral_code}`;
    const raw = (termTemplate.content as string)
      .replace(/\{PERCENTUAL\}/g, String(influencer.commission_percent))
      .replace(/\{NOME_INFLUENCIADOR\}/g, influencer.name)
      .replace(/\{DATA\}/g, new Date().toLocaleDateString("pt-BR"))
      .replace(/\{LINK_INDICACAO\}/g, referralLink);
    return DOMPurify.sanitize(raw.replace(/\n/g, '<br/>'), {
      ALLOWED_TAGS: ['br', 'b', 'i', 'u', 'strong', 'em', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: []
    });
  };

  const handleAccept = async () => {
    if (!influencer || !token) return;
    setIsSubmitting(true);
    try {
      const { data: success, error } = await supabase
        .rpc("accept_influencer_term" as any, { 
          p_token: token, 
          p_version: termTemplate?.version || "1.0" 
        });

      if (error) throw error;
      if (!success) throw new Error("Termo já foi aceito ou link inválido.");
      setAccepted(true);
    } catch (e: any) {
      console.error("Error accepting term:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">{error}</h2>
            <p className="text-muted-foreground">Entre em contato com o administrador.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    const referralLink = `${window.location.origin}/auth?tab=signup&ref=${influencer?.referral_code}`;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Termo Aceito!</h2>
            <p className="text-muted-foreground">
              Obrigado, <strong>{influencer?.name}</strong>! Seu aceite foi registrado com sucesso.
            </p>
            <p className="text-xs text-muted-foreground">
              Data: {influencer?.term_accepted_at ? new Date(influencer.term_accepted_at).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")}
            </p>

            <div className="mt-4 p-4 rounded-lg border bg-secondary/50 text-left space-y-2">
              <p className="text-sm font-semibold">🔗 Seu link de indicação:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={referralLink}
                  className="flex-1 text-xs bg-background border rounded px-3 py-2 select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Compartilhe este link para que seus leads se cadastrem e você receba sua comissão.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {termTemplate?.title || "Termo de Parceria"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Versão {termTemplate?.version} • Olá, <strong>{influencer?.name}</strong>! Leia o termo completo abaixo.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea
            ref={scrollAreaRef}
            className="h-[400px] rounded-lg border bg-secondary/30 p-4"
          >
            <div
              className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: getProcessedContent() }}
            />
          </ScrollArea>

          {!hasScrolledToEnd && (
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              ↓ Role até o final para habilitar o aceite
            </p>
          )}

          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
            <Checkbox
              id="accept-terms"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
              disabled={!hasScrolledToEnd}
              className="mt-0.5"
            />
            <label
              htmlFor="accept-terms"
              className={`text-sm cursor-pointer ${hasScrolledToEnd ? "" : "text-muted-foreground"}`}
            >
              Declaro que li, compreendi e concordo com os termos desta parceria e a
              comissão de <strong>{influencer?.commission_percent}%</strong> sobre o valor pago pelos leads vinculados,
              válida por 12 meses a partir do cadastro de cada lead.
            </label>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!hasScrolledToEnd || !isChecked || isSubmitting}
            className="w-full gap-2"
            size="lg"
          >
            <CheckCircle2 className="h-5 w-5" />
            {isSubmitting ? "Processando..." : "Aceitar e Assinar Digitalmente"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Ao clicar, você concorda que esta assinatura digital tem validade jurídica.
            Data e hora serão registradas automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
