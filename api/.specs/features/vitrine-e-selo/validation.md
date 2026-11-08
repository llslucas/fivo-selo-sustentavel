**Verdict**: PASS

# Vitrine e Selo: validação da infra do `api` (T19–T28) e fechamento da feature

**Veredito**: ✅ **PASS**. O gate `build` está verde: build, tsc e eslint saem com 0, o unit dá **713/713** e o e2e dá **585/585**, sem testes pulados. Não há drift entre o schema e o banco migrado. Os 24 ACs da infra batem com o valor que a spec define. O sensor injetou 28 mutantes nos caminhos de infra: **27 morreram** e 1 é equivalente (M27). Nenhum mutante não equivalente sobreviveu. Ficam 2 spec-precision gaps, nenhum deles bloqueante. Com `validation-dominio.md` (PASS) e `validation-web.md` (PASS), **os 12 requisitos VIT-01…VIT-12 estão verificados**. Continuam pendentes o UAT de 320 px e a integração ponta a ponta de 10/11, que já constam de `validation-web.md`.

**Data**: 2026-11-08
**Spec**: `.specs/features/vitrine-e-selo/spec.md`
**Diff range**: `6ddf194..6dc3110` (10 commits, T19–T28, de `d1a0041` a `6dc3110`), 32 arquivos, +3082/−88
**Verifier**: sub-agente independente (autor ≠ verificador). O código e os testes foram lidos sem nenhuma alteração. As mutações rodaram num `git worktree` descartável. Este é o único arquivo escrito no repositório.
**Escopo**: infra T19–T28. O domínio (T1–T18, T45–T51) e o `web` (T29–T44, T60–T66) não foram verificados de novo: este relatório só consolida os vereditos daqueles relatórios.

Caminhos abreviados: `TH/` = `test/http/`, `TD/` = `test/database/`, `SELO/` = `src/infra/selo/`.

---

## Task Completion

| Task | Commit | Status | Notas |
| ---- | ------ | ------ | ----- |
| T19 | `d1a0041` | ✅ | `slug String? @unique` em `empresa`; `@@unique([empresaId, slug])` em `campanha` (`prisma/migrations/20261108153354_slug/migration.sql:8,11`). O `migrate diff` do banco contra o schema deu "No difference detected", e o `migrate status` deu "up to date" |
| T20 | `c418c09` | ✅ | Mapper, `findBySlug`, `listarSlugsComPrefixo`, P2002 com alvo `slug` → `SlugEmUsoError` |
| T21 | `aff81e9` | ✅ | Mapper, `listarPorEmpresa` (`criadoEm desc`), P2002 com alvo `slug` → `SlugEmUsoError`; o P2002 de outra coluna segue sem conversão |
| T22 | `3748f5b` | ✅ | `prisma/scripts/backfill-slugs.ts`, `npm run backfill:slugs` |
| T23 | `6755fa0` | ✅ | `QrCodeRenderizadorDeSelo`: `WEB_URL` obrigatório em produção, lido na construção do provider (a app não sobe sem ele) |
| T24 | `d11bf36` | ✅ | `GET /campanhas` |
| T25 | `ae8591f` | ✅ | `GET /campanhas/:id/selo` |
| T26 | `3da3437` | ✅ | `GET /empresas/publicas` |
| T27 | `d8a94ee` | ✅ | `GET /empresas/publicas/:slug` |
| T28 | `6dc3110` | ✅ | `GET /empresas/publicas/:slug/logo` e e2e da aprovação com slug |

---

## Spec-Anchored Acceptance Criteria (ACs cobertos por T19–T28)

### Slug permanente (VIT-01): infra

| Critério | Valor da spec | `file:line` + asserção | Resultado |
| -------- | ------------- | ---------------------- | --------- |
| AC1: aprovar a empresa atribui slug de `nomeFantasia` | `cafe-serra-verde` para "Café Serra Verde" | `TH/empresas/empresas-publicas.e2e-spec.ts:398` `expect(aprovacao.status).toBe(204)`; `:410-415` `toMatchObject({ slug: 'cafe-serra-verde', … })` pelo admin real | ✅ |
| AC2: aprovar a campanha atribui slug de `nome` | `agua-limpa` para "Água Limpa" | `TH/empresas/empresas-publicas.e2e-spec.ts:414` `campanhas: [{ slug: 'agua-limpa', nome: 'Água Limpa' }]`; `TH/campanhas/campanhas-lista.e2e-spec.ts:96` `urlPublica: \`${WEB_URL}/empresa/cafe-bom/agua-limpa\`` | ✅ |
| AC5: slug já usado por outra empresa | unicidade global; a corrida vira `SlugEmUsoError` e nada é gravado | `TD/prisma-empresa-repository.e2e-spec.ts:450-457` `rejects.toBeInstanceOf(SlugEmUsoError)`, `toThrow('Slug já está em uso')`, `linha.status` `PENDENTE_APROVACAO`, `linha.slug` `null`, `decididoPor` `null` | ✅ |
| AC6: slug já usado por outra campanha da mesma empresa | unicidade por empresa; empresas diferentes podem repetir | `TD/prisma-campanha-repository.e2e-spec.ts:879-883` (mesmo slug em empresas distintas → `true`, `true`); `:896-904` `SlugEmUsoError`, `depois` `toEqual(antes)`, `versao` 0, `EM_ANALISE`, `slug` `null` (rollback); `:921-924` P2002 de `capa_arquivo_id` continua `PrismaClientKnownRequestError` | ✅ |
| AC7: o slug não muda ao renomear a empresa ou a campanha | slug inalterado | `TH/empresas/empresas-publicas.e2e-spec.ts:438-446` depois de `PATCH /empresas/me` e `PATCH /campanhas/:id`: `slug: 'cafe-serra-verde'`, campanha `slug: 'agua-limpa'` com `nome: 'Água Pura'`, e `/torrefacao-serra-verde` → 404 | ✅ |
| AC7: o slug não muda ao suspender | slug preservado | `TD/prisma-empresa-repository.e2e-spec.ts:469-472` `SUSPENSA` e `slug?.valor` `'cafe-serra-verde'` | ✅ |
| AC7: um `save` cadastral obsoleto não apaga o slug | slug preservado | `TD/prisma-empresa-repository.e2e-spec.ts:490` `slug?.valor` `'cafe-serra-verde'` | ✅ |
| Ida e volta do slug (mapper) | o slug persiste e é reconstruído | `TD/prisma-empresa-repository.e2e-spec.ts:394-396,405`; `TD/prisma-campanha-repository.e2e-spec.ts:316,388,870-872` | ✅ |
| Premissa da spec: backfill de empresas `APROVADA`/`SUSPENSA` e campanhas `APROVADA`, em ordem de `decididoEm` | base para a decidida antes, `-2` para a seguinte | `TD/backfill-slugs.e2e-spec.ts:122-123` (inserida depois e decidida antes → `cafe-serra-verde`); `:141-142` `SUSPENSA` → `-2`, sem tocar no slug existente; `:177-179` campanhas por empresa | ✅ (⚠️ SP-I2) |
| Backfill: `PENDENTE_APROVACAO` e `RASCUNHO` ficam sem slug | `null` | `TD/backfill-slugs.e2e-spec.ts:202-204` | ✅ |
| Backfill idempotente | a 2ª execução não muda nada | `TD/backfill-slugs.e2e-spec.ts:237-244` `segunda` `{ empresas: 0, campanhas: 0 }` e todas as linhas `toEqual` às da 1ª execução | ✅ |

AC3 e AC4 (formação do slug e fallback) são de domínio e estão em `validation-dominio.md` (PASS, 18/18).

### Campanhas na área da empresa (VIT-02): API

| Critério | Valor da spec | `file:line` + asserção | Resultado |
| -------- | ------------- | ---------------------- | --------- |
| AC1: 200, só as campanhas da empresa, `criadoEm` desc | ordem e escopo | `TH/campanhas/campanhas-lista.e2e-spec.ts:82-105` `toEqual([percentual (01-03), aprovada (01-02), rascunho (01-01)])`, sem "Da Outra"; `:146` lista vazia; `TD/prisma-campanha-repository.e2e-spec.ts:946` ordem e filtro do repositório | ✅ |
| AC2: chaves exatas `id`, `nome`, `status`, `regraDoacao` (`tipo` + `valor`/`percentual` ou `null`), `urlPublica` | só essas chaves | `TH/campanhas/campanhas-lista.e2e-spec.ts:83` `toEqual` exato (rejeita chave a mais): `{ tipo: 'PERCENTUAL', percentual: '2.50' }`, `{ tipo: 'POR_UNIDADE', valor: '1.00' }` e `regraDoacao: null` | ✅ |
| AC3: `urlPublica` = `{WEB_URL}/empresa/{slugEmpresa}/{slugCampanha}` só na `APROVADA` | `null` em `RASCUNHO`, `EM_ANALISE` e `REJEITADA` | `TH/campanhas/campanhas-lista.e2e-spec.ts:96` URL exata; `:89,103` `null` em `RASCUNHO`; `:108-136` `EM_ANALISE` e `REJEITADA` **com slug gravado** → `urlPublica: null` | ✅ |
| AC4: sem papel `EMPRESA` → 403 | 403 | `TH/campanhas/campanhas-lista.e2e-spec.ts:159-163` ADMIN e INSTITUICAO → `403`, `message: 'Acesso negado'`; `:170` sem sessão → 401 | ✅ |

### Selo genérico (VIT-04): API

| Critério | Valor da spec | `file:line` + asserção | Resultado |
| -------- | ------------- | ---------------------- | --------- |
| AC1: 200, `Content-Type: image/svg+xml`, `Content-Disposition: attachment; filename="selo-{slugCampanha}.svg"` | cabeçalhos exatos | `TH/campanhas/campanhas-selo.e2e-spec.ts:79-83` `toBe('image/svg+xml')`, `toBe('attachment; filename="selo-agua-limpa.svg"')` | ✅ |
| AC2: a marca Fivo, "Selo Sustentável Fivo" e o QR codificando **exatamente** a URL | URL exata, decodificada | `SELO/qrcode-renderizador-de-selo.spec.ts:96` `lido.data` `toBe(URL_ESPERADA)` (rasterizado com resvg e decodificado com jsQR); `:116-117` `<text>Fivo</text>` e `<text>Selo Sustentável Fivo</text>`; `TH/campanhas/campanhas-selo.e2e-spec.ts:85-86` o QR decodificado da resposta HTTP é `${WEB_URL}/empresa/cafe-bom/agua-limpa` | ✅ (⚠️ SP-I1 na "marca") |
| AC3: nível Q, margem ≥ 4 módulos | Q; ≥ 4 | `SELO/qrcode-renderizador-de-selo.spec.ts:102` nível lido dos bits de formato do símbolo (ISO 18004, com checagem BCH em `:47`) `toBe('Q')`; `:108` margem medida no raster `toBeGreaterThanOrEqual(4)` (o fundo do selo é verde, então a zona clara é só a margem do QR) | ✅ |
| AC4: vetorial, sem imagem rasterizada | sem `<image>` | `SELO/qrcode-renderizador-de-selo.spec.ts:123-124` `not.toMatch(/<image\b/i)` e `toMatch(/<path\b/)` | ✅ |
| AC5: bytes idênticos | igualdade byte a byte | `SELO/qrcode-renderizador-de-selo.spec.ts:135` `Buffer.equals` entre duas instâncias | ✅ |
| AC6: não `APROVADA` → 409 "Campanha não está aprovada" | corpo exato | `TH/campanhas/campanhas-selo.e2e-spec.ts:100-104` `toEqual({ statusCode: 409, message: 'Campanha não está aprovada' })` | ✅ |
| AC7: inexistente ou de outra empresa → 404 "Campanha não encontrada" | corpo exato, o mesmo nos dois casos | `TH/campanhas/campanhas-selo.e2e-spec.ts:128-131` `toEqual(NAO_ENCONTRADA)` nos dois (a rota troca a mensagem genérica do `DomainExceptionFilter`: `campanhas.controller.ts:332-340`) | ✅ |
| AC8: sem papel `EMPRESA` → 403 | 403 | `TH/campanhas/campanhas-selo.e2e-spec.ts:146-150` ADMIN → `403`, `'Acesso negado'`; INSTITUICAO pela varredura de rotas `TH/campanhas/campanhas-concorrencia.e2e-spec.ts:300` (agora com 7 rotas de empresa) | ✅ |
| Design §Risks: `WEB_URL` obrigatório em produção | erro na construção | `SELO/qrcode-renderizador-de-selo.spec.ts:142` `toThrow('WEB_URL é obrigatório em produção')` | ✅ |

### Página pública da empresa (VIT-06): API

| Critério | Valor da spec | `file:line` + asserção | Resultado |
| -------- | ------------- | ---------------------- | --------- |
| AC1: 200 sem sessão com `nomeFantasia`, `cidade`, `uf`, `site`, `temLogo` e `campanhas` (+ `slug` do contrato) | corpo do contrato | `TH/empresas/empresas-publicas.e2e-spec.ts:220-249` `toEqual` exato do corpo inteiro, sem cookie | ✅ |
| AC2: só `APROVADA`, aprovação mais recente primeiro; campos da campanha; `situacao` | ordem por `decididoEm` desc; `NAO_INICIADA`/`EM_ANDAMENTO` | mesmo `toEqual`: `mata-viva` (decidida em 03-01) antes de `agua-limpa` (02-01), sem rascunho, em análise e rejeitada; `beneficiada` `CAUSA` e `INSTITUICAO` com nome; `vigencia` com e sem `fim`; as duas `situacao` | ✅ |
| AC3: slug inexistente ou empresa fora de `APROVADA` → 404 "Empresa não encontrada", mesmo corpo | corpo exato | `TH/empresas/empresas-publicas.e2e-spec.ts:329-332` `toEqual(NAO_ENCONTRADA)` para a suspensa e para a inexistente | ✅ |
| AC4: nenhum campo proibido | ausentes | `TH/empresas/empresas-publicas.e2e-spec.ts:286-288` 14 chaves ausentes; `:289-297` chaves exatas da campanha; `:299-312` nenhum valor sensível (id, e-mail, CNPJ, razão social, telefone, contato, ids da campanha e da instituição) no JSON | ✅ |
| AC5: logo de empresa `APROVADA` → 200 com os bytes e o `Content-Type`; nos demais casos → 404 | bytes, mime e `nosniff` (design) | `TH/empresas/empresas-publicas.e2e-spec.ts:355-358` `200`, `'image/png'`, `x-content-type-options` `'nosniff'`, `Buffer.equals(bytes)`; `:370-380` sem logo, inexistente e **suspensa com logo** → 404 com o corpo exato | ✅ |
| Edge: empresa suspensa → 404 na página | 404 | `:329-330` | ✅ |

### Vitrine de parceiros (VIT-08): API

| Critério | Valor da spec | `file:line` + asserção | Resultado |
| -------- | ------------- | ---------------------- | --------- |
| AC1: 200 sem sessão com todas as `APROVADA`, chaves `slug`, `nomeFantasia`, `cidade`, `uf`, `temLogo` | só essas chaves | `TH/empresas/empresas-publicas.e2e-spec.ts:101-131` `toEqual` exato, sem `PENDENTE_APROVACAO` e sem `REJEITADA`, com `temLogo` `true` e `false`; `:153-154` lista vazia | ✅ |
| AC2: ordem alfabética sem caixa nem acento | `abelha`, `Árvore`, `Café`, `Zebra` | mesmo `toEqual` (a ordem por código Unicode daria `Café`, `Zebra`, `abelha`, `Árvore`) | ✅ |
| Edge: a suspensa sai da vitrine | fora da lista | `TH/empresas/empresas-publicas.e2e-spec.ts:145-147` `toEqual(['cafe-serra-verde'])` | ✅ |

**Status**: ✅ 24/24 ACs de infra com evidência e valor da spec. ⚠️ 2 spec-precision gaps (abaixo), nenhum bloqueante.

### Spec-precision gaps

| # | AC | Gap | Como o teste fixou |
| - | -- | --- | ------------------ |
| SP-I1 | Selo AC2 | "marca Fivo" não diz qual é a arte. Não existe arquivo vetorial da marca (design §Risks) | `SELO/qrcode-renderizador-de-selo.spec.ts:116` trava um wordmark `<text>Fivo</text>`. Quando a arte oficial existir, a spec precisa nomeá-la, e o teste também muda |
| SP-I2 | Premissa "backfill em ordem de `decididoEm`" | Em empresa `SUSPENSA`, `decididoEm` é a data da suspensão (`empresa.ts:177-232` atualiza o campo em toda decisão), e não a da primeira aprovação. A ordem do backfill segue a última decisão, enquanto a intenção ("quem foi aprovado antes fica com a base") pode ser outra | O teste segue a letra da spec (`TD/backfill-slugs.e2e-spec.ts:126-143`). A spec deveria dizer "data da aprovação", ou aceitar explicitamente a última decisão |

---

## Discrimination Sensor

Scratch: `git worktree add --detach` em `…/scratchpad/wt`, com symlink para `api/node_modules`. Cada mutante foi aplicado por substituição exata (padrão único por arquivo), rodou sozinho na suíte que cobre o código (e2e um de cada vez, `maxWorkers: 1`, mesmo banco `fivo-postgres-test`) e foi revertido com `git checkout`. Nenhum mutante foi morto por erro de compilação: todos os mortos falharam em asserção.

| # | Arquivo | Mutação | Suíte | Resultado |
| - | ------- | ------- | ----- | --------- |
| M1 | `prisma-empresa-mapper.ts:73` | `toDomain` devolve `slug: null` | `TD/prisma-empresa-repository` | ✅ Morto (4 falhas) |
| M2 | `prisma-campanha-mapper.ts:277` | `toPrisma` não grava o slug | `TD/prisma-campanha-repository` | ✅ Morto (4) |
| M3 | `prisma-empresa-mapper.ts:107` | `toPrisma` não grava o slug | `TD/prisma-empresa-repository` | ✅ Morto (6) |
| M4 | `erros-prisma.ts:20` | qualquer P2002 vira `SlugEmUsoError` | `TD/prisma-campanha-repository` | ✅ Morto (2) |
| M5 | `erros-prisma.ts:20` | nenhum P2002 vira `SlugEmUsoError` | `TD/` empresa + campanha | ✅ Morto (2) |
| M6 | `prisma-empresa-repository.ts:172` | `salvarTransicao` não converte o P2002 | `TD/prisma-empresa-repository` | ✅ Morto (1) |
| M7 | `prisma-campanha-repository.ts:71` | `salvar` não converte o P2002 | `TD/prisma-campanha-repository` | ✅ Morto (1) |
| M8 | `prisma-empresa-repository.ts:70` | `listarSlugsComPrefixo` com `equals` | `TD/prisma-empresa-repository` | ✅ Morto (1) |
| M9 | `prisma-campanha-repository.ts:152` | `listarPorEmpresa` com `criadoEm asc` | `TD/` campanha + `TH/campanhas-lista` | ✅ Morto (2) |
| M10 | `prisma-campanha-repository.ts:150` | `listarPorEmpresa` sem filtro de empresa | `TD/` campanha + `TH/campanhas-lista` | ✅ Morto (3) |
| M11 | `campanhas.controller.ts:277` | `urlPublica` sem checar `APROVADA` | `TH/campanhas-lista` | ✅ Morto (2) |
| M12 | `campanhas.controller.ts:346` | `Content-Disposition: inline` | `TH/campanhas-selo` | ✅ Morto (1) |
| M13 | `campanhas.controller.ts:345` | `Content-Type: text/xml` | `TH/campanhas-selo` | ✅ Morto (1) |
| M14 | `campanhas.controller.ts:337` | mensagem do 404 do selo trocada | `TH/campanhas-selo` | ✅ Morto (1) |
| M15 | `empresas-publicas.controller.ts:180` | o 404 da página cai no filtro genérico | `TH/empresas-publicas` | ✅ Morto (1) |
| M16 | `empresas-publicas.controller.ts:205` | o logo sai sem `nosniff` | `TH/empresas-publicas` | ✅ Morto (1) |
| M17 | `empresas-publicas.controller.ts:210` | o logo é servido sem checar `APROVADA` | `TH/empresas-publicas` | ✅ Morto (1) |
| M18 | `qrcode-renderizador-de-selo.ts:37` | `errorCorrectionLevel: 'M'` | `SELO/*.spec` | ✅ Morto (1) |
| M19 | `qrcode-renderizador-de-selo.ts:38` | `margin: 2` | `SELO/*.spec` | ✅ Morto (1) |
| M20 | `url-publica-da-campanha.ts:14` | guarda de `WEB_URL` em produção removida | `SELO/*.spec` | ✅ Morto (1) |
| M21 | `url-publica-da-campanha.ts:27` | slugs trocados na URL do QR | `SELO/*.spec` | ✅ Morto (1) |
| M22 | `backfill-slugs.ts:29` | o `findMany` de empresas sem `slug: null` | `TD/backfill-slugs` | ✅ Morto (1; pela contagem `{0,0}`, porque a guarda do `updateMany` ainda protege as linhas) |
| M23 | `backfill-slugs.ts:13` | `decididoEm` em ordem `desc` | `TD/backfill-slugs` | ✅ Morto (2) |
| M24 | `backfill-slugs.ts:30` | backfill ignora `SUSPENSA` | `TD/backfill-slugs` | ✅ Morto (2) |
| M25 | `backfill-slugs.ts:59` | slug de campanha com unicidade global | `TD/backfill-slugs` | ✅ Morto (1) |
| M26 | `prisma-empresa-repository.ts:119` | `save` cadastral volta a gravar o slug | `TD/prisma-empresa-repository` | ✅ Morto (4) |
| M27 | `backfill-slugs.ts:45` | `updateMany` de empresa sem a guarda `slug: null` | `TD/backfill-slugs` | ➖ Equivalente: o `findMany` já filtra `slug: null`. A guarda só age se outro processo gravar o slug entre a leitura e a escrita, o que não é observável num teste sequencial |
| M28 | `backfill-slugs.ts:29,45` | sem as duas guardas (leitura e escrita) | `TD/backfill-slugs` | ✅ Morto (2; as linhas mudam na 2ª execução) |

**Sensor depth**: P0 (infra crítica: unicidade, URL impressa, rotas públicas), com 28 mutações manuais.
**Result**: 28 injetados, **27 mortos**, **0 sobreviventes**, 1 equivalente: ✅ PASS.
**Isolamento**: o `git status --porcelain` do repositório real estava vazio antes do sensor e continua vazio depois (`diff` idêntico). O worktree foi removido e podado (`git worktree list` só mostra a árvore principal).

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Minimum code / sem scope creep | ✅ Só o que T19–T28 pedem. `Content-Security-Policy` no logo copia a capa pública (padrão existente) |
| Surgical changes | ✅ `src/domain/**`, `test/doubles/**`, `test/factories/**` e `web/**` intocados no diff. Os testes antigos mudaram só nas contagens de rotas (`campanhas-concorrencia.e2e-spec.ts:300`, `openapi-paridade.e2e-spec.ts:119`) e no `WEB_URL` de produção (`openapi.e2e-spec.ts:21`) |
| Matches patterns | ✅ Conversão de P2002 em erro de domínio como em `prisma-instituicao-repository`; a rota pública do logo segue o molde da capa |
| Spec-anchored outcome check | ✅ (2 gaps sinalizados) |
| Per-layer coverage | ✅ Renderizador: os 5 itens da matriz (QR decodificado, Q, margem, sem `<image>`, bytes). Adaptadores: ida e volta, unicidade global e por empresa, consultas novas, backfill idempotente. Rotas: happy + edge + 403/404/409 + campos proibidos + paridade OpenAPI (44 rotas) |
| Todo teste mapeia para AC/edge/Done-when | ✅ Os 401 sem sessão vêm do Done-when da T24 |
| Guidelines | Nenhuma guideline documentada (`tasks.md` §Test Coverage Matrix); valem os strong defaults |

---

## Edge Cases

- [x] Empresa suspensa: 404 na página e no logo, fora da vitrine, slug preservado (`TH/empresas/empresas-publicas.e2e-spec.ts:145,329,375`; `TD/prisma-empresa-repository.e2e-spec.ts:472`).
- [x] Aprovações simultâneas com o mesmo nome: cobertas por composição. O adaptador converte o P2002 de `slug` em `SlugEmUsoError`, com rollback (`TD/…empresa…:450-457`, `TD/…campanha…:896-904`), e o caso de uso repete até 3 vezes (`aprovar-empresa.spec.ts:296-339`, verificado em `validation-dominio.md`). Não há e2e com duas aprovações HTTP concorrentes (follow-up 1).
- [x] Alteração de compromisso pendente mantém a versão aprovada na página pública: domínio (`validation-dominio.md`).
- [x] HTML e script exibidos como texto, e a imagem quebrada vira iniciais: `web` (`validation-web.md`).

---

## Gate Check

- **Gate command** (`tasks.md` §Gate Check Commands, Build): `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- **Banco**: `fivo-postgres-test` (localhost:5433) via `api/.env`. `prisma migrate status` deu "up to date", e o `migrate diff --from-schema-datasource --to-schema-datamodel` deu "No difference detected".
- **Result**: exit 0. Build, tsc e eslint limpos. Unit **713 passed / 713** (74 suítes). e2e **585 passed / 585** (39 suítes, 88 s). 0 falhas e 0 pulados.
- **Antes da infra**: unit 706 (`validation-dominio.md`, rodada 3) e e2e 546 (das quais 39 falhavam pelos stubs de T20/T21).
- **Delta**: unit +7 (`qrcode-renderizador-de-selo.spec.ts`); e2e +39 testes, e 585/585 verdes contra 507/546 antes.
- Os números conferem com os do autor (713 e 585).

---

## Requirement Traceability

| Requirement | Domínio | `web` | Infra (este relatório) | Estado final |
| ----------- | ------- | ----- | ---------------------- | ------------ |
| VIT-01 | ✅ `validation-dominio.md` | — | ✅ T19–T22, T28 | ✅ Verified |
| VIT-02 | ✅ | — | ✅ T24 | ✅ Verified |
| VIT-03 | — | ✅ `validation-web.md` (AC10 no UAT) | n/a | ✅ Verified (UAT 320 px pendente) |
| VIT-04 | ✅ | — | ✅ T23, T25 | ✅ Verified |
| VIT-05 | — | ✅ | o `Content-Disposition` da API (T25) sustenta o nome do arquivo | ✅ Verified (download real nos navegadores no UAT) |
| VIT-06 | ✅ | — | ✅ T27, T28 | ✅ Verified |
| VIT-07 | — | ✅ (AC13 no UAT) | consome VIT-06 | ✅ Verified (UAT 320 px pendente) |
| VIT-08 | ✅ | — | ✅ T26 | ✅ Verified |
| VIT-09 | — | ✅ (AC5 no UAT) | consome VIT-08 | ✅ Verified (UAT 320 px pendente) |
| VIT-10 | — | ✅ | endpoints já existentes | ✅ Verified |
| VIT-11 | — | ✅ | endpoints já existentes | ✅ Verified |
| VIT-12 | — | ✅ | endpoints já existentes | ✅ Verified |

A tabela de rastreabilidade de `spec.md` ainda mostra "Implementing". O Verifier não edita a spec: a mudança para "Verified" fica com o orquestrador.

---

## Summary

**Overall**: ✅ Ready. A infra do `api` está pronta para a integração de ter 10/11.

**Spec-anchored check**: 24/24 ACs de infra batem com o valor da spec; 2 spec-precision gaps (SP-I1, SP-I2).
**Sensor**: 27/27 mutantes não equivalentes mortos (28 injetados, 1 equivalente).
**Gate**: unit 713/713, e2e 585/585, build, tsc e eslint limpos.

**Follow-ups não bloqueantes**:

1. Um e2e com duas `POST /admin/empresas/:id/aprovacao` concorrentes de homônimas, conferindo `cafe-serra-verde` e `cafe-serra-verde-2` sem 500. Hoje a garantia vem da composição de um unit do retry com um e2e do adaptador.
2. SP-I1: nomear na spec a arte da marca Fivo e trocar o `<text>Fivo</text>` por `<path>` quando ela existir (a fonte do sistema varia entre impressoras).
3. SP-I2: decidir se o backfill ordena pela data da primeira aprovação ou pela última decisão (`decididoEm`), e ajustar a spec ou o script.
4. O selo devolve `Content-Type: image/svg+xml` sem `X-Content-Type-Options: nosniff` e sem CSP. Como o download é `attachment` e o SVG não tem conteúdo variável além da URL, o risco é baixo, e a spec não exige esses cabeçalhos.
5. Os itens de UAT e da integração ponta a ponta de `validation-web.md` (320 px, download real do SVG, QR lido por celular a 2,0 cm).
