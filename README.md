# Quadra em Foco

Aplicação web para pesquisar atletas da NBA em uma base pública com mais de mil perfis e montar uma lista persistente de favoritos.

## Autor

Athos Lira Araújo — GitHub [@athoslira](https://github.com/athoslira) — Matrícula: **22307894**

## Links da entrega

- [Repositório no GitHub](https://github.com/athoslira/bootcampII)
- [Aplicação no GitHub Pages](https://athoslira.github.io/bootcampII/)
- [Imagem no Docker Hub](https://hub.docker.com/r/athoslira/bootcamp2-app)

## Funcionalidades

- Busca por nome completo ou parcial em uma base de 1.076 atletas.
- Exibição de foto, equipe, posição, altura, peso e formação.
- Criação, listagem e exclusão de atletas favoritos.
- Favoritos preservados após fechar ou recarregar o navegador.
- Prevenção de duplicatas e indicação visual de atletas já salvos.
- Interface responsiva, acessível por teclado e com estados de carregamento e erro.

## API externa

A busca consome o dataset público [NBA Rosters](https://github.com/A-V29/NBA.Rosters):

```text
https://raw.githubusercontent.com/A-V29/NBA.Rosters/main/2025-26.NBA.Roster.json
```

## Persistência

Os favoritos são armazenados em um banco PostgreSQL no Supabase. A tabela `favoritos` possui:

| Coluna | Finalidade |
| --- | --- |
| `id` | Identificador gerado pelo banco |
| `criado_em` | Data e hora do cadastro |
| `chave_atleta` | Chave única baseada no nome e na equipe |
| `nome`, `equipe`, `posicao` | Identificação esportiva |
| `altura`, `peso`, `faculdade` | Informações do perfil |
| `imagem_url` | Foto pública do atleta |

A aplicação realiza as operações **Create**, **Read** e **Delete**. O script reproduzível de criação está em [`supabase/schema.sql`](supabase/schema.sql).

O Row Level Security está habilitado, mas as políticas permitem `SELECT`, `INSERT` e `DELETE` para o papel anônimo. Essa configuração aberta foi usada somente para a etapa acadêmica, que não inclui autenticação: todos os visitantes compartilham a mesma lista de favoritos. Em produção, cada registro deveria ser vinculado a um usuário autenticado.

## Executar localmente

```bash
git clone https://github.com/athoslira/bootcampII.git
cd bootcampII
python -m http.server 8080
```

Abra `http://localhost:8080`.

## Executar com Docker

Com o Docker em execução, qualquer pessoa pode iniciar a versão final com uma linha:

```bash
docker run -d -p 8080:80 athoslira/bootcamp2-app:1.1
```

Depois, abra `http://localhost:8080`.

Tags publicadas:

- `1.0`: primeira versão com CRUD persistente funcional.
- `1.1`: adiciona prevenção visual de duplicatas, contador e estado **Salvo**.
- `latest`: aponta para o mesmo conteúdo da versão `1.1`.

## Testes

O projeto usa o test runner nativo do Node.js:

```bash
npm test
```

Os testes cobrem normalização dos dados da NBA, escape de HTML, geração da chave do atleta, payload enviado ao Supabase, validação de identificadores, indexação de favoritos e estado visual de atletas já salvos.

## Sidequests

### SQ1 · `.dockerignore`

O arquivo [`.dockerignore`](.dockerignore) exclui do contexto de build o histórico Git, testes, documentação interna, evidências, arquivos de editor e dependências locais. Isso reduz os dados enviados ao daemon, melhora o reaproveitamento do cache e evita colocar arquivos sem função dentro da imagem.

### SQ2 · Versionamento da imagem

As tags públicas `1.0`, `1.1` e `latest` estão no [Docker Hub](https://hub.docker.com/r/athoslira/bootcamp2-app/tags). A `1.0` registra o primeiro CRUD funcional; a `1.1` representa uma melhoria observável na prevenção de favoritos duplicados. `latest` e `1.1` apontam para o mesmo digest.

### SQ3 · Overview no Docker Hub

O overview do repositório descreve a aplicação, apresenta o comando `docker run` pronto para copiar e liga para o [código-fonte no GitHub](https://github.com/athoslira/bootcampII).

![Overview publicado no Docker Hub](evidencias/dockerhub-overview.png)

### SQ4 · Explorando a orquestração

Dois containers da versão `1.1` foram executados simultaneamente nas portas 8080 e 8081:

![Saída real do docker ps com dois containers](evidencias/sq4-docker-ps.png)

Com 100 containers, eu usaria Kubernetes em vez de iniciar e acompanhar cada processo manualmente. Um **cluster** reúne as máquinas disponíveis; cada **pod** encapsula uma ou mais instâncias da aplicação; e um Deployment declara a quantidade desejada de **réplicas**. O controlador recria réplicas que falham, distribui a carga e permite atualizações graduais sem administrar container por container.

## Limitações conhecidas

- A lista de favoritos é compartilhada porque esta etapa não possui autenticação.
- A disponibilidade das fotos depende das URLs fornecidas pelo dataset externo.
- As políticas anônimas do Supabase devem ser substituídas antes de um uso em produção.
