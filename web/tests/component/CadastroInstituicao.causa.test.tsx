// Testes de exemplo de envio e bloqueio do CadastroInstituicaoForm — Task 4.8.
//
// Cobrem os casos de borda da integração do SeletorCausa no formulário:
// - Lista vazia bloqueia o submit (Req 5.3, 5.4): com /causas -> [] o seletor
//   fica em "vazio", o botão "Enviar cadastro" fica desabilitado e um submit
//   direto no <form> não dispara POST /instituicoes.
// - Sucesso + seleção A->B + envio (Req 2.2, 2.3): selecionar uma causa e,
//   depois, outra; o causaId enviado no POST é o da segunda (B substitui A).
// - causaId vazio (Req 2.4): submeter sem causa com a lista pronta exibe
//   "Campo obrigatório", não envia e preserva os demais campos.
// - Id fora da lista (Req 2.5): com um causaId preenchido que não pertence à
//   lista carregada, o envio é bloqueado localmente e a Mensagem_Causa_Invalida
//   é exibida.
//
// Seguem o teste de referência (cadastro-instituicao.test.tsx): mock de
// next/navigation, helper mockFetch (instalarMockFetch/responderPara),
// lerFormData para ler o corpo multipart capturado e um preencherTudo(user)
// que preenche os campos obrigatórios. ThemeProvider real do app envolve o
// componente.
//
// Mecanismo do caso "id fora da lista" (Req 2.5): forçar o valor pelo input
// oculto do MUI Select (fireEvent.change em .MuiSelect-nativeInput) NÃO é
// confiável — verificado empiricamente, o Select controlado ignora o evento e o
// onChange do seletor não dispara (mesmo achado do teste de propriedade da Task
// 4.6, CadastroInstituicao.property-fora-da-lista.test.tsx). No
// CadastroInstituicaoForm real, o único gatilho de recarga da lista (bump de
// recarregarCausas) vive no tratamento do 422, que SEMPRE limpa a seleção
// (patch("causaId", "")) — então, apenas pela UI do formulário, causaId nunca
// permanece preenchido com um id fora da lista. Por isso este exemplo usa o
// MESMO mecanismo robusto da Task 4.6 (corrida de desativação) com o SeletorCausa
// REAL dentro de um harness mínimo que espelha a fiação e o guard exato do
// handleSubmit do formulário: seleciona uma causa da lista L1, recarrega para
// uma lista L2 disjunta SEM limpar a seleção e então aplica o guard ao enviar.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import CadastroInstituicaoForm from "@/components/cadastro/CadastroInstituicaoForm";
import SeletorCausa from "@/components/cadastro/SeletorCausa";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";
import { lerFormData } from "../helpers/formData";

// Preencher o formulário inteiro leva alguns segundos num notebook lento.
vi.setConfig({ testTimeout: 20000 });

// Mensagem_Causa_Invalida — texto exato exibido junto ao campo causaId quando o
// valor não pertence à lista carregada (CadastroInstituicaoForm). Fixado aqui de
// propósito: o teste quebra se o contrato visível mudar.
const MENSAGEM_CAUSA_INVALIDA =
  "A causa selecionada é inválida ou não está mais disponível. Escolha outra.";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/cadastro-instituicao",
  useSearchParams: () => new URLSearchParams(),
}));

// Duas causas para os cenários de seleção/envio; ids e nomes únicos tornam as
// options inequívocas no listbox.
const CAUSAS = [
  { id: "causa-1", nome: "Educação", descricao: "Ensino" },
  { id: "causa-2", nome: "Meio ambiente", descricao: "Natureza" },
];

let mock: MockFetch;

beforeEach(() => {
  push.mockClear();
  mock = instalarMockFetch();
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

// Preenche todos os campos de texto obrigatórios, seleciona uma causa pelo nome
// e anexa o documento PDF. Copiado do teste de referência; `causaNome` permite
// escolher qual causa selecionar (default: /Educação/).
//
// A seleção da causa usa um matcher por regex para o nome da option: cada
// MenuItem renderiza `<ListItemText primary={nome} secondary={descricao} />`,
// então o accessible name da option é a concatenação "nomeDescricao" (ex.:
// "EducaçãoEnsino"). Um regex que casa só o nome localiza a option sem depender
// da descrição concatenada.
async function preencherTudo(
  user: ReturnType<typeof userEvent.setup>,
  causaNome: RegExp = /Educação/,
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

  await user.click(screen.getByRole("combobox", { name: /Causa que a instituição defende/ }));
  await user.click(await screen.findByRole("option", { name: causaNome }));

  // Fecha o listbox antes de prosseguir (o portal do MUI Select some).
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());

  await user.upload(
    screen.getByLabelText("Documento de comprovação"),
    new File(["%PDF"], "estatuto.pdf", { type: "application/pdf" }),
  );
}

describe("CadastroInstituicaoForm — envio e bloqueio (causa)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // 1. Lista vazia bloqueia o submit (Req 5.3, 5.4)
  // ──────────────────────────────────────────────────────────────────────
  it("lista vazia: botão 'Enviar cadastro' desabilitado e submit direto não envia (Req 5.3, 5.4)", async () => {
    mock.responderPara("/causas", { status: 200, body: [] });
    const { container } = renderizar();

    // O seletor entra em "vazio" após a busca bem-sucedida com lista vazia.
    expect(await screen.findByText("Ainda não há causas cadastradas")).toBeInTheDocument();

    // Botão de envio permanece desabilitado enquanto o seletor não está pronto.
    expect(screen.getByRole("button", { name: "Enviar cadastro" })).toBeDisabled();

    // Submete o formulário diretamente (contornando o botão desabilitado) e
    // confirma que nenhum POST /instituicoes foi disparado.
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    // Dá tempo para qualquer efeito assíncrono do submit assentar.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enviar cadastro" })).toBeDisabled();
    });
    expect(chamadasDeCadastro()).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. Sucesso + seleção A->B + envio (Req 2.2, 2.3)
  // ──────────────────────────────────────────────────────────────────────
  it("seleção A depois B: o causaId enviado é o da segunda causa (B substitui A) (Req 2.2, 2.3)", async () => {
    mock.responderPara("/causas", { status: 200, body: CAUSAS });
    mock.responderPara("/instituicoes", { status: 201, body: { id: "inst-1" } });
    const user = userEvent.setup();
    renderizar();

    // Preenche tudo e seleciona A ("Educação").
    await preencherTudo(user, /Educação/);

    // Reabre o seletor e escolhe B ("Meio ambiente"), substituindo A.
    await user.click(screen.getByRole("combobox", { name: /Causa que a instituição defende/ }));
    await user.click(await screen.findByRole("option", { name: /Meio ambiente/ }));
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    expect(await screen.findByText("Cadastro enviado!")).toBeInTheDocument();

    const [chamada] = chamadasDeCadastro();
    expect(chamada.method).toBe("POST");
    expect(chamada.body).toBeInstanceOf(FormData);
    const campos = lerFormData(chamada.body as FormData);
    // O causaId leva o id de B (causa-2), e não o de A (causa-1).
    expect(campos.causaId).toBe("causa-2");
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. causaId vazio (Req 2.4)
  // ──────────────────────────────────────────────────────────────────────
  it("causaId vazio: exibe 'Campo obrigatório', não envia e preserva os demais campos (Req 2.4)", async () => {
    // Lista não vazia: o seletor fica "pronto" (botão habilitado), então o
    // submit roda validar() e sinaliza o causaId vazio como obrigatório.
    mock.responderPara("/causas", { status: 200, body: CAUSAS });
    mock.responderPara("/instituicoes", { status: 201, body: { id: "inst-1" } });
    const user = userEvent.setup();
    renderizar();

    // Aguarda o seletor ficar pronto (combobox habilitado).
    await screen.findByRole("combobox", { name: /Causa que a instituição defende/ });

    // Preenche TODOS os campos de texto obrigatórios, MENOS a causa, e anexa o
    // documento (também obrigatório) para isolar o erro no campo causaId.
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
    await user.upload(
      screen.getByLabelText("Documento de comprovação"),
      new File(["%PDF"], "estatuto.pdf", { type: "application/pdf" }),
    );

    await user.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    // Pelo menos um "Campo obrigatório" aparece (o do causaId sem seleção).
    expect((await screen.findAllByText("Campo obrigatório")).length).toBeGreaterThan(0);
    // Nenhum POST de cadastro foi disparado.
    expect(chamadasDeCadastro()).toHaveLength(0);
    // Os demais campos preenchidos permanecem (ex.: Razão social).
    expect(screen.getByLabelText(/Razão social/)).toHaveValue("Instituto Esperança Ltda");
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. Id fora da lista (Req 2.5) — corrida de desativação (mecanismo da Task 4.6)
  // ──────────────────────────────────────────────────────────────────────
  it("id fora da lista: envio bloqueado e Mensagem_Causa_Invalida exibida (Req 2.5)", async () => {
    // L1: lista inicial com a causa escolhida. L2: lista disjunta (a causa foi
    // desativada durante o preenchimento) — não contém o id selecionado.
    const L1 = [{ id: "L1-educacao", nome: "Educação", descricao: "Ensino" }];
    const L2 = [{ id: "L2-saude", nome: "Saúde", descricao: "Atendimento" }];

    mock.responderPara("/causas", { status: 200, body: L1 });
    const onEnviar = vi.fn();

    const { rerender } = render(
      <HarnessCausa causaIdInicial="" recarregarChave={0} onEnviar={onEnviar} />,
    );

    // Aguarda a carga de L1 concluir: o marcador reflete os ids reportados pelo
    // SeletorCausa real via onCausasChange somente no estado "pronto".
    const idsL1 = L1.map((c) => c.id).join(",");
    await waitFor(() => expect(screen.getByTestId("causas-ids").textContent).toBe(idsL1));

    // Seleciona a causa da lista L1 pela interação real do MUI Select.
    const combobox = screen.getByRole("combobox", {
      name: /Causa que a instituição defende/,
    });
    fireEvent.mouseDown(combobox);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getAllByRole("option")[0]);
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());

    // Corrida de desativação: re-mocka /causas para L2 e recarrega o seletor
    // (bump de recarregarChave) SEM limpar a seleção. O causaId permanece
    // "L1-educacao", agora ausente da lista carregada (L2).
    mock.responderPara("/causas", { status: 200, body: L2 });
    rerender(<HarnessCausa causaIdInicial="" recarregarChave={1} onEnviar={onEnviar} />);
    const idsL2 = L2.map((c) => c.id).join(",");
    await waitFor(() => expect(screen.getByTestId("causas-ids").textContent).toBe(idsL2));

    // Envia: o guard do Req 2.5 bloqueia (causaId fora de L2).
    fireEvent.click(screen.getByRole("button", { name: "Enviar cadastro" }));

    // criarInstituicao (representado por onEnviar) NÃO é chamado...
    expect(onEnviar).not.toHaveBeenCalled();
    // ...e a Mensagem_Causa_Invalida aparece junto ao campo.
    expect(await screen.findByText(MENSAGEM_CAUSA_INVALIDA)).toBeInTheDocument();
  });
});

// Harness mínimo que espelha a fiação do CadastroInstituicaoForm em torno do
// SeletorCausa REAL e aplica o MESMO guard do handleSubmit (Req 2.5): guarda
// causaId (como data.causaId) e causasIds (reportado por onCausasChange); o
// botão "Enviar cadastro" bloqueia o envio e exibe a Mensagem_Causa_Invalida
// quando o causaId não pertence à última lista carregada. Só o gatilho de
// recarga (recarregarChave) e o envio são dirigidos pelo teste — a seleção, a
// carga da lista e o reporte de causasIds são todos do componente real.
function HarnessCausa({
  causaIdInicial,
  recarregarChave,
  onEnviar,
}: {
  causaIdInicial: string;
  recarregarChave: number;
  onEnviar: (causaId: string) => void;
}) {
  const [causaId, setCausaId] = useState<string>(causaIdInicial);
  const [causasIds, setCausasIds] = useState<string[]>([]);
  const [erroCausa, setErroCausa] = useState<string | undefined>(undefined);

  function handleEnviar() {
    // Guard idêntico ao de CadastroInstituicaoForm.handleSubmit (Req 2.5).
    if (causaId && !causasIds.includes(causaId)) {
      setErroCausa(MENSAGEM_CAUSA_INVALIDA);
      return;
    }
    onEnviar(causaId);
  }

  return (
    <ThemeProvider theme={theme}>
      <SeletorCausa
        label="Causa que a instituição defende"
        value={causaId}
        onChange={(id) => {
          setCausaId(id);
          setErroCausa(undefined);
        }}
        error={erroCausa}
        recarregarChave={recarregarChave}
        onCausasChange={setCausasIds}
      />
      <button type="button" onClick={handleEnviar}>
        Enviar cadastro
      </button>
      {/* Marcador determinístico dos ids reportados via onCausasChange, usado
          para aguardar a recarga (L1 -> L2) de forma estável antes de enviar. */}
      <output data-testid="causas-ids">{causasIds.join(",")}</output>
    </ThemeProvider>
  );
}
