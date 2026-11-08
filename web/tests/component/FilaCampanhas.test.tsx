// Testes da página /admin/campanhas (vitrine-e-selo T43, VIT-12 AC1–AC7).
// O serviço do admin é mockado; os erros usam ApiError real.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { ApiError } from "@/services/api";
import { type ItemFilaCampanha } from "@/services/admin";

const replace = vi.fn();

const listarFilaCampanhas = vi.fn();
const aprovarCampanha = vi.fn();
const rejeitarCampanha = vi.fn();
const aprovarAlteracao = vi.fn();
const rejeitarAlteracao = vi.fn();

vi.mock("@/services/admin", async () => {
  const real = await vi.importActual<typeof import("@/services/admin")>("@/services/admin");
  return {
    ...real,
    listarFilaCampanhas: () => listarFilaCampanhas(),
    aprovarCampanha: (id: string) => aprovarCampanha(id),
    rejeitarCampanha: (id: string, motivo: string) => rejeitarCampanha(id, motivo),
    aprovarAlteracao: (id: string) => aprovarAlteracao(id),
    rejeitarAlteracao: (id: string, motivo: string) => rejeitarAlteracao(id, motivo),
  };
});

// O router precisa ser o mesmo objeto em todo render: `carregar` depende dele.
vi.mock("next/navigation", () => {
  let router: { push: () => void; replace: typeof replace } | null = null;
  return {
    useRouter: () => (router ??= { push: vi.fn(), replace }),
    usePathname: () => "/admin/campanhas",
    useSearchParams: () => new URLSearchParams(),
  };
});

import AdminCampanhasPage from "@/app/admin/campanhas/page";

const MOTIVO_19 = "a".repeat(19);
const MOTIVO_20 = "a".repeat(20);

const nova: ItemFilaCampanha = {
  campanhaId: "camp-nova",
  tipo: "NOVA",
  empresa: "Café Serra Verde",
  nome: "Água Limpa",
  beneficiada: { tipo: "INSTITUICAO", nome: "Instituto Verde" },
  regraDoacao: { tipo: "POR_UNIDADE", valor: "1.00" },
  vigencia: { inicio: "2026-11-01", fim: "2027-01-31" },
  submetidoEm: "2026-10-28T12:00:00.000Z",
};

const alteracao: ItemFilaCampanha = {
  campanhaId: "camp-alteracao",
  tipo: "ALTERACAO",
  empresa: "Padaria Sol",
  nome: "Pão Solidário",
  beneficiada: { tipo: "CAUSA", nome: "Educação" },
  regraDoacao: { tipo: "PERCENTUAL", percentual: "2.50" },
  vigencia: { inicio: "2026-10-01" },
  submetidoEm: "2026-10-29T12:00:00.000Z",
};

function montar() {
  return render(
    <ThemeProvider theme={theme}>
      <AdminCampanhasPage />
    </ThemeProvider>,
  );
}

async function itemDe(nome: string) {
  const titulo = await screen.findByRole("heading", { name: nome });
  return within(titulo.closest("li")!);
}

beforeEach(() => {
  replace.mockClear();
  for (const fn of [
    listarFilaCampanhas,
    aprovarCampanha,
    rejeitarCampanha,
    aprovarAlteracao,
    rejeitarAlteracao,
  ]) {
    fn.mockReset();
  }
  listarFilaCampanhas.mockResolvedValue([nova, alteracao]);
});

describe("Fila de campanhas do admin", () => {
  it("lista os itens na ordem da API com o rótulo e os dados de cada um", async () => {
    montar();

    const itens = await screen.findAllByTestId("item-fila-campanha");
    expect(itens).toHaveLength(2);
    expect(within(itens[0]).getByRole("heading")).toHaveTextContent("Água Limpa");
    expect(within(itens[1]).getByRole("heading")).toHaveTextContent("Pão Solidário");

    const primeiro = within(itens[0]);
    expect(primeiro.getByText("Nova")).toBeInTheDocument();
    expect(primeiro.getByText("Café Serra Verde")).toBeInTheDocument();
    expect(primeiro.getByText("Beneficiada: Instituto Verde")).toBeInTheDocument();
    expect(primeiro.getByText("R$ 1,00 por unidade vendida")).toBeInTheDocument();
    expect(primeiro.getByText("Vigência: 01/11/2026 a 31/01/2027")).toBeInTheDocument();
    expect(primeiro.getByText("Enviada em 28/10/2026")).toBeInTheDocument();

    const segundo = within(itens[1]);
    expect(segundo.getByText("Alteração")).toBeInTheDocument();
    expect(segundo.getByText("Padaria Sol")).toBeInTheDocument();
    expect(segundo.getByText("Beneficiada: Educação")).toBeInTheDocument();
    expect(segundo.getByText("2,5% de cada venda")).toBeInTheDocument();
    expect(segundo.getByText("Vigência: A partir de 01/10/2026")).toBeInTheDocument();
    expect(segundo.getByText("Enviada em 29/10/2026")).toBeInTheDocument();
  });

  it("mostra a mensagem de fila vazia", async () => {
    listarFilaCampanhas.mockResolvedValue([]);
    montar();

    expect(await screen.findByText("Nenhuma campanha aguardando análise.")).toBeInTheDocument();
  });

  it.each([
    ["Nova", nova, aprovarCampanha, aprovarAlteracao],
    ["Alteração", alteracao, aprovarAlteracao, aprovarCampanha],
  ])(
    "aprovar um item %s chama a rota do tipo e retira o item",
    async (_rotulo, item, rotaCerta, rotaErrada) => {
      rotaCerta.mockResolvedValue(undefined);
      montar();

      await userEvent.click((await itemDe(item.nome)).getByRole("button", { name: "Aprovar" }));
      await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Aprovar" }));

      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: item.nome })).not.toBeInTheDocument(),
      );
      expect(rotaCerta).toHaveBeenCalledWith(item.campanhaId);
      expect(rotaErrada).not.toHaveBeenCalled();
      expect(screen.getAllByTestId("item-fila-campanha")).toHaveLength(1);
    },
  );

  it.each([
    ["Nova", nova, rejeitarCampanha, rejeitarAlteracao],
    ["Alteração", alteracao, rejeitarAlteracao, rejeitarCampanha],
  ])(
    "rejeitar um item %s envia o motivo pela rota do tipo e retira o item",
    async (_rotulo, item, rotaCerta, rotaErrada) => {
      rotaCerta.mockResolvedValue(undefined);
      montar();

      await userEvent.click((await itemDe(item.nome)).getByRole("button", { name: "Rejeitar" }));
      const dialogo = within(screen.getByRole("dialog"));
      await userEvent.click(dialogo.getByLabelText("Motivo da rejeição"));
      await userEvent.paste(MOTIVO_20);
      await userEvent.click(dialogo.getByRole("button", { name: "Rejeitar" }));

      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: item.nome })).not.toBeInTheDocument(),
      );
      expect(rotaCerta).toHaveBeenCalledWith(item.campanhaId, MOTIVO_20);
      expect(rotaErrada).not.toHaveBeenCalled();
    },
  );

  it("mantém o confirmar da rejeição desabilitado com 19 caracteres e habilita com 20", async () => {
    montar();

    await userEvent.click((await itemDe(nova.nome)).getByRole("button", { name: "Rejeitar" }));
    const dialogo = within(screen.getByRole("dialog"));
    const campo = dialogo.getByLabelText("Motivo da rejeição");
    const confirmar = dialogo.getByRole("button", { name: "Rejeitar" });

    expect(confirmar).toBeDisabled();
    await userEvent.click(campo);
    await userEvent.paste(MOTIVO_19);
    expect(confirmar).toBeDisabled();
    await userEvent.type(campo, "a");
    expect(confirmar).toBeEnabled();
  });

  it("no 409, mostra a mensagem da API e recarrega a fila", async () => {
    aprovarCampanha.mockRejectedValue(
      new ApiError(409, "A beneficiada não está mais disponível no catálogo"),
    );
    montar();
    await itemDe(nova.nome);
    listarFilaCampanhas.mockResolvedValue([alteracao]);

    await userEvent.click((await itemDe(nova.nome)).getByRole("button", { name: "Aprovar" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Aprovar" }));

    expect(
      await screen.findByText("A beneficiada não está mais disponível no catálogo"),
    ).toBeInTheDocument();
    expect(listarFilaCampanhas).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: nova.nome })).not.toBeInTheDocument(),
    );
  });

  it("manda para o login quando a sessão expira ao carregar", async () => {
    listarFilaCampanhas.mockRejectedValue(new ApiError(401, "Não autenticado"));
    montar();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
