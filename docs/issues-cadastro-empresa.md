# Issues — cadastro-empresa (API)

Gerado de [`.specs/features/cadastro-empresa/tasks.md`](../.specs/features/cadastro-empresa/tasks.md) em 2026-09-07.
Arquitetura **AD-017** (hexagonal, contexto único `src/domain/fivo/`, rich domain model).
**Código escrito por mãos humanas** (trabalho escolar).

- **Repositório:** https://github.com/llslucas/fivo-selo-sustentavel
- **Milestone:** [cadastro-empresa — API](https://github.com/llslucas/fivo-selo-sustentavel/milestone/1) (nº 1)
- **Issues:** #3–#34 (uma por task)
- **32 tasks / 6 fases.** Fases 1–2 fecham a regra de negócio (verificável sem infra); 3–6 são a camada de infra.

## Mapa task → issue

| Task | Issue | Fase | Tipo | Depende de | Título |
| ---- | ----- | ---- | ---- | ---------- | ------ |
| T1 | [#3](https://github.com/llslucas/fivo-selo-sustentavel/issues/3) | 1 | teste | — | Testes unit do value object `Cnpj` |
| T2 | [#4](https://github.com/llslucas/fivo-selo-sustentavel/issues/4) | 1 | dominio | — | Value object `Senha` |
| T3 | [#5](https://github.com/llslucas/fivo-selo-sustentavel/issues/5) | 1 | dominio | — | Entidade `Empresa` — modelo e máquina de estados |
| T4 | [#6](https://github.com/llslucas/fivo-selo-sustentavel/issues/6) | 1 | dominio | #4 | Entidade `User` — `Senha`, contadores e bloqueio de login |
| T5 | [#7](https://github.com/llslucas/fivo-selo-sustentavel/issues/7) | 1 | dominio | — | Entidade `Arquivo` — factory validante |
| T6 | [#8](https://github.com/llslucas/fivo-selo-sustentavel/issues/8) | 1 | dominio | — | Contrato uniforme de erro de aplicação |
| T7 | [#9](https://github.com/llslucas/fivo-selo-sustentavel/issues/9) | 1 | dominio | — | Novas portas de domínio e seus test doubles |
| T8 | [#10](https://github.com/llslucas/fivo-selo-sustentavel/issues/10) | 2 | dominio | #5, #6, #7, #8, #9 | Retrabalho de `CriarEmpresaUseCase` |
| T9 | [#11](https://github.com/llslucas/fivo-selo-sustentavel/issues/11) | 2 | dominio | #6, #8, #9 | Retrabalho de `AutenticarUsuarioUseCase` |
| T10 | [#12](https://github.com/llslucas/fivo-selo-sustentavel/issues/12) | 2 | dominio | #5, #8, #9 | Aprovação e rejeição pelo administrador + fila |
| T11 | [#13](https://github.com/llslucas/fivo-selo-sustentavel/issues/13) | 2 | dominio | #5, #8, #9 | Suspensão e reativação pelo administrador |
| T12 | [#14](https://github.com/llslucas/fivo-selo-sustentavel/issues/14) | 2 | dominio | #5, #7, #9, #10 | `EditarDadosEmpresaUseCase` (P2) |
| T13 | [#15](https://github.com/llslucas/fivo-selo-sustentavel/issues/15) | 2 | dominio | #4, #6, #9, #11 | `SolicitarRecuperacaoSenhaUseCase` + `RedefinirSenhaUseCase` (P2) |
| T14 | [#16](https://github.com/llslucas/fivo-selo-sustentavel/issues/16) | 3 | infra | #5, #6, #7 | Setup de Prisma + PostgreSQL |
| T15 | [#17](https://github.com/llslucas/fivo-selo-sustentavel/issues/17) | 3 | infra | #16 | `PrismaService` + `DatabaseModule` global |
| T16 | [#18](https://github.com/llslucas/fivo-selo-sustentavel/issues/18) | 3 | teste | #17 | Harness de teste e2e com Postgres descartável |
| T17 | [#19](https://github.com/llslucas/fivo-selo-sustentavel/issues/19) | 3 | infra | #17, #18, #10, #11 | Adaptadores Prisma — `EmpresaRepository` e `UserRepository` |
| T18 | [#20](https://github.com/llslucas/fivo-selo-sustentavel/issues/20) | 3 | infra | #17, #18, #9 | Adaptadores Prisma — `Sessao`, `RegistroAuditoria`, `TokenSenha` |
| T19 | [#21](https://github.com/llslucas/fivo-selo-sustentavel/issues/21) | 4 | infra | #17 | `CryptographyModule` — hash e gerador de token opaco |
| T20 | [#22](https://github.com/llslucas/fivo-selo-sustentavel/issues/22) | 4 | infra | #17 | `MailModule` — adaptador de log |
| T21 | [#23](https://github.com/llslucas/fivo-selo-sustentavel/issues/23) | 4 | infra | #17 | `StorageModule` — disco local |
| T22 | [#24](https://github.com/llslucas/fivo-selo-sustentavel/issues/24) | 4 | infra | #7, #23, #19 | `ArquivoService` — sniff, construção da entidade e persistência |
| T23 | [#25](https://github.com/llslucas/fivo-selo-sustentavel/issues/25) | 5 | infra | #8, #18 | `DomainExceptionFilter` + `ZodValidationPipe` |
| T24 | [#26](https://github.com/llslucas/fivo-selo-sustentavel/issues/26) | 5 | infra | #20, #21, #25 | `AuthModule` — sessão, guards e decorators |
| T25 | [#27](https://github.com/llslucas/fivo-selo-sustentavel/issues/27) | 5 | infra | #10, #22, #24, #26 | `CadastroEmpresaController` — autocadastro e dados próprios |
| T26 | [#28](https://github.com/llslucas/fivo-selo-sustentavel/issues/28) | 5 | infra | #11, #26 | `AutenticacaoController` — login e logout |
| T27 | [#29](https://github.com/llslucas/fivo-selo-sustentavel/issues/29) | 5 | infra | #12, #13, #26 | `AdminEmpresasController` — fila e decisões |
| T28 | [#30](https://github.com/llslucas/fivo-selo-sustentavel/issues/30) | 5 | infra | #24, #26 | Entrega de binário — `GET /arquivos/:id` |
| T29 | [#31](https://github.com/llslucas/fivo-selo-sustentavel/issues/31) | 5 | infra | #14, #15, #27, #28 | Rotas P2 — edição cadastral e recuperação de senha |
| T30 | [#32](https://github.com/llslucas/fivo-selo-sustentavel/issues/32) | 6 | teste | #27, #29, #30 | Sweep de concorrência e re-cadastro |
| T31 | [#33](https://github.com/llslucas/fivo-selo-sustentavel/issues/33) | 6 | infra | #27, #29 | Fila de reenvio de e-mail |
| T32 | [#34](https://github.com/llslucas/fivo-selo-sustentavel/issues/34) | 6 | teste | #30 | Escape de conteúdo e verificação de sanitização |

## Fases

| Fase | Tema | Tasks |
| ---- | ---- | ----- |
| 1 | Regras de negócio no domínio (entidades + VOs) | T1, T2, T3, T4, T5, T6, T7 |
| 2 | Casos de uso | T8, T9, T10, T11, T12, T13 |
| 3 | Persistência (Prisma / PostgreSQL) | T14, T15, T16, T17, T18 |
| 4 | Adaptadores de criptografia, e-mail e storage | T19, T20, T21, T22 |
| 5 | HTTP, autenticação e sessão | T23, T24, T25, T26, T27, T28, T29 |
| 6 | Edge cases e robustez | T30, T31, T32 |

## Ordem de execução

Estritamente sequencial, sem paralelismo intra-fase. Cada task: implementar → gate verde → commit atômico → marcar a issue e a task em `tasks.md`.

Fase 1 `T1..T7` (T2 antes de T4) · Fase 2 `T8→T9→T10→T11→T12→T13` · Fase 3 `T14→T15→T16→T17→T18` · Fase 4 `T19→T20→T21→T22` · Fase 5 `T23→T24→T25→T26→T27→T28→T29` · Fase 6 `T30→T31→T32`.
