// Teste de propriedade do Catalogo_Beneficiadas (web/src/services/instituicoes.ts).
//
// Cobre a Property 1 do design (catalogo-instituicoes-wizard): o descarte de
// beneficiadas sem `id` ou `nome`. O `request` real (services/api.ts) é
// exercitado contra o Mock_API (instalarMockFetch), nunca contra rede de
// verdade; a lista bruta devolvida pelo fetch mockado é construída com itens
// válidos e itens inválidos (sem `id`/`nome`), e afirma-se que a saída de
// `listarBeneficiadas` contém exatamente os itens válidos, na ordem relativa
// original.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { listarBeneficiadas, type Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch } from "../helpers/mockFetch";

// Gera uma beneficiada válida: `id` e `nome` não vazios garantidos, demais
// campos arbitrários dentro do contrato.
const beneficiadaValidaArb: fc.Arbitrary<Beneficiada> = fc.record({
  tipo: fc.constantFrom<Beneficiada["tipo"]>("INSTITUICAO", "CAUSA"),
  id: fc.string({ minLength: 1 }).filter((s) => s.length > 0),
  nome: fc.string({ minLength: 1 }).filter((s) => s.length > 0),
  causa: fc.option(fc.string(), { nil: null }),
  cidade: fc.option(fc.string(), { nil: null }),
  uf: fc.option(fc.string(), { nil: null }),
  descricao: fc.string(),
  site: fc.option(fc.string(), { nil: null }),
  logoArquivoId: fc.option(fc.string(), { nil: null }),
});

// Gera uma beneficiada inválida: falta `id`, falta `nome`, ou ambos vazios
// (""), que o serviço trata como ausente via Boolean(...).
const beneficiadaInvalidaArb: fc.Arbitrary<Record<string, unknown>> = fc
  .record({
    tipo: fc.constantFrom("INSTITUICAO", "CAUSA"),
    id: fc.oneof(fc.constant(""), fc.constant(undefined), fc.constant(null)),
    nome: fc.oneof(fc.constant(""), fc.constant(undefined), fc.constant(null)),
    descricao: fc.string(),
  })
  // Garante que ao menos um dos campos obrigatórios está ausente/vazio. Como
  // ambos já saem de um conjunto "vazio", a condição é sempre verdadeira, mas
  // deixamos explícito para legibilidade.
  .filter((item) => !item.id || !item.nome);

type ItemBruto = { valido: boolean; item: Record<string, unknown> };

// Gera um item etiquetado (válido ou inválido) para montar listas mistas em
// qualquer ordem, preservando o rótulo para a asserção da saída esperada.
const itemBrutoArb: fc.Arbitrary<ItemBruto> = fc.oneof(
  beneficiadaValidaArb.map((item) => ({ valido: true, item: item as Record<string, unknown> })),
  beneficiadaInvalidaArb.map((item) => ({ valido: false, item })),
);

describe("Catalogo_Beneficiadas (instituicoes.ts) — descarte de itens inválidos", () => {
  // Feature: catalogo-instituicoes-wizard, Property 1: Descarte de beneficiadas sem id ou nome
  // Validates: Requirements 1.8
  it("Property 1: Descarte de beneficiadas sem id ou nome", () => {
    fc.assert(
      fc.asyncProperty(fc.array(itemBrutoArb), async (brutos) => {
        const mock = instalarMockFetch();
        const listaBruta = brutos.map((b) => b.item);
        mock.responderCom({ status: 200, body: listaBruta });

        const resultado = await listarBeneficiadas();

        // Saída esperada: exatamente os itens válidos, na mesma ordem relativa.
        const esperado = brutos.filter((b) => b.valido).map((b) => b.item);

        expect(
          resultado,
          `Esperado apenas os itens válidos na ordem original. ` +
            `Lista bruta: ${JSON.stringify(listaBruta)}.`,
        ).toEqual(esperado);

        // Nenhum item descartado (sem id ou sem nome) deve aparecer na saída.
        for (const item of resultado) {
          expect(Boolean(item.id)).toBe(true);
          expect(Boolean(item.nome)).toBe(true);
        }

        mock.restaurar();
      }),
      { numRuns: 100 },
    );
  });
});
