"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Parametros } from "@/contrato/tipos";
import { ParametrosProvider } from "@/lib/api/parametros";
import { useAtalho } from "@/lib/atalhos";
import { Cabecalho } from "./Cabecalho";
import {
  BuscaDoTopoProvider,
  ConsultandoProvider,
  useBuscaDoTopo,
  useConsultando,
} from "./consultando";
import { FaixaCarregando } from "./FaixaCarregando";

function focarNumero() {
  document.querySelector<HTMLElement>("[data-atalho-numero]")?.focus();
}

function Estrutura({ children }: { children: ReactNode }) {
  const { ativo } = useConsultando();
  const { oculta } = useBuscaDoTopo();
  const rota = usePathname();
  useAtalho("/", focarNumero);

  return (
    <>
      <Cabecalho comBusca={rota !== "/" && !oculta} />
      {ativo && <FaixaCarregando />}
      {/* Ocupado enquanto a consulta roda (11b e Atualizar), como no canvas. */}
      <main
        aria-busy={ativo || undefined}
        className="mx-auto w-full max-w-[var(--largura-maxima)] px-6 pt-6 pb-16"
      >
        {children}
      </main>
    </>
  );
}

/** Moldura das telas: cabeçalho, faixa de consulta e conteúdo, com os parâmetros e o estado da consulta. */
export function Moldura({
  children,
  consultandoInicial,
  parametrosIniciais,
}: {
  children: ReactNode;
  consultandoInicial?: boolean;
  parametrosIniciais?: Partial<Parametros>;
}) {
  return (
    <ParametrosProvider inicial={parametrosIniciais}>
      <ConsultandoProvider inicial={consultandoInicial}>
        <BuscaDoTopoProvider>
          <Estrutura>{children}</Estrutura>
        </BuscaDoTopoProvider>
      </ConsultandoProvider>
    </ParametrosProvider>
  );
}
