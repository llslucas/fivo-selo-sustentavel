# Cadastro de Empresa — Validação consolidada da feature

**Date**: 2026-09-20
**Spec**: `.specs/features/cadastro-empresa/spec.md` (EMP-01 a EMP-11)
**Escopo**: T1–T55, Fases 1–9. Cada fase foi verificada por um Verifier independente ao seu fim.

## Validation

**Result**: PASS

Relatórios por fase (fonte da evidência detalhada por AC):

| Fase | Tasks | Relatório | Veredito |
| ---- | ----- | --------- | -------- |
| 1 | T1–T7 | `validation-fase1.md` | PASS |
| 2 | T8–T13 | `validation-fase2.md` | PASS |
| 3 | T14–T18, T33 | `validation-fase3.md` | PASS (achados tratados nas Fases 5–8) |
| 4–5 | T19–T29 | `validation-fase5.md` | PASS (achados tratados nas Fases 6–8) |
| 6 | T30–T32 | `validation-fase6.md` | PASS |
| 7 | T34–T39 | `validation-fase7.md` | PASS |
| 8 | T40–T46 | `validation-fase8.md` | PASS (19/21 mutantes mortos) |
| 9 | T47–T55 | `validation-fase9.md` | PASS (25/26 mutantes mortos; o sobrevivente foi morto depois) |

## Fase 9 — EMP-11 (OpenAPI)

| AC | Evidência | Resultado |
| -- | --------- | --------- |
| AC1 — `/docs` e `/docs/openapi.json` sem sessão fora de produção | `test/http/openapi.e2e-spec.ts:44` (200 + `openapi` começa com `3.`), `:66` (`/docs` HTML) | PASS |
| AC2 — 404 em produção sem `SWAGGER_ENABLED=true` | `test/http/openapi.e2e-spec.ts:78` (produção → 404), `:89` (`SWAGGER_ENABLED='false'` → 404) | PASS |
| AC3 — toda rota documentada | `test/http/openapi-paridade.e2e-spec.ts:115` (15 rotas = 15 operações, conjunto igual); `test/http/openapi-exportacao.e2e-spec.ts:19` (`openapi.json` igual ao gerado) | PASS |
| AC4 — esquemas derivados do Zod | `src/infra/http/openapi/esquema-openapi.spec.ts:17` (`required`, `minLength`/`maxLength` de `uf`) | PASS |
| AC5 — cookie de sessão; rotas não públicas protegidas | `test/http/openapi-paridade.e2e-spec.ts:133` (`@Public` sem `security`, demais com) | PASS |

**Correção pós-Verifier**: o Verifier apontou que `SWAGGER_ENABLED` diferente de `true` (por exemplo `false`, o valor de `.env.example`) em produção não tinha teste (mutante `Boolean(env)` sobrevivia). Foi adicionado o e2e correspondente e o mutante passou a ser morto.

**Gate final**: `tsc`, `eslint` e build verdes; unit 174, e2e 205; `npm run openapi:export` sai com 0 e não gera diff.

**Pendências Minor (não bloqueantes)**: os status documentados são conferidos contra literais dos testes, sem ligação com o runtime; a paridade de AC5 checa só a presença de `security`; a spec não define se 500 e 400 de corpo malformado entram em AC3; o teste de 2xx é fraco porque o Nest deriva o 2xx de `@HttpCode`.
