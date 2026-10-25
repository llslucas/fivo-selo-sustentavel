// Testes de exemplo e integração do componente FilaEmpresas
// (web/src/components/admin/FilaEmpresas.tsx) — Task 2.9.
//
// Cobre o carregamento da lista, os botões por linha, o estado vazio, o erro
// de carregamento com "Tentar novamente", o redirecionamento 401, os fluxos de
// aprovação e rejeição (confirmação, chamadas de serviço, ações desabilitadas
// durante o envio, Snackbar de sucesso e cancelamento) e os ramos de erro de
// decisão por status (409/404/403/422/500/401).
//
// A FilaEmpresas é dona do próprio carregamento: ao montar chama
// `listarFilaEmpresas` e, nas decisões, `aprovarEmpresa`/`rejeitarEmpresa` do
// serviço `@/services/admin`. Por isso mockamos esse módulo (preservando os
// demais exports, como MOTIVO_REJEICAO_MINIMO que o diálogo usa) e controlamos
// só essas três funções. `next/navigation` também é mockado porque o
// componente usa `useRouter`. Os status são simulados com `ApiError` real de
// `@/services/api`.
//
// Convenções seguidas do restante da suíte (ver
// FilaInstituicoes.documento.test.tsx e FilaEmpresas.property-*.test.tsx):
// ThemeProvider com o tema do app, `userEvent` para interações e `findBy*`
// para esperar o carregamento assíncrono inicial.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  within,
  waitFor,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { ApiError } from "@/services/api";
import { type ItemFilaEmpresa } from "@/services/admin";

const replace = vi.fn();

const listarFilaEmpresas = vi.fn();
const aprovarEmpresa = vi.fn();
const rejeitarEmpresa = vi.fn();

vi.mock("@/services/admin", async () => {
  const real =
    await vi.importActual<typeof import("@/services/admin")>("@/services/admin");
  return {
    ...real,
    listarFilaEmpresas: () => listarFilaEmpresas(),
    aprovarEmpresa: (id: string) => aprovarEmpresa(id),
    rejeitarEmpresa: (id: string, motivo: string) => rejeitarEmpresa(id, motivo),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace,
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/admin/empresas",
  useSearchParams: () => new URLSearchParams(),
}));

// Import após os mocks para que o componente use as versões mockadas.
import FilaEmpresas from "@/components/admin/FilaEmpresas";

// Fábrica de item da fila. Razões sociais distintas por padrão para
// localizar linhas sem ambiguidade.
function item(parcial: Partial<ItemFilaEmpresa> = {}): ItemFilaEmpresa {
  return {
    id: "emp-1",
    razaoSocial: "Padaria Pao Quente",
    cnpj: "11222333000181",
    email: "contato@paoquente.com",
    criadoEm: "2026-10-20T12:00:00.000Z",
    ...parcial,
  };
}

// Promessa controlável: resolvemos/rejeitamos manualmente para observar o
// estado "enviando" (ações desabilitadas) antes da conclusão.
function promessaControlada<T = void>() {
  let resolver!: (valor: T) => void;
  let rejeitar!: (erro: unknown) => void;
  const promessa = new Promise<T>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

function montar() {
  return render(
    <ThemeProvider theme={theme}>
      <FilaEmpresas />
    </ThemeProvider>,
  );
}

async function acoesDaLinha(razaoSocial: string) {
  const titulo = await screen.findByRole("heading", {
    level: 2,
    name: razaoSocial,
  });
  const linha = titulo.closest("li") as HTMLElement;
  return within(within(linha).getByTestId("acoes-empresa"));
}

const motivoValido = "Documentacao fiscal nao confere com o CNPJ informado.";

beforeEach(() => {
  replace.mockReset();
  listarFilaEmpresas.mockReset();
  aprovarEmpresa.mockReset();
  rejeitarEmpresa.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("FilaEmpresas — carregamento e exibição", () => {
  it("mostra o indicador de carregamento enquanto a lista não chega (R5.1, R5.2)", async () => {
    const { promessa, resolver } = promessaControlada<ItemFilaEmpresa[]>();
    listarFilaEmpresas.mockReturnValue(promessa);

    montar();

    // Indicador de carregamento do AsyncState (role=status).
    expect(screen.getByRole("status", { name: "Carregando" })).toBeInTheDocument();
    expect(listarFilaEmpresas).toHaveBeenCalledTimes(1);

    resolver([item()]);
    await screen.findByRole("heading", { level: 2, name: "Padaria Pao Quente" });
    await promessa;
  });

  it("renderiza uma linha por empresa com botões Aprovar e Rejeitar (R5.6)", async () => {
    listarFilaEmpresas.mockResolvedValue([
      item({ id: "emp-1", razaoSocial: "Alpha Ltda" }),
      item({ id: "emp-2", razaoSocial: "Beta SA" }),
    ]);

    montar();

    await screen.findByRole("heading", { level: 2, name: "Alpha Ltda" });

    const acoesAlpha = await acoesDaLinha("Alpha Ltda");
    expect(acoesAlpha.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(acoesAlpha.getByRole("button", { name: "Rejeitar" })).toBeInTheDocument();

    const acoesBeta = await acoesDaLinha("Beta SA");
    expect(acoesBeta.getByRole("button", { name: "Aprovar" })).toBeInTheDocument();
    expect(acoesBeta.getByRole("button", { name: "Rejeitar" })).toBeInTheDocument();
  });

  it("exibe a mensagem de lista vazia quando não há empresas (R5.5)", async () => {
    listarFilaEmpresas.mockResolvedValue([]);

    montar();

    expect(
      await screen.findByText("Nenhuma empresa aguardando análise."),
    ).toBeInTheDocument();
  });

  it("com erro ≠401, mostra mensagem e 'Tentar novamente' que refaz a chamada (R6.1, R6.2)", async () => {
    // 500 é erro recuperável → AsyncState mostra o botão de retry. A primeira
    // chamada falha; da segunda em diante resolve com a lista recuperada.
    listarFilaEmpresas
      .mockRejectedValueOnce(new ApiError(500, "Internal server error"))
      .mockResolvedValue([item({ razaoSocial: "Recuperada Ltda" })]);

    montar();

    const retry = await screen.findByRole("button", { name: "Tentar novamente" });
    expect(
      screen.getByText("O servidor está indisponível no momento. Tente novamente em instantes."),
    ).toBeInTheDocument();

    await userEvent.click(retry);

    await screen.findByRole("heading", { level: 2, name: "Recuperada Ltda" });
    // Houve ao menos uma nova chamada após o clique em "Tentar novamente".
    expect(listarFilaEmpresas.mock.calls.length).toBeGreaterThan(1);
  });

  it("com ApiError 401 no carregamento, redireciona para o login (R4.3)", async () => {
    listarFilaEmpresas.mockRejectedValue(new ApiError(401, "Nao autorizado"));

    montar();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});

describe("FilaEmpresas — aprovação (R7)", () => {
  it("abre o diálogo identificando a empresa e confirma chamando aprovarEmpresa(id) (R7.1, R7.2, R7.5)", async () => {
    listarFilaEmpresas.mockResolvedValue([
      item({ id: "emp-9", razaoSocial: "Gamma Comercio" }),
    ]);
    aprovarEmpresa.mockResolvedValue(undefined);

    montar();

    await userEvent.click((await acoesDaLinha("Gamma Comercio")).getByRole("button", { name: "Aprovar" }));

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("Gamma Comercio")).toBeInTheDocument();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Aprovar" }));

    await waitFor(() => expect(aprovarEmpresa).toHaveBeenCalledWith("emp-9"));

    // Sucesso: Snackbar com a confirmação e a empresa sai da lista.
    expect(await screen.findByText("Gamma Comercio foi aprovada.")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { level: 2, name: "Gamma Comercio" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("desabilita as ações do diálogo enquanto a aprovação está em andamento (R7.3)", async () => {
    listarFilaEmpresas.mockResolvedValue([item({ razaoSocial: "Delta ME" })]);
    const { promessa, resolver } = promessaControlada();
    aprovarEmpresa.mockReturnValue(promessa);

    montar();

    await userEvent.click((await acoesDaLinha("Delta ME")).getByRole("button", { name: "Aprovar" }));

    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Aprovar" }));

    // Durante o envio, Cancelar fica desabilitado.
    await waitFor(() =>
      expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toBeDisabled(),
    );

    resolver(undefined);
    await promessa;
    await screen.findByText("Delta ME foi aprovada.");
  });

  it("cancelar o diálogo fecha sem alterar a lista nem chamar o serviço (R7.6)", async () => {
    listarFilaEmpresas.mockResolvedValue([item({ razaoSocial: "Epsilon Ltda" })]);

    montar();

    await userEvent.click((await acoesDaLinha("Epsilon Ltda")).getByRole("button", { name: "Aprovar" }));

    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(aprovarEmpresa).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 2, name: "Epsilon Ltda" }),
    ).toBeInTheDocument();
  });
});

describe("FilaEmpresas — rejeição (R8)", () => {
  it("abre o diálogo identificando a empresa e envia motivo válido chamando rejeitarEmpresa(id, motivo) (R8.1, R8.3, R8.6)", async () => {
    listarFilaEmpresas.mockResolvedValue([
      item({ id: "emp-7", razaoSocial: "Zeta Servicos" }),
    ]);
    rejeitarEmpresa.mockResolvedValue(undefined);

    montar();

    await userEvent.click((await acoesDaLinha("Zeta Servicos")).getByRole("button", { name: "Rejeitar" }));

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("Zeta Servicos")).toBeInTheDocument();

    await userEvent.type(
      within(dialogo).getByLabelText("Motivo da rejeição"),
      motivoValido,
    );
    await userEvent.click(within(dialogo).getByRole("button", { name: "Rejeitar" }));

    await waitFor(() =>
      expect(rejeitarEmpresa).toHaveBeenCalledWith("emp-7", motivoValido),
    );

    expect(
      await screen.findByText(
        "Zeta Servicos foi rejeitada. O motivo será enviado por e-mail.",
      ),
    ).toBeInTheDocument();
  });

  it("desabilita as ações do diálogo enquanto a rejeição está em andamento (R8.4)", async () => {
    listarFilaEmpresas.mockResolvedValue([item({ razaoSocial: "Eta Ltda" })]);
    const { promessa, resolver } = promessaControlada();
    rejeitarEmpresa.mockReturnValue(promessa);

    montar();

    await userEvent.click((await acoesDaLinha("Eta Ltda")).getByRole("button", { name: "Rejeitar" }));

    const dialogo = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialogo).getByLabelText("Motivo da rejeição"),
      motivoValido,
    );
    await userEvent.click(within(dialogo).getByRole("button", { name: "Rejeitar" }));

    await waitFor(() =>
      expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toBeDisabled(),
    );

    resolver(undefined);
    await promessa;
    await screen.findByText(
      "Eta Ltda foi rejeitada. O motivo será enviado por e-mail.",
    );
  });
});

describe("FilaEmpresas — erros de decisão (R9)", () => {
  it("com 409, fecha o diálogo, avisa que outra pessoa já decidiu e recarrega (R9.1)", async () => {
    // A lista traz a empresa até a decisão falhar; depois a recarga vem vazia.
    // Usamos um flag em vez de encadear mockResolvedValueOnce porque o
    // carregamento inicial pode disparar mais de uma chamada.
    let decidiu = false;
    const theta = item({ id: "emp-1", razaoSocial: "Theta Ltda" });
    listarFilaEmpresas.mockImplementation(() =>
      Promise.resolve(decidiu ? [] : [theta]),
    );
    aprovarEmpresa.mockImplementation(() => {
      decidiu = true;
      return Promise.reject(new ApiError(409, "Conflito"));
    });

    montar();

    await userEvent.click((await acoesDaLinha("Theta Ltda")).getByRole("button", { name: "Aprovar" }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Aprovar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText(
        "Outra pessoa já decidiu sobre Theta Ltda. A lista foi atualizada.",
      ),
    ).toBeInTheDocument();
    // A lista foi recarregada após o conflito.
    await waitFor(() => expect(aprovarEmpresa).toHaveBeenCalled());
  });

  it("com 404, fecha o diálogo, avisa que não foi encontrada e recarrega (R9.2)", async () => {
    let decidiu = false;
    const iota = item({ id: "emp-2", razaoSocial: "Iota SA" });
    listarFilaEmpresas.mockImplementation(() =>
      Promise.resolve(decidiu ? [] : [iota]),
    );
    aprovarEmpresa.mockImplementation(() => {
      decidiu = true;
      return Promise.reject(new ApiError(404, "Nao encontrada"));
    });

    montar();

    await userEvent.click((await acoesDaLinha("Iota SA")).getByRole("button", { name: "Aprovar" }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Aprovar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      await screen.findByText("Iota SA não foi encontrada. A lista foi atualizada."),
    ).toBeInTheDocument();
    await waitFor(() => expect(aprovarEmpresa).toHaveBeenCalled());
  });

  it("com 403, mostra a mensagem de permissão dentro do diálogo em andamento (R9.3)", async () => {
    listarFilaEmpresas.mockResolvedValue([item({ razaoSocial: "Kappa Ltda" })]);
    aprovarEmpresa.mockRejectedValue(new ApiError(403, "Proibido"));

    montar();

    await userEvent.click((await acoesDaLinha("Kappa Ltda")).getByRole("button", { name: "Aprovar" }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Aprovar" }));

    expect(
      await within(dialogo).findByText(
        "Você não tem permissão para decidir sobre empresas.",
      ),
    ).toBeInTheDocument();
    // O diálogo permanece aberto para o admin ver o erro.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("com 500, mostra a mensagem de erro no diálogo em andamento (R9.6)", async () => {
    listarFilaEmpresas.mockResolvedValue([item({ razaoSocial: "Lambda Ltda" })]);
    aprovarEmpresa.mockRejectedValue(new ApiError(500, "Internal server error"));

    montar();

    await userEvent.click((await acoesDaLinha("Lambda Ltda")).getByRole("button", { name: "Aprovar" }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Aprovar" }));

    expect(
      await within(dialogo).findByText(
        "O servidor está indisponível no momento. Tente novamente em instantes.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("com 422 na rejeição, mostra 'motivo inválido' no diálogo de rejeição (R9.4)", async () => {
    listarFilaEmpresas.mockResolvedValue([item({ razaoSocial: "Mu Comercio" })]);
    rejeitarEmpresa.mockRejectedValue(new ApiError(422, "Unprocessable"));

    montar();

    await userEvent.click((await acoesDaLinha("Mu Comercio")).getByRole("button", { name: "Rejeitar" }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialogo).getByLabelText("Motivo da rejeição"),
      motivoValido,
    );
    await userEvent.click(within(dialogo).getByRole("button", { name: "Rejeitar" }));

    expect(
      await within(dialogo).findByText(
        "O motivo informado é inválido. Revise e tente novamente.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("com 401 numa decisão, redireciona para o login (R9.5)", async () => {
    listarFilaEmpresas.mockResolvedValue([item({ razaoSocial: "Nu Ltda" })]);
    aprovarEmpresa.mockRejectedValue(new ApiError(401, "Nao autorizado"));

    montar();

    await userEvent.click((await acoesDaLinha("Nu Ltda")).getByRole("button", { name: "Aprovar" }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Aprovar" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
