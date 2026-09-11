import type { Instituicao } from "./types";

// Lista mockada — na v1 real (RF03) isso vem de uma lista cadastrada pela Fivo Lab.
export const instituicoesMock: Instituicao[] = [
  {
    id: "casa-do-bem",
    nome: "Casa do Bem",
    cidade: "São João da Boa Vista, SP",
    descricao: "Assistência alimentar ativa desde 2011.",
  },
  {
    id: "lar-sao-vicente",
    nome: "Lar São Vicente",
    cidade: "Campinas, SP",
    descricao: "Acolhimento e apoio a famílias em vulnerabilidade.",
  },
  {
    id: "apae-regional",
    nome: "APAE regional",
    cidade: "Poços de Caldas, MG",
    descricao: "Apoio a pessoas com deficiência intelectual e múltipla.",
  },
];
