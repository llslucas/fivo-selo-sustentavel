"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { useRouter } from "next/navigation";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SeletorCausa from "@/components/cadastro/SeletorCausa";
import { ApiError, ehErroRecuperavel, mensagemDeErro } from "@/services/api";
import { criarInstituicao } from "@/services/cadastroInstituicao";
import { formatarCep, formatarCnpj, formatarTelefone } from "@/lib/mascaras";
import { useBuscaCep } from "@/hooks/useBuscaCep";
import { validarDocumento, validarLogo } from "@/lib/arquivos";
import { APP_ROUTES } from "@/lib/routes";

type FormState = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  telefone: string;
  contato: string;
  site: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  causaId: string;
  descricao: string;
  descricaoDocumento: string;
};

const ESTADO_INICIAL: FormState = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  email: "",
  senha: "",
  confirmarSenha: "",
  telefone: "",
  contato: "",
  site: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  causaId: "",
  descricao: "",
  descricaoDocumento: "",
};

const CAMPOS_OBRIGATORIOS: (keyof FormState)[] = [
  "razaoSocial",
  "nomeFantasia",
  "cnpj",
  "telefone",
  "email",
  "contato",
  "site",
  "cep",
  "logradouro",
  "numero",
  "bairro",
  "cidade",
  "causaId",
  "descricao",
];

// Label com asterisco vermelho pra marcar campo obrigatório.
// O asterisco é apenas visual; o texto "(obrigatório)" fica oculto para
// leitores de tela anunciarem o estado programaticamente.
function Obrigatorio({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}{" "}
      <Box component="span" aria-hidden="true" sx={{ color: "error.main" }}>
        *
      </Box>
      <Box component="span" className="visually-hidden">
        (obrigatório)
      </Box>
    </>
  );
}

type CampoArquivoProps = {
  titulo: React.ReactNode;
  rotulo: string;
  dica: string;
  accept: string;
  arquivo: File | null;
  erro?: string;
  onChange: (arquivo: File | undefined) => void;
};

function CampoArquivo({ titulo, rotulo, dica, accept, arquivo, erro, onChange }: CampoArquivoProps) {
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {titulo}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        {dica}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Button
          component="label"
          variant="outlined"
          color="inherit"
          startIcon={<UploadFileRoundedIcon />}
          sx={{ borderRadius: 2 }}
        >
          {arquivo ? "Trocar arquivo" : "Escolher arquivo"}
          <input
            type="file"
            accept={accept}
            hidden
            aria-label={rotulo}
            onChange={(e) => {
              onChange(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
          {arquivo ? arquivo.name : "Nenhum arquivo selecionado"}
        </Typography>
      </Stack>
      {erro && (
        <Typography variant="caption" color="error" role="alert" sx={{ display: "block", mt: 0.5 }}>
          {erro}
        </Typography>
      )}
    </Box>
  );
}

export default function CadastroInstituicaoForm() {
  const router = useRouter();

  const [data, setData] = useState<FormState>(ESTADO_INICIAL);
  const [documento, setDocumento] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [podeTentarDeNovo, setPodeTentarDeNovo] = useState(false);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [concluido, setConcluido] = useState(false);

  function patch(campo: keyof FormState, valor: string) {
    setData((prev) => ({ ...prev, [campo]: valor }));
  }

  const buscaCep = useBuscaCep((endereco) => {
    setData((prev) => ({
      ...prev,
      logradouro: endereco.logradouro || prev.logradouro,
      bairro: endereco.bairro || prev.bairro,
      cidade: endereco.cidade || prev.cidade,
      uf: endereco.uf || prev.uf,
    }));
  });

  function limparErroCampo(campo: string) {
    setErrosCampo((prev) => {
      const resto = { ...prev };
      delete resto[campo];
      return resto;
    });
  }

  function handleDocumento(arquivo: File | undefined) {
    if (!arquivo) return;
    const mensagem = validarDocumento(arquivo);
    if (mensagem) {
      setDocumento(null);
      setErrosCampo((prev) => ({ ...prev, documento: mensagem }));
      return;
    }
    setDocumento(arquivo);
    limparErroCampo("documento");
  }

  async function handleLogo(arquivo: File | undefined) {
    if (!arquivo) return;
    const mensagem = await validarLogo(arquivo);
    if (mensagem) {
      setLogo(null);
      setErrosCampo((prev) => ({ ...prev, logo: mensagem }));
      return;
    }
    setLogo(arquivo);
    limparErroCampo("logo");
  }

  function validar(): Record<string, string> {
    const erros: Record<string, string> = {};
    for (const campo of CAMPOS_OBRIGATORIOS) {
      if (!data[campo].trim()) erros[campo] = "Campo obrigatório";
    }
    if (!data.senha) erros.senha = "Campo obrigatório";
    else if (data.senha.length < 10) erros.senha = "Mínimo de 10 caracteres";
    if (!data.confirmarSenha) erros.confirmarSenha = "Campo obrigatório";
    else if (data.confirmarSenha !== data.senha) erros.confirmarSenha = "As senhas não conferem";
    if (!data.uf.trim()) erros.uf = "Campo obrigatório";
    else if (data.uf.trim().length !== 2) erros.uf = "UF deve ter 2 letras";
    if (!documento) erros.documento = "Anexe o documento de comprovação";
    if (errosCampo.logo) erros.logo = errosCampo.logo;
    return erros;
  }

  async function enviar() {
    if (!documento) return;
    setLoading(true);
    setErro(null);
    setPodeTentarDeNovo(false);
    setErrosCampo({});
    try {
      await criarInstituicao({
        razaoSocial: data.razaoSocial.trim(),
        nomeFantasia: data.nomeFantasia.trim(),
        cnpj: data.cnpj.trim(),
        email: data.email.trim(),
        senha: data.senha,
        telefone: data.telefone.trim(),
        contato: data.contato.trim(),
        site: data.site.trim(),
        cep: data.cep.trim(),
        logradouro: data.logradouro.trim(),
        numero: data.numero.trim(),
        complemento: data.complemento.trim() || undefined,
        bairro: data.bairro.trim(),
        cidade: data.cidade.trim(),
        uf: data.uf.trim().toUpperCase(),
        causaId: data.causaId,
        descricao: data.descricao.trim(),
        documento,
        descricaoDocumento: data.descricaoDocumento.trim() || undefined,
        logo,
      });
      setConcluido(true);
    } catch (e) {
      setErro(mensagemDeErro(e));
      setPodeTentarDeNovo(ehErroRecuperavel(e));
      if (e instanceof ApiError) setErrosCampo(e.fieldErrors);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const erros = validar();
    setErrosCampo(erros);
    if (Object.keys(erros).length > 0) return;
    await enviar();
  }

  if (concluido) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#EFEFEF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: { xs: 4, md: 8 },
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Box
            role="status"
            aria-live="polite"
            sx={{
              bgcolor: "background.default",
              borderRadius: 3,
              p: { xs: 3, sm: 5 },
              boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
              textAlign: "center",
            }}
          >
            <CheckCircleRoundedIcon color="primary" sx={{ fontSize: 56, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Cadastro enviado!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              O cadastro da <strong>{data.razaoSocial}</strong> foi recebido. Aguarde a análise
              da equipe da Fivo: você recebe um aviso por e-mail assim que o cadastro for
              aprovado — só então dá pra entrar na plataforma.
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push(APP_ROUTES.public.login)}
              sx={{ px: 4, borderRadius: 2 }}
            >
              Ir para o login
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }
    return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#EFEFEF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 4, md: 8 },
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Box
          component="form"
          noValidate
          onSubmit={(e) => void handleSubmit(e)}
          sx={{
            bgcolor: "background.default",
            borderRadius: 3,
            p: { xs: 3, sm: 5 },
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Chip
              label="Instituição"
              size="small"
              sx={{
                bgcolor: "primary.light",
                color: "primary.main",
                fontWeight: 600,
                mb: 1.5,
              }}
            />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Cadastro da instituição
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Informe os dados da sua instituição e anexe um documento que comprove o cadastro.
              A equipe da Fivo analisa antes de liberar o acesso.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Campos marcados com <Box component="span" sx={{ color: "error.main" }}>*</Box> são obrigatórios.
            </Typography>
          </Box>

          {erro && (
            <ErrorMessage
              mensagem={erro}
              onRetry={podeTentarDeNovo ? () => void enviar() : undefined}
              sx={{ mb: 3 }}
            />
          )}

          <Stack spacing={3}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              Dados da instituição
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={<Obrigatorio>Razão social</Obrigatorio>}
                  value={data.razaoSocial}
                  onChange={(e) => patch("razaoSocial", e.target.value)}
                  error={Boolean(errosCampo.razaoSocial)}
                  helperText={errosCampo.razaoSocial}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={<Obrigatorio>Nome fantasia</Obrigatorio>}
                  value={data.nomeFantasia}
                  onChange={(e) => patch("nomeFantasia", e.target.value)}
                  error={Boolean(errosCampo.nomeFantasia)}
                  helperText={errosCampo.nomeFantasia}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={<Obrigatorio>CNPJ</Obrigatorio>}
                  placeholder="00.000.000/0000-00"
                  value={data.cnpj}
                  onChange={(e) => patch("cnpj", formatarCnpj(e.target.value))}
                  error={Boolean(errosCampo.cnpj)}
                  helperText={errosCampo.cnpj}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={<Obrigatorio>Telefone</Obrigatorio>}
                  placeholder="(19) 99999-0000"
                  value={data.telefone}
                  onChange={(e) => patch("telefone", formatarTelefone(e.target.value))}
                  error={Boolean(errosCampo.telefone)}
                  helperText={errosCampo.telefone}
                  slotProps={{ htmlInput: { maxLength: 15 } }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={<Obrigatorio>E-mail</Obrigatorio>}
                  type="email"
                  value={data.email}
                  onChange={(e) => patch("email", e.target.value)}
                  error={Boolean(errosCampo.email)}
                  helperText={errosCampo.email}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={<Obrigatorio>Pessoa de contato</Obrigatorio>}
                  value={data.contato}
                  onChange={(e) => patch("contato", e.target.value)}
                  error={Boolean(errosCampo.contato)}
                  helperText={errosCampo.contato}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={<Obrigatorio>Site</Obrigatorio>}
                  placeholder="https://www.suainstituicao.org.br"
                  value={data.site}
                  onChange={(e) => patch("site", e.target.value)}
                  error={Boolean(errosCampo.site)}
                  helperText={errosCampo.site}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={<Obrigatorio>Senha</Obrigatorio>}
                  type={mostrarSenha ? "text" : "password"}
                  value={data.senha}
                  onChange={(e) => patch("senha", e.target.value)}
                  error={Boolean(errosCampo.senha)}
                  helperText={errosCampo.senha ?? "Mínimo de 10 caracteres"}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                            onClick={() => setMostrarSenha((v) => !v)}
                            edge="end"
                          >
                            {mostrarSenha ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={<Obrigatorio>Confirmar senha</Obrigatorio>}
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  value={data.confirmarSenha}
                  onChange={(e) => patch("confirmarSenha", e.target.value)}
                  error={Boolean(errosCampo.confirmarSenha)}
                  helperText={errosCampo.confirmarSenha}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              mostrarConfirmarSenha ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"
                            }
                            onClick={() => setMostrarConfirmarSenha((v) => !v)}
                            edge="end"
                          >
                            {mostrarConfirmarSenha ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              Endereço
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label={<Obrigatorio>CEP</Obrigatorio>}
                  placeholder="13870-000"
                  value={data.cep}
                  onChange={(e) => {
                    const formatado = formatarCep(e.target.value);
                    patch("cep", formatado);
                    if (formatado.replace(/\D/g, "").length === 8) {
                      void buscaCep.buscar(formatado);
                    }
                  }}
                  onBlur={() => void buscaCep.buscar(data.cep)}
                  error={Boolean(errosCampo.cep) || Boolean(buscaCep.erro)}
                  helperText={errosCampo.cep || buscaCep.erro}
                  slotProps={{
                    input: {
                      endAdornment: buscaCep.buscando ? (
                        <InputAdornment position="end">
                          <CircularProgress size={18} />
                        </InputAdornment>
                      ) : undefined,
                    },
                  }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label={<Obrigatorio>Endereço (Rua, Av.)</Obrigatorio>}
                  value={data.logradouro}
                  onChange={(e) => patch("logradouro", e.target.value)}
                  error={Boolean(errosCampo.logradouro)}
                  helperText={errosCampo.logradouro}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label={<Obrigatorio>Número</Obrigatorio>}
                  value={data.numero}
                  onChange={(e) => patch("numero", e.target.value)}
                  error={Boolean(errosCampo.numero)}
                  helperText={errosCampo.numero}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Complemento"
                  value={data.complemento}
                  onChange={(e) => patch("complemento", e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label={<Obrigatorio>Bairro</Obrigatorio>}
                  value={data.bairro}
                  onChange={(e) => patch("bairro", e.target.value)}
                  error={Boolean(errosCampo.bairro)}
                  helperText={errosCampo.bairro}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label={<Obrigatorio>Cidade</Obrigatorio>}
                  value={data.cidade}
                  onChange={(e) => patch("cidade", e.target.value)}
                  error={Boolean(errosCampo.cidade)}
                  helperText={errosCampo.cidade}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  label={<Obrigatorio>UF</Obrigatorio>}
                  placeholder="SP"
                  value={data.uf}
                  onChange={(e) => patch("uf", e.target.value.toUpperCase())}
                  error={Boolean(errosCampo.uf)}
                  helperText={errosCampo.uf}
                  slotProps={{ htmlInput: { maxLength: 2 } }}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              Causa e apresentação
            </Typography>
            <SeletorCausa
              label={<Obrigatorio>Causa que a instituição defende</Obrigatorio>}
              value={data.causaId}
              onChange={(causaId) => patch("causaId", causaId)}
              error={errosCampo.causaId}
            />
            <TextField
              label={<Obrigatorio>Descrição da instituição</Obrigatorio>}
              placeholder="Conte o que a instituição faz e quem ela atende."
              value={data.descricao}
              onChange={(e) => patch("descricao", e.target.value)}
              error={Boolean(errosCampo.descricao)}
              helperText={errosCampo.descricao}
              multiline
              minRows={3}
              fullWidth
            />

            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              Documentos
            </Typography>
            <CampoArquivo
              titulo={<Obrigatorio>Documento de comprovação</Obrigatorio>}
              rotulo="Documento de comprovação"
              dica="PDF, JPG ou PNG, até 10 MB."
              accept="application/pdf,image/jpeg,image/png"
              arquivo={documento}
              erro={errosCampo.documento}
              onChange={handleDocumento}
            />
            <TextField
              label="Descrição do documento"
              placeholder="Ex.: Estatuto social registrado em cartório"
              value={data.descricaoDocumento}
              onChange={(e) => patch("descricaoDocumento", e.target.value)}
              fullWidth
            />
            <CampoArquivo
              titulo="Logo da instituição (opcional)"
              rotulo="Logo da instituição"
              dica="PNG, JPG ou SVG, até 5 MB. PNG e JPG com pelo menos 512×512 pixels."
              accept="image/png,image/jpeg,image/svg+xml"
              arquivo={logo}
              erro={errosCampo.logo}
              onChange={(arquivo) => void handleLogo(arquivo)}
            />
          </Stack>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
              mt: 4,
              pt: 2,
            }}
          >
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => router.push(APP_ROUTES.public.login)}
              disabled={loading}
              sx={{ px: 3, borderRadius: 2 }}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ px: 4, borderRadius: 2, minWidth: 120 }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Enviar cadastro"}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}