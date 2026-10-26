// Testes de exemplo do fluxo 422 "causa inválida ou inativa" completo do
// CadastroInstituicaoForm (web/src/components/cadastro/CadastroInstituicaoForm.tsx)
// — Task 5.3.
//
// Cobre (Requisitos 6.1, 6.2, 6.3, 6.4):
// - 422 básico: a API rejeita o envio com
//   `errors: [{ campo: "causaId", mensagem: "…" }]`; o formulário exibe a
//   Mensagem_Causa_Invalida junto ao campo (sem acionar o ErrorMessage global),
//   limpa a seleção de causaId e dispara um novo GET /causas (recarregamento do
//   seletor). (6.1, 6.2, 6.3)
// - Recarregamento OK + reenvio: após o 422 e o recarregamento bem-sucedido, o
//   usuário escolhe uma nova causa; com a API voltando a 201, o reenvio é
//   liberado e o POST leva o id recém-selecionado. (6.3)
// - Recarregamento com falha: se o GET /causas disparado pelo 422 falhar, o
//   seletor cai em "erro" (com "Tentar novamente") e o envio permanece
//   bloqueado. (6.4)
//
// O setup segue o teste de referência tests/component/cadastro-instituicao.test.tsx:
// mock de next/navigation, instalarMockFetch() + responderPara("/causas", …),
// o helper preencherTudo(user) e a inspeção de FormData via lerFormData.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import CadastroInstituicaoForm from "@/components/cadastro/CadastroInstituicaoForm";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";
import { lerFormData } from "../helpers/formData";

// Preencher o formulário inteiro leva alguns segundos num notebook lento.
vi.setConfig({ testTimeout: 20000 });

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/cadastro-instituicao",
  useSearchParams: () => new URLSearchParams(),
}));

// Mensagem_Causa_Invalida devolvida pela API no corpo do 422 (campo causaId).
// É a mesma string esperada junto ao campo após a rejeição (Requisito 6.1).
const MENSAGEM_422 = "Causa inválida ou inativa.";

const CAUSAS = [
  { id: "causa-1", nome: "Educação", descricao: "Ensino" },
  { id: "causa-2", nome: "Meio ambiente", descricao: "Natureza" },
];

let mock: MockFetch;

beforeEach(() => {
  push.mockClear();
  mock = instalarMockFetch();
  mock.responderPara("/causas", { status: 200, body: CAUSAS });
});

function renderizar() {
  return render(
    <ThemeProvider theme={theme}>
      <CadastroInstituicaoForm />
    </ThemeProvider>,
  );
}

function chamadasDeCadastro() {
  return mock.chamadas.filter((c) => c.url.endsWith("/instituicoes"));
}

function chamadasDeCausas() {
  return mock.chamadas.filter((c) => c.url.endsWith("/causas"));
}

// Preenche todos os campos obrigatórios e seleciona a causa informada.
// Copiado do teste de referência; `preencher` controla se já seleciona uma
// causa (os testes de recarregamento preenchem e selecionam em momentos
// distintos).
async function preencherTudo(
  user: ReturnType<typeof userEvent.setup>,
  nomeCausa = "Educação",
) {
  // fireEvent.change em vez de user.type: ~150 teclas por campo deixam o
  // teste lento sem acrescentar cobertura.
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
  digitar(/CEP/, "13870-000");
  digitar(/Endereço \(Rua, Av\.\)/, "Rua das Flores");
  digitar(/^Número/, "100");
  digitar(/Bairro/, "Centro");
  digitar(/Cidade/, "São João da Boa Vista");
  digitar(/^UF/, "sp");
  digitar(/Descrição da instituição/, "Apoio a crianças em vulnerabilidade.");

  await selecionarCausa(user, nomeCausa);

  await user.upload(
    screen.getByLabelText("Documento de comprovação"),
    new File(["%PDF"], "estatuto.pdf", { type: "application/pdf" }),
  );
}

// Abre o combobox e escolhe a opção pelo nome visível.
async function selecionarCausa(
  user: ReturnType<typeof userEvent.setup>,
  nomeCausa: string,
) {
  await user.click(
    screen.getByRole("combobox", { name: /Causa que a instituição defende/ }),
  );
  await user.click(await screen.findByRole("option", { name: new RegExp(nomeCausa) }));
}

describe("CadastroInstituicaoForm — fluxo 422 'causa inválida ou inativa'", () => {
  // ──────────────────────────────────────────────────────────────────────
  // Teste 1 — 422 básico (Req 6.1, 6.2, 6.3)
  // ──────────────────────────────────────────────────────────────────────

  it("422: exibe a mensagem junto ao campo, limpa causaId e dispara novo GET /causas (Req 6.1, 6.2, 6.3)", async () => {
    mock.responderPara("/instituicoes", {
      status: 422,
      body: {
        statusCode: 422,
        message: MENSAGEM_422,
        errors: [{ campo: "causaId", mensagem: MENSAGEM_422 }],
      },
    });
    const user = userEvent.setup();
    renderizar();

    // O seletor precisa carregar (pronto) antes de preencher/enviar.
    await screen.findByRole("combobox", { name: /Causa que a instituição defende/ });
    await preencherTudo(user, "Educação");

    // Antes do envio: o GET /causas do montar já ocorreu (1).
    await waitFor(() => expect(chamadasDeCausas().length).toBeGreaterThanOrEqual(1));
    const causasAntes = chamadasDeCausas().length;

    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    // A Mensagem_Causa_Invalida aparece junto ao campo causaId (helperText do
    // seletor), confirmando o tratamento isolado do 422.
    expect(await screen.findByText(MENSAGEM_422)).toBeInTheDocument();

    // O ErrorMessage global (role=alert no topo do formulário) não é acionado
    // para este 422: o único alerta eventualmente presente não carrega a
    // mensagem de causa.
    for (const alerta of screen.queryAllByRole("alert")) {
      expect(alerta).not.toHaveTextContent(MENSAGEM_422);
    }

    // A seleção anterior foi limpa: o combobox não exibe mais "Educação".
    await waitFor(() => {
      const combobox = screen.getByRole("combobox", {
        name: /Causa que a instituição defende/,
      });
      expect(combobox.textContent ?? "").not.toContain("Educação");
    });

    // Um novo GET /causas foi disparado pelo recarregamento pós-422.
    await waitFor(() => {
      expect(chamadasDeCausas().length).toBeGreaterThan(causasAntes);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Teste 2 — recarregamento OK e reenvio (Req 6.3)
  // ──────────────────────────────────────────────────────────────────────

  it("recarregamento OK: pedir nova seleção e liberar o reenvio com o novo causaId (Req 6.3)", async () => {
    mock.responderPara("/instituicoes", {
      status: 422,
      body: {
        statusCode: 422,
        message: MENSAGEM_422,
        errors: [{ campo: "causaId", mensagem: MENSAGEM_422 }],
      },
    });
    const user = userEvent.setup();
    renderizar();

    await screen.findByRole("combobox", { name: /Causa que a instituição defende/ });
    await preencherTudo(user, "Educação");

    // Primeiro envio -> 422 -> limpa causaId e recarrega as causas.
    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));
    expect(await screen.findByText(MENSAGEM_422)).toBeInTheDocument();

    // Após o recarregamento bem-sucedido (mesma resposta de /causas), o usuário
    // precisa escolher outra causa. Esperamos a seleção estar limpa primeiro.
    await waitFor(() => {
      const combobox = screen.getByRole("combobox", {
        name: /Causa que a instituição defende/,
      });
      expect(combobox.textContent ?? "").not.toContain("Educação");
    });

    // A API volta a aceitar o cadastro; o usuário escolhe uma nova causa.
    mock.responderPara("/instituicoes", { status: 201, body: { id: "inst-1" } });
    await selecionarCausa(user, "Meio ambiente");

    // O reenvio é liberado e tem sucesso.
    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));
    expect(await screen.findByText("Cadastro enviado!")).toBeInTheDocument();

    // O POST levou o id da causa recém-selecionada (causa-2).
    const envios = chamadasDeCadastro();
    const ultimo = envios[envios.length - 1];
    expect(ultimo.method).toBe("POST");
    const campos = lerFormData(ultimo.body as FormData);
    expect(campos.causaId).toBe("causa-2");
  });

  // ──────────────────────────────────────────────────────────────────────
  // Teste 3 — recarregamento com falha mantém o envio bloqueado (Req 6.4)
  // ──────────────────────────────────────────────────────────────────────

  it("recarregamento com falha: seletor em erro com 'Tentar novamente' e envio bloqueado (Req 6.4)", async () => {
    mock.responderPara("/instituicoes", {
      status: 422,
      body: {
        statusCode: 422,
        message: MENSAGEM_422,
        errors: [{ campo: "causaId", mensagem: MENSAGEM_422 }],
      },
    });
    const user = userEvent.setup();
    renderizar();

    // Monta e carrega a lista (pronto) para preencher e selecionar.
    await screen.findByRole("combobox", { name: /Causa que a instituição defende/ });
    await preencherTudo(user, "Educação");

    // Logo antes de submeter, troca a resposta de /causas para 500: o GET
    // disparado pelo 422 (recarregamento) vai falhar e levar o seletor a "erro".
    mock.responderPara("/causas", {
      status: 500,
      body: { statusCode: 500, message: "Erro interno" },
    });

    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    // O seletor cai em Estado_Erro: alerta com a ação "Tentar novamente".
    const alerta = await screen.findByRole("alert");
    expect(
      within(alerta).getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();

    // Com o seletor em erro (estadoCausa !== "pronto"), o envio fica bloqueado.
    expect(screen.getByRole("button", { name: "Enviar cadastro" })).toBeDisabled();

    // Nenhum cadastro foi concluído com sucesso.
    expect(screen.queryByText("Cadastro enviado!")).not.toBeInTheDocument();
  });
});
