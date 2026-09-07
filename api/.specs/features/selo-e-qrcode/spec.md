# Selo Digital e QR Code Specification

> Convenção: seções e palavras-chave EARS em inglês; conteúdo em português (AD-005).
> Fonte: `docs/proposta-inicial.md` — RF04, RF05 e a Atualização de 29/08/2026 (monetização adiada, 1 selo único por campanha).

## Problem Statement

O selo é o único elo físico entre a embalagem do produto e a página de transparência: sem ele a campanha não chega ao consumidor. Hoje não existe forma de a empresa obter uma arte de selo padronizada, com seu logo, os dados da campanha e um QR Code que resolva para a página certa. Duas ambiguidades da proposta foram fechadas: ela cita "geração com IA" no escopo inicial e a exclui em "fora de escopo" — vale a leitura restritiva de 5 modelos fixos (AD-004); e ela condiciona o uso do selo à compra — a Atualização de 29/08/2026 adia a monetização, de modo que a aprovação da campanha, e não o pagamento, é o que libera a geração do arquivo. O registro da solicitação permanece para histórico e para reintroduzir a cobrança depois sem remodelar o domínio.

## Goals

- [ ] Empresa gera o arquivo do selo de uma campanha aprovada em menos de 2 minutos, sem designer.
- [ ] Selo entregue em PNG 300 DPI (materiais digitais) e PDF vetorial (gráfica parceira), com QR Code legível em ambos.
- [ ] QR Code resolve para a página pública da campanha por link permanente e imutável.
- [ ] Cada campanha tem exatamente um selo, com modelo definitivo a partir da primeira geração.

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Cobrança, preço ou pagamento do selo | Monetização adiada pela Atualização de 29/08/2026; permanece no backlog do produto |
| Gateway de pagamento e intermediação financeira | Excluídos pela proposta e sem função enquanto a monetização estiver adiada |
| Geração livre de arte de selo por IA | Excluída pela proposta e pela decisão AD-004; v1 usa 5 modelos fixos |
| Numeração ou individualização de selos por unidade | Excluída pela Atualização de 29/08/2026; é 1 selo único por campanha na v1 |
| Múltiplos selos ou múltiplos modelos por campanha | Excluída pela Atualização de 29/08/2026: 1 selo único por campanha |
| Integração com a gráfica parceira (envio automático para impressão) | Mediação da venda de selos físicos está fora do escopo da v1 |
| RFID, etiquetas físicas antifraude ou selos holográficos | Listados como fora de escopo na proposta |
| Editor visual livre do selo (mover elementos, trocar cores) | Descaracteriza o padrão visual da marca Fivo; os 5 modelos são fixos |
| Contabilização de scans do QR Code | Métrica de leitura pertence a evolução futura; não está nos requisitos da v1 |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Modelos de selo | 5 templates fixos, definidos pela Fivo Lab, sem geração por IA | Decidido com o usuário (AD-004), coerente com RF04 e com "fora de escopo" | y |
| Formatos de exportação | PNG rasterizado a 300 DPI e PDF vetorial | Decidido com o usuário (AD-004); PDF vetorial é exigência de impressão em embalagem | y |
| Cobrança do selo | Não existe na v1; a geração é liberada pela aprovação da campanha | Determinado pela Atualização de 29/08/2026, que adia a monetização e supersede AD-002 | y |
| Registro de solicitação de selo | Mantido como entidade com os estados `SOLICITADO` e `GERADO`, sem qualquer estado de pagamento | Decidido com o usuário (AD-007): preserva histórico e o gancho para reintroduzir a cobrança sem remodelar o domínio | y |
| Cardinalidade selo–campanha | Exatamente um selo por campanha | Determinado pela Atualização de 29/08/2026 | y |
| Escolha do modelo | Definitiva a partir da primeira geração bem-sucedida; trocar de modelo exige nova campanha | Decidido com o usuário (AD-009): o modelo já foi para a embalagem impressa e não pode divergir do arquivo armazenado | y |
| Composição do selo | Renderização server-side determinística a partir de template SVG + logo + dados da campanha + QR Code | Garante consistência visual e reprodutibilidade do mesmo arquivo | n |
| Conteúdo textual do selo | Nome da campanha e a regra de doação em texto curto, além da marca Fivo | É o que a proposta usa como exemplo de divulgação na embalagem | n |
| Correção de erro do QR Code | Nível Q (25% de recuperação) | Embalagem sofre dobra, corte e desgaste; nível Q equilibra robustez e densidade | n |
| Tamanho mínimo do QR Code | 2,0 cm de lado no material impresso, informado nas instruções de uso entregues com o arquivo | Abaixo disso a leitura por celular comum falha | n |
| Regeneração do arquivo | Permitida sem limite, sempre com o mesmo modelo já escolhido, refletindo o logo e os dados vigentes da campanha | O redownload é necessário para novas tiragens; travar o modelo já garante a fidelidade ao que foi impresso | n |
| Retenção dos arquivos gerados | Armazenados enquanto a campanha existir, com URL de download autenticada | A empresa precisa rebaixar o arquivo para novas tiragens de embalagem | n |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Solicitação do selo da campanha ⭐ MVP

**User Story**: Como empresa com campanha aprovada, quero solicitar o selo daquela campanha, para registrar a intenção de uso e liberar a escolha do modelo e a geração do arquivo.

**Why P1**: É o portão entre campanha aprovada e selo utilizável, e o registro que sustenta o histórico do que cada empresa gerou (AD-007).

**Acceptance Criteria**

1. WHILE a campanha estiver `APROVADA` the system SHALL permitir que a empresa proprietária abra a solicitação de selo para ela; em qualquer outro estado SHALL responder HTTP 409 com a mensagem "Campanha não está aprovada".
2. WHEN a empresa abre a solicitação de selo THEN the system SHALL criá-la no estado `SOLICITADO`, registrar data-hora e responder HTTP 201 com o identificador da solicitação.
3. IF já existir uma solicitação de selo para a mesma campanha THEN the system SHALL rejeitar a nova com HTTP 409 e a mensagem "Esta campanha já possui um selo", garantindo 1 selo único por campanha.
4. WHEN o primeiro arquivo de selo da campanha é gerado com sucesso THEN the system SHALL alterar o estado da solicitação para `GERADO` e registrar a data-hora da geração.
5. The system SHALL permitir apenas a transição `SOLICITADO → GERADO`, respondendo HTTP 409 a qualquer outra.
6. IF um usuário que não seja a empresa proprietária da campanha nem administrador consultar ou abrir a solicitação THEN the system SHALL responder HTTP 403 sem alterar estado.
7. The system SHALL registrar em log de auditoria toda transição de estado da solicitação, com autor, estados anterior e novo e data-hora.
8. The system SHALL disponibilizar a geração do selo sem exigir pagamento, registro de pagamento ou liberação adicional do administrador além da aprovação da campanha.

**Independent Test**: Abrir solicitação para uma campanha aprovada e receber 201; abrir uma segunda para a mesma campanha e receber 409; tentar abrir solicitação para campanha em `RASCUNHO` e receber 409; gerar o arquivo e conferir que a solicitação passa a `GERADO`.

---

### P1: Geração do selo a partir de modelo ⭐ MVP

**User Story**: Como empresa com solicitação aberta, quero escolher um dos 5 modelos de selo e gerar o arquivo com meu logo e os dados da campanha, para aplicá-lo na embalagem do produto.

**Why P1**: É o passo 5–7 do fluxo básico da proposta e o produto entregue à empresa.

**Acceptance Criteria**

1. WHEN a empresa consulta os modelos disponíveis THEN the system SHALL retornar exatamente 5 modelos, cada um com identificador, nome e imagem de pré-visualização.
2. WHILE existir solicitação de selo para a campanha the system SHALL permitir gerar o arquivo; se não existir solicitação SHALL responder HTTP 409 com a mensagem "Solicite o selo desta campanha antes de gerar o arquivo".
3. WHEN a empresa solicita a primeira geração informando o modelo escolhido THEN the system SHALL persistir esse modelo como o modelo definitivo da campanha e compor o selo com o logo da empresa, o nome da campanha, a regra de doação em texto curto, a marca Fivo e o QR Code da campanha.
4. IF a empresa solicitar uma nova geração informando modelo diferente do já persistido THEN the system SHALL rejeitar com HTTP 409 e a mensagem "O modelo do selo desta campanha não pode ser alterado".
5. IF o modelo informado não estiver entre os 5 disponíveis THEN the system SHALL rejeitar com HTTP 422 e a mensagem "Modelo de selo inválido".
6. IF a empresa não possuir logo cadastrado THEN the system SHALL bloquear a geração com HTTP 422 e a mensagem "Cadastre o logo da empresa antes de gerar o selo".
7. WHEN a geração conclui com sucesso THEN the system SHALL disponibilizar dois arquivos para a campanha: um PNG com resolução equivalente a no mínimo 300 DPI para 5 cm de lado e um PDF vetorial.
8. The system SHALL preservar o QR Code como elemento vetorial no PDF, sem rasterização.
9. WHEN a mesma campanha é gerada novamente THEN the system SHALL produzir arquivos visualmente idênticos aos anteriores, exceto se o logo da empresa ou os dados da campanha tiverem mudado.
10. WHEN a empresa gera o selo THEN the system SHALL entregar junto um documento com as instruções de aplicação, incluindo o tamanho mínimo de impressão do QR Code de 2,0 cm.
11. IF a composição do selo falhar THEN the system SHALL responder HTTP 500 com a mensagem "Não foi possível gerar o selo, tente novamente", não persistir arquivo parcial e manter a solicitação no estado anterior.
12. The system SHALL restringir o download dos arquivos do selo à empresa proprietária da campanha e aos administradores, respondendo HTTP 403 a qualquer outro solicitante.

**Independent Test**: Com solicitação aberta, escolher o modelo 3, gerar o selo e verificar que PNG e PDF são produzidos e que o PDF abre em software vetorial com o QR em vetor; pedir nova geração com o modelo 5 e receber 409; pedir nova geração com o modelo 3 e receber o arquivo; baixar como outra empresa e receber 403.

---

### P1: QR Code e link permanente ⭐ MVP

**User Story**: Como consumidor, quero escanear o QR Code impresso na embalagem e chegar à página da campanha, para saber qual causa está sendo apoiada.

**Why P1**: É o passo 9–10 do fluxo básico e a razão de existir do selo.

**Acceptance Criteria**

1. WHEN o selo é gerado THEN the system SHALL embutir um QR Code que codifica a URL pública permanente da campanha construída a partir do identificador público imutável.
2. The system SHALL gerar o QR Code com nível de correção de erro Q e margem quiet zone de no mínimo 4 módulos.
3. WHEN o QR Code é lido THEN the system SHALL responder na URL codificada com a página pública da campanha em HTTP 200, sem exigir autenticação.
4. The system SHALL manter a URL do QR Code válida e apontando para a mesma campanha de forma permanente, mesmo após edições da campanha, regeneração do arquivo do selo ou encerramento da campanha.
5. IF o identificador público da URL não corresponder a nenhuma campanha aprovada THEN the system SHALL responder HTTP 404 com página amigável explicando que a campanha não foi encontrada.
6. The system SHALL usar identificadores públicos não sequenciais e não adivinháveis, impedindo a enumeração de campanhas por incremento.
7. IF a URL for acessada sobre HTTP THEN the system SHALL redirecionar para HTTPS com status 301.

**Independent Test**: Gerar o selo, ler o QR Code com um celular e confirmar a chegada à página correta; alterar a campanha, regerar o arquivo e reler o mesmo QR impresso, confirmando que continua resolvendo para a mesma página.

---

### P2: Histórico e redownload do selo

**User Story**: Como empresa, quero ver o selo de cada campanha minha e rebaixar seus arquivos, para reutilizar a arte em novas tiragens de embalagem.

**Why P2**: Evita regeneração e suporte, mas o MVP funciona com o download imediato após a geração.

**Acceptance Criteria**

1. WHEN a empresa acessa o histórico de selos THEN the system SHALL listar o selo de cada campanha sua com campanha, modelo definitivo, data-hora da primeira geração, data-hora da última regeneração e links de download de PNG e PDF.
2. WHILE a empresa estiver `APROVADA` the system SHALL manter os links de download ativos, inclusive para campanhas `ENCERRADA`.
3. IF a empresa estiver `SUSPENSA` THEN the system SHALL responder HTTP 403 a qualquer tentativa de download dos arquivos do selo, restaurando o acesso quando ela voltar a `APROVADA`.

**Independent Test**: Gerar selos em duas campanhas, verificar ambos no histórico com download funcional, encerrar uma campanha e confirmar que o download continua; suspender a empresa e confirmar 403.

---

## Edge Cases

- IF a empresa gerar o selo e depois trocar o logo THEN the system SHALL manter os arquivos já gerados inalterados e aplicar o novo logo somente em gerações posteriores.
- IF a campanha for encerrada após a geração do selo THEN the system SHALL manter a URL do QR Code funcional, exibindo a página pública com marcação de campanha encerrada.
- IF o logo enviado tiver fundo transparente incompatível com o modelo escolhido THEN the system SHALL compor sobre fundo sólido definido pelo modelo, sem falhar a geração.
- IF a regra de doação tiver texto longo demais para o modelo THEN the system SHALL truncar a exibição no selo preservando o valor e a beneficiada, e SHALL manter o texto completo na página pública.
- IF duas requisições de primeira geração para a mesma campanha chegarem simultaneamente com modelos diferentes THEN the system SHALL persistir apenas o modelo da primeira, produzir um único conjunto de arquivos e responder HTTP 409 à segunda.
- IF a beneficiada da campanha for alterada e reaprovada após a geração do selo THEN the system SHALL manter o arquivo já gerado inalterado até que a empresa peça nova geração, porque a arte impressa não se atualiza sozinha.
- WHEN o armazenamento de arquivos estiver indisponível THEN the system SHALL responder HTTP 503 e não alterar o estado da solicitação para `GERADO`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SELO-01 | P1: Solicitação do selo — abertura condicionada à campanha aprovada | Design | Pending |
| SELO-02 | P1: Solicitação do selo — unicidade de 1 selo por campanha | Design | Pending |
| SELO-03 | P1: Solicitação do selo — máquina de estados, autorização e auditoria | Design | Pending |
| SELO-04 | P1: Geração do selo — 5 modelos fixos e composição | Design | Pending |
| SELO-05 | P1: Geração do selo — modelo definitivo após a primeira geração | Design | Pending |
| SELO-06 | P1: Geração do selo — exportação PNG 300 DPI e PDF vetorial | Design | Pending |
| SELO-07 | P1: Geração do selo — determinismo, tratamento de falha e controle de acesso | Design | Pending |
| SELO-08 | P1: QR Code — codificação e parâmetros de leitura | Design | Pending |
| SELO-09 | P1: QR Code — link permanente e resolução pública | Design | Pending |
| SELO-10 | P1: QR Code — identificador não enumerável e HTTPS | Design | Pending |
| SELO-11 | P2: Histórico e redownload do selo | - | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 11 total, 0 mapeados para tasks, 11 não mapeados ⚠️ (esperado — fase Tasks ainda não executada)

---

## Success Criteria

- [ ] Empresa gera PNG e PDF do selo em menos de 2 minutos a partir da campanha aprovada, sem nenhuma etapa de pagamento.
- [ ] QR Code impresso a 2,0 cm é lido por celular comum em menos de 3 segundos.
- [ ] Nenhuma campanha tem mais de um selo nem mais de um modelo (verificável por teste que espera 409 na segunda solicitação e na troca de modelo).
- [ ] PDF entregue abre em software vetorial com QR Code em vetor e sem perda de qualidade ao ampliar.
