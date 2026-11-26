"use client";

import { Aviso } from "@/componentes/comum/Aviso";
import { Button } from "@/componentes/ui/button";
import type { ErroDaConsulta } from "@/lib/api/cliente";
import { useParametros } from "@/lib/api/parametros";
import { textosDoErro } from "@/lib/api/textos-erro";

/** Falha ao atualizar: os dados da consulta anterior seguem à vista, abaixo deste aviso (decisão 43). */
export function FalhaAtualizar({
  erro,
  consultadoAs,
  aoTentar,
}: Readonly<{
  erro: ErroDaConsulta;
  consultadoAs: string;
  aoTentar: () => void;
}>) {
  const { tempoLimiteSegundos } = useParametros();
  const textos = textosDoErro(erro.tipo);
  return (
    <Aviso tom="atencao">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-[min(100%,26rem)] flex-1 text-[15px] leading-[22px]">
          <b>Não foi possível atualizar.</b> {textos.frase(tempoLimiteSegundos)} Os dados abaixo são
          da consulta das {consultadoAs}.
        </p>
        <Button
          variant="secundaria"
          size="compacto"
          title="Atualizar (u)"
          aria-keyshortcuts="u"
          onClick={aoTentar}
        >
          Tentar de novo
        </Button>
      </div>
    </Aviso>
  );
}
