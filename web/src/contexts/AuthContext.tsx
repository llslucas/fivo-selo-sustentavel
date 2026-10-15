"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api";
import { getEmpresaAtual, type EmpresaAtual } from "@/services/empresas";
import { logout as logoutRequest } from "@/services/auth";

// "nao-autenticado": nunca teve sessão (visitante, ou acabou de deslogar).
// "expirada": tinha sessão válida e ela parou de funcionar numa checagem
// posterior (ex: 8h de inatividade) — distinção útil pra decidir se mostra
// algo como "sua sessão expirou" em vez de simplesmente levar pro login.
// "erro": não deu pra confirmar a sessão (rede, servidor, permissão) — não é
// o mesmo que estar deslogado, então a tela mostra o erro em vez de ir pro login.
export type EstadoSessao = "carregando" | "autenticado" | "nao-autenticado" | "expirada" | "erro";

export type AuthContextValue = {
  empresa: EmpresaAtual | null;
  estado: EstadoSessao;
  // Falha da última verificação quando estado === "erro".
  erro: unknown;
  // Reconsulta GET /empresas/me — chamar depois de um login bem-sucedido,
  // já que o provedor só busca uma vez ao montar.
  verificar: () => Promise<void>;
  tentarNovamente: () => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaAtual | null>(null);
  const [estado, setEstado] = useState<EstadoSessao>("carregando");
  const [erro, setErro] = useState<unknown>(null);
  const jaAutenticouAntes = useRef(false);

  const verificar = useCallback(async () => {
    setErro(null);
    try {
      const atual = await getEmpresaAtual();
      jaAutenticouAntes.current = true;
      setEmpresa(atual);
      setEstado("autenticado");
    } catch (e) {
      setEmpresa(null);
      if (e instanceof ApiError && e.status === 401) {
        setEstado(jaAutenticouAntes.current ? "expirada" : "nao-autenticado");
      } else {
        setErro(e);
        setEstado("erro");
      }
    }
  }, []);

  // Usado no "Tentar novamente": volta pro loading enquanto reconsulta.
  const tentarNovamente = useCallback(() => {
    setEstado("carregando");
    void verificar();
  }, [verificar]);

  useEffect(() => {
    // Busca única, na raiz da aplicação, ao montar — é o que evita chamadas
    // duplicadas: as telas privadas leem o estado daqui, não buscam de novo.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial intencional, roda uma vez só
    void verificar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Mesmo se a chamada falhar (ex: sessão já expirada no servidor),
      // o estado local é limpo do mesmo jeito.
    } finally {
      jaAutenticouAntes.current = false;
      setEmpresa(null);
      setErro(null);
      setEstado("nao-autenticado");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ empresa, estado, erro, verificar, tentarNovamente, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
