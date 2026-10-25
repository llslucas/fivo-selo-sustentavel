"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api";
import { getEmpresaAtual, type EmpresaAtual } from "@/services/empresas";
import { logout as logoutRequest, type Papel } from "@/services/auth";

// A API só tem "quem sou eu" para empresa (GET /empresas/me). Para ADMIN e
// INSTITUICAO o papel fica guardado na aba (sessionStorage) e é o que mantém a
// sessão reconhecida depois de recarregar a página. Só o papel — nunca token.
const CHAVE_PAPEL = "fivo_papel";

function lerPapelSalvo(): Papel | null {
  try {
    const valor = window.sessionStorage.getItem(CHAVE_PAPEL);
    return valor === "ADMIN" || valor === "EMPRESA" || valor === "INSTITUICAO" ? valor : null;
  } catch {
    return null;
  }
}

function salvarPapel(papel: Papel | null) {
  try {
    if (papel) {
      window.sessionStorage.setItem(CHAVE_PAPEL, papel);
    } else {
      window.sessionStorage.removeItem(CHAVE_PAPEL);
    }
  } catch {
    // Storage indisponível (ex: navegação privada restrita): segue só em memória.
  }
}

// "nao-autenticado": nunca teve sessão (visitante, ou acabou de deslogar).
// "expirada": tinha sessão válida e ela parou de funcionar numa checagem
// posterior (ex: 8h de inatividade) — distinção útil pra decidir se mostra
// algo como "sua sessão expirou" em vez de simplesmente levar pro login.
// "erro": não deu pra confirmar a sessão (rede, servidor, permissão) — não é
// o mesmo que estar deslogado, então a tela mostra o erro em vez de ir pro login.
export type EstadoSessao = "carregando" | "autenticado" | "nao-autenticado" | "expirada" | "erro";

export type AuthContextValue = {
  empresa: EmpresaAtual | null;
  papel: Papel | null;
  estado: EstadoSessao;
  // Falha da última verificação quando estado === "erro".
  erro: unknown;
  // Reconfirma a sessão a partir do papel salvo: só consulta GET /empresas/me
  // quando o papel é EMPRESA (ou ainda não há papel salvo).
  verificar: () => Promise<void>;
  // Chamar depois de um login bem-sucedido, com o papel devolvido pela API,
  // já que o provedor só verifica uma vez ao montar.
  entrar: (papel: Papel) => Promise<void>;
  tentarNovamente: () => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaAtual | null>(null);
  const [papel, setPapel] = useState<Papel | null>(null);
  const [estado, setEstado] = useState<EstadoSessao>("carregando");
  const [erro, setErro] = useState<unknown>(null);
  const jaAutenticouAntes = useRef(false);

  const verificar = useCallback(async () => {
    setErro(null);
    const papelSalvo = lerPapelSalvo();
    if (papelSalvo === "ADMIN" || papelSalvo === "INSTITUICAO") {
      jaAutenticouAntes.current = true;
      setEmpresa(null);
      setPapel(papelSalvo);
      setEstado("autenticado");
      return;
    }
    try {
      const atual = await getEmpresaAtual();
      jaAutenticouAntes.current = true;
      salvarPapel("EMPRESA");
      setEmpresa(atual);
      setPapel("EMPRESA");
      setEstado("autenticado");
    } catch (e) {
      setEmpresa(null);
      if (e instanceof ApiError && e.status === 401) {
        salvarPapel(null);
        setPapel(null);
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

  const entrar = useCallback(
    async (novoPapel: Papel) => {
      salvarPapel(novoPapel);
      await verificar();
    },
    [verificar],
  );

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
      salvarPapel(null);
      setEmpresa(null);
      setPapel(null);
      setErro(null);
      setEstado("nao-autenticado");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ empresa, papel, estado, erro, verificar, entrar, tentarNovamente, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
