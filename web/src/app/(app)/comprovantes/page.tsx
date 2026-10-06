"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

type StatusComprovante = "Aprovado" | "Em análise" | "Reprovado";

interface ComprovanteItem {
  id: string;
  campanha: string;
  dataEnvio: string;
  nomeArquivo: string;
  status: StatusComprovante;
  valor: number;
}

const comprovantesIniciais: ComprovanteItem[] = [
  {
    id: "1",
    campanha: "Reflorestar Serra Verde",
    dataEnvio: "12/09/2026",
    nomeArquivo: "comprovante_01.pdf",
    status: "Aprovado",
    valor: 1200,
  },
  {
    id: "2",
    campanha: "Educação para Todos",
    dataEnvio: "05/09/2026",
    nomeArquivo: "comprovante_02.jpg",
    status: "Em análise",
    valor: 850,
  },
  {
    id: "3",
    campanha: "Água Limpa para Todos",
    dataEnvio: "28/08/2026",
    nomeArquivo: "comprovante_03.png",
    status: "Reprovado",
    valor: 430,
  },
];

const campanhasOpcoes = [
  { id: "c1", nome: "Reflorestar Serra Verde" },
  { id: "c2", nome: "Educação para Todos" },
  { id: "c3", nome: "Água Limpa para Todos" },
  { id: "c4", nome: "Café que alimenta" },
];

export default function ComprovantesPage() {
  const [campanhaSelecionada, setCampanhaSelecionada] = useState("");
  const [valorDoado, setValorDoado] = useState("");
  const [dataDoacao, setDataDoacao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [comprovantes, setComprovantes] = useState<ComprovanteItem[]>(comprovantesIniciais);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivoSelecionado(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campanhaSelecionada || !valorDoado) {
      return;
    }

    const valorNumerico = parseFloat(
      valorDoado.replace(/[^\d,.-]/g, "").replace(",", ".")
    ) || 0;

    const novaCampanhaObj = campanhasOpcoes.find((c) => c.id === campanhaSelecionada);

    const novoItem: ComprovanteItem = {
      id: String(Date.now()),
      campanha: novaCampanhaObj?.nome || "Campanha Fivo",
      dataEnvio: new Date().toLocaleDateString("pt-BR"),
      nomeArquivo: arquivoSelecionado ? arquivoSelecionado.name : "comprovante_anexo.pdf",
      status: "Em análise",
      valor: valorNumerico,
    };

    setComprovantes([novoItem, ...comprovantes]);
    setSucessoMsg("Comprovante enviado com sucesso para validação!");
    setCampanhaSelecionada("");
    setValorDoado("");
    setDataDoacao("");
    setDescricao("");
    setArquivoSelecionado(null);

    setTimeout(() => setSucessoMsg(null), 5000);
  };

  const getStatusColor = (status: StatusComprovante) => {
    switch (status) {
      case "Aprovado":
        return {
          bg: "#E1F5EE",
          text: "#0F6E56",
        };
      case "Em análise":
        return {
          bg: "#FAEEDA",
          text: "#854F0B",
        };
      case "Reprovado":
        return {
          bg: "#FCEBE6",
          text: "#C33924",
        };
    }
  };

  return (
    <Box sx={{ bgcolor: "#F5F4EE", minHeight: "100vh", py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Stack spacing={4}>
          {/* Cabeçalho */}
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5, color: "#1B1B19" }}>
              Comprovantes de Doação
            </Typography>
            <Typography variant="body2" sx={{ color: "#5F5E5A" }}>
              Envie os comprovantes das doações realizadas e acompanhe o status de aprovação.
            </Typography>
          </Box>

          {sucessoMsg && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              {sucessoMsg}
            </Alert>
          )}

          {/* Card de Formulário de Envio */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              bgcolor: "#FFFFFF",
              borderRadius: 3,
              p: { xs: 3, md: 4 },
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <Stack spacing={3}>
              {/* Select Campanha */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "#333333", mb: 0.75, display: "block" }}>
                  Campanha
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={campanhaSelecionada}
                  onChange={(e) => setCampanhaSelecionada(e.target.value)}
                  placeholder="Selecione a campanha"
                  slotProps={{
                    select: {
                      displayEmpty: true,
                      renderValue: (selected: unknown) => {
                        if (!selected) {
                          return <span style={{ color: "#8E8E93" }}>Selecione a campanha</span>;
                        }
                        return campanhasOpcoes.find((c) => c.id === selected)?.nome;
                      },
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "#FFFFFF",
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Selecione a campanha
                  </MenuItem>
                  {campanhasOpcoes.map((opcao) => (
                    <MenuItem key={opcao.id} value={opcao.id}>
                      {opcao.nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Linha Valor doado e Data */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#333333", mb: 0.75, display: "block" }}>
                    Valor doado
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="R$ 0,00"
                    value={valorDoado}
                    onChange={(e) => setValorDoado(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "#FFFFFF",
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#333333", mb: 0.75, display: "block" }}>
                    Data da doação
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="dd/mm/aaaa"
                    value={dataDoacao}
                    onChange={(e) => setDataDoacao(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "#FFFFFF",
                      },
                    }}
                  />
                </Grid>
              </Grid>

              {/* Descrição opcional */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "#333333", mb: 0.75, display: "block" }}>
                  Descrição (opcional)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Detalhes sobre esta doação..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "#FFFFFF",
                    },
                  }}
                />
              </Box>

              {/* Dropzone de upload */}
              <Box
                component="label"
                sx={{
                  border: "1.5px dashed #D1D5DB",
                  borderRadius: 2.5,
                  p: 4,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  bgcolor: "#FAFAFA",
                  transition: "border-color 0.2s, background-color 0.2s",
                  "&:hover": {
                    borderColor: "#0F6E56",
                    bgcolor: "#F4FAF7",
                  },
                }}
              >
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    bgcolor: "#E1F5EE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0F6E56",
                    mb: 1.5,
                  }}
                >
                  <FileUploadOutlinedIcon sx={{ fontSize: 22 }} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#1B1B19", textAlign: "center", mb: 0.5 }}>
                  {arquivoSelecionado ? arquivoSelecionado.name : "Arraste o comprovante aqui ou clique para selecionar"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#71717A" }}>
                  PDF, JPG ou PNG até 10MB
                </Typography>
              </Box>

              {/* Botão de Envio */}
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!campanhaSelecionada || !valorDoado}
                  sx={{
                    bgcolor: "#0F6E56",
                    "&:hover": { bgcolor: "#0B5240" },
                    px: 3,
                    py: 1.25,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Enviar comprovante
                </Button>
              </Box>
            </Stack>
          </Box>

          {/* Seção Comprovantes enviados */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1B1B19", mb: 2 }}>
              Comprovantes enviados
            </Typography>

            <Box
              sx={{
                bgcolor: "#FFFFFF",
                borderRadius: 3,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                overflow: "hidden",
                border: "1px solid #EFEFEF",
              }}
            >
              {comprovantes.map((item, index) => {
                const statusStyle = getStatusColor(item.status);
                const isLast = index === comprovantes.length - 1;

                return (
                  <Box
                    key={item.id}
                    sx={{
                      p: 2.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: isLast ? 0 : "1px solid #F0EFEA",
                      flexWrap: "wrap",
                      gap: 2,
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: "#F4FAF7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#0F6E56",
                          border: "1px solid #E1F5EE",
                          flexShrink: 0,
                        }}
                      >
                        <DescriptionOutlinedIcon fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#1B1B19" }}>
                          Comprovante — {item.campanha}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#8E8E93" }}>
                          Enviado em {item.dataEnvio} · {item.nomeArquivo}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
                      <Chip
                        label={item.status}
                        size="small"
                        sx={{
                          bgcolor: statusStyle.bg,
                          color: statusStyle.text,
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          borderRadius: 1.5,
                          height: 24,
                          "& .MuiChip-label": { px: 1.5 },
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#1B1B19", minWidth: 80, textAlign: "right" }}>
                        {formatCurrency(item.valor)}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
