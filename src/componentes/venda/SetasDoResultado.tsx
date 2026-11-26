"use client";

import { Button } from "@base-ui/react/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SETA } from "@/componentes/reserva/BarraDeTroca";
import { cliqueSimples } from "@/componentes/reserva/TabelaVendas";
import { lerOrigem, type Origem } from "@/lib/armazenamento/origem";
import { useAtalho } from "@/lib/atalhos";
import { enderecoDaVenda } from "@/lib/venda/rota";
import { usePainel } from "./painel-contexto";

type VendaDoResultado = Origem["vendas"][number];

/**
 * A origem guardada pelo resultado, só quando ela tem a venda aberta (decisão 17). Lida depois da
 * montagem, e de novo a cada venda: a busca do topo, o formulário e as recentes a apagam antes de
 * navegar (decisão 28).
 */
export function useOrigemDaVenda(idreserva: number | null): Origem | null {
  const [origem, setOrigem] = useState<Origem | null>(null);
  useEffect(() => {
    const guardada = idreserva === null ? null : lerOrigem();
    setOrigem(guardada?.vendas.some((v) => v.idreserva === idreserva) ? guardada : null);
  }, [idreserva]);
  return origem;
}

type Lado = {
  rotulo: "Anterior do resultado" | "Próxima do resultado";
  tecla: "," | ".";
  naPonta: string;
  Icone: typeof ChevronLeft;
};

const ANTERIOR: Lado = {
  rotulo: "Anterior do resultado",
  tecla: ",",
  naPonta: "Esta é a primeira do resultado",
  Icone: ChevronLeft,
};
const PROXIMA: Lado = {
  rotulo: "Próxima do resultado",
  tecla: ".",
  naPonta: "Esta é a última do resultado",
  Icone: ChevronRight,
};

function Seta({
  lado,
  destino,
  aoIr,
}: Readonly<{
  lado: Lado;
  destino: VendaDoResultado | undefined;
  aoIr(v: VendaDoResultado): void;
}>) {
  const { rotulo, tecla, naPonta, Icone } = lado;
  if (destino === undefined) {
    return (
      <Button className={SETA} aria-label={rotulo} title={naPonta} disabled focusableWhenDisabled>
        <Icone className="size-[18px]" aria-hidden="true" />
      </Button>
    );
  }
  const produto = destino.produto?.trim();
  return (
    <Link
      href={enderecoDaVenda(destino.numero, destino.idreserva)}
      aria-label={`${rotulo}: ${destino.numero}${produto ? `, ${produto}` : ""}`}
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
 * "{i} de {n} no resultado", com ‹ › para a anterior e a próxima do resultado, na ordem e com os
 * filtros dele (IA 3; tela 8b), e as teclas `,` e `.`, desligadas com um painel aberto. Navegam
 * com `push`, para Voltar refazer o caminho.
 */
export function SetasDoResultado({
  origem,
  idreserva,
}: Readonly<{ origem: Origem; idreserva: number }>) {
  const roteador = useRouter();
  const { painelAberto } = usePainel();
  const { vendas } = origem;
  const i = vendas.findIndex((v) => v.idreserva === idreserva);
  const anterior = i > 0 ? vendas[i - 1] : undefined;
  const proxima = i >= 0 ? vendas[i + 1] : undefined;

  function ir(v: VendaDoResultado | undefined) {
    if (v !== undefined) roteador.push(enderecoDaVenda(v.numero, v.idreserva));
  }

  useAtalho(",", () => ir(anterior), !painelAberto);
  useAtalho(".", () => ir(proxima), !painelAberto);

  if (i < 0) return null;
  return (
    <div
      role="group"
      aria-label="Vendas do resultado"
      className="flex items-center gap-2 text-sm text-texto-auxiliar tabular-nums"
    >
      <Seta lado={ANTERIOR} destino={anterior} aoIr={ir} />
      <span>
        {i + 1} de {vendas.length} no resultado
      </span>
      <Seta lado={PROXIMA} destino={proxima} aoIr={ir} />
    </div>
  );
}
