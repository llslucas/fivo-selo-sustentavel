// Feature: seletor-causa-cadastro-instituicao, Property 4: Envio válido carrega um id pertencente à lista
//
// Property 4: Envio válido carrega um id pertencente à lista
// Validates: Requirements 2.3
//
// Para qualquer lista não vazia de causas e qualquer causa escolhida nela,
// preencher os campos mínimos do CadastroInstituicaoForm, selecionar essa causa
// e enviar o cadastro faz com que `criarInstituicao()` receba um `causaId` igual
// ao `id` da causa escolhida — e esse id pertence à lista apresentada pelo
// seletor. A asserção lê o `causaId` do corpo multipart capturado no POST
// /instituicoes (via mockFetch + lerFormData), que é exatamente o valor que o
// formulário passou a `criarInstituicao()`.
//
// A interação usa fireEvent (change nos campos de texto, mouseDown para abrir o
// MUI select, click no option por índice) de forma síncrona, como o teste de
// propriedade de referência (SeletorCausa.property-selecao). userEvent, com
// atrasos de ponteiro por evento, torna 100 iterações de formulário completo
// inviáveis em tempo de teste. O upload do documento reusa um único File.

import { describe, it, expect, afterEach, vi } from "vitest";
import fc from "fast-check";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import CadastroInstituicaoForm from "@/components/cadastro/CadastroInstituicaoForm";
import type { Causa } from "@/services/causas";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";
import { lerFormData } from "../helpers/formData";

// Preencher o formulário inteiro 100 vezes (busca de causas + estado "pronto" +
// envio) ultrapassa de longe o timeout padrão de 5 s. Cada iteração monta e
// preenche o formulário completo de instituição (árvore MUI grande) ~4 s em
// jsdom; 100 iterações ≈ 400 s, daí o teto generoso de 10 min.
vi.setConfig({ testTimeout: 600000 });

// next/navigation é mockado como no teste de referência (cadastro-instituicao).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/cadastro-instituicao",
  useSearchParams: () => new URLSearchParams(),
}));

// Cada iteração monta e desmonta a própria árvore; limpamos aqui para garantir
// independência entre runs (o afterEach global também desmonta).
afterEach(() => {
  cleanup();
});

// Documento de comprovação reusado em todas as iterações (um PDF mínimo). Criar
// um File por iteração não acrescenta cobertura e só deixa o teste mais lento.
const DOCUMENTO = new File(["%PDF"], "estatuto.pdf", { type: "application/pdf" });

// Nome de causa simples: alfanumérico, 1..12 caracteres, sempre não vazio.
// Nomes simples e únicos deixam cada option inequívoca no listbox; a seleção é
// por índice, então o importante é que o nome renderize e seja distinguível.
const arbNome: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 12, unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789") })
  .filter((s) => s.trim().length > 0);

// Gerador de causa com os campos do contrato: id 1..36, nome alfanumérico
// 1..12, descricao 0..500 (Requisito 7.2).
const arbCausa: fc.Arbitrary<Causa> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 36 }),
  nome: arbNome,
  descricao: fc.string({ minLength: 0, maxLength: 500 }),
});

// Lista NÃO vazia com ids e nomes únicos: o id é o valor emitido/enviado e o
// nome é a accessible name da option; ambos únicos tornam a asserção inequívoca.
const arbListaNaoVazia: fc.Arbitrary<Causa[]> = fc
  .uniqueArray(arbCausa, {
    minLength: 1,
    maxLength: 12,
    selector: (c) => c.id,
  })
  .filter((lista) => new Set(lista.map((c) => c.nome)).size === lista.length);

function preencherCamposTexto() {
  const digitar = (rotulo: RegExp, valor: string) =>
    fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

  digitar(/Razão social/, "Instituto Esperança Ltda");
  digitar(/Nome fantasia/, "Instituto Esperança");
  digitar(/CNPJ/, "12345678000190");
  digitar(/Telefone/, "19999990000");
  digitar(/E-mail/, "contato@esperanca.org");
  digitar(/Pessoa de contato/, "Maria Souza");
  digitar(/^Site/, "https://esperanca.org");
  digitar(/^Senha/, "senhasegura123");
  digitar(/Confirmar senha/, "senhasegura123");
  // CEP propositalmente com menos de 8 dígitos: satisfaz a validação de campo
  // obrigatório (não vazio) sem disparar a busca de endereço (useBuscaCep só
  // busca com 8 dígitos). Evita um fetch de CEP por iteração, que a cada uma
  // das 100 execuções só somaria latência sem agregar cobertura a esta Property.
  digitar(/CEP/, "13870");
  digitar(/Endereço \(Rua, Av\.\)/, "Rua das Flores");
  digitar(/^Número/, "100");
  digitar(/Bairro/, "Centro");
  digitar(/Cidade/, "São João da Boa Vista");
  digitar(/^UF/, "sp");
  digitar(/Descrição da instituição/, "Apoio a crianças em vulnerabilidade.");
}

describe("CadastroInstituicaoForm — envio válido carrega um id pertencente à lista", () => {
  // Feature: seletor-causa-cadastro-instituicao, Property 4: Envio válido carrega um id pertencente à lista
  // Validates: Requirements 2.3
  it("Property 4: o causaId enviado é o id da causa escolhida e pertence à lista", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbListaNaoVazia,
        // Índice da causa a selecionar, resolvido contra o tamanho da lista.
        fc.nat(),
        async (causas, indiceBruto) => {
          const indice = indiceBruto % causas.length;
          const alvo = causas[indice];

          // Mock de HTTP por iteração: /causas devolve a lista gerada e o POST
          // de cadastro (/instituicoes) responde 201.
          const mock: MockFetch = instalarMockFetch();
          mock.responderPara("/causas", { status: 200, body: causas });
          mock.responderPara("/instituicoes", { status: 201, body: { id: "inst-1" } });

          render(
            <ThemeProvider theme={theme}>
              <CadastroInstituicaoForm />
            </ThemeProvider>,
          );

          preencherCamposTexto();

          // Aguarda o seletor atingir "pronto": o combobox habilitado aparece.
          const combobox = await screen.findByRole("combobox", {
            name: /Causa que a instituição defende/,
          });

          // Abre o MUI select e seleciona a option do índice escolhido. Os
          // options vêm na ordem da lista recebida (o front não reordena).
          fireEvent.mouseDown(combobox);
          await screen.findByRole("listbox");
          const options = screen.getAllByRole("option");
          expect(options).toHaveLength(causas.length);
          // Clicar na option dispara o onChange do TextField select de forma
          // síncrona (grava o causaId no formulário). Não aguardamos o fecho do
          // listbox: a transição de saída do MUI não afeta o valor já gravado e
          // só somaria latência a cada uma das 100 iterações.
          fireEvent.click(options[indice]);

          // Anexa o documento de comprovação (obrigatório para o envio).
          fireEvent.change(screen.getByLabelText("Documento de comprovação"), {
            target: { files: [DOCUMENTO] },
          });

          // Envia o cadastro.
          fireEvent.click(screen.getByRole("button", { name: "Enviar cadastro" }));

          // Aguarda o POST /instituicoes ser capturado (o envio foi liberado).
          const chamadasCadastro = () =>
            mock.chamadas.filter((c) => c.url.endsWith("/instituicoes"));
          await waitFor(() => expect(chamadasCadastro()).toHaveLength(1));

          const [chamada] = chamadasCadastro();
          expect(chamada.method).toBe("POST");
          expect(chamada.body).toBeInstanceOf(FormData);
          const campos = lerFormData(chamada.body as FormData);

          // O causaId enviado é exatamente o id da causa escolhida...
          expect(campos.causaId).toBe(alvo.id);
          // ...e esse id pertence à lista apresentada pelo seletor.
          expect(causas.map((c) => c.id)).toContain(campos.causaId as string);

          mock.restaurar();
          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
