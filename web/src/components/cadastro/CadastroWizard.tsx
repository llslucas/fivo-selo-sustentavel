"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import InputAdornment from "@mui/material/InputAdornment";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useRouter } from "next/navigation";

export default function CadastroWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form state
  const [razaoSocial, setRazaoSocial] = useState("Café Serra Verde Ltda");
  const [cnpj, setCnpj] = useState("12.345.678/0001-90");
  const [email, setEmail] = useState("contato@serraverde.com.br");
  const [telefone, setTelefone] = useState("(19) 99999-0000");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreviewUrl(url);
  }

  function handleNext() {
    if (step < totalSteps) {
      setStep((s) => s + 1);
    } else {
      router.push("/dashboard");
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.push("/login");
    }
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
          {/* Header do Step */}
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
          </Box>

          {/* Conteúdo da Etapa 1 */}
          {step === 1 && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Razão social"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="CNPJ"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    fullWidth
                    slotProps={{
                      input: {
                        endAdornment: cnpj ? (
                          <InputAdornment position="end">
                            <CheckRoundedIcon sx={{ color: "primary.main", fontSize: 20 }} />
                          </InputAdornment>
                        ) : undefined,
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Telefone"
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}>
                  Logo da empresa
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

          {/* Conteúdo da Etapa 2 */}
          {step === 2 && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField label="Endereço (Rua, Av.)" placeholder="Rua das Flores, 123" fullWidth />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="CEP" placeholder="13870-000" fullWidth />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField label="Cidade" placeholder="São João da Boa Vista" fullWidth />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Estado" placeholder="SP" fullWidth />
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* Conteúdo da Etapa 3 */}
          {step === 3 && (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <CheckCircleRoundedIcon color="primary" sx={{ fontSize: 56, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Tudo pronto para começar!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Sua empresa <strong>{razaoSocial}</strong> foi cadastrada com sucesso.
              </Typography>
            </Box>
          )}

          {/* Botões de Ação */}
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
              sx={{ px: 3, borderRadius: 2 }}
            >
              Voltar
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{ px: 4, borderRadius: 2 }}
            >
              {step === totalSteps ? "Concluir" : "Continuar"}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
