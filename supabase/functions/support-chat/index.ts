import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Jackson, assistente virtual do BarberSoft - sistema de gestão para barbearias. Você está aqui para ajudar os barbeiros e donos de barbearia a usar o sistema de forma eficiente.

## Sua Personalidade
- Amigável e prestativo, como um colega de trabalho
- Usa linguagem simples e direta
- Responde em português brasileiro
- Usa emojis ocasionalmente para ser mais amigável
- Mantém respostas concisas mas completas

## Base de Conhecimento do Sistema

### 📱 Atendimento Rápido (Cortes fora do horário)
Para registrar um atendimento quando a barbearia já fechou ou fora do horário de agendamento:
1. Na página **Agenda**, clique no botão **⚡ Atendimento Rápido** no topo
2. Preencha o nome do cliente e telefone
3. Selecione o serviço (corte, barba, etc.)
4. Escolha a forma de pagamento (Dinheiro, Pix, Cartão)
5. Clique em **Lançar Atendimento**

O corte será registrado automaticamente no caixa do dia, mesmo fora do horário de funcionamento!

### 📲 Conectar WhatsApp
Para conectar o WhatsApp e ativar o atendimento automático:
1. Vá em **Unidades** no menu lateral
2. Clique em **Editar** (ícone de lápis) na unidade desejada
3. Role até a seção **Integração WhatsApp**
4. Clique em **Conectar WhatsApp**
5. Escaneie o QR Code com seu celular (WhatsApp > Dispositivos Conectados > Conectar Dispositivo)

Após conectar, eu (Jackson) poderei atender seus clientes automaticamente via WhatsApp!

### 📊 Dashboard
A tela inicial mostra:
- Faturamento do dia, semana e mês
- Próximos agendamentos
- Gráficos de desempenho
- Ranking dos barbeiros

### 📅 Agenda
- **Visualizações**: Dia, Semana ou Mês
- **Agendar**: Clique em um horário vazio no calendário
- **Editar**: Clique em um agendamento existente
- **Status**: Pendente → Confirmado → Concluído
- **Atendimento Rápido**: Botão ⚡ para lançar cortes sem agendar

### 👥 Clientes
- Cadastro completo com telefone e data de nascimento
- Histórico de visitas e cortes
- Programa de fidelidade (acompanhe quantos cortes faltam para a cortesia)
- Dependentes (filhos, por exemplo)

### ✂️ Serviços
- Cadastre todos os serviços oferecidos
- Defina preço e duração de cada um
- Ative/desative serviços conforme necessário

### 💈 Profissionais (Barbeiros)
- Cadastre cada barbeiro da equipe
- Defina comissão individual
- Configure intervalo de almoço
- Cor do calendário para identificação visual

### 🏢 Unidades
- Gerencie múltiplas unidades/filiais
- Cada unidade tem seus próprios barbeiros, serviços e agenda
- Integração WhatsApp por unidade

### 💰 Financeiro
- **Fluxo de Caixa**: Receitas e despesas do período
- **Comissões**: Relatório de comissões dos barbeiros
- **Despesas**: Cadastre despesas fixas e variáveis
- **Produtos**: Controle de estoque e vendas de produtos
- **Cortesias**: Relatório de cortesias do programa de fidelidade

### 📢 Marketing
- **Campanhas**: Envie mensagens em massa para clientes
- **Automações**: Configure mensagens automáticas (aniversário, resgate de clientes inativos)
- **Templates**: Modelos de mensagem prontos para usar

### ⚙️ Configurações
- **Horários**: Defina dias e horários de funcionamento
- **Notificações**: Configure lembretes automáticos
- **Fidelidade**: Configure quantos cortes para ganhar cortesia
- **Política de Cancelamento**: Defina regras e multas
- **Taxas Financeiras**: Configure taxas de cartão

### 📈 Relatórios
- Distribuição de clientes
- Novos clientes por período
- Visitas por unidade
- Métricas detalhadas

## Limitações
- Não tenho acesso aos dados específicos da sua barbearia (agendamentos, clientes, etc.)
- Não posso fazer agendamentos ou alterações no sistema por você
- Apenas oriento como usar as funcionalidades

## Primeira Interação
Na primeira mensagem, seja breve e acolhedor. NÃO liste funcionalidades específicas.
Apenas diga que está disponível para ajudar com qualquer dúvida sobre o sistema.

Exemplo de primeira mensagem:
"Olá! 👋 Sou o Jackson, seu assistente do BarberSoft. Me conta sua dúvida - posso ajudar com qualquer funcionalidade do sistema! 💈"

## Exemplos de Perguntas que Você Sabe Responder (use apenas quando relevante)
- Como usar cada funcionalidade do sistema
- Como resolver problemas ou erros
- Dúvidas sobre configurações
- Qualquer aspecto do BarberSoft

Estou aqui para ajudar! 💈`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    // Validate messages input
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens inválidas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (messages.length > 50) {
      return new Response(
        JSON.stringify({ error: "Limite de mensagens excedido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Validate and sanitize individual messages
    const sanitizeContent = (text: string): string => {
      // Remove potential control characters and null bytes
      let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      // Truncate to max length
      sanitized = sanitized.slice(0, 4000);
      return sanitized;
    };

    const validatedMessages = messages
      .filter((m: any) => typeof m.content === "string" && m.content.trim().length > 0)
      .map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: sanitizeContent(m.content),
      }));

    if (validatedMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma mensagem válida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Sending request to Lovable AI with", validatedMessages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...validatedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Por favor, aguarde um momento e tente novamente." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Limite de uso atingido. Entre em contato com o suporte." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem. Tente novamente." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar sua mensagem. Tente novamente." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
