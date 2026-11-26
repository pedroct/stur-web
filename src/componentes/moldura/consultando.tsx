"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

/**
 * `ativo`: a consulta roda (faixa e busca do topo desativada). `ocupado`: o conteúdo do `<main>`
 * ainda não existe (carregando inicial); no Atualizar ele segue à vista e a linha de status, dentro
 * do `<main>`, precisa ser ouvida, então o `aria-busy` não vale.
 */
type Consultando = {
  ativo: boolean;
  ocupado: boolean;
  definir(ativo: boolean, opcoes?: { ocupado?: boolean }): void;
};
type BuscaDoTopo = { oculta: boolean; ocultar(oculta: boolean): void };

const nada = () => {};

const ContextoConsultando = createContext<Consultando>({
  ativo: false,
  ocupado: false,
  definir: nada,
});
const ContextoBuscaDoTopo = createContext<BuscaDoTopo>({ oculta: false, ocultar: nada });

/** Enquanto a consulta roda: a busca do topo fica desativada e a faixa aparece. */
export function ConsultandoProvider({
  inicial = false,
  children,
}: Readonly<{
  inicial?: boolean;
  children: ReactNode;
}>) {
  const [estado, setEstado] = useState({ ativo: inicial, ocupado: inicial });
  const definir = useCallback((ativo: boolean, { ocupado = ativo }: { ocupado?: boolean } = {}) => {
    setEstado((atual) =>
      atual.ativo === ativo && atual.ocupado === (ativo && ocupado)
        ? atual
        : { ativo, ocupado: ativo && ocupado },
    );
  }, []);
  const valor = useMemo(() => ({ ...estado, definir }), [estado, definir]);
  return <ContextoConsultando value={valor}>{children}</ContextoConsultando>;
}

export function useConsultando(): Consultando {
  return useContext(ContextoConsultando);
}

/** A página que mostra o formulário esconde a busca do topo. */
export function BuscaDoTopoProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [oculta, setOculta] = useState(false);
  const valor = useMemo(() => ({ oculta, ocultar: setOculta }), [oculta]);
  return <ContextoBuscaDoTopo value={valor}>{children}</ContextoBuscaDoTopo>;
}

export function useBuscaDoTopo(): BuscaDoTopo {
  return useContext(ContextoBuscaDoTopo);
}
