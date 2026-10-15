// Funções específicas de sessão/autenticação. Usa o cliente genérico de
// services/api.ts. O cookie de sessão (fivo_sessao) é HttpOnly — definido e
// limpo pela própria API; este arquivo nunca lê, grava nem guarda token ou
// senha em localStorage/sessionStorage/cookies do frontend.

import { request } from "./api";

export type Papel = "ADMIN" | "EMPRESA" | "INSTITUICAO";

export function login(email: string, senha: string): Promise<{ papel: Papel }> {
  return request("/sessoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
}

export function logout(): Promise<void> {
  return request("/sessoes/atual", { method: "DELETE" });
}

// Resposta neutra (202): a API devolve a mesma mensagem com ou sem conta
// cadastrada para o e-mail.
export function solicitarRecuperacaoSenha(email: string): Promise<{ mensagem: string }> {
  return request("/senha/recuperacao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

// O token vem do link enviado por e-mail. 400 = link inválido, expirado ou já usado.
export function redefinirSenha(token: string, novaSenha: string): Promise<void> {
  return request("/senha/redefinicao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, novaSenha }),
  });
}
