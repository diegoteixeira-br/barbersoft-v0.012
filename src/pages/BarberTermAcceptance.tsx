import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import DOMPurify from "dompurify";

export default function BarberTermAcceptance() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barber, setBarber] = useState<any>(null);
  const [term, setTerm] = useState<any>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      const { data: barberData, error: barberErr } = await supabase.rpc(
        "get_barber_by_term_token" as any,
        { p_token: token }
      );

      if (barberErr || !barberData) {
        setError("Link inválido, expirado ou termo já aceito.");
        setLoading(false);
        return;
      }

      setBarber(barberData);

      // Fetch active term for the company
      const { data: termData, error: termErr } = await supabase
        .from("partnership_terms")
        .select("*")
        .eq("company_id", barberData.company_id)
        .eq("is_active", true)
        .single();

      if (termErr || !termData) {
        setError("Nenhum termo de parceria ativo encontrado.");
        setLoading(false);
        return;
      }

      setTerm(termData);
      setLoading(false);
    }
    loadData();
  }, [token]);

  // Scroll detection
  useEffect(() => {
    if (!term) return;
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollTop + clientHeight >= scrollHeight - 50)
        setHasScrolledToEnd(true);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [term]);

  const getProcessedContent = () => {
    if (!term || !barber) return "";
    const raw = (term.content as string)
      .replace(/\{\{nome\}\}/g, barber.name)
      .replace(/\{\{comissao\}\}/g, `${barber.commission_rate}%`)
      .replace(/\{\{unidade\}\}/g, barber.unit_name || "Unidade");
    return DOMPurify.sanitize(raw.replace(/\n/g, "<br/>"), {
      ALLOWED_TAGS: [
        "br", "b", "i", "u", "strong", "em", "p",
        "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
      ],
      ALLOWED_ATTR: [],
    });
  };

  const handleAccept = async () => {
    if (!barber || !token || !term) return;
    setIsSubmitting(true);
    try {
      const { data: success, error: err } = await supabase.rpc(
        "accept_barber_term" as any,
        {
          p_token: token,
          p_term_id: term.id,
          p_content_snapshot: term.content,
          p_commission_rate: barber.commission_rate,
          p_ip: null,
          p_user_agent: navigator.userAgent,
        }
      );

      if (err) throw err;
      if (!success) throw new Error("Termo já foi aceito ou link inválido.");
      setAccepted(true);
    } catch (e: any) {
      setError(e.message || "Erro ao aceitar termo.");
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
            <p className="text-muted-foreground">
              Entre em contato com o administrador da barbearia.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Termo Aceito!</h2>
            <p className="text-muted-foreground">
              Obrigado, <strong>{barber?.name}</strong>! Seu aceite foi
              registrado com sucesso. Agora sua agenda pode ser ativada.
            </p>
            <p className="text-xs text-muted-foreground">
              Data: {new Date().toLocaleString("pt-BR")}
            </p>
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
            {term?.title || "Termo de Parceria"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Versão {term?.version} • Olá,{" "}
            <strong>{barber?.name}</strong>! Leia o termo completo abaixo.
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
              className={`text-sm cursor-pointer ${
                hasScrolledToEnd ? "" : "text-muted-foreground"
              }`}
            >
              Declaro que li, compreendi e concordo com os termos desta parceria
              e a comissão de{" "}
              <strong>{barber?.commission_rate}%</strong> acordada.
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
            Ao clicar, você concorda que esta assinatura digital tem validade
            jurídica. Data e hora serão registradas automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
