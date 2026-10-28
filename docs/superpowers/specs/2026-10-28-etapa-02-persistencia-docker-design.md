# Etapa 02 — Persistência e distribuição com Docker

## Objetivo

Evoluir o Quadra em Foco no mesmo repositório da Etapa 01. A aplicação continuará consultando o dataset público NBA Rosters e passará a salvar atletas favoritos em um banco PostgreSQL real no Supabase. A mesma interface será distribuída como imagem pública no Docker Hub.

## Escopo

- Criar, listar e excluir favoritos no Supabase.
- Manter a aplicação compatível com hospedagem estática no GitHub Pages.
- Preservar a busca atual e o estilo editorial esportivo.
- Empacotar os arquivos estáticos com Nginx.
- Cumprir SQ1, SQ2, SQ3 e SQ4.
- Atualizar testes e documentação.

Não faz parte desta etapa autenticação de usuários, perfis privados ou backend próprio. Como consequência, todos os visitantes compartilharão a mesma lista de favoritos. Essa limitação acadêmica será declarada no README.

## Arquitetura

```text
Navegador
  ├── busca atletas ───────> NBA Rosters (JSON público)
  └── CRUD de favoritos ──> Supabase (PostgreSQL + API REST)

Distribuição
  ├── GitHub Pages ────────> index.html, style.css e módulos JavaScript
  └── Docker/Nginx ────────> os mesmos arquivos estáticos
```

O frontend utilizará `@supabase/supabase-js` como módulo ES hospedado em CDN. Apenas a URL do projeto e a chave pública `publishable` ficarão no cliente; nenhuma chave `service_role` será usada ou versionada.

## Modelo de dados

Tabela `favoritos`:

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `bigint` | chave primária gerada automaticamente |
| `criado_em` | `timestamptz` | padrão `now()` |
| `chave_atleta` | `text` | obrigatória e única |
| `nome` | `text` | obrigatório |
| `equipe` | `text` | obrigatório |
| `posicao` | `text` | opcional |
| `altura` | `text` | opcional |
| `peso` | `text` | opcional |
| `faculdade` | `text` | opcional |
| `imagem_url` | `text` | opcional |

`chave_atleta` será derivada de nome e equipe normalizados. A restrição única também protege contra duplicatas caso duas inserções ocorram quase simultaneamente.

O RLS ficará habilitado com políticas para o papel `anon` realizar `SELECT`, `INSERT` e `DELETE`. As políticas serão abertas apenas para atender à etapa sem autenticação.

## Experiência da interface

Cada resultado da busca receberá um botão de favorito. A página terá uma seção independente chamada “Meus favoritos”, carregada ao abrir a aplicação.

Estados previstos:

- carregamento inicial dos favoritos;
- lista vazia com orientação para pesquisar um atleta;
- favorito salvo com confirmação visual;
- atleta já favoritado, sem criar duplicata;
- remoção com atualização imediata da lista e dos botões da busca;
- erro de rede ou banco com mensagem legível e possibilidade de tentar novamente.

Os botões terão estado desabilitado durante operações assíncronas e os avisos usarão uma região `aria-live`. A interface continuará responsiva e navegável por teclado.

## Fluxo de dados

1. A página inicializa o cliente Supabase e executa `SELECT` em `favoritos`.
2. A busca continua carregando e filtrando o JSON NBA Rosters.
3. Ao favoritar, o frontend normaliza os dados do atleta e executa `INSERT`.
4. A resposta confirmada atualiza a lista local e o estado dos botões.
5. Ao remover, o frontend executa `DELETE` pelo `id` e só então retira o item da interface.
6. Falhas não alteram a cópia visual como se a operação tivesse funcionado.

## Estrutura de código

- `script.js`: busca, normalização e inicialização da página.
- `supabase.js`: configuração pública e operações do repositório de favoritos.
- `favorites.js`: regras puras, geração de chave e marcação HTML dos favoritos.
- `index.html` e `style.css`: seção, controles e estados visuais.
- `supabase/schema.sql`: criação da tabela, restrição, RLS e políticas reproduzíveis.
- `tests/`: testes das regras existentes e das novas regras de favoritos.

A separação mantém as regras testáveis sem navegador e concentra o acesso ao banco em um único módulo.

## Docker e sidequests

O `Dockerfile` usará `nginx:alpine` e copiará apenas os arquivos necessários para `/usr/share/nginx/html/`. O `.dockerignore` excluirá Git, documentação de planejamento, testes, capturas, dependências locais e arquivos de editor.

Sequência de versões:

- `athoslira/bootcamp2-app:1.0`: CRUD persistente funcional.
- `athoslira/bootcamp2-app:1.1`: prevenção de duplicatas, indicação visual e contador.
- `athoslira/bootcamp2-app:latest`: mesmo conteúdo da versão `1.1`.

O overview do Docker Hub terá descrição, comando pronto e link do GitHub. Para SQ4, serão executados dois containers da versão final nas portas 8080 e 8081. A evidência será produzida a partir da saída real do `docker ps` e versionada no repositório. O README explicará cluster, pod e réplica no contexto de administrar 100 containers com Kubernetes.

## Testes e validação

- Testes unitários da geração de chave, payload, prevenção de duplicata e marcação segura.
- Regressão dos testes da busca e escape de HTML.
- Verificação manual de criar, recarregar, listar e excluir usando o Supabase real.
- Verificação da aplicação no GitHub Pages.
- Build da imagem e teste nas portas 8080 e 8081.
- Pull/execução da imagem pública usando exatamente o comando do README.

## Entrega e histórico

Os commits mostrarão a evolução: schema e regras, interface CRUD, Docker `1.0`, melhoria `1.1`, evidências e documentação. O README final conterá links do GitHub, GitHub Pages e Docker Hub; comando `docker run`; estrutura da persistência; limitação de RLS; explicações das quatro sidequests; e a captura da SQ4.

## Dependências externas

- Projeto Supabase: `https://hzfnrtcgmbvkffujluab.supabase.co`.
- Chave usada no frontend: somente a chave pública `publishable` fornecida pelo responsável.
- Docker Hub: namespace `athoslira`.
- Docker Desktop: precisa ser instalado e iniciado neste computador antes do build e das evidências.

## Critérios de conclusão

A Etapa 02 estará concluída apenas quando o CRUD persistir após recarregar a página, os testes passarem, a imagem pública puder ser baixada e executada, as três tags existirem no Docker Hub, dois containers aparecerem simultaneamente nas portas solicitadas e o README contiver todas as evidências exigidas.
