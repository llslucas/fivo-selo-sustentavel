// Testes de exemplo dos estados do SeletorCausa
// (web/src/components/cadastro/SeletorCausa.tsx) — Task 2.9.
//
// Diferente do SeletorBeneficiada (apresentacional), o SeletorCausa é dono do
// próprio fetch: no montar chama listarCausasComTimeout() -> request("/causas").
// Por isso estes exemplos dirigem os estados pela resposta do Mock_API
// (web/tests/helpers/mockFetch.ts), não por props.
//
// Cobre (Task 2.9):
// - Montagem (Req 1.1): exatamente uma chamada GET /causas ao montar.
// - Carregando -> pronto (Req 1.5, 3.1–3.3): indicador visível e seleção
//   desabilitada enquanto pendente; ao resolver, indicador some, seleção
//   habilita e as opções aparecem.
// - Erro + retry (Req 1.7, 3.4–3.5, 4.1–4.6): falha de rede -> Estado_Erro com
//   "Tentar novamente"; nova falha mantém o botão; sucesso na 2ª tentativa
//   exibe a lista.
// - Timeout de 10 s (Req 1.7, 4.1): com fake timers, a requisição que não
//   resolve estoura o Limite_De_Espera (AbortController) e cai em erro.
// - Vazio (Req 1.6, 5.1–5.2): /causas -> [] -> mensagem exata
//   "Ainda não há causas cadastradas".

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import SeletorCausa from "@/components/cadastro/SeletorCausa";
import { LIMITE_ESPERA_CAUSAS_MS, type Causa } from "@/services/causas";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

// Texto exato da Mensagem_Lista_Vazia (Req 5.2). Repetido de propósito: o teste
// fixa o contrato visível, falhando se o componente mudar a string.
const MENSAGEM_LISTA_VAZIA = "Ainda não há causas cadastradas";
const TEXTO_CARREGANDO = "Carregando causas…";

const causasFixture: Causa[] = [
  { id: "1", nome: "Educação", descricao: "Acesso ao ensino" },
  { id: "2", nome: "Saúde", descricao: "Atendimento e prevenção" },
  { id: "3", nome: "Meio ambiente", descricao: "Preservação ambiental" },
];

// Monta o SeletorCausa dentro do ThemeProvider real (MUI) usado pelo app.
function montar(props: Partial<React.ComponentProps<typeof SeletorCausa>> = {}) {
  const onChange = props.onChange ?? vi.fn();
  const utils = render(
    <ThemeProvider theme={theme}>
      <SeletorCausa
        value=""
        onChange={onChange}
        label="Causa"
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...utils, onChange };
}

// Chamadas capturadas que batem no endpoint /causas (ignora prefixo /api).
function chamadasCausas(mock: MockFetch) {
  return mock.chamadas.filter((c) => c.url.endsWith("/causas"));
}

describe("SeletorCausa — exemplos dos estados do seletor", () => {
  let mock: MockFetch;

  beforeEach(() => {
    mock = instalarMockFetch();
  });

  afterEach(() => {
    mock.restaurar();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Montagem (Req 1.1)
  // ──────────────────────────────────────────────────────────────────────

  it("montagem: dispara exatamente uma chamada GET /causas (Req 1.1)", async () => {
    mock.responderPara("/causas", { status: 200, body: causasFixture });

    montar();

    // Espera o efeito do montar disparar a busca e a lista aparecer.
    await waitFor(() => {
      expect(chamadasCausas(mock).length).toBe(1);
    });

    const chamadas = chamadasCausas(mock);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].method).toBe("GET");
    expect(chamadas[0].url.endsWith("/causas")).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Carregando -> pronto (Req 1.5, 3.1, 3.2, 3.3)
  // ──────────────────────────────────────────────────────────────────────

  it("carregando: mostra o indicador e bloqueia a seleção; ao resolver, some e as opções aparecem (Req 1.5, 3.1, 3.2, 3.3)", async () => {
    mock.responderPara("/causas", { status: 200, body: causasFixture });

    montar();

    // Snapshot síncrono logo após o render: ainda em "carregando" (a resposta
    // do Mock_API só resolve em um microtask posterior). Indicador presente...
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText(TEXTO_CARREGANDO)).toBeInTheDocument();
    // ...e seleção bloqueada (combobox desabilitado).
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-disabled", "true");

    // Após resolver: o indicador some e o combobox habilita.
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
    expect(screen.queryByText(TEXTO_CARREGANDO)).not.toBeInTheDocument();
    const combobox = screen.getByRole("combobox");
    expect(combobox).not.toHaveAttribute("aria-disabled", "true");

    // As opções aparecem ao abrir o seletor: nome em destaque e descrição.
    await userEvent.click(combobox);
    const opcoes = await screen.findAllByRole("option");
    expect(opcoes).toHaveLength(causasFixture.length);
    for (const causa of causasFixture) {
      const opcao = opcoes.find((o) => o.textContent?.includes(causa.nome));
      expect(opcao).toBeDefined();
      expect(opcao).toHaveTextContent(causa.nome);
      expect(opcao).toHaveTextContent(causa.descricao);
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // Erro + retry (Req 1.7, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6)
  // ──────────────────────────────────────────────────────────────────────

  it("erro + retry: falha de rede vira Estado_Erro com 'Tentar novamente'; sucesso na 2ª tentativa exibe a lista (Req 1.7, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4)", async () => {
    // 1ª busca: falha de rede -> ApiError(0) -> Estado_Erro.
    mock.falharPorRede();

    montar();

    // Estado de erro apresentado (MUI Alert) com a ação "Tentar novamente".
    const alerta = await screen.findByRole("alert");
    expect(alerta).toBeInTheDocument();
    const botaoRetry = within(alerta).getByRole("button", {
      name: "Tentar novamente",
    });
    expect(botaoRetry).toBeInTheDocument();
    expect(botaoRetry).toBeEnabled();

    // A seleção não existe durante o erro (nenhum combobox renderizado).
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    // Configura sucesso para a nova tentativa e aciona o retry.
    mock.restaurar();
    mock = instalarMockFetch();
    mock.responderPara("/causas", { status: 200, body: causasFixture });

    await userEvent.click(botaoRetry);

    // Após a nova busca bem-sucedida, a lista aparece e o erro some.
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    const combobox = await screen.findByRole("combobox");
    expect(combobox).not.toHaveAttribute("aria-disabled", "true");
    // A nova tentativa disparou uma chamada GET /causas.
    expect(chamadasCausas(mock).length).toBeGreaterThanOrEqual(1);
  });

  it("erro + retry: falha repetida mantém a ação 'Tentar novamente' disponível (Req 4.5, 4.6)", async () => {
    // 1ª busca falha.
    mock.falharPorRede();
    montar();

    const alerta = await screen.findByRole("alert");
    const botaoRetry = within(alerta).getByRole("button", {
      name: "Tentar novamente",
    });

    // 2ª busca também falha: clicamos no retry mantendo a falha de rede.
    await userEvent.click(botaoRetry);

    // Permanece em erro, com a ação "Tentar novamente" novamente disponível.
    const alertaDepois = await screen.findByRole("alert");
    expect(
      within(alertaDepois).getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Timeout de 10 s (Req 1.7, 4.1) — fake timers
  // ──────────────────────────────────────────────────────────────────────

  it("timeout: requisição que não resolve estoura o Limite_De_Espera e cai em erro (Req 1.7, 4.1)", async () => {
    // O Mock_API sempre resolve; aqui precisamos de uma requisição que nunca
    // resolve até o AbortController de listarCausasComTimeout() disparar. Por
    // isso stubamos o fetch com um promise que só rejeita quando o signal
    // aborta (como o fetch real faz), reproduzindo o timeout fielmente.
    vi.useFakeTimers();
    mock.restaurar();

    const fetchStub = ((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }
      });
    }) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchStub);

    try {
      montar();

      // Antes do limite: ainda carregando (nenhum alerta de erro).
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // Avança além do Limite_De_Espera (10 s): o AbortController dispara, o
      // fetch rejeita e request() converte em ApiError(0) -> Estado_Erro.
      await vi.advanceTimersByTimeAsync(LIMITE_ESPERA_CAUSAS_MS + 1);
      // Deixa a cadeia de promises (fetch -> request -> setEstado) assentar.
      await vi.runAllTimersAsync();

      // Volta aos timers reais antes de consultar o DOM, evitando que o
      // findBy/waitFor dependa dos timers falsos para avançar.
      vi.useRealTimers();

      const alerta = await screen.findByRole("alert");
      expect(alerta).toBeInTheDocument();
      expect(
        within(alerta).getByRole("button", { name: "Tentar novamente" }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // Vazio (Req 1.6, 5.1, 5.2)
  // ──────────────────────────────────────────────────────────────────────

  it("vazio: /causas -> [] exibe a mensagem exata 'Ainda não há causas cadastradas' e bloqueia a seleção (Req 1.6, 5.1, 5.2)", async () => {
    mock.responderPara("/causas", { status: 200, body: [] });

    montar();

    // A mensagem exata da Lista_Vazia aparece após a busca bem-sucedida.
    expect(await screen.findByText(MENSAGEM_LISTA_VAZIA)).toBeInTheDocument();

    // Sem erro e seleção bloqueada (combobox desabilitado).
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
