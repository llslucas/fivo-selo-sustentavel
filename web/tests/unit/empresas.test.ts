// Testes de unidade do Servico_Empresas (web/src/services/empresas.ts).
//
// Cobre as Propriedades 8–12 do design (testes-frontend) e dois exemplos
// (sucesso e edge de falha) de `criarEmpresa`. A função monta um FormData com
// 13 campos obrigatórios sempre presentes, inclui os opcionais (complemento,
// site, logo) apenas quando "truthy", NÃO define Content-Type manual (deixa o
// browser gerar o boundary do multipart) e dispara POST /empresas via cliente
// genérico (services/api.ts), que prefixa "/api" e usa credentials:"include".
//
// As Propriedades são testes fast-check, uma por teste, com no mínimo 100
// iterações. As respostas são controladas pelo Mock_API (instalarMockFetch),
// configurado ANTES de cada chamada a criarEmpresa (a guarda anti-rede do
// setup global falharia caso contrário). O reset é feito via restaurar().

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { criarEmpresa, type CriarEmpresaInput } from "@/services/empresas";
import { ApiError } from "@/services/api";
import { instalarMockFetch } from "../helpers/mockFetch";
import { assertContrato } from "../helpers/requestContract";
import {
  lerFormData,
  assertCamposPresentes,
  assertCamposAusentes,
} from "../helpers/formData";

// Os 13 campos obrigatórios que o cadastro sempre anexa ao FormData.
const CAMPOS_OBRIGATORIOS = [
  "razaoSocial",
  "nomeFantasia",
  "cnpj",
  "email",
  "senha",
  "telefone",
  "cep",
  "logradouro",
  "numero",
  "bairro",
  "cidade",
  "uf",
  "contato",
];

// String não vazia (ao menos um caractere não-branco após trim), para garantir
// que os campos obrigatórios tenham valor significativo nas asserções.
const stringNaoVazia = fc
  .string({ minLength: 1 })
  .map((s) => (s.trim().length > 0 ? s : `v${s}`));

// Constrói um File de logo determinístico a partir de um Blob, como no uso real
// (um arquivo de imagem anexado ao cadastro).
function criarLogo(nome = "logo.png"): File {
  return new File([new Blob(["x"])], nome, { type: "image/png" });
}

// Arbitrary que produz um CriarEmpresaInput com TODOS os campos obrigatórios
// não vazios. Os opcionais ficam ausentes (undefined) por padrão.
const inputObrigatorio: fc.Arbitrary<CriarEmpresaInput> = fc.record({
  razaoSocial: stringNaoVazia,
  nomeFantasia: stringNaoVazia,
  cnpj: stringNaoVazia,
  email: stringNaoVazia,
  senha: stringNaoVazia,
  telefone: stringNaoVazia,
  cep: stringNaoVazia,
  logradouro: stringNaoVazia,
  numero: stringNaoVazia,
  bairro: stringNaoVazia,
  cidade: stringNaoVazia,
  uf: stringNaoVazia,
  contato: stringNaoVazia,
});

describe("Servico_Empresas (empresas.ts)", () => {
  // Feature: testes-frontend, Property 8: Cadastro envia POST /empresas com FormData
  // Validates: Requirements 5.1
  it("Property 8: Cadastro envia POST /empresas com FormData", () => {
    fc.assert(
      fc.asyncProperty(inputObrigatorio, async (input) => {
        const mock = instalarMockFetch();
        // Resposta de sucesso para que criarEmpresa resolva sem erro.
        mock.responderCom({ status: 201, body: { id: "emp-1" } });

        await criarEmpresa(input);

        const chamada = mock.ultimaChamada();
        // Método POST, rota /api/empresas e corpo do tipo FormData.
        assertContrato(chamada, { metodo: "POST", rota: "/empresas" });
        expect(chamada.body instanceof FormData).toBe(true);

        mock.restaurar();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: testes-frontend, Property 9: Campos obrigatórios sempre presentes no FormData
  // Validates: Requirements 5.2
  it("Property 9: Campos obrigatórios sempre presentes no FormData", () => {
    fc.assert(
      fc.asyncProperty(inputObrigatorio, async (input) => {
        const mock = instalarMockFetch();
        mock.responderCom({ status: 201, body: { id: "emp-1" } });

        await criarEmpresa(input);

        const corpo = mock.ultimaChamada().body;
        expect(corpo instanceof FormData).toBe(true);
        // Os 13 obrigatórios devem estar presentes e com valor não vazio.
        assertCamposPresentes(corpo as FormData, CAMPOS_OBRIGATORIOS);

        mock.restaurar();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: testes-frontend, Property 10: Opcionais informados são incluídos no FormData
  // Validates: Requirements 5.3
  it("Property 10: Opcionais informados são incluídos no FormData", () => {
    fc.assert(
      fc.asyncProperty(
        inputObrigatorio,
        stringNaoVazia, // complemento informado
        stringNaoVazia, // site informado
        fc.string({ minLength: 1 }).map((s) => `${s.replace(/\s/g, "")}.png`), // nome do logo
        async (base, complemento, site, nomeLogo) => {
          const logo = criarLogo(nomeLogo);
          const input: CriarEmpresaInput = {
            ...base,
            complemento,
            site,
            logo,
          };

          const mock = instalarMockFetch();
          mock.responderCom({ status: 201, body: { id: "emp-1" } });

          await criarEmpresa(input);

          const corpo = mock.ultimaChamada().body as FormData;
          const mapa = lerFormData(corpo);

          // complemento e site aparecem com o valor informado.
          expect(mapa.complemento).toBe(complemento);
          expect(mapa.site).toBe(site);
          // logo aparece como File, verificado pelo nome.
          expect(mapa.logo instanceof File).toBe(true);
          expect((mapa.logo as File).name).toBe(logo.name);

          mock.restaurar();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: testes-frontend, Property 11: Opcionais ausentes são omitidos do FormData
  // Validates: Requirements 5.4
  it("Property 11: Opcionais ausentes são omitidos do FormData", () => {
    // Gera, para cada opcional, um valor "falsy" (ausente/null/vazio) ou um
    // valor presente — garantindo que ao menos um esteja ausente por iteração.
    const complementoAusente = fc.constantFrom<"" | null | undefined>(
      "",
      null,
      undefined,
    );
    const siteAusente = fc.constantFrom<"" | null | undefined>(
      "",
      null,
      undefined,
    );
    const logoAusente = fc.constantFrom<null | undefined>(null, undefined);

    fc.assert(
      fc.asyncProperty(
        inputObrigatorio,
        // Para cada opcional, decide se fica ausente (valor falsy) ou presente.
        fc.option(stringNaoVazia, { nil: undefined }),
        fc.option(stringNaoVazia, { nil: undefined }),
        fc.boolean(), // logo presente?
        complementoAusente,
        siteAusente,
        logoAusente,
        async (
          base,
          complementoPresente,
          sitePresente,
          logoPresente,
          complementoFalsy,
          siteFalsy,
          logoFalsy,
        ) => {
          // Resolve o valor final de cada opcional: ou um valor presente, ou um
          // valor "falsy" (que deve ser omitido do FormData).
          const complemento =
            complementoPresente !== undefined
              ? complementoPresente
              : (complementoFalsy ?? undefined);
          const site =
            sitePresente !== undefined ? sitePresente : (siteFalsy ?? undefined);
          const logo = logoPresente ? criarLogo() : logoFalsy;

          const input: CriarEmpresaInput = {
            ...base,
            complemento: complemento ?? undefined,
            site: site ?? undefined,
            logo: logo ?? null,
          };

          // Garante que ao menos um opcional esteja ausente nesta iteração.
          const ausentes: string[] = [];
          if (!input.complemento) ausentes.push("complemento");
          if (!input.site) ausentes.push("site");
          if (!input.logo) ausentes.push("logo");
          fc.pre(ausentes.length > 0);

          const mock = instalarMockFetch();
          mock.responderCom({ status: 201, body: { id: "emp-1" } });

          await criarEmpresa(input);

          const corpo = mock.ultimaChamada().body as FormData;
          // Cada opcional falsy deve estar omitido do FormData.
          assertCamposAusentes(corpo, ausentes);

          mock.restaurar();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: testes-frontend, Property 12: Cadastro não define Content-Type manual
  // Validates: Requirements 5.5
  it("Property 12: Cadastro não define Content-Type manual", () => {
    fc.assert(
      fc.asyncProperty(inputObrigatorio, async (input) => {
        const mock = instalarMockFetch();
        mock.responderCom({ status: 201, body: { id: "emp-1" } });

        await criarEmpresa(input);

        const chamada = mock.ultimaChamada();
        // Nenhum Content-Type manual: o browser define o boundary do multipart.
        assertContrato(chamada, {
          metodo: "POST",
          rota: "/empresas",
          semContentTypeManual: true,
        });

        mock.restaurar();
      }),
      { numRuns: 100 },
    );
  });

  // Exemplo de sucesso: criarEmpresa resolve com o objeto da empresa criada
  // sem lançar, quando a API responde 201 com { id }.
  // Validates: Requirements 5.7
  it("sucesso: resolve com a empresa criada sem lançar", async () => {
    const mock = instalarMockFetch();
    mock.responderPara("/empresas", {
      status: 201,
      body: { id: "emp-123" },
    });

    const input: CriarEmpresaInput = {
      razaoSocial: "Empresa Exemplo LTDA",
      nomeFantasia: "Exemplo",
      cnpj: "12345678000190",
      email: "contato@exemplo.com",
      senha: "senha-super-secreta",
      telefone: "11999998888",
      cep: "01001000",
      logradouro: "Praça da Sé",
      numero: "100",
      bairro: "Sé",
      cidade: "São Paulo",
      uf: "SP",
      contato: "Fulano de Tal",
    };

    const resultado = await criarEmpresa(input);
    expect(resultado).toEqual({ id: "emp-123" });

    mock.restaurar();
  });

  // Edge de falha: quando a API falha SEM coleção `errors` (500 sem corpo de
  // erros, ou falha de rede), criarEmpresa lança ApiError e nenhum fieldError
  // por campo é populado.
  // Validates: Requirements 5.8
  it("edge: falha sem coleção errors lança ApiError sem fieldErrors por campo", async () => {
    const input: CriarEmpresaInput = {
      razaoSocial: "Empresa Exemplo LTDA",
      nomeFantasia: "Exemplo",
      cnpj: "12345678000190",
      email: "contato@exemplo.com",
      senha: "senha-super-secreta",
      telefone: "11999998888",
      cep: "01001000",
      logradouro: "Praça da Sé",
      numero: "100",
      bairro: "Sé",
      cidade: "São Paulo",
      uf: "SP",
      contato: "Fulano de Tal",
    };

    // Caso 1: 500 com corpo de erro sem a coleção `errors`.
    const mock500 = instalarMockFetch();
    mock500.responderPara("/empresas", {
      status: 500,
      body: { statusCode: 500, message: "Erro interno do servidor" },
    });

    await expect(criarEmpresa(input)).rejects.toSatisfy((erro: unknown) => {
      expect(erro).toBeInstanceOf(ApiError);
      const apiErro = erro as ApiError;
      expect(apiErro.status).toBe(500);
      expect(Object.keys(apiErro.fieldErrors)).toHaveLength(0);
      return true;
    });

    mock500.restaurar();

    // Caso 2: falha de rede (fetch rejeita) → ApiError(0, ...) sem fieldErrors.
    const mockRede = instalarMockFetch();
    mockRede.falharPorRede();

    await expect(criarEmpresa(input)).rejects.toSatisfy((erro: unknown) => {
      expect(erro).toBeInstanceOf(ApiError);
      const apiErro = erro as ApiError;
      expect(apiErro.status).toBe(0);
      expect(Object.keys(apiErro.fieldErrors)).toHaveLength(0);
      return true;
    });

    mockRede.restaurar();
  });
});
