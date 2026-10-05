# Cadastro de Empresa — Validação da Fase 9 (T47–T55, EMP-11 OpenAPI)

**Date**: 2026-09-20
**Spec**: `.specs/features/cadastro-empresa/spec.md` — "P2: Contrato HTTP documentado (OpenAPI)", AC1–AC5
**Diff range**: `8463e31^..1a769dd` (`git log main..HEAD`) — 9 commits, 19 arquivos, +2669/−40 (1490 linhas são o `openapi.json` gerado)
**Verifier**: sub-agente independente (author ≠ verifier). Nenhuma linha de produção ou teste alterada no tree real; mutantes injetados por cópia in-place com `git checkout -- <arquivo>` a cada rodada, `git status --porcelain` idêntico ao baseline (`?? .vscode/`) no fim.

---

## Veredito

# PASS com ressalvas (1 mutante sobrevivente Major, 0 Critical)

Todos os "Done when" de T47–T55 têm asserção citada e batem com a spec. Gate verde. Sensor: 26 mutantes injetados, 25 mortos, 1 sobrevivente (M25 — AC2 com `SWAGGER_ENABLED="false"`). O documento diz a verdade sobre os controllers nos pontos conferidos (ver "Fidelidade ao comportamento real").

**Gate (estado real)**: `tsc --noEmit` ok; `eslint` ok; unit **174 passed / 31 suites**; e2e **204 passed / 21 suites**; `npm run openapi:export` exit 0 e `openapi.json` sem diff (15 operações). Metas de contagem das tasks (≥170 unit, ≥199 e2e) atendidas.

---

## Task Completion

| Task | Status | Notas |
| ---- | ------ | ----- |
| T47 | Done | `montarDocumentoOpenApi` + `configurarApp`; `.env.example` ganhou `SWAGGER_ENABLED` |
| T48 | Done | `esquemaOpenApi` com `z.toJSONSchema(io:'input', target:'openapi-3.0')`; `ErroResposta` |
| T49 | Done | 5 operações, multipart com `logo` binário |
| T50 | Done | `POST /sessoes` 200 (corrigido de 201; confere com `@HttpCode(200)` em `autenticacao.controller.ts:388`) |
| T51 | Done | 202/204/400/422, públicas |
| T52 | Done | 5 operações, todas protegidas via `@ApiProtegida` no nível da classe |
| T53 | Done | binário + 3 cabeçalhos + 401/403/404 |
| T54 | Done | paridade por conjunto (não por contagem) |
| T55 | Done | script exit 0; e2e compara com o arquivo versionado |

---

## Spec-Anchored Acceptance Criteria (evidence-or-zero)

| AC | Spec-defined outcome | `file:line` + asserção | Resultado |
| -- | -------------------- | ---------------------- | --------- |
| AC1 (dev/`SWAGGER_ENABLED=true`) JSON sem sessão | 200, OpenAPI 3 | `test/http/openapi.e2e-spec.ts:49` `expect(resposta.status).toBe(200)`; `:50-52` `openapi.startsWith('3.')` (chamada sem cookie, `NODE_ENV=test`) | PASS |
| AC1 UI em `/docs` sem sessão | 200 HTML | `openapi.e2e-spec.ts:73-74` `status toBe(200)`; `content-type toMatch(/text\/html/)` | PASS |
| AC1 com produção + `SWAGGER_ENABLED=true` | ambas 200 | `openapi.e2e-spec.ts:95-98` `expect(...status).toBe(200)` x2 | PASS |
| AC2 produção sem a flag | 404 em `/docs` e `/docs/openapi.json` | `openapi.e2e-spec.ts:82-85` `.status toBe(404)` x2 (só com a variável ausente) | PASS parcial — ver Gap 1 |
| AC3 toda rota registrada documentada | conjunto de rotas = conjunto de operações | `test/http/openapi-paridade.e2e-spec.ts:119-120` `toHaveLength(15)`; `expect(documentadas).toEqual(registradas)` (rotas via `DiscoveryService`) | PASS |
| AC3 ≥1 resposta de sucesso | toda operação com 2xx | `openapi-paridade.e2e-spec.ts:127-129` `some(startsWith('2'))` | PASS (fraca, ver Gap 5) |
| AC3 método, caminho, corpo, sucesso e cada erro, por controller | status exatos | empresas `openapi.e2e-spec.ts:148-170`; sessões `:207-217`; senha `:233-238`; admin `:256-286`; arquivos `:318-323` — todos `toEqual([...])` sobre `Object.keys(responses).sort()` | PASS contra o controller; spec-precision gap (Gap 4) |
| AC3 corpo de requisição | multipart com `logo` binário; `motivo` obrigatório | `openapi.e2e-spec.ts:178-181` `logo toEqual({type:'string',format:'binary'})`; `:305` `required toEqual(['motivo'])` | PASS |
| AC3 exportação versionada | arquivo = documento gerado | `test/http/openapi-exportacao.e2e-spec.ts:169-175` `versionado !== gerado → throw 'rode npm run openapi:export'`; `expect(versionado).toBe(gerado)` | PASS |
| AC4 campo obrigatório no Zod é obrigatório no doc | `required` do doc = `required` do Zod | unit `src/infra/http/openapi/esquema-openapi.spec.ts:107-111` `required arrayContaining([razaoSocial,cnpj,email,senha,uf])`, `not.toContain('complemento'/'site')`, `:112-113` `uf.minLength/maxLength toBe(2)`; e2e `openapi.e2e-spec.ts:182-185` (mesmo conjunto no `POST /empresas`) | PASS (só `CriarEmpresa` e `RejeicaoEmpresa`; ver Gap 6) |
| AC4 `ErroResposta` | `statusCode` inteiro, `message` string obrigatórios | `esquema-openapi.spec.ts:122-126` `required arrayContaining`, `statusCode.type toBe('integer')`, `message.type toBe('string')` | PASS |
| AC4 sem duplicar componente | 1 componente por nome | `esquema-openapi.spec.ts:133-138` `toHaveLength(1)` | PASS |
| AC5 esquema de segurança por cookie | apiKey/cookie com o nome de `NOME_COOKIE_SESSAO` | `openapi.e2e-spec.ts:59-65` `securitySchemes toEqual({cookie:{type:'apiKey',in:'cookie',name:NOME_COOKIE_SESSAO}})` | PASS |
| AC5 rota protegida marcada, pública não | `security:[{cookie:[]}]` só nas não `@Public` | paridade `:137-140` `operacao?.security !== undefined` `toEqual(!rota.publica)` para as 15; exatos em `openapi.e2e-spec.ts:189-192, 218, 239-240, 295, 339` | PASS |

### Fidelidade ao comportamento real (leitura dos controllers)

| Item | Documento | Controller | OK |
| ---- | --------- | ---------- | -- |
| `POST /sessoes` | 200 + `Set-Cookie` | `@HttpCode(200)` `autenticacao.controller.ts:388`; `definirCookieDeSessao` | sim |
| Login 429 | documentado | `ContaBloqueadaError.status = 429` | sim |
| `PATCH /empresas/me/email` | 202 | `@HttpCode(202)` `cadastro-empresa.controller.ts:257` | sim |
| confirmação de e-mail | 204/400/409/422, pública | `@HttpCode(204)`, `TokenConfirmacaoEmailInvalidoError` 400, `UserAlreadyExistsError` 409 | sim |
| Senha | 202 neutro com `{mensagem}`; 204 + 400 | corpo `mensagem` `senha.controller.ts:230-233`; `TokenInvalidoError` 400 | sim |
| Admin | 5 operações protegidas, 403 de papel, 409 = `TransicaoInvalidaError` | `@Roles(ADMIN)`, status 409 no erro | sim |
| Arquivos | 200 binário + 3 cabeçalhos; 401/403/404 | `@Header` nosniff/CSP; `Content-Disposition` attachment só SVG (`:344`); 403/404 no controller | sim |
| `POST /empresas` | 201, 409, 422, 503 | 503 via `StorageIndisponivelError`; 422 inclui `PayloadTooLarge` mapeado no filter | sim |

Não documentados (nenhum teste os cobra): 500 (`DomainExceptionFilter` fallback), 400 de corpo/multipart malformado do Nest, e o `Set-Cookie` de limpeza no 204 do logout. Ver Gap 4.

---

## Discrimination Sensor

Profundidade: expandida (≥5; caminho de contrato público consumido pelo `web`). Comando por mutante: `npx tsc --noEmit`, `npx jest src/infra/http/openapi`, `npx jest --config ./test/jest-e2e.json test/http/openapi` (16 e2e + 3 unit). Cada mutante restaurado por `git checkout -- <arquivo>`.

| # | Arquivo | Mutação | Resultado |
| - | ------- | ------- | --------- |
| M1 | `configurar-app.ts:49` | `NODE_ENV !== 'production'` → `===` | Morto (14 e2e falham) |
| M2 | `configurar-app.ts:50` | `SWAGGER_ENABLED === 'true'` → `false` | Morto (1) |
| M3 | `configurar-app.ts:48-51` | `\|\|` → `&&` | Morto (14) |
| M4 | `configurar-app.ts:59` | `jsonDocumentUrl` → `docs-json` | Morto (13) |
| M5 | `configurar-app.ts:31` | remove `addCookieAuth` | Morto (2) |
| M6 | `esquema-openapi.ts:167` | `delete esquema.required` | Morto (3 unit + 3 e2e) |
| M7 | `esquema-openapi.ts:162` | `io:'input'` → `'output'` | Morto (1 unit + 1 e2e) |
| M8 | `esquema-openapi.ts:185` | `ErroResposta.message` opcional | Morto (1 + 1) |
| M9 | `cadastro-empresa.controller.ts:189` | remove `@ApiProtegida` de `GET /empresas/me` | Morto (4) |
| M10 | `senha.controller.ts:241` | `@ApiExcludeEndpoint()` em `redefinicao` | Morto (3) |
| M11 | `autenticacao.controller.ts:369` | login 200 → 201 documentado | Morto (2) |
| M12 | `autenticacao.controller.ts:372` | remove header `Set-Cookie` | Morto (2) |
| M13 | `senha.controller.ts:200` | remove `@Public()` da classe | Morto (1, paridade) |
| M14 | `arquivo.controller.ts:275` | remove `X-Content-Type-Options` do doc | Morto (2) |
| M15 | `cadastro-empresa.controller.ts:64` | `logo` `binary` → `byte` | Morto (2) |
| M16 | `admin-empresas.controller.ts:101` | aprovação 409 → 400 | Morto (2) |
| M17 | `autenticacao.controller.ts:385` | remove 429 do login | Morto (2) |
| M18 | `decorators.ts:84` | `comPapel` deixa de acrescentar 403 | Morto (4) |
| M19 | `serializar-openapi.ts:194` | serializa sem ordenar chaves | Morto (1, exportação) |
| M20 | `cadastro-empresa.controller.ts:248` | remove `@ApiResponse` 202 de `me/email` | Morto (3) |
| M21 | `admin-empresas.controller.ts:44` | remove `@ApiProtegida` da classe admin | Morto (3) |
| M22 | `admin-empresas.controller.ts:39` | `rejeicaoSchema.partial()` (motivo opcional) | Morto (2) |
| M23 | `arquivo.controller.ts:283` | renomeia `Content-Disposition` | Morto (2) |
| M24 | `arquivo.controller.ts:308` | remove `image/svg+xml` do 200 | Morto (2) |
| M25 | `configurar-app.ts:50` | `SWAGGER_ENABLED === 'true'` → `Boolean(SWAGGER_ENABLED)` | **SOBREVIVEU** (16/16 verdes) |
| M26 | `arquivo.controller.ts:312` | remove 404 de `GET /arquivos/:id` | Morto (2) |

**Resultado**: 25/26 mortos. M25: a spec AC2 diz "`SWAGGER_ENABLED` não for `true`" e o `.env.example` distribui `SWAGGER_ENABLED="false"`; com a mutação, `"false"` em produção expõe `/docs`, e nenhum teste usa `"false"`. Isolamento: `git status --porcelain` = baseline (`?? .vscode/`) após todas as rodadas e após `npm run openapi:export`.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Sem features além do pedido | ok (`@ApiTags`, `summary` são metadados leves) |
| Mudanças cirúrgicas | ok — só controllers, `configurar-app`, `openapi/`, script, `package.json` |
| Segue padrões existentes | ok (`ZodValidationPipe`, decorators em `infra/http`) |
| Asserção bate com a spec | ok, exceto lacunas abaixo |
| Todo teste mapeia a AC/Done-when | ok (`openapi-exportacao` = T55) |
| Diretrizes documentadas | nenhuma além dos gates das tasks |

Observação: `esquemaOpenApi` mantém um `Map` global de módulo (`componentes`), mutável e compartilhado entre testes; o teste "não duplica" registra `Repetido` nele, mas `openapi.json` versionado não o contém porque o script não importa o spec. Hoje inofensivo.

---

## Lacunas ranqueadas

**Critical**: nenhuma.

**Major**
1. AC2 sem teste para `SWAGGER_ENABLED` presente e diferente de `"true"` (ex.: `"false"`, o valor do `.env.example`). Mutante M25 sobrevive. Correção: e2e `NODE_ENV=production` + `SWAGGER_ENABLED='false'` → 404 nas duas rotas (`openapi.e2e-spec.ts` perto da linha 78).

**Minor**
2. Nenhum teste liga o documento ao runtime: os status documentados são conferidos contra literais escritos à mão no teste (`openapi.e2e-spec.ts:148-323`), não contra o que a rota devolve. Se o controller mudar de status e o decorator não, os testes de contrato não percebem (os e2e de comportamento existentes cobrem só parte).
3. AC5 na paridade só verifica `security !== undefined`, não que seja `[{cookie: []}]` (`openapi-paridade.e2e-spec.ts:137`); o valor exato é asserido apenas em 5 pontos do `openapi.e2e-spec.ts`.
4. Spec-precision gap AC3 ("cada status de erro que a rota pode devolver"): a spec não diz se 500, 400 de corpo malformado e outros erros de framework entram. O documento não os lista e nenhum teste decide isso. Também não documenta o `Set-Cookie` de limpeza no logout.
5. AC3 "ao menos uma resposta 2xx" no teste de paridade é fraca por construção (o Nest deriva 2xx de `@HttpCode`; a própria T54 admite que remover `@ApiResponse` 2xx não derruba). Sem consequência para o contrato, só para a força do teste.
6. AC4 asserido em valor só para `CriarEmpresa` (`esquema-openapi.spec.ts:107`) e `RejeicaoEmpresa` (`openapi.e2e-spec.ts:305`); `EditarEmpresa`, `TrocarEmail`, `ConfirmarEmail`, `Login`, `RecuperacaoSenha`, `RedefinicaoSenha` dependem só do mesmo helper. Nada garante que o esquema registrado no `@ApiBody` é o mesmo passado ao `ZodValidationPipe` (mesmo const em cada controller hoje, sem teste).

## Sensor / Gate resumidos

- Spec-anchored: 14 linhas de AC, 13 PASS + 1 PASS parcial (AC2); 1 spec-precision gap (AC3 erros).
- Gate: 174 unit + 204 e2e passed, 0 failed, 0 skipped; tsc e eslint limpos.
- Sensor: 26 injetados, 25 mortos, 1 sobrevivente (Major).
