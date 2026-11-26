import type { ReactNode } from "react";
import { dadosDoSeloTexto, Selo } from "@/componentes/comum/Selo";
import type { Reserva } from "@/contrato/tipos";
import {
  fraseDasEmissoes,
  fraseDosServicos,
  selosDaReserva,
  subtituloDaReserva,
} from "@/lib/reserva/cabecalho";

/**
 * O topo da reserva com várias vendas (decisão 12; telas 4b, 6b e 7b): "Reserva {n} · {k} vendas",
 * um selo por situação, o cliente em h1, o subtítulo e as frases das datas. À direita vai o que a
 * página põe (a linha da consulta).
 */
export function CabecalhoReserva({
  reserva,
  hoje,
  children,
}: Readonly<{ reserva: Reserva; hoje: string; children?: ReactNode }>) {
  const { numero, vendas } = reserva;
  const cliente = vendas.find((v) => v.resumo.cliente)?.resumo.cliente ?? `Reserva ${numero}`;
  const subtitulo = subtituloDaReserva(reserva);
  const datas = [fraseDasEmissoes(reserva), fraseDosServicos(reserva)]
    .filter((f) => f !== null)
    .join(" ");

  return (
    <section className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 flex-[1_1_35rem]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold tabular-nums">
            Reserva {numero} · {vendas.length} vendas
          </span>
          {selosDaReserva(reserva, hoje).map((s) => {
            const selo = dadosDoSeloTexto(s);
            return (
              <Selo key={s.rotulo} {...selo}>
                {selo.texto}
              </Selo>
            );
          })}
        </div>
        <h1 className="mt-3 text-4xl leading-11 font-bold tracking-[-0.01em]">{cliente}</h1>
        {subtitulo !== "" && (
          <p className="mt-1.5 text-base leading-6 text-texto-auxiliar">{subtitulo}</p>
        )}
        {datas !== "" && (
          <p className="mt-1 text-[13px] leading-5 text-texto-auxiliar tabular-nums">{datas}</p>
        )}
      </div>
      <div className="flex flex-col items-end text-right">{children}</div>
    </section>
  );
}
