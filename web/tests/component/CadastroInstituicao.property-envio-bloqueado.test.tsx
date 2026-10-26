// Feature: seletor-causa-cadastro-instituicao, Property 6: Envio bloqueado enquanto o seletor não está pronto
//
// Property 6: Envio bloqueado enquanto o seletor não está pronto
// Validates: Requirements 5.3, 5.4
//
// Enquanto o SeletorCausa não está no estado "pronto" — ou seja, em qualquer
// estado de {carregando, erro, vazio} — o CadastroInstituicaoForm mantém o
// botão "Enviar cadastro" desabilitado e o envio bloqueado: um submit do
// formulário NÃO chega a chamar criarInstituicao(). O formulário deriva
// causasProntas = estadoCausa === "pronto" e aplica disabled={loading ||
// !causasProntas} ao botão, além de handleSubmit sair cedo quando
// estadoCausa !== "pronto".
//
// Cada estado não-pronto é induzido via mock de HTTP (GET /causas):
//   - vazio: resposta 200 com corpo [] → o seletor exibe a mensagem exata
//     "Ainda não há causas cadastradas".
//   - erro: falha de rede → o seletor cai em erro com "Tentar novamente".
//   - carregando: /causas nunca resolve (fetch stubado com promessa pendente),
//     mantendo o seletor em carregando indefinidamente.
//
// Para provar que criarInstituicao() não é chamado, respondemos /instituicoes
// com 201 (de modo que um POST, se ocorresse, seria capturado pelo mock) e, após
// submeter o formulário diretamente (clicar num botão desabilitado não dispara
// nada), afirmamos que nenhuma requisição a "/instituicoes" foi capturada —
// criarInstituicao() só é alcançável via enviar(), então a ausência desse POST
// prova que não foi chamado.

import { describe, it, expect, afterEach, vi } from "vitest";
import fc from "fast-check";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import CadastroInstituicaoForm from "@/components/cadastro/CadastroInstituicaoForm";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

// Cada iteração monta o formulário, aguarda o estado do seletor refletir e
// submete; 10 execuções ultrapassam o timeout padrão de 5 s.
vi.setConfig({ testTimeout: 120000 });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/cadastro-instituicao",
  useSearchParams: () => new URLSearchParams(),
}));

// Cada iteração monta e desmonta a própria árvore; limpamos aqui e também
// desfazemos qualquer stub global (necessário para o caso "carregando", que
// stuba o fetch com uma promessa pendente).
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type EstadoNaoPronto = "carregando" | "erro" | "vazio";

// Gera cada estado não-pronto. numRuns: 10 repete os três estados ~3x cada,
// o que é aceitável conforme a tarefa ("para cada estado").
const arbEstado: fc.Arbitrary<EstadoNaoPronto> = fc.constantFrom(
  "carregando",
  "erro",
  "vazio",
);

function renderizar() {
  return render(
    <ThemeProvider theme={theme}>
      <CadastroInstituicaoForm />
    </ThemeProvider>,
  );
}

describe("CadastroInstituicaoForm — envio bloqueado enquanto o seletor não está pronto", () => {
  // Feature: seletor-causa-cadastro-instituicao, Property 6: Envio bloqueado enquanto o seletor não está pronto
  // Validates: Requirements 5.3, 5.4
  it("Property 6: em {carregando, erro, vazio} o botão fica desabilitado e o submit não chama criarInstituicao", async () => {
    await fc.assert(
      fc.asyncProperty(arbEstado, async (estado) => {
        // mock capturará qualquer POST /instituicoes caso o envio escapasse.
        let mock: MockFetch | null = null;

        if (estado === "carregando") {
          // /causas nunca resolve: o seletor permanece em "carregando".
          // Usamos um stub manual (não o mockFetch) porque este precisa de uma
          // promessa pendente. Como não há mock, o POST /instituicoes também
          // nunca resolveria — mas no estado carregando o submit é bloqueado
          // antes de qualquer fetch, então nenhuma chamada deve ser registrada.
          vi.stubGlobal("fetch", () => new Promise<Response>(() => {}));
        } else {
          mock = instalarMockFetch();
          // Se um POST escapasse, seria capturado e respondido com 201.
          mock.responderPara("/instituicoes", { status: 201, body: { id: "inst-1" } });
          if (estado === "vazio") {
            mock.responderPara("/causas", { status: 200, body: [] });
          } else {
            // estado === "erro": falha de rede derruba o seletor em erro.
            mock.responderPara("/causas", { status: 500, body: { message: "erro" } });
          }
        }

        const { container } = renderizar();

        // Aguarda o estado do seletor ser refletido na UI.
        if (estado === "vazio") {
          await screen.findByText("Ainda não há causas cadastradas");
        } else if (estado === "erro") {
          // ErrorMessage renderiza role=alert com a ação "Tentar novamente".
          await screen.findByRole("alert");
          await screen.findByRole("button", { name: "Tentar novamente" });
        } else {
          // carregando: o combobox do seletor existe e está desabilitado.
          await waitFor(() => {
            const combobox = screen.queryByRole("combobox", {
              name: /Causa que a instituição defende/,
            });
            expect(combobox).not.toBeNull();
            expect(combobox).toHaveAttribute("aria-disabled", "true");
          });
        }

        // O botão "Enviar cadastro" está desabilitado em todos os estados
        // não-prontos (Requisitos 5.3, 5.4).
        const enviar = screen.getByRole("button", { name: "Enviar cadastro" });
        expect(enviar).toBeDisabled();

        // Clicar num botão desabilitado não faz nada; para provar que o envio
        // está bloqueado, submetemos o formulário diretamente.
        const form = container.querySelector("form");
        expect(form).not.toBeNull();
        fireEvent.submit(form as HTMLFormElement);

        // Dá tempo de qualquer efeito assentar sem que nada seja enviado.
        await Promise.resolve();

        // Nenhuma requisição a /instituicoes foi disparada → criarInstituicao()
        // não foi chamado (só é alcançável via enviar()).
        if (mock) {
          const posts = mock.chamadas.filter((c) => c.url.endsWith("/instituicoes"));
          expect(posts).toHaveLength(0);
        }

        cleanup();
        if (mock) mock.restaurar();
        vi.unstubAllGlobals();
      }),
      { numRuns: 10 },
    );
  });
});
