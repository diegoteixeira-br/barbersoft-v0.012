
-- Add term template to influencer_partnerships
ALTER TABLE public.influencer_partnerships
ADD COLUMN term_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN term_version TEXT DEFAULT '1.0';

-- Create table for influencer term templates
CREATE TABLE public.influencer_term_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Termo de Parceria com Influenciador',
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.influencer_term_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access on influencer_term_templates"
  ON public.influencer_term_templates
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Insert default term
INSERT INTO public.influencer_term_templates (title, content, version) VALUES (
  'Termo de Parceria com Influenciador Digital',
  E'TERMO DE PARCERIA COM INFLUENCIADOR DIGITAL\n\n1. DAS PARTES\nEste termo é celebrado entre a BarberSoft ("Empresa") e o Influenciador identificado no cadastro do sistema.\n\n2. DO OBJETO\nO presente termo estabelece as condições da parceria para divulgação da plataforma BarberSoft pelo Influenciador, mediante comissão sobre os valores efetivamente recebidos dos leads indicados.\n\n3. DA COMISSÃO\n3.1. O Influenciador receberá uma comissão de {PERCENTUAL}% sobre o valor efetivamente pago por cada cliente (lead) que se cadastrar através do link exclusivo do Influenciador.\n3.2. A comissão é vitalícia, sendo devida enquanto o lead indicado mantiver sua assinatura ativa e em dia.\n3.3. A comissão será calculada sobre o valor bruto pago pelo lead, excluindo impostos e taxas de processamento.\n3.4. O pagamento da comissão ao Influenciador será realizado mensalmente, após a confirmação do recebimento dos valores dos leads.\n\n4. DAS CONDIÇÕES\n4.1. A comissão só é devida quando o lead efetivamente realizar o pagamento da assinatura.\n4.2. Cadastros que não resultarem em pagamento não geram direito a comissão.\n4.3. Em caso de cancelamento da assinatura pelo lead, a comissão deixa de ser devida a partir do mês seguinte ao cancelamento.\n4.4. Se o lead reativar a assinatura, a comissão volta a ser devida.\n\n5. DAS OBRIGAÇÕES DO INFLUENCIADOR\n5.1. Divulgar a plataforma de forma ética e verdadeira.\n5.2. Não fazer promessas falsas ou enganosas sobre a plataforma.\n5.3. Utilizar exclusivamente o link fornecido para rastreamento dos leads.\n\n6. DA VIGÊNCIA\nEste termo tem vigência indeterminada, podendo ser rescindido por qualquer das partes mediante comunicação prévia de 30 dias.\n\n7. DA RESCISÃO\n7.1. Em caso de rescisão, as comissões pendentes serão pagas normalmente.\n7.2. Após a rescisão, novos leads não geram direito a comissão, mas leads já vinculados continuam gerando comissão enquanto mantiverem assinaturas ativas.\n\n8. DO FORO\nFica eleito o foro da comarca da sede da Empresa para dirimir quaisquer questões oriundas deste termo.',
  '1.0'
);
