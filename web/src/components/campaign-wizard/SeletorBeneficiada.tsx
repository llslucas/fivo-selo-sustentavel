"use client";

// Componente apresentacional do catálogo de beneficiadas. Renderiza o campo de
// busca e os quatro estados visuais (carregando/erro/vazio/carregado) a partir
// das props, delegando a seleção e a nova tentativa aos callbacks do pai. Não
// mantém estado próprio de dados: todo o estado vem do hook `useBeneficiadas`.
// Suporta dois layouts via `variante`: "lista" (pilha vertical, como em
// StepCausaRegra) e "cards" (grade de cards com avatar, como em
// StepSobreCampanha).

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { Theme } from "@mui/material/styles";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import type { Beneficiada } from "@/services/instituicoes";
import type { EstadoBeneficiadas } from "./hooks/useBeneficiadas";

export type SeletorBeneficiadaProps = {
  beneficiadas: Beneficiada[];
  estado: EstadoBeneficiadas;
  termoBusca: string;
  mensagemErro: string;
  podeTentarNovamente: boolean;
  selecionadaId: string | null; // = data.instituicaoId
  onBuscar: (termo: string) => void; // = definirTermoBusca
  onTentarNovamente: () => void; // = tentarNovamente
  onSelecionar: (id: string) => void; // chama onChange({ instituicaoId: id })
  variante?: "lista" | "cards"; // layout: StepCausaRegra vs StepSobreCampanha
};

// Texto exato do Estado_Vazio do catálogo (Requisito 2.3).
const MENSAGEM_VAZIO_CATALOGO = "Nenhuma instituição disponível no momento";

export default function SeletorBeneficiada({
  beneficiadas,
  estado,
  termoBusca,
  mensagemErro,
  podeTentarNovamente,
  selecionadaId,
  onBuscar,
  onTentarNovamente,
  onSelecionar,
  variante = "lista",
}: SeletorBeneficiadaProps) {
  // Em `carregando` a seleção é bloqueada e o indicador é o único estado
  // visível (Requisitos 1.2, 2.1, 4.2).
  const carregando = estado === "carregando";
  // Há busca ativa quando o termo (após trim) tem 2+ caracteres: muda o texto
  // do Estado_Vazio para a variante "nenhum resultado para o termo"
  // (Requisitos 3.5).
  const temBuscaAtiva = termoBusca.trim().length >= 2;

  return (
    <Stack spacing={2} data-testid="seletor-beneficiada">
      {/* Campo de busca ligado a onBuscar (Requisito 3). */}
      <TextField
        label="Buscar instituição ou causa"
        placeholder="Digite o nome da beneficiada"
        value={termoBusca}
        onChange={(e) => onBuscar(e.target.value)}
        fullWidth
        size="small"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {carregando && (
        <Box
          role="status"
          aria-label="Carregando instituições"
          data-testid="beneficiadas-carregando"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 6,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {estado === "erro" && (
        <Box
          role="alert"
          data-testid="beneficiadas-erro"
          sx={{
            border: 1,
            borderColor: "error.light",
            borderRadius: 2,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            alignItems: "flex-start",
          }}
        >
          <Typography variant="body2" color="error.main">
            {mensagemErro}
          </Typography>
          {/* Ação "Tentar novamente" apenas quando o erro é recuperável
              (Requisitos 2.6, 4.7, 4.8). */}
          {podeTentarNovamente && (
            <Button variant="outlined" size="small" onClick={onTentarNovamente}>
              Tentar novamente
            </Button>
          )}
        </Box>
      )}

      {estado === "vazio" && (
        <Box
          data-testid="beneficiadas-vazio"
          sx={{ py: 6, textAlign: "center" }}
        >
          <Typography variant="body2" color="text.secondary">
            {temBuscaAtiva
              ? `Nenhum resultado para "${termoBusca.trim()}"`
              : MENSAGEM_VAZIO_CATALOGO}
          </Typography>
        </Box>
      )}

      {estado === "carregado" &&
        (variante === "cards" ? (
          <ListaCards
            beneficiadas={beneficiadas}
            selecionadaId={selecionadaId}
            onSelecionar={onSelecionar}
          />
        ) : (
          <ListaVertical
            beneficiadas={beneficiadas}
            selecionadaId={selecionadaId}
            onSelecionar={onSelecionar}
          />
        ))}
    </Stack>
  );
}

type ListaProps = {
  beneficiadas: Beneficiada[];
  selecionadaId: string | null;
  onSelecionar: (id: string) => void;
};

// Variante "lista": pilha vertical de botões, como em StepCausaRegra.
function ListaVertical({ beneficiadas, selecionadaId, onSelecionar }: ListaProps) {
  return (
    <Stack
      spacing={1.5}
      role="listbox"
      aria-label="Instituições e causas"
      data-testid="beneficiadas-lista"
    >
      {beneficiadas.map((beneficiada) => {
        const selected = selecionadaId === beneficiada.id;
        return (
          <Box
            key={beneficiada.id}
            component="button"
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={beneficiada.nome}
            data-testid={`beneficiada-item-${beneficiada.id}`}
            data-selected={selected ? "true" : "false"}
            onClick={() => onSelecionar(beneficiada.id)}
            sx={{
              width: "100%",
              textAlign: "left",
              font: "inherit",
              color: "inherit",
              border: 1,
              borderColor: selected ? "primary.main" : "divider",
              bgcolor: selected ? "primary.light" : "transparent",
              borderRadius: 2,
              p: 2,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              transition: "border-color 0.15s ease, background-color 0.15s ease",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {beneficiada.nome}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {beneficiada.descricao}
              </Typography>
            </Box>
            {selected && <CheckCircleRoundedIcon color="primary" fontSize="small" />}
          </Box>
        );
      })}
    </Stack>
  );
}

// Variante "cards": grade de cards com avatar, como em StepSobreCampanha.
// Grid em vez de Stack com wrap: todas as colunas têm a mesma largura e as
// linhas ficam alinhadas (4 por linha no desktop, 2 no tablet, 1 no celular).
function ListaCards({ beneficiadas, selecionadaId, onSelecionar }: ListaProps) {
  return (
    <Box
      role="listbox"
      aria-label="Instituições e causas"
      data-testid="beneficiadas-lista"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        gap: 2,
      }}
    >
      {beneficiadas.map((beneficiada) => (
        <CardBeneficiada
          key={beneficiada.id}
          beneficiada={beneficiada}
          selected={selecionadaId === beneficiada.id}
          onSelecionar={onSelecionar}
        />
      ))}
    </Box>
  );
}

type CardBeneficiadaProps = {
  beneficiada: Beneficiada;
  selected: boolean;
  onSelecionar: (id: string) => void;
};

// No celular a descrição começa recolhida e abre pela setinha; no tablet e no
// desktop fica sempre aberta. A setinha é irmã do card (não filha): um botão
// dentro de outro é HTML inválido, e assim abrir a descrição não seleciona.
function CardBeneficiada({ beneficiada, selected, onSelecionar }: CardBeneficiadaProps) {
  const ehCelular = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"));
  const [expandida, setExpandida] = useState(false);
  const descricaoAberta = !ehCelular || expandida;
  const idDescricao = `beneficiada-descricao-${beneficiada.id}`;

  return (
    <Box sx={{ position: "relative", minWidth: 0 }}>
      <Box
        component="button"
        type="button"
        role="option"
        aria-selected={selected}
        aria-label={beneficiada.nome}
        data-testid={`beneficiada-item-${beneficiada.id}`}
        data-selected={selected ? "true" : "false"}
        onClick={() => onSelecionar(beneficiada.id)}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          width: "100%",
          height: "100%",
          minWidth: 0,
          textAlign: "left",
          font: "inherit",
          color: "inherit",
          border: 1,
          borderColor: selected ? "primary.main" : "divider",
          bgcolor: selected ? "primary.light" : "background.default",
          borderRadius: 2,
          p: 2.5,
          cursor: "pointer",
          position: "relative",
          transition: "border-color 0.15s ease, background-color 0.15s ease",
          "&:hover": { borderColor: "primary.main" },
        }}
      >
        {/* Avatar colorido da beneficiada. */}
        <Box
          aria-hidden="true"
          sx={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: selected ? "primary.main" : "divider",
            mb: 1.5,
            opacity: 0.6,
          }}
        />
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, mb: descricaoAberta ? 0.5 : 0, pr: { xs: 5, sm: 3 } }}
        >
          {beneficiada.nome}
        </Typography>
        <Collapse in={descricaoAberta} timeout="auto" id={idDescricao} sx={{ width: "100%" }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.6, wordBreak: "break-word" }}
          >
            {beneficiada.descricao}
          </Typography>
        </Collapse>
        {selected && (
          <CheckCircleRoundedIcon
            color="primary"
            sx={{ position: "absolute", top: 12, right: 12, fontSize: 22 }}
          />
        )}
      </Box>

      {ehCelular && (
        <IconButton
          size="small"
          onClick={() => setExpandida((atual) => !atual)}
          aria-expanded={expandida}
          aria-controls={idDescricao}
          aria-label={`${expandida ? "Esconder" : "Mostrar"} descrição de ${beneficiada.nome}`}
          sx={{ position: "absolute", bottom: 12, right: 12 }}
        >
          <ExpandMoreRoundedIcon
            sx={{
              transform: expandida ? "rotate(180deg)" : "none",
              transition: "transform 0.2s ease",
            }}
          />
        </IconButton>
      )}
    </Box>
  );
}
