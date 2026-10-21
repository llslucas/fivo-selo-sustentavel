// Testes de componente do cadastro de instituição (CadastroInstituicaoForm).
//
// Cobrem: validação dos campos obrigatórios antes do envio, envio multipart
// (POST /instituicoes) com tela de sucesso, e erros da API (409 e 503) sem
// perder os dados já preenchidos.

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

let mock: MockFetch;

beforeEach(() => {
  push.mockClear();
  mock = instalarMockFetch();
  mock.responderPara("/causas", {
    status: 200,
    body: [
      { id: "causa-1", nome: "Educação", descricao: "Ensino" },
      { id: "causa-2", nome: "Meio ambiente", descricao: "Natureza" },
    ],
  });
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

async function preencherTudo(user: ReturnType<typeof userEvent.setup>) {
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

  await user.click(screen.getByRole("combobox", { name: /Causa que a instituição defende/ }));
  await user.click(await screen.findByRole("option", { name: "Educação" }));

  await user.upload(
    screen.getByLabelText("Documento de comprovação"),
    new File(["%PDF"], "estatuto.pdf", { type: "application/pdf" }),
  );
}

describe("CadastroInstituicaoForm", () => {
  it("mostra os erros dos campos obrigatórios e não envia o cadastro", async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    expect(await screen.findByText("Anexe o documento de comprovação")).toBeInTheDocument();
    expect(screen.getAllByText("Campo obrigatório").length).toBeGreaterThan(5);
    expect(chamadasDeCadastro()).toHaveLength(0);
  });

  it("recusa documento com formato inválido", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderizar();

    await user.upload(
      screen.getByLabelText("Documento de comprovação"),
      new File(["x"], "nota.txt", { type: "text/plain" }),
    );

    expect(await screen.findByText("O documento deve ser um PDF, JPG ou PNG.")).toBeInTheDocument();
  });

  it("envia o multipart e mostra a tela de sucesso com link para o login", async () => {
    mock.responderPara("/instituicoes", { status: 201, body: { id: "inst-1" } });
    const user = userEvent.setup();
    renderizar();

    await preencherTudo(user);
    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    expect(await screen.findByText("Cadastro enviado!")).toBeInTheDocument();
    expect(screen.getByText(/Aguarde a análise/)).toBeInTheDocument();

    const [chamada] = chamadasDeCadastro();
    expect(chamada.method).toBe("POST");
    expect(chamada.body).toBeInstanceOf(FormData);
    const campos = lerFormData(chamada.body as FormData);
    expect(campos.razaoSocial).toBe("Instituto Esperança Ltda");
    expect(campos.uf).toBe("SP");
    expect(campos.causaId).toBe("causa-1");
    expect((campos.documento as File).name).toBe("estatuto.pdf");
    expect(campos).not.toHaveProperty("logo");
    expect(new Headers(chamada.init.headers).has("Content-Type")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Ir para o login" }));
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("mantém os dados preenchidos quando a API responde 409", async () => {
    mock.responderPara("/instituicoes", {
      status: 409,
      body: { statusCode: 409, message: "CNPJ já cadastrado." },
    });
    const user = userEvent.setup();
    renderizar();

    await preencherTudo(user);
    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    expect(await screen.findByText("CNPJ já cadastrado.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Razão social/)).toHaveValue("Instituto Esperança Ltda");
    expect(screen.getByRole("button", { name: "Enviar cadastro" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
  });

  it("oferece tentar novamente quando o armazenamento está indisponível (503)", async () => {
    mock.responderPara("/instituicoes", {
      status: 503,
      body: { statusCode: 503, message: "Armazenamento indisponível." },
    });
    const user = userEvent.setup();
    renderizar();

    await preencherTudo(user);
    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    const alerta = await screen.findByRole("alert");
    expect(within(alerta).getByText(/indisponível/)).toBeInTheDocument();

    mock.responderPara("/instituicoes", { status: 201, body: { id: "inst-1" } });
    await user.click(within(alerta).getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => expect(screen.getByText("Cadastro enviado!")).toBeInTheDocument());
    expect(chamadasDeCadastro()).toHaveLength(2);
  });
});