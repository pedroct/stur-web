"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

type Consultando = { ativo: boolean; definir(ativo: boolean): void };
type BuscaDoTopo = { oculta: boolean; ocultar(oculta: boolean): void };

const nada = () => {};

const ContextoConsultando = createContext<Consultando>({ ativo: false, definir: nada });
const ContextoBuscaDoTopo = createContext<BuscaDoTopo>({ oculta: false, ocultar: nada });

/** Enquanto a consulta roda: a busca do topo fica desativada e a faixa aparece. */
export function ConsultandoProvider({
  inicial = false,
  children,
}: {
  inicial?: boolean;
  children: ReactNode;
}) {
  const [ativo, definir] = useState(inicial);
  const valor = useMemo(() => ({ ativo, definir }), [ativo]);
  return <ContextoConsultando value={valor}>{children}</ContextoConsultando>;
}

export function useConsultando(): Consultando {
  return useContext(ContextoConsultando);
}

/** A página que mostra o formulário esconde a busca do topo. */
export function BuscaDoTopoProvider({ children }: { children: ReactNode }) {
  const [oculta, ocultar] = useState(false);
  const valor = useMemo(() => ({ oculta, ocultar }), [oculta]);
  return <ContextoBuscaDoTopo value={valor}>{children}</ContextoBuscaDoTopo>;
}

export function useBuscaDoTopo(): BuscaDoTopo {
  return useContext(ContextoBuscaDoTopo);
}
