# Usuários de demonstração

Contas criadas pelo seed de demonstração (`docker compose exec api npm run seed:demo`). Todos os dados são fictícios e os e-mails `.demo` não recebem mensagens.

**Senha de todos os usuários do seed:** `Demo-Fivo-2026` (ou o valor de `SEED_SENHA`, se definido ao rodar o seed).

## Administrador

| E-mail            | Senha                            |
| ----------------- | -------------------------------- |
| `admin@fivo.test` | valor de `ADMIN_SENHA` no `.env` |

Fica com as aprovações de empresas, instituições e campanhas. A fila de campanhas começa com dois pedidos novos (Safra Solidária 2026 e Bit Verde) e uma alteração (Beleza que acolhe, de 5% para 7%).

## Empresas

| Empresa               | Situação  | E-mail                              | Responsável        | Cidade            | Campanhas |
| --------------------- | --------- | ----------------------------------- | ------------------ | ----------------- | --------- |
| Café Serra Alta       | Aprovada  | `sustentabilidade@serraalta.demo`   | Rafael Mendes      | Belo Horizonte/MG | 3         |
| Ondas Tech            | Aprovada  | `rh@ondastech.demo`                 | Juliana Prado      | Florianópolis/SC  | 3         |
| Verde Vivo            | Aprovada  | `contato@verdevivo.demo`            | Mariana Lopes      | São Paulo/SP      | 3         |
| Moda Leve             | Pendente  | `contato@modaleve.demo`             | Fernanda Kowalski  | Curitiba/PR       | —         |
| Pão da Vila           | Pendente  | `financeiro@paodavila.demo`         | Carlos Albuquerque | Recife/PE         | —         |
| Horizonte Obras       | Rejeitada | `adm@horizonteobras.demo`           | Paulo Ribeiro      | Rio de Janeiro/RJ | —         |
| Litoral Distribuidora | Suspensa  | `contato@litoraldistribuidora.demo` | Bruno Santana      | Salvador/BA       | —         |

### Campanhas das empresas aprovadas

| Empresa         | Campanha                      | Situação                           | Beneficiada          | Regra                |
| --------------- | ----------------------------- | ---------------------------------- | -------------------- | -------------------- |
| Verde Vivo      | Cada frasco planta uma árvore | Aprovada, em andamento             | Raízes da Mata       | R$ 2,00 por unidade  |
| Verde Vivo      | Beleza que acolhe             | Aprovada, com alteração em análise | Casa Esperança       | 5% (pedido: 7%)      |
| Verde Vivo      | Linha Pet Natural             | Rascunho                           | Patas Amigas         | R$ 1,50 por unidade  |
| Café Serra Alta | Café que alimenta             | Aprovada, em andamento             | Prato Cheio          | R$ 1,00 por unidade  |
| Café Serra Alta | Safra Solidária 2026          | Em análise                         | Causa Educação       | 3%                   |
| Café Serra Alta | Natal sem fome                | Rejeitada                          | Causa Combate à Fome | 10%                  |
| Ondas Tech      | Código do Futuro              | Aprovada, sem data de fim          | Aprender Juntos      | 2%                   |
| Ondas Tech      | Volta às aulas conectada      | Aprovada, encerrada                | Aprender Juntos      | R$ 50,00 por unidade |
| Ondas Tech      | Bit Verde                     | Em análise                         | Causa Meio Ambiente  | R$ 0,50 por unidade  |

## Instituições

| Instituição       | Situação  | E-mail                           | Responsável         | Causa             | Cidade            |
| ----------------- | --------- | -------------------------------- | ------------------- | ----------------- | ----------------- |
| Aprender Juntos   | Aprovada  | `contato@aprenderjuntos.demo`    | Helena Duarte       | Educação          | São Paulo/SP      |
| Casa Esperança    | Aprovada  | `acolhimento@casaesperanca.demo` | Irmã Lúcia Teixeira | Saúde             | Goiânia/GO        |
| Patas Amigas      | Aprovada  | `adote@patasamigas.demo`         | Gabriel Schneider   | Proteção Animal   | Porto Alegre/RS   |
| Prato Cheio       | Aprovada  | `doacoes@pratocheio.demo`        | Antônia Nogueira    | Combate à Fome    | Fortaleza/CE      |
| Raízes da Mata    | Aprovada  | `projetos@raizesdamata.demo`     | Tiago Vasconcelos   | Meio Ambiente     | Vitória/ES        |
| Bola pra Frente   | Pendente  | `contato@bolaprafrente.demo`     | Marcos Silva        | Cultura e Esporte | Rio de Janeiro/RJ |
| Ler é Viver       | Pendente  | `biblioteca@lereviver.demo`      | Rosa Amazonas       | Educação          | Manaus/AM         |
| Mar Limpo         | Rejeitada | `contato@marlimpo.demo`          | Diego Furtado       | Meio Ambiente     | Santos/SP         |
| Sorriso Solidário | Suspensa  | `contato@sorrisosolidario.demo`  | Patrícia Moura      | Saúde             | Brasília/DF       |

## Causas

Educação, Meio Ambiente, Saúde, Proteção Animal, Combate à Fome e Cultura e Esporte estão ativas. Inclusão Digital está inativa.

## Roteiro sugerido

1. Entre como `admin@fivo.test` e aprove ou rejeite os itens da fila (empresas, instituições e campanhas pendentes).
2. Entre como `contato@verdevivo.demo` para ver o painel de uma empresa com campanhas em vários estados e gerar o selo.
3. Abra a vitrine pública da Verde Vivo ou do Café Serra Alta sem estar logado.
4. Entre como `adm@horizonteobras.demo` para ver como fica uma empresa rejeitada.
