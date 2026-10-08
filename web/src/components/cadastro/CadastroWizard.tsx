"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { useRouter } from "next/navigation";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { ApiError, criarEmpresa, mensagemDeErro } from "@/lib/api";
import { formatarCnpj, formatarTelefone } from "@/lib/mascaras";
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
};

const CAMPOS_ETAPA_1 = ["razaoSocial", "nomeFantasia", "cnpj", "telefone", "email", "senha", "contato", "site"];
const CAMPOS_ETAPA_2 = ["cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"];

// Label com asterisco vermelho pra marcar campo obrigatório.
function Obrigatorio({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children} <Box component="span" sx={{ color: "error.main" }}>*</Box>
    </>
  );
}

export default function CadastroWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [data, setData] = useState<FormState>(ESTADO_INICIAL);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [concluido, setConcluido] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  function patch(campo: keyof FormState, valor: string) {
    setData((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreviewUrl(url);
  }

  // Valida a etapa 1 e devolve as mensagens de erro por campo (vazio se tudo ok).
  function validarEtapa1(): Record<string, string> {
    const erros: Record<string, string> = {};
    if (!data.razaoSocial.trim()) erros.razaoSocial = "Campo obrigatório";
    if (!data.nomeFantasia.trim()) erros.nomeFantasia = "Campo obrigatório";
    if (!data.cnpj.trim()) erros.cnpj = "Campo obrigatório";
    if (!data.telefone.trim()) erros.telefone = "Campo obrigatório";
    if (!data.email.trim()) erros.email = "Campo obrigatório";
    if (!data.contato.trim()) erros.contato = "Campo obrigatório";
    if (!data.senha) erros.senha = "Campo obrigatório";
    else if (data.senha.length < 10) erros.senha = "Mínimo de 10 caracteres";
    if (!data.confirmarSenha) erros.confirmarSenha = "Campo obrigatório";
    else if (data.confirmarSenha !== data.senha) erros.confirmarSenha = "As senhas não conferem";
    return erros;
  }

  // Valida a etapa 2 e devolve as mensagens de erro por campo.
  function validarEtapa2(): Record<string, string> {
    const erros: Record<string, string> = {};
    if (!data.cep.trim()) erros.cep = "Campo obrigatório";
    if (!data.logradouro.trim()) erros.logradouro = "Campo obrigatório";
    if (!data.numero.trim()) erros.numero = "Campo obrigatório";
    if (!data.bairro.trim()) erros.bairro = "Campo obrigatório";
    if (!data.cidade.trim()) erros.cidade = "Campo obrigatório";
    if (!data.uf.trim()) erros.uf = "Campo obrigatório";
    else if (data.uf.trim().length !== 2) erros.uf = "UF deve ter 2 letras";
    return erros;
  }

  const senhaValida = data.senha.trim().length >= 10;
  const senhasConferem = data.senha.length > 0 && data.senha === data.confirmarSenha;

  const etapa1Completa = Boolean(
    data.razaoSocial.trim() &&
      data.nomeFantasia.trim() &&
      data.cnpj.trim() &&
      data.telefone.trim() &&
      data.email.trim() &&
      data.contato.trim() &&
      senhaValida &&
      senhasConferem,
  );

  const etapa2Completa = Boolean(
    data.cep.trim() &&
      data.logradouro.trim() &&
      data.numero.trim() &&
      data.bairro.trim() &&
      data.cidade.trim() &&
      data.uf.trim().length === 2,
  );

  // Trava o "Continuar" enquanto a etapa atual não estiver toda preenchida.
  const podeAvancar = step === 1 ? etapa1Completa : step === 2 ? etapa2Completa : true;

  function handleBack() {
    setErro(null);
    setErrosCampo({});
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.push(APP_ROUTES.public.login);
    }
  }

  async function handleNext() {
    setErro(null);

    if (step === 1) {
      const erros = validarEtapa1();
      setErrosCampo(erros);
      if (Object.keys(erros).length > 0) return;
    }

    if (step === 2) {
      const erros = validarEtapa2();
      setErrosCampo(erros);
      if (Object.keys(erros).length > 0) return;
    }

    if (step < totalSteps) {
      setErrosCampo({});
      setStep((s) => s + 1);
      return;
    }

    await handleSubmit();
  }

  async function handleSubmit() {
    setLoading(true);
    setErro(null);
    setErrosCampo({});
    try {
      await criarEmpresa({
        razaoSocial: data.razaoSocial.trim(),
        nomeFantasia: data.nomeFantasia.trim(),
        cnpj: data.cnpj.trim(),
        email: data.email.trim(),
        senha: data.senha,
        telefone: data.telefone.trim(),
        contato: data.contato.trim(),
        site: data.site.trim() || undefined,
        cep: data.cep.trim(),
        logradouro: data.logradouro.trim(),
        numero: data.numero.trim(),
        complemento: data.complemento.trim() || undefined,
        bairro: data.bairro.trim(),
        cidade: data.cidade.trim(),
        uf: data.uf.trim().toUpperCase(),
        logo: logoFile,
      });
      setConcluido(true);
    } catch (e) {
      setErro(mensagemDeErro(e));
      if (e instanceof ApiError) {
        setErrosCampo(e.fieldErrors);
        // Volta pra etapa onde o campo com erro está, pra pessoa conseguir corrigir.
        const camposComErro = Object.keys(e.fieldErrors);
        if (camposComErro.some((c) => CAMPOS_ETAPA_1.includes(c))) {
          setStep(1);
        } else if (camposComErro.some((c) => CAMPOS_ETAPA_2.includes(c))) {
          setStep(2);
        }
      }
    } finally {
      setLoading(false);
    }
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
              A conta da <strong>{data.razaoSocial}</strong> foi criada e está{" "}
              <strong>pendente de aprovação</strong>. Você recebe um aviso por
              e-mail assim que o time da Fivo aprovar o cadastro — só então dá
              pra entrar na plataforma.
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
          sx={{
            bgcolor: "background.default",
            borderRadius: 3,
            p: { xs: 3, sm: 5 },
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Chip
              label={`Etapa ${step} de ${totalSteps}`}
              size="small"
              sx={{
                bgcolor: "primary.light",
                color: "primary.main",
                fontWeight: 600,
                mb: 1.5,
              }}
            />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
              {step === 1 && "Dados da empresa"}
              {step === 2 && "Endereço e Localização"}
              {step === 3 && "Revisão e Confirmação"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {step === 1 && "Essas informações aparecem na página pública das suas campanhas."}
              {step === 2 && "Informe o endereço sede da sua empresa."}
              {step === 3 && "Verifique os dados antes de finalizar seu cadastro."}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={(step / totalSteps) * 100}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: "divider",
                "& .MuiLinearProgress-bar": { borderRadius: 2 },
              }}
            />

            {step < 3 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                Campos marcados com <Box component="span" sx={{ color: "error.main" }}>*</Box> são obrigatórios.
              </Typography>
            )}
          </Box>

          {erro && <ErrorMessage mensagem={erro} sx={{ mb: 3 }} />}

          {step === 1 && (
            <Stack spacing={3}>
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
              </Grid>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label={<Obrigatorio>CNPJ</Obrigatorio>}
                    placeholder="12.345.678/0001-90"
                    value={data.cnpj}
                    onChange={(e) => patch("cnpj", formatarCnpj(e.target.value))}
                    error={Boolean(errosCampo.cnpj)}
                    helperText={errosCampo.cnpj}
                    fullWidth
                    slotProps={{
                      htmlInput: { inputMode: "numeric", maxLength: 18 },
                      input: {
                        endAdornment: data.cnpj && !errosCampo.cnpj ? (
                          <InputAdornment position="end">
                            <CheckRoundedIcon sx={{ color: "primary.main", fontSize: 20 }} />
                          </InputAdornment>
                        ) : undefined,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label={<Obrigatorio>Telefone</Obrigatorio>}
                    type="tel"
                    placeholder="(19) 99999-0000"
                    value={data.telefone}
                    onChange={(e) => patch("telefone", formatarTelefone(e.target.value))}
                    error={Boolean(errosCampo.telefone)}
                    helperText={errosCampo.telefone}
                    fullWidth
                    slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 15 } }}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
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
                    label={<Obrigatorio>Nome do responsável</Obrigatorio>}
                    placeholder="Quem vamos contatar por lá"
                    value={data.contato}
                    onChange={(e) => patch("contato", e.target.value)}
                    error={Boolean(errosCampo.contato)}
                    helperText={errosCampo.contato}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label={<Obrigatorio>Senha</Obrigatorio>}
                    type={mostrarSenha ? "text" : "password"}
                    value={data.senha}
                    onChange={(e) => patch("senha", e.target.value)}
                    error={Boolean(errosCampo.senha) || (data.senha.length > 0 && !senhaValida)}
                    helperText={errosCampo.senha ?? "Mínimo de 10 caracteres"}
                    fullWidth
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setMostrarSenha((v) => !v)}
                              edge="end"
                              size="small"
                              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {mostrarSenha ? (
                                <VisibilityOffRoundedIcon fontSize="small" />
                              ) : (
                                <VisibilityRoundedIcon fontSize="small" />
                              )}
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
                    error={Boolean(errosCampo.confirmarSenha) || (data.confirmarSenha.length > 0 && !senhasConferem)}
                    helperText={
                      errosCampo.confirmarSenha ??
                      (data.confirmarSenha.length > 0 && !senhasConferem ? "As senhas não conferem" : undefined)
                    }
                    fullWidth
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setMostrarConfirmarSenha((v) => !v)}
                              edge="end"
                              size="small"
                              aria-label={mostrarConfirmarSenha ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {mostrarConfirmarSenha ? (
                                <VisibilityOffRoundedIcon fontSize="small" />
                              ) : (
                                <VisibilityRoundedIcon fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Site (opcional)"
                placeholder="https://suaempresa.com.br"
                value={data.site}
                onChange={(e) => patch("site", e.target.value)}
                error={Boolean(errosCampo.site)}
                helperText={errosCampo.site}
                fullWidth
              />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}>
                  Logo da empresa (opcional)
                </Typography>
                <Box
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                  sx={{
                    border: "1px dashed",
                    borderColor: dragOver ? "primary.main" : "divider",
                    bgcolor: dragOver ? "primary.light" : "background.paper",
                    borderRadius: 2,
                    py: 4,
                    px: 3,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease, background-color 0.15s ease",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/svg+xml"
                    hidden
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  {logoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreviewUrl}
                      alt="Logo da empresa"
                      style={{ maxHeight: 70, maxWidth: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <>
                      <ImageRoundedIcon sx={{ color: "text.secondary", mb: 1, fontSize: 32 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {logoFile ? logoFile.name : "Arraste o arquivo ou clique para enviar"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        PNG ou SVG, fundo transparente
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label={<Obrigatorio>CEP</Obrigatorio>}
                    placeholder="13870-000"
                    value={data.cep}
                    onChange={(e) => patch("cep", e.target.value)}
                    error={Boolean(errosCampo.cep)}
                    helperText={errosCampo.cep}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    label={<Obrigatorio>Endereço (Rua, Av.)</Obrigatorio>}
                    placeholder="Rua das Flores"
                    value={data.logradouro}
                    onChange={(e) => patch("logradouro", e.target.value)}
                    error={Boolean(errosCampo.logradouro)}
                    helperText={errosCampo.logradouro}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    label={<Obrigatorio>Número</Obrigatorio>}
                    value={data.numero}
                    onChange={(e) => patch("numero", e.target.value)}
                    error={Boolean(errosCampo.numero)}
                    helperText={errosCampo.numero}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 9 }}>
                  <TextField
                    label="Complemento (opcional)"
                    placeholder="Sala 12, bloco B..."
                    value={data.complemento}
                    onChange={(e) => patch("complemento", e.target.value)}
                    error={Boolean(errosCampo.complemento)}
                    helperText={errosCampo.complemento}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
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
                    placeholder="São João da Boa Vista"
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
            </Stack>
          )}

          {step === 3 && (
            <Stack spacing={1.5}>
              <ResumoLinha label="Razão social" valor={data.razaoSocial} />
              <ResumoLinha label="Nome fantasia" valor={data.nomeFantasia} />
              <ResumoLinha label="CNPJ" valor={data.cnpj} />
              <ResumoLinha label="E-mail" valor={data.email} />
              <ResumoLinha label="Telefone" valor={data.telefone} />
              <ResumoLinha label="Responsável" valor={data.contato} />
              <ResumoLinha
                label="Endereço"
                valor={`${data.logradouro}, ${data.numero}${data.complemento ? ` - ${data.complemento}` : ""} - ${data.bairro}, ${data.cidade}/${data.uf} - ${data.cep}`}
              />
            </Stack>
          )}

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
              onClick={handleBack}
              disabled={loading}
              sx={{ px: 3, borderRadius: 2 }}
            >
              Voltar
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleNext()}
              disabled={loading || !podeAvancar}
              sx={{ px: 4, borderRadius: 2, minWidth: 120 }}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "#fff" }} />
              ) : step === totalSteps ? (
                "Concluir"
              ) : (
                "Continuar"
              )}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

function ResumoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        py: 1.25,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>
        {valor || "—"}
      </Typography>
    </Box>
  );
}
