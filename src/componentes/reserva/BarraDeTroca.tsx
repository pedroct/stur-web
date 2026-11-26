"use client";

import { Button } from "@base-ui/react/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePainel } from "@/componentes/venda/painel-contexto";
import type { Reserva, VendaDaReserva } from "@/contrato/tipos";
import { useAtalho } from "@/lib/atalhos";
import { linhaDaBarra, textoDaProxima, textoDaVenda } from "@/lib/reserva/tabela";
import { cn } from "@/lib/utils";
import { enderecoDaVenda } from "@/lib/venda/rota";
import { cliqueSimples, pedirRolagem, TabelaVendas } from "./TabelaVendas";

export const SETA = cn(
  "inline-flex size-alvo shrink-0 items-center justify-center rounded-pilula border border-borda bg-superficie text-texto-principal outline-0 transition-colors duration-150 hover:bg-superficie-sutil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco",
  "aria-disabled:cursor-not-allowed aria-disabled:text-borda-controle aria-disabled:hover:bg-superficie",
);

type Lado = {
  rotulo: "Venda anterior" | "Próxima venda";
  tecla: "[" | "]";
  naPonta: string;
  Icone: typeof ChevronLeft;
};

const ANTERIOR: Lado = {
  rotulo: "Venda anterior",
  tecla: "[",
  naPonta: "Esta é a primeira venda",
  Icone: ChevronLeft,
};
const PROXIMA: Lado = {
  rotulo: "Próxima venda",
  tecla: "]",
  naPonta: "Esta é a última venda",
  Icone: ChevronRight,
};

function Seta({
  lado,
  destino,
  total,
  aoIr,
}: Readonly<{
  lado: Lado;
  destino: VendaDaReserva | undefined;
  total: number;
  aoIr(v: VendaDaReserva): void;
}>) {
  const { rotulo, tecla, naPonta, Icone } = lado;
  if (destino === undefined) {
    return (
      <Button className={SETA} aria-label={rotulo} title={naPonta} disabled focusableWhenDisabled>
        <Icone className="size-[18px]" aria-hidden="true" />
      </Button>
    );
  }
  return (
    <Link
      href={enderecoDaVenda(destino.resumo.numero, destino.resumo.idreserva)}
      aria-label={`${rotulo}: ${textoDaVenda(destino, total)}`}
      title={`${rotulo} (${tecla})`}
      aria-keyshortcuts={tecla}
      className={SETA}
      onClick={(e) => {
        if (!cliqueSimples(e)) return;
        e.preventDefault();
        aoIr(destino);
      }}
    >
      <Icone className="size-[18px]" aria-hidden="true" />
    </Link>
  );
}

/**
 * Com uma venda aberta, a tabela recolhe nesta barra, presa no topo ao rolar (IA 6.10; telas 4, 6
 * e 7): qual venda é, o resumo dela, a próxima e as setas na ordem de lançamento, com `[` e `]`
 * (desligadas com um painel aberto). "Ver as {n} vendas" reabre a tabela. A barra vem como irmã da
 * seção da venda, para continuar presa enquanto se lê a venda.
 */
export function BarraDeTroca({
  reserva,
  hoje,
  aberta,
}: Readonly<{ reserva: Reserva; hoje: string; aberta: number }>) {
  const roteador = useRouter();
  const { painelAberto } = usePainel();
  const vendas = [...reserva.vendas].sort((a, b) => a.posicao - b.posicao);
  const total = vendas.length;
  const i = vendas.findIndex((v) => v.resumo.idreserva === aberta);
  const atual = vendas[i];
  const anterior = i > 0 ? vendas[i - 1] : undefined;
  const proxima = i >= 0 ? vendas[i + 1] : undefined;

  function ir(v: VendaDaReserva | undefined) {
    if (v === undefined) return;
    pedirRolagem(v.resumo.idreserva, true);
    roteador.push(enderecoDaVenda(reserva.numero, v.resumo.idreserva), { scroll: false });
  }

  useAtalho("[", () => ir(anterior), !painelAberto);
  useAtalho("]", () => ir(proxima), !painelAberto);

  if (atual === undefined) return null;
  const produto = atual.resumo.produto?.trim();
  return (
    <>
      <div className="sticky top-2 z-10 mt-3 flex items-center gap-3 rounded-grande border-2 border-acao-primaria bg-acao-fundo px-3 py-2.5 shadow-flutuante">
        <Seta lado={ANTERIOR} destino={anterior} total={total} aoIr={ir} />
        <div className="min-w-0 flex-1 tabular-nums">
          <p className="text-base leading-6 font-semibold">
            Venda {atual.posicao} de {total}
            {produto ? ` · ${produto}` : ""}
          </p>
          <p className="text-[13px] leading-5 text-texto-auxiliar">{linhaDaBarra(atual, hoje)}</p>
        </div>
        {proxima && (
          <p className="max-w-[220px] text-right text-[13px] leading-5 text-texto-auxiliar tabular-nums">
            {textoDaProxima(proxima)}
          </p>
        )}
        <Seta lado={PROXIMA} destino={proxima} total={total} aoIr={ir} />
      </div>
      <details className="group mt-2">
        <summary className="flex min-h-alvo w-fit cursor-pointer items-center gap-2 text-sm font-medium">
          <ChevronRight
            className="size-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          Ver as {total} vendas
        </summary>
        <TabelaVendas reserva={reserva} hoje={hoje} aberta={aberta} />
      </details>
    </>
  );
}
