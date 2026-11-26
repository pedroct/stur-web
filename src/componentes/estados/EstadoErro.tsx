"use client";

import { Copy, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/componentes/ui/button";
import type { ErroDaConsulta } from "@/lib/api/cliente";
import { useParametros } from "@/lib/api/parametros";
import { comTentarDeNovo, TEXTOS_ERRO, tipoComTexto } from "@/lib/api/textos-erro";

const COPIADO_POR_MS = 2000;

/** O idreserva nunca aparece na tela (PRD 9.4); a cópia leva o detalhe inteiro, para o diagnóstico. */
function semIdreserva(texto: string): string {
  return texto.replace(/venda \d+:/g, "venda •••:");
}

/**
 * Tela 12: o erro no lugar do resultado, com as ações que cabem a cada tipo. O "Detalhe técnico"
 * só existe no formato desconhecido e mostra o `codigo` e o `detalhe` do backend (decisão 6).
 * Dentro da reserva (12c), o título desce para h2, a `mensagem` diz qual venda não abriu e a
 * `acaoExtra` volta para a tabela das vendas, como a de `NenhumaVenda`.
 */
export function EstadoErro({
  erro,
  rodape,
  aoTentar,
  alterarHref,
  nivelTitulo = "h1",
  mensagem,
  acaoExtra,
}: Readonly<{
  erro: ErroDaConsulta;
  rodape?: string;
  aoTentar?: () => void;
  alterarHref: string;
  nivelTitulo?: "h1" | "h2";
  mensagem?: string;
  acaoExtra?: { rotulo: string; aoClicar(): void };
}>) {
  const { tempoLimiteSegundos } = useParametros();
  const tipo = tipoComTexto(erro.tipo);
  const textos = TEXTOS_ERRO[tipo];
  const podeTentar = aoTentar !== undefined && comTentarDeNovo(tipo);
  const Titulo = nivelTitulo;
  const detalhe = JSON.stringify({ codigo: erro.codigo, detalhe: erro.detalhe }, null, 2);

  const [copiado, setCopiado] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (espera.current !== null) clearTimeout(espera.current);
    },
    [],
  );

  function copiar() {
    navigator.clipboard.writeText(detalhe).then(
      () => {
        if (espera.current !== null) clearTimeout(espera.current);
        setCopiado(true);
        espera.current = setTimeout(() => {
          espera.current = null;
          setCopiado(false);
        }, COPIADO_POR_MS);
      },
      () => {}, // sem acesso à área de transferência, o detalhe segue à vista para copiar à mão
    );
  }

  return (
    <div className="max-w-[760px]">
      <div
        role="alert"
        className="mt-6 flex items-start gap-4 rounded-medio bg-estado-erro-fundo p-6 text-texto-principal"
      >
        <TriangleAlert className="size-7 shrink-0 text-estado-erro" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <Titulo className="text-2xl leading-8 font-bold">{textos.titulo}</Titulo>
          <p className="mt-2 text-base leading-6">
            {mensagem ?? textos.mensagem(tempoLimiteSegundos)}
          </p>
          {tipo === "formato" && (
            <details className="mt-4 rounded-pequeno border border-borda bg-superficie px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold outline-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
                Detalhe técnico
              </summary>
              <pre className="mt-3 overflow-x-auto font-mono text-[13px] leading-5 whitespace-pre-wrap">
                {semIdreserva(detalhe)}
              </pre>
            </details>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {podeTentar && (
              <Button onClick={aoTentar}>
                <RotateCw className="size-[18px]" aria-hidden="true" />
                Tentar de novo
              </Button>
            )}
            {tipo === "formato" && (
              <Button onClick={copiar}>
                <Copy className="size-[18px]" aria-hidden="true" />
                {copiado ? "Copiado" : "Copiar detalhe"}
              </Button>
            )}
            <Link
              href={alterarHref}
              className={buttonVariants({ variant: "secundaria", size: "compacto" })}
            >
              Alterar consulta
            </Link>
            {acaoExtra && (
              <Button variant="secundaria" size="compacto" onClick={acaoExtra.aoClicar}>
                {acaoExtra.rotulo}
              </Button>
            )}
          </div>
        </div>
      </div>
      {rodape && <p className="mt-4 text-[13px] leading-5 text-texto-auxiliar">{rodape}</p>}
    </div>
  );
}
