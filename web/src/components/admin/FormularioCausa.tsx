"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Causa, DadosCausa } from "@/services/causas";

type Props = {
  causaInicial?: Causa;   
  enviando: boolean;
  erroNome?: string;     
  onSalvar: (dados: DadosCausa) => void;
  onCancelar?: () => void;
};

export default function FormularioCausa({
  causaInicial, enviando, erroNome, onSalvar, onCancelar,
}: Props) {
  const [nome, setNome] = useState(causaInicial?.nome ?? "");
  const [descricao, setDescricao] = useState(causaInicial?.descricao ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSalvar({ nome: nome.trim(), descricao: descricao.trim() });
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Nome da causa"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          error={Boolean(erroNome)}
          helperText={erroNome}
          required
          disabled={enviando}
        />
        <TextField
          label="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          multiline
          minRows={2}
          required
          disabled={enviando}
        />
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button type="submit" variant="contained" disabled={enviando}>
            {causaInicial ? "Salvar" : "Criar causa"}
          </Button>
          {onCancelar && (
            <Button onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
