# Campanhas Context

**Gathered:** 2026-10-15
**Spec:** `.specs/features/campanhas/spec.md`
**Status:** Ready for design — spec confirmada em 2026-10-15

---

## Feature Boundary

Rodada P1 do `api`: criação da campanha em rascunho, submissão, fila e decisão do administrador, alteração de campanha aprovada (edição livre de textos e reanálise de compromisso) e uma consulta pública mínima da versão aprovada por identificador público (CAMP-01…08, CAMP-11). Encerramento (CAMP-09), duplicação (CAMP-10) e o `web` ficam para rodadas posteriores.

**Autoria:** mesma divisão do AD-020 — domínio pelo grupo, infra pelo agente depois de um gate de verificação do domínio (decisão do usuário em 2026-10-15; registrar como AD na fase Tasks).

**Código existente:** rascunho de 2026-09-04 (`entities/campanha.ts`, `use-cases/criar-campanha.ts`, `test/repositories/in-memory-campanha-repository.ts`, `test/factories/campanha-factory.ts`) fora da spec e do AD-017 — estados diferentes, só instituição como beneficiada, fim e meta obrigatórios, validação da regra no caso de uso. Será retrabalhado no lugar.

---

## Implementation Decisions

### Fronteira com `paginas-publicas`

- `campanhas` entrega o caso de uso de busca da campanha publicada por `idPublico` e um endpoint JSON público enxuto com a versão aprovada.
- 404 único para campanha inexistente, `RASCUNHO`, `EM_ANALISE`, `REJEITADA`, empresa não `APROVADA` ou identificador malformado.
- `paginas-publicas` depois enriquece o payload (logo, comprovantes, Open Graph) e renderiza o HTML no `web` em `/{identificador-publico}`.
- O escape de HTML da descrição é responsabilidade de quem renderiza; o `api` guarda e devolve texto puro em JSON.

### Vigência, meta e valores

- Data de início pode estar no passado — sem validação contra "hoje".
- Datas são de calendário (sem hora), fuso America/Sao_Paulo.
- Data de fim opcional; quando informada, precisa ser posterior à de início e posterior a hoje no momento da submissão.
- Meta opcional e apenas informativa.
- Valor por unidade e meta em centavos inteiros; percentual em centésimos de ponto (1 = 0,01%).

### Agent's Discretion

Nenhuma área marcada como "você decide".

### Declined / Undiscussed Gray Areas → Assumptions

- **Alteração de compromisso em campanha aprovada** → a campanha permanece `APROVADA`; a alteração vira um registro pendente próprio (AD-006c) com decisão do admin; uma alteração pendente por vez (segunda → 409).
- **Imagens da campanha** → uma imagem de capa opcional, PNG ou JPEG, até 5 MB, gravada pelo `ArquivoService`.
- **Campos exigidos no rascunho** → o rascunho exige só o nome; cada campo informado é validado na hora; a submissão exige nome, descrição, beneficiada, regra de doação e data de início.
- **Teto de valores** → valor por unidade e meta até R$ 999.999,99.
- **Lista de campanhas da empresa** → fica em `transparencia-e-area-empresa`; aqui só o detalhe de uma campanha própria.

---

## Specific References

- Fila do admin no mesmo formato das filas de empresa (`cadastro-empresa` EMP-04) e de instituição (`catalogo-instituicoes`): mais antiga primeiro.
- Seleção da beneficiada pelo contrato INST-09 (`AssegurarBeneficiadaDisponivelUseCase`) e mensagens já existentes (`BeneficiadaAmbiguaError`, `BeneficiadaIndisponivelError`, `MotivoInsuficienteError`, `TransicaoInvalidaError`, `StorageIndisponivelError`).

---

## Deferred Ideas

None - discussion stayed within feature scope
