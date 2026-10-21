// Testes de componente de exemplo/edge do SeletorBeneficiada
// (web/src/components/campaign-wizard/SeletorBeneficiada.tsx) — Task 5.6.
//
// SeletorBeneficiada é apresentacional: todos os estados visuais
// (carregando/erro/vazio/carregado) e a ação "Tentar novamente" derivam
// exclusivamente das props. Por isso os exemplos abaixo dirigem cada estado
// diretamente via `estado`, `mensagemErro`, `podeTentarNovamente` e
// `termoBusca`, sem passar pelo hook `useBeneficiadas`.
//
// Cobre (Task 5.6):
// - Estado carregando como único estado visível, com a seleção bloqueada
//   (Requisitos 1.2, 2.1).
// - Estado vazio do catálogo com o texto exato "Nenhuma instituição disponível
//   no momento" (Requisito 2.3).
// - Estado vazio de busca: termo ativo (>= 2 chars) muda para a variante
//   "nenhum resultado para o termo" (Requisito 3.5).
// - Estado de erro exibindo as mensagens 401/403/404 recebidas via
//   `mensagemErro` (Requisitos 4.4, 4.5, 4.6).
// - Ação "Tentar novamente" presente apenas quando `podeTentarNovamente` é
//   verdadeiro e, ao clicar, invoca `onTentarNovamente` (Requisitos 2.7, 4.10).
//
// Estes são exemplos/edge; as propriedades 2/3/9/10 (ordem, nome/descrição,
// seleção e marcação) são cobertas em outras tasks e não são duplicadas aqui.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import SeletorBeneficiada, {
  type SeletorBeneficiadaProps,
} from "@/components/campaign-wizard/SeletorBeneficiada";
import type { Beneficiada } from "@/services/instituicoes";

// Texto exato do Estado_Vazio do catálogo (Requisito 2.3). Repetido aqui de
// propósito: o teste fixa o contrato visível, falhando se o componente mudar.
const MENSAGEM_VAZIO_CATALOGO = "Nenhuma instituição disponível no momento";

// Beneficiada mínima para os cenários de "carregado" (não usada nos estados
// carregando/erro/vazio, mas passada como lista para manter as props completas).
const beneficiadaFixture: Beneficiada = {
  tipo: "INSTITUICAO",
  id: "benef-1",
  nome: "Instituto Verde",
  causa: "Meio ambiente",
  cidade: "São Paulo",
  uf: "SP",
  descricao: "Reflorestamento urbano",
  site: "https://instituto-verde.org",
  logoArquivoId: null,
};

// Monta o componente com props padrão sobrescritíveis, dentro do ThemeProvider
// real (MUI) usado pelo app. Retorna também os spies dos callbacks.
function montar(props: Partial<SeletorBeneficiadaProps> = {}) {
  const onBuscar = props.onBuscar ?? vi.fn();
  const onTentarNovamente = props.onTentarNovamente ?? vi.fn();
  const onSelecionar = props.onSelecionar ?? vi.fn();

  const propsFinais: SeletorBeneficiadaProps = {
    beneficiadas: [],
    estado: "carregado",
    termoBusca: "",
    mensagemErro: "",
    podeTentarNovamente: false,
    selecionadaId: null,
    onBuscar,
    onTentarNovamente,
    onSelecionar,
    ...props,
  };

  const utils = render(
    <ThemeProvider theme={theme}>
      <SeletorBeneficiada {...propsFinais} />
    </ThemeProvider>,
  );

  return { ...utils, onBuscar, onTentarNovamente, onSelecionar };
}

describe("SeletorBeneficiada — exemplos/edge dos estados visuais", () => {
  // ──────────────────────────────────────────────────────────────────────
  // Estado carregando (Requisitos 1.2, 2.1)
  // ──────────────────────────────────────────────────────────────────────

  it("carregando: exibe o indicador como único estado e bloqueia a seleção (Req 1.2, 2.1)", async () => {
    montar({
      estado: "carregando",
      beneficiadas: [beneficiadaFixture],
    });

    // O indicador de carregamento está presente...
    expect(
      screen.getByTestId("beneficiadas-carregando"),
    ).toBeInTheDocument();

    // ...e é o único estado visível: lista, vazio e erro ficam ocultos.
    expect(screen.queryByTestId("beneficiadas-lista")).not.toBeInTheDocument();
    expect(screen.queryByTestId("beneficiadas-vazio")).not.toBeInTheDocument();
    expect(screen.queryByTestId("beneficiadas-erro")).not.toBeInTheDocument();

    // Seleção bloqueada: não há itens selecionáveis renderizados, mesmo com
    // beneficiadas na lista. Nenhum item de beneficiada aparece no DOM.
    expect(
      screen.queryByTestId(`beneficiada-item-${beneficiadaFixture.id}`),
    ).not.toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Estado vazio do catálogo (Requisito 2.3)
  // ──────────────────────────────────────────────────────────────────────

  it("vazio do catálogo: mostra o texto exato sem busca ativa (Req 2.3)", () => {
    montar({
      estado: "vazio",
      termoBusca: "",
      beneficiadas: [],
    });

    const vazio = screen.getByTestId("beneficiadas-vazio");
    expect(vazio).toBeInTheDocument();
    // Texto exato do catálogo vazio, não a variante de busca.
    expect(vazio).toHaveTextContent(MENSAGEM_VAZIO_CATALOGO);

    // Os demais estados permanecem ocultos.
    expect(
      screen.queryByTestId("beneficiadas-carregando"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("beneficiadas-erro")).not.toBeInTheDocument();
  });

  it("vazio do catálogo: termo com 1 caractere ainda usa o texto do catálogo (Req 2.3, 3.5)", () => {
    // 1 caractere não conta como busca ativa (regra de 2+): mantém o texto do
    // catálogo vazio, não a variante de "nenhum resultado".
    montar({
      estado: "vazio",
      termoBusca: "a",
      beneficiadas: [],
    });

    const vazio = screen.getByTestId("beneficiadas-vazio");
    expect(vazio).toHaveTextContent(MENSAGEM_VAZIO_CATALOGO);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Estado vazio de busca (Requisito 3.5)
  // ──────────────────────────────────────────────────────────────────────

  it("vazio de busca: termo ativo muda para a variante 'nenhum resultado' (Req 3.5)", () => {
    const termo = "escola";
    montar({
      estado: "vazio",
      termoBusca: termo,
      beneficiadas: [],
    });

    const vazio = screen.getByTestId("beneficiadas-vazio");
    // Variante de busca: cita o termo digitado e NÃO é o texto do catálogo.
    expect(vazio).toHaveTextContent(`Nenhum resultado para "${termo}"`);
    expect(vazio).not.toHaveTextContent(MENSAGEM_VAZIO_CATALOGO);
  });

  it("vazio de busca: usa o termo após trim na variante (Req 3.5)", () => {
    // Espaços ao redor são aparados antes de compor a mensagem.
    montar({
      estado: "vazio",
      termoBusca: "  reciclagem  ",
      beneficiadas: [],
    });

    const vazio = screen.getByTestId("beneficiadas-vazio");
    expect(vazio).toHaveTextContent('Nenhum resultado para "reciclagem"');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Estado de erro com mensagens 401/403/404 (Requisitos 4.4, 4.5, 4.6)
  // ──────────────────────────────────────────────────────────────────────

  // Cada status mapeia para a mensagem que `mensagemDeErro` do Cliente_HTTP
  // produziria; aqui ela chega pronta via `mensagemErro` e deve ser exibida.
  const casosErro: Array<{ status: number; mensagem: string; req: string }> = [
    {
      status: 401,
      mensagem: "Sua sessão expirou. Entre novamente para continuar.",
      req: "4.4",
    },
    {
      status: 403,
      mensagem: "Você não tem permissão para acessar o catálogo.",
      req: "4.5",
    },
    {
      status: 404,
      mensagem: "Catálogo de instituições não encontrado.",
      req: "4.6",
    },
  ];

  it.each(casosErro)(
    "erro $status: exibe a mensagem recebida via mensagemErro (Req $req)",
    ({ mensagem }) => {
      montar({
        estado: "erro",
        mensagemErro: mensagem,
        podeTentarNovamente: false,
      });

      const erro = screen.getByTestId("beneficiadas-erro");
      expect(erro).toBeInTheDocument();
      expect(erro).toHaveTextContent(mensagem);

      // O estado de erro é o único visível; os demais ficam ocultos.
      expect(
        screen.queryByTestId("beneficiadas-carregando"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("beneficiadas-vazio"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("beneficiadas-lista"),
      ).not.toBeInTheDocument();
    },
  );

  // ──────────────────────────────────────────────────────────────────────
  // Ação "Tentar novamente" (Requisitos 2.7, 4.10)
  // ──────────────────────────────────────────────────────────────────────

  it("erro recuperável: mostra 'Tentar novamente' e chama onTentarNovamente ao clicar (Req 2.7, 4.10)", async () => {
    const onTentarNovamente = vi.fn();
    montar({
      estado: "erro",
      mensagemErro: "Falha ao carregar o catálogo.",
      podeTentarNovamente: true,
      onTentarNovamente,
    });

    const erro = screen.getByTestId("beneficiadas-erro");
    const botao = within(erro).getByRole("button", {
      name: "Tentar novamente",
    });
    expect(botao).toBeInTheDocument();

    await userEvent.click(botao);
    expect(onTentarNovamente).toHaveBeenCalledTimes(1);
  });

  it("erro não recuperável: oculta a ação 'Tentar novamente' (Req 4.10)", () => {
    const onTentarNovamente = vi.fn();
    montar({
      estado: "erro",
      mensagemErro: "Você não tem permissão para acessar o catálogo.",
      podeTentarNovamente: false,
      onTentarNovamente,
    });

    const erro = screen.getByTestId("beneficiadas-erro");
    // Sem botão de nova tentativa quando o erro não é recuperável.
    expect(
      within(erro).queryByRole("button", { name: "Tentar novamente" }),
    ).not.toBeInTheDocument();
    expect(onTentarNovamente).not.toHaveBeenCalled();
  });
});
