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

function Estrutura({ children }: Readonly<{ children: ReactNode }>) {
  const { ativo, ocupado } = useConsultando();
  const { oculta } = useBuscaDoTopo();
  const rota = usePathname();
  useAtalho("/", focarNumero);

  return (
    <>
      <Cabecalho comBusca={rota !== "/" && !oculta} />
      {ativo && <FaixaCarregando />}
      {/* Ocupado só no carregando inicial (11b); no Atualizar a linha de status tem de ser ouvida. */}
      <main
        aria-busy={ocupado || undefined}
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
}: Readonly<{
  children: ReactNode;
  consultandoInicial?: boolean;
  parametrosIniciais?: Partial<Parametros>;
}>) {
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
