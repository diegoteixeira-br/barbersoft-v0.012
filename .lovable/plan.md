

## Gerenciador de Blog - Painel de Administracao

### Resumo
Criar uma pagina completa de gerenciamento de blog no painel admin, com CRUD de artigos, geracao de conteudo via IA (OpenAI) e geracao de imagens de capa via IA (Gemini). Os posts serao armazenados no Supabase e, futuramente, o blog publico podera consumir esses dados ao inves do arquivo estatico atual.

---

### 1. Banco de Dados

**Nova tabela `blog_posts`** (via migracao):

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid (PK) | gen_random_uuid() |
| title | text | NOT NULL |
| slug | text | UNIQUE, NOT NULL |
| excerpt | text | Resumo curto |
| content | text | Conteudo rich text (HTML) |
| category | text | Gestao, Tecnologia, Marketing, Tendencias, Financeiro |
| image_url | text | URL da imagem de capa |
| read_time | text | Ex: "5 min" |
| author | text | Default "Equipe BarberSoft" |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

**RLS**: Somente super admins podem ler, criar, editar e excluir (usando a funcao `is_super_admin()` ja existente). Leitura publica habilitada para o blog publico consumir.

**Storage bucket**: Criar bucket `blog-images` com politica publica de leitura para servir as imagens de capa.

---

### 2. Edge Functions

#### a) `generate-blog-content` (Nova)
- Recebe o `title` via POST
- Chama a API OpenAI (usando `LOVABLE_API_KEY` + gateway `ai.gateway.lovable.dev`) para gerar:
  - Artigo completo em HTML formatado (com h2, h3, listas, negrito)
  - Excerpt (resumo de 1-2 frases)
  - read_time estimado
- Retorna JSON com `content`, `excerpt`, `read_time`
- Config: `verify_jwt = false` (validacao manual de super admin no codigo)

#### b) `generate-blog-image` (Nova)
- Recebe o `title` via POST
- Usa o modelo Gemini de geracao de imagens (`google/gemini-2.5-flash-image`) via gateway Lovable
- Recebe a imagem base64, faz upload para o bucket `blog-images` no Supabase Storage
- Retorna a URL publica da imagem
- Config: `verify_jwt = false` (validacao manual)

---

### 3. Frontend - Nova Pagina Admin

#### Arquivos novos:
- `src/pages/admin/AdminBlog.tsx` - Pagina principal
- `src/components/admin/BlogPostFormModal.tsx` - Modal/formulario de criacao/edicao
- `src/hooks/useBlogPosts.ts` - Hook com React Query para CRUD

#### Navegacao:
- Adicionar item "Blog" no `AdminSidebar.tsx` com icone `FileText`
- Adicionar rota `/admin/blog` no `App.tsx` protegida por `SuperAdminGuard`

#### Formulario (dentro de um modal/dialog):
- Campo **Titulo** + botao "Gerar Artigo com IA" ao lado
- Campo **Slug** (auto-gerado a partir do titulo, editavel)
- **Categoria** - Select com opcoes: Gestao, Tecnologia, Marketing, Tendencias, Financeiro
- **Excerpt** - Textarea (preenchido pela IA ou manualmente)
- **Tempo de leitura** - Input texto (preenchido pela IA)
- **Imagem de capa** - Input URL + botao "Gerar Capa com IA"
- **Conteudo** - Editor rich text usando `react-markdown` para preview e textarea para edicao (formato Markdown, que ja e o padrao do blog)
- Botoes Salvar / Cancelar

#### Tabela de artigos:
- Colunas: Titulo, Categoria, Data, Acoes (Editar, Excluir)
- Confirmacao antes de excluir
- Ordenacao por data de criacao (mais recente primeiro)

#### Integracao com blog publico:
- Atualizar `Blog.tsx` e `BlogPost.tsx` para buscar posts do Supabase (tabela `blog_posts`) alem dos posts estaticos em `blogPosts.ts`, mesclando ambos

---

### 4. Detalhes Tecnicos

**Dependencias**: Nenhuma nova necessaria. O editor de conteudo usara textarea com preview Markdown (usando `react-markdown` ja instalado).

**Secrets necessarios**: Nenhum novo - usara `LOVABLE_API_KEY` (ja existe) para o gateway de IA.

**Sequencia de implementacao**:
1. Migracao do banco (tabela + bucket storage)
2. Edge Functions (generate-blog-content, generate-blog-image)
3. Hook `useBlogPosts.ts`
4. Componentes admin (formulario, pagina)
5. Rota e navegacao
6. Integracao do blog publico com dados do Supabase

