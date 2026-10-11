"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { getEmpresaAtual, type EmpresaAtual } from "@/services/empresas";
import { logout as logoutRequest } from "@/services/auth";

// "nao-autenticado": nunca teve sessão (visitante, ou acabou de deslogar).
// "expirada": tinha sessão válida e ela parou de funcionar numa checagem
// posterior (ex: 8h de inatividade) — distinção útil pra decidir se mostra
// algo como "sua sessão expirou" em vez de simplesmente levar pro login.
export type EstadoSessao = "carregando" | "autenticado" | "nao-autenticado" | "expirada";

export type AuthContextValue = {
  empresa: EmpresaAtual | null;
  estado: EstadoSessao;
  // Reconsulta GET /empresas/me — chamar depois de um login bem-sucedido,
  // já que o provedor só busca uma vez ao montar.
  verificar: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaAtual | null>(null);
  const [estado, setEstado] = useState<EstadoSessao>("carregando");
  const jaAutenticouAntes = useRef(false);

  const verificar = useCallback(async () => {
    try {
      const atual = await getEmpresaAtual();
      jaAutenticouAntes.current = true;
      setEmpresa(atual);
      setEstado("autenticado");
    } catch {
      setEmpresa(null);
      setEstado(jaAutenticouAntes.current ? "expirada" : "nao-autenticado");
    }
  }, []);

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
      setEstado("nao-autenticado");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ empresa, estado, verificar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
