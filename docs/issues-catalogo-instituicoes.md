# Issues — catalogo-instituicoes (API)

Gerado de [`.specs/features/catalogo-instituicoes/tasks.md`](../api/.specs/features/catalogo-instituicoes/tasks.md) em 2026-09-20.
Arquitetura **AD-017** (hexagonal, contexto único `src/domain/fivo/`, rich domain model).
Autoria dividida por **AD-020**: **domínio (T1–T20) por humanos**, **infra (T21–T34) pelo agente**.

- **Repositório:** https://github.com/llslucas/fivo-selo-sustentavel
- **Milestone:** [catalogo-instituicoes — API](https://github.com/llslucas/fivo-selo-sustentavel/milestone/2) (nº 2)
- **Issues:** #52–#85 (uma por task)
- **34 tasks / 9 fases.** Rodada **P1** do `api`. P2 (área logada da instituição, notas internas) e as telas do `web` ficam para rodadas posteriores.

## Gate de handoff (entre T20 e T21)

A Fase 6 só começa quando: gate `build` verde **e** verificação independente do agente sobre `src/domain/**` registrada em `validation-dominio.md` com veredito PASS. Lacunas encontradas viram tasks humanas de correção.

## Mapa task → issue

| Task | Issue | Fase | Tipo | Autor | Depende de | Título |
| ---- | ----- | ---- | ---- | ----- | ---------- | ------ |
| T1 | [#52](https://github.com/llslucas/fivo-selo-sustentavel/issues/52) | 1 | dominio | 👤 humano | — | Erros de aplicação do catálogo |
| T2 | [#53](https://github.com/llslucas/fivo-selo-sustentavel/issues/53) | 1 | dominio | 👤 humano | #52 | Entidade `Causa` |
| T3 | [#54](https://github.com/llslucas/fivo-selo-sustentavel/issues/54) | 1 | dominio | 👤 humano | #52 | Value object `DocumentoValidacao` |
| T4 | [#55](https://github.com/llslucas/fivo-selo-sustentavel/issues/55) | 1 | dominio | 👤 humano | #52 | `Arquivo` — tipos e limites por tipo |
| T5 | [#56](https://github.com/llslucas/fivo-selo-sustentavel/issues/56) | 1 | dominio | 👤 humano | #52, #54 | Entidade `Instituicao` — retrabalho para rich domain model |
| T6 | [#57](https://github.com/llslucas/fivo-selo-sustentavel/issues/57) | 2 | dominio | 👤 humano | #53 | Porta `CausaRepository`, double em memória e factory |
| T7 | [#58](https://github.com/llslucas/fivo-selo-sustentavel/issues/58) | 2 | dominio | 👤 humano | #56 | Porta `InstituicaoRepository` expandida e double reescrito |
| T8 | [#59](https://github.com/llslucas/fivo-selo-sustentavel/issues/59) | 2 | dominio | 👤 humano | — | Porta `VerificadorDeDocumento` e fake |
| T9 | [#60](https://github.com/llslucas/fivo-selo-sustentavel/issues/60) | 3 | dominio | 👤 humano | #53, #57 | `CriarCausaUseCase` |
| T10 | [#61](https://github.com/llslucas/fivo-selo-sustentavel/issues/61) | 3 | dominio | 👤 humano | #53, #57 | `EditarCausaUseCase` |
| T11 | [#62](https://github.com/llslucas/fivo-selo-sustentavel/issues/62) | 3 | dominio | 👤 humano | #53, #57, #58 | `InativarCausaUseCase` |
| T12 | [#63](https://github.com/llslucas/fivo-selo-sustentavel/issues/63) | 3 | dominio | 👤 humano | #57 | `ListarCausasAtivasUseCase` |
| T13 | [#64](https://github.com/llslucas/fivo-selo-sustentavel/issues/64) | 4 | dominio | 👤 humano | #54, #56, #57, #58 | `CriarInstituicaoUseCase` — retrabalho do autocadastro |
| T14 | [#65](https://github.com/llslucas/fivo-selo-sustentavel/issues/65) | 4 | dominio | 👤 humano | #58 | `ListarFilaInstituicoesUseCase` |
| T15 | [#66](https://github.com/llslucas/fivo-selo-sustentavel/issues/66) | 4 | dominio | 👤 humano | #56, #58, #59 | `AprovarInstituicaoUseCase` — retrabalho |
| T16 | [#67](https://github.com/llslucas/fivo-selo-sustentavel/issues/67) | 4 | dominio | 👤 humano | #56, #58 | `RejeitarInstituicaoUseCase` — retrabalho |
| T17 | [#68](https://github.com/llslucas/fivo-selo-sustentavel/issues/68) | 4 | dominio | 👤 humano | #56, #58 | Suspensão e reativação de instituição |
| T18 | [#69](https://github.com/llslucas/fivo-selo-sustentavel/issues/69) | 4 | dominio | 👤 humano | #56, #58 | `InativarInstituicaoUseCase` |
| T19 | [#70](https://github.com/llslucas/fivo-selo-sustentavel/issues/70) | 5 | dominio | 👤 humano | #57, #58 | `ListarBeneficiadasUseCase` |
| T20 | [#71](https://github.com/llslucas/fivo-selo-sustentavel/issues/71) | 5 | dominio | 👤 humano | #57, #58 | `AssegurarBeneficiadaDisponivelUseCase` |
| T21 | [#72](https://github.com/llslucas/fivo-selo-sustentavel/issues/72) | 6 | infra | 🤖 agente | — | Schema Prisma e migration do catálogo |
| T22 | [#73](https://github.com/llslucas/fivo-selo-sustentavel/issues/73) | 6 | infra | 🤖 agente | #57, #72 | `PrismaCausaRepository` e mapper |
| T23 | [#74](https://github.com/llslucas/fivo-selo-sustentavel/issues/74) | 6 | infra | 🤖 agente | #58, #72 | `PrismaInstituicaoRepository` e mapper |
| T24 | [#75](https://github.com/llslucas/fivo-selo-sustentavel/issues/75) | 7 | infra | 🤖 agente | #55, #72 | `ArquivoService` — PDF e limites por tipo |
| T25 | [#76](https://github.com/llslucas/fivo-selo-sustentavel/issues/76) | 7 | infra | 🤖 agente | #74, #75 | Acesso restrito ao documento de validação |
| T26 | [#77](https://github.com/llslucas/fivo-selo-sustentavel/issues/77) | 7 | infra | 🤖 agente | #59, #75 | Adaptador `VerificadorDeDocumentoPrisma` |
| T27 | [#78](https://github.com/llslucas/fivo-selo-sustentavel/issues/78) | 8 | infra | 🤖 agente | #60, #61, #62, #73 | `AdminCausasController` |
| T28 | [#79](https://github.com/llslucas/fivo-selo-sustentavel/issues/79) | 8 | infra | 🤖 agente | #63, #73, #78 | `GET /causas` público |
| T29 | [#80](https://github.com/llslucas/fivo-selo-sustentavel/issues/80) | 8 | infra | 🤖 agente | #64, #74, #75 | `POST /instituicoes` — autocadastro |
| T30 | [#81](https://github.com/llslucas/fivo-selo-sustentavel/issues/81) | 8 | infra | 🤖 agente | #65, #66, #67, #74, #77 | `AdminInstituicoesController` — fila, aprovação e rejeição |
| T31 | [#82](https://github.com/llslucas/fivo-selo-sustentavel/issues/82) | 8 | infra | 🤖 agente | #68, #69, #81 | Suspensão, reativação e inativação de instituição (HTTP) |
| T32 | [#83](https://github.com/llslucas/fivo-selo-sustentavel/issues/83) | 8 | infra | 🤖 agente | #70, #74 | `GET /beneficiadas` |
| T33 | [#84](https://github.com/llslucas/fivo-selo-sustentavel/issues/84) | 9 | teste | 🤖 agente | #80, #81, #82 | Sweep de concorrência e autorização |
| T34 | [#85](https://github.com/llslucas/fivo-selo-sustentavel/issues/85) | 9 | infra | 🤖 agente | #78, #79, #83, #84 | Fechamento — OpenAPI exportado e documentação |

## Fases

| Fase | Tema | Tasks | Autor |
| ---- | ---- | ----- | ----- |
| 1 | Erros, value objects e entidades | T1–T5 | 👤 humano |
| 2 | Portas e test doubles | T6–T8 | 👤 humano |
| 3 | Casos de uso de causa | T9–T12 | 👤 humano |
| 4 | Autocadastro, fila e decisões do administrador | T13–T18 | 👤 humano |
| 5 | Catálogo de beneficiadas | T19, T20 | 👤 humano |
| 6 | Persistência (Prisma / PostgreSQL) | T21–T23 | 🤖 agente |
| 7 | Arquivos | T24–T26 | 🤖 agente |
| 8 | HTTP, rotas e OpenAPI | T27–T32 | 🤖 agente |
| 9 | Fechamento | T33, T34 | 🤖 agente |

## Ordem de execução

Sequencial por fase. Dentro de uma fase, tasks sem dependência entre si podem ser distribuídas entre pessoas diferentes do grupo (ex.: T2, T3 e T4 em paralelo; T9–T12 em paralelo depois de T6).

Fase 1 `T1 … T5` · Fase 2 `T6 … T8` · Fase 3 `T9 … T12` · Fase 4 `T13 … T18` · Fase 5 `T19 → T20` · **gate de handoff** · Fase 6 `T21 → T22 → T23` · Fase 7 `T24 → T25 → T26` · Fase 8 `T27 … T32` · Fase 9 `T33 → T34`.

Cada task: implementar → gate verde → commit atômico → marcar a issue e a task em `tasks.md`.
