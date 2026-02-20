
# Corrigir Links de Compartilhamento (Facebook e WhatsApp)

## Problema Atual
Ambos os botoes de compartilhamento (Facebook e WhatsApp) estao usando a URL direta da Edge Function do Supabase (`lgrugpsyewvinlkgmeve.supabase.co/functions/v1/blog-share?slug=...`). Isso faz com que:
- **Facebook**: Mostra o dominio do Supabase no preview em vez de `barbersoft.com.br`
- **WhatsApp**: Mostra a URL feia do Supabase na mensagem em vez da URL limpa

## Solucao
O site ja tem um proxy PHP configurado em `barbersoft.com.br/share/blog/{slug}` que redireciona crawlers para a Edge Function e usuarios reais para o blog. Esse proxy ja funciona perfeitamente (como mostrado no print 3 do WhatsApp).

A correcao e simples: trocar a URL de compartilhamento para usar o proxy do dominio proprio.

## Mudanca

### Arquivo: `src/pages/institucional/BlogPost.tsx`

Trocar a URL usada nos botoes de compartilhamento:

**De:**
```
edgeFunctionUrl = https://lgrugpsyewvinlkgmeve.supabase.co/functions/v1/blog-share?slug=...
```

**Para:**
```
shareUrl = https://barbersoft.com.br/share/blog/{slug}
```

- **Facebook** vai usar: `https://www.facebook.com/sharer/sharer.php?u=https://barbersoft.com.br/share/blog/{slug}` -- mostrara `barbersoft.com.br` no preview
- **WhatsApp** vai usar: `https://api.whatsapp.com/send?text={titulo} https://barbersoft.com.br/share/blog/{slug}` -- mostrara a URL limpa com imagem/titulo/descricao como no print 3

Nenhuma alteracao na Edge Function ou no PHP -- apenas a URL que o frontend usa para montar os links de compartilhamento.
