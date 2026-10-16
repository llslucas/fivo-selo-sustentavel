# Issues — campanhas (API)

Gerado de [`.specs/features/campanhas/tasks.md`](../api/.specs/features/campanhas/tasks.md) em 2026-10-15.
Arquitetura **AD-017** (hexagonal, contexto único `src/domain/fivo/`, rich domain model).
Autoria dividida por **AD-021**: **domínio (T1–T27) pelo grupo**, **infra (T28–T40) pelo agente**.

- **Repositório:** https://github.com/llslucas/fivo-selo-sustentavel
- **Milestone:** [campanhas — API](https://github.com/llslucas/fivo-selo-sustentavel/milestone/3) (nº 3)
- **Issues:** #159–#185 (uma por task de domínio). As tasks de infra (T28–T40) não têm issue: o agente as executa depois do gate de handoff.
- **40 tasks / 9 fases.** Rodada **P1** do `api` (CAMP-01…08 e CAMP-11). Encerramento, duplicação e telas do `web` ficam para rodadas posteriores.

## Gate de handoff (entre T27 e T28)

A Fase 7 só começa quando: gate `build` verde **e** verificação independente do agente sobre `src/domain/**` registrada em `validation-dominio.md` com veredito PASS. Lacunas encontradas viram tasks de correção para o grupo.

## Mapa task → issue

| Task | Issue | Fase | Depende de | Título |
| ---- | ----- | ---- | ---------- | ------ |
| T1 | [#159](https://github.com/llslucas/fivo-selo-sustentavel/issues/159) | 1 | — | Erros de aplicação de campanha |
| T2 | [#160](https://github.com/llslucas/fivo-selo-sustentavel/issues/160) | 1 | #159 | Value object NomeCampanha |
| T3 | [#161](https://github.com/llslucas/fivo-selo-sustentavel/issues/161) | 1 | #159 | Value object DescricaoCampanha |
| T4 | [#162](https://github.com/llslucas/fivo-selo-sustentavel/issues/162) | 1 | #159 | Value object ValorMonetario (em centavos) |
| T5 | [#163](https://github.com/llslucas/fivo-selo-sustentavel/issues/163) | 1 | #159 | Value object Percentual (em centésimos) |
| T6 | [#164](https://github.com/llslucas/fivo-selo-sustentavel/issues/164) | 1 | #162, #163 | Value object RegraDoacao |
| T7 | [#165](https://github.com/llslucas/fivo-selo-sustentavel/issues/165) | 2 | #159 | Value object Beneficiada |
| T8 | [#166](https://github.com/llslucas/fivo-selo-sustentavel/issues/166) | 2 | #159 | Value object DataCalendario (data sem hora) |
| T9 | [#167](https://github.com/llslucas/fivo-selo-sustentavel/issues/167) | 2 | #166 | Value object Vigencia |
| T10 | [#168](https://github.com/llslucas/fivo-selo-sustentavel/issues/168) | 2 | #164, #165, #167 | Value object Compromisso |
| T11 | [#169](https://github.com/llslucas/fivo-selo-sustentavel/issues/169) | 2 | — | Arquivo: tipo IMAGEM_CAMPANHA para a capa |
| T12 | [#170](https://github.com/llslucas/fivo-selo-sustentavel/issues/170) | 3 | #168 | Entidade AlteracaoCompromisso |
| T13 | [#171](https://github.com/llslucas/fivo-selo-sustentavel/issues/171) | 3 | #160, #161, #162, #168 | Campanha: rascunho, edição e submissão (reescrita) |
| T14 | [#172](https://github.com/llslucas/fivo-selo-sustentavel/issues/172) | 3 | #171 | Campanha: decisões do administrador |
| T15 | [#173](https://github.com/llslucas/fivo-selo-sustentavel/issues/173) | 3 | #170, #172 | Campanha: alteração de campanha aprovada |
| T16 | [#174](https://github.com/llslucas/fivo-selo-sustentavel/issues/174) | 4 | #173 | CampanhaRepository, repositório em memória e factory (reescrita) |
| T17 | [#175](https://github.com/llslucas/fivo-selo-sustentavel/issues/175) | 4 | — | Templates de e-mail de rejeição de campanha |
| T18 | [#176](https://github.com/llslucas/fivo-selo-sustentavel/issues/176) | 5 | #174 | CriarCampanhaUseCase (reescrita) |
| T19 | [#177](https://github.com/llslucas/fivo-selo-sustentavel/issues/177) | 5 | #174 | EditarCampanhaUseCase |
| T20 | [#178](https://github.com/llslucas/fivo-selo-sustentavel/issues/178) | 5 | #174 | SubmeterCampanhaUseCase |
| T21 | [#179](https://github.com/llslucas/fivo-selo-sustentavel/issues/179) | 5 | #174 | ConsultarCampanhaDaEmpresaUseCase |
| T22 | [#180](https://github.com/llslucas/fivo-selo-sustentavel/issues/180) | 6 | #174 | ListarFilaCampanhasUseCase |
| T23 | [#181](https://github.com/llslucas/fivo-selo-sustentavel/issues/181) | 6 | #174 | AprovarCampanhaUseCase |
| T24 | [#182](https://github.com/llslucas/fivo-selo-sustentavel/issues/182) | 6 | #174, #175 | RejeitarCampanhaUseCase |
| T25 | [#183](https://github.com/llslucas/fivo-selo-sustentavel/issues/183) | 6 | #174 | AprovarAlteracaoCampanhaUseCase |
| T26 | [#184](https://github.com/llslucas/fivo-selo-sustentavel/issues/184) | 6 | #174, #175 | RejeitarAlteracaoCampanhaUseCase |
| T27 | [#185](https://github.com/llslucas/fivo-selo-sustentavel/issues/185) | 6 | #174 | BuscarCampanhaPublicaUseCase |

## Fases

| Fase | Tema | Tasks | Autor |
| ---- | ---- | ----- | ----- |
| 1 | Erros e value objects de texto e dinheiro | T1–T6 | 👤 grupo |
| 2 | Beneficiada, datas, compromisso e tipo de arquivo | T7–T11 | 👤 grupo |
| 3 | Entidades | T12–T15 | 👤 grupo |
| 4 | Portas e doubles de teste | T16, T17 | 👤 grupo |
| 5 | Casos de uso da empresa | T18–T21 | 👤 grupo |
| 6 | Casos de uso do administrador e consulta pública | T22–T27 | 👤 grupo |
| 7 | Persistência, arquivo e e-mail | T28–T31 | 🤖 agente |
| 8 | HTTP | T32–T38 | 🤖 agente |
| 9 | Fechamento | T39, T40 | 🤖 agente |

## Ordem de execução

Sequencial por fase. Dentro de uma fase, tasks sem dependência entre si podem ser divididas entre pessoas do grupo:

- **Fase 1:** T1 primeiro; depois T2, T3, T4 e T5 em paralelo; T6 quando T4 e T5 estiverem prontas.
- **Fase 2:** T7, T8 e T11 em paralelo; T9 depois da T8; T10 por último.
- **Fase 3:** T12 e T13 em paralelo; T14 depois da T13; T15 por último.
- **Fase 4:** T16 e T17 em paralelo.
- **Fases 5 e 6:** depois da T16, todos os casos de uso (T18–T27) podem ser feitos em paralelo; T24 e T26 também precisam da T17.

Cada task: implementar → gate verde → commit atômico → marcar a caixa em `tasks.md` no mesmo commit → fechar a issue.
