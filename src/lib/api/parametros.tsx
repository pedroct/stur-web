"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { Parametros } from "@/contrato/tipos";
import { buscarJson } from "./cliente";

const PADROES: Parametros = {
  periodoMaximoDias: 31,
  linhasPorPagina: 20,
  opcoesPorPagina: [20, 50, 100],
  tempoLimiteSegundos: 30,
  dadosDoSturAte: null,
};

const ContextoParametros = createContext<Parametros>(PADROES);

// Uma promessa só por carga da página: o modo estrito monta o efeito duas vezes.
let promessa: Promise<Parametros> | null = null;

export function lerParametros(): Promise<Parametros> {
  promessa ??= buscarJson<Parametros>("/api/v1/parametros");
  return promessa;
}

export function zerarParametros(): void {
  promessa = null;
}

export function ParametrosProvider({
  inicial,
  children,
}: {
  inicial?: Partial<Parametros>;
  children: ReactNode;
}) {
  const [valor, setValor] = useState<Parametros>({ ...PADROES, ...inicial });

  useEffect(() => {
    if (inicial) return;
    let ativo = true;
    lerParametros().then(
      (parametros) => {
        if (ativo) setValor(parametros);
      },
      () => {}, // sem resposta, valem os padrões
    );
    return () => {
      ativo = false;
    };
  }, [inicial]);

  return <ContextoParametros value={valor}>{children}</ContextoParametros>;
}

export function useParametros(): Parametros {
  return useContext(ContextoParametros);
}
