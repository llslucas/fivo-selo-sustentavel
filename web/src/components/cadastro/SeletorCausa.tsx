"use client";

import { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { listarCausas, type Causa } from "@/services/causas";

type SeletorCausaProps = {
  value: string;
  onChange: (causaId: string) => void;
  label: React.ReactNode;
  error?: string;
};

// Versão provisória: lista as causas ativas num select simples. A F2 evolui
// este componente (busca, descrição da causa etc.).
export default function SeletorCausa({ value, onChange, label, error }: SeletorCausaProps) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    listarCausas()
      .then((lista) => setCausas(lista))
      .catch(() => setFalhou(true))
      .finally(() => setCarregando(false));
  }, []);

  const ajuda = falhou
    ? "Não foi possível carregar as causas. Recarregue a página."
    : error;

  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={carregando || falhou}
      error={Boolean(error) || falhou}
      helperText={ajuda}
      fullWidth
    >
      {causas.map((causa) => (
        <MenuItem key={causa.id} value={causa.id}>
          {causa.nome}
        </MenuItem>
      ))}
    </TextField>
  );
}