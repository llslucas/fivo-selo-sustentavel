// Testes de unidade (exemplos e edge cases) do Catalogo_Beneficiadas
// (web/src/services/instituicoes.ts).
//
// Cobre os exemplos concretos descritos na Testing Strategy do design
// (catalogo-instituicoes-wizard):
//   - caminho feliz 200 preservando TODOS os campos do contrato
//     (`tipo`, `id`, `nome`, `causa`, `cidade`, `uf`, `descricao`, `site`,
//     `logoArquivoId`) — Requisito 1.7;
//   - propagação de `ApiError` em caso de falha, sem tratamento no serviço —
//     Requisito 4.1.
//
// As propriedades (descarte de itens inválidos / regra de busca por
// comprimento do termo) ficam em arquivos de teste de propriedade próprios
// (tasks 1.2 e 1.3) — aqui só exemplos/edge.
//
// O `request` real (services/api.ts) é exercitado contra o Mock_API
// (instalarMockFetch); nenhuma conexão de rede é estabelecida. Cada caso
// configura a resposta ANTES da chamada e chama `restaurar()` ao final.

import { describe, it, expect } from "vitest";

import { listarBeneficiadas, type Beneficiada } from "@/services/instituicoes";
import { ApiError } from "@/services/api";
import { instalarMockFetch } from "../helpers/mockFetch";
import { assertContrato } from "../helpers/requestContract";

describe("Catalogo_Beneficiadas (instituicoes.ts) — exemplos/edge", () => {
  // Exemplo de caminho feliz: a API responde 200 com uma lista de beneficiadas
  // e o serviço devolve exatamente os itens recebidos, preservando todos os
  // campos do contrato sem renomear, descartar ou transformar nenhum.
  // Validates: Requirements 1.7
  it("200: preserva todos os campos do contrato no caminho feliz", async () => {
    const instituicao: Beneficiada = {
      tipo: "INSTITUICAO",
      id: "inst-1",
      nome: "Instituto Exemplo",
      causa: "Educação",
      cidade: "São Paulo",
      uf: "SP",
      descricao: "Apoio à educação de crianças.",
      site: "https://instituto.example",
      logoArquivoId: "arq-1",
    };
    // Segundo item com os nullables em null, para garantir que valores nulos
    // também são preservados (e não caem em default nem são removidos).
    const causa: Beneficiada = {
      tipo: "CAUSA",
      id: "causa-1",
      nome: "Causa Exemplo",
      causa: null,
      cidade: null,
      uf: null,
      descricao: "Descrição da causa.",
      site: null,
      logoArquivoId: null,
    };
    const corpoEsperado: Beneficiada[] = [instituicao, causa];

    const mock = instalarMockFetch();
    try {
      mock.responderPara("/beneficiadas", { status: 200, body: corpoEsperado });

      const resultado = await listarBeneficiadas();

      // GET em /api/beneficiadas com credentials: "include" (contrato do cliente).
      assertContrato(mock.ultimaChamada(), {
        metodo: "GET",
        rota: "/beneficiadas",
      });

      // Todos os campos do contrato chegam intactos, na ordem recebida.
      expect(resultado).toEqual(corpoEsperado);

      // Verificação explícita campo a campo do primeiro item, para falhar com
      // mensagem clara caso algum campo do contrato seja perdido/renomeado.
      const [primeiro] = resultado;
      expect(primeiro.tipo).toBe(instituicao.tipo);
      expect(primeiro.id).toBe(instituicao.id);
      expect(primeiro.nome).toBe(instituicao.nome);
      expect(primeiro.causa).toBe(instituicao.causa);
      expect(primeiro.cidade).toBe(instituicao.cidade);
      expect(primeiro.uf).toBe(instituicao.uf);
      expect(primeiro.descricao).toBe(instituicao.descricao);
      expect(primeiro.site).toBe(instituicao.site);
      expect(primeiro.logoArquivoId).toBe(instituicao.logoArquivoId);

      // Os nullables permanecem null no segundo item (não viram "" nem default).
      const [, segundo] = resultado;
      expect(segundo.causa).toBeNull();
      expect(segundo.cidade).toBeNull();
      expect(segundo.uf).toBeNull();
      expect(segundo.site).toBeNull();
      expect(segundo.logoArquivoId).toBeNull();
    } finally {
      mock.restaurar();
    }
  });

  // Edge de falha (resposta não-ok): o serviço não captura nem trata o erro;
  // deixa o ApiError lançado por `request` propagar para quem chamou.
  // Validates: Requirements 4.1
  it("propaga ApiError (status da resposta) sem tratamento, em falha 5xx", async () => {
    const mock = instalarMockFetch();
    try {
      mock.responderPara("/beneficiadas", {
        status: 500,
        body: { statusCode: 500, message: "Erro interno" },
      });

      await expect(listarBeneficiadas()).rejects.toSatisfy((erro: unknown) => {
        expect(erro).toBeInstanceOf(ApiError);
        expect((erro as ApiError).status).toBe(500);
        return true;
      });
    } finally {
      mock.restaurar();
    }
  });

  // Edge de falha (sem conexão): quando o fetch rejeita, `request` converte em
  // ApiError(0, ...). O serviço propaga esse erro inalterado.
  // Validates: Requirements 4.1
  it("propaga ApiError(0) sem tratamento, em falha de rede", async () => {
    const mock = instalarMockFetch();
    try {
      mock.falharPorRede();

      await expect(listarBeneficiadas("educacao")).rejects.toSatisfy(
        (erro: unknown) => {
          expect(erro).toBeInstanceOf(ApiError);
          expect((erro as ApiError).status).toBe(0);
          return true;
        },
      );
    } finally {
      mock.restaurar();
    }
  });
});
