"use client";

import { FalhaAtualizar } from "@/componentes/estados/FalhaAtualizar";
import type { VendaConsultada } from "@/contrato/tipos";
import type { ErroDaConsulta } from "@/lib/api/cliente";
import { formatarHora } from "@/lib/tempo";
import { LinhaConsulta } from "./LinhaConsulta";

export type ConsultaDaVenda = {
  atualizando: boolean;
  aoAtualizar(): void;
  falha: ErroDaConsulta | null;
};

/**
 * A venda. Casca: as Tasks 5 a 9 a completam. Sozinha (`nivelBase` 1), o título é o h1 e a linha
 * da consulta é dela; dentro da reserva (`naReserva`, `nivelBase` 2), o título desce para h2 e a
 * linha da consulta, com o Atualizar, fica na reserva, acima da lista.
 */
export function Venda({
  dados,
  naReserva,
  nivelBase,
  consulta,
}: Readonly<{
  dados: VendaConsultada;
  naReserva: boolean;
  nivelBase: 1 | 2;
  consulta: ConsultaDaVenda;
}>) {
  const Titulo = nivelBase === 1 ? "h1" : "h2";
  const numero = dados.reserva.numero;
  const cliente = dados.venda.nomecliente ?? `Reserva ${numero}`;

  if (naReserva) {
    return (
      <section className="mt-10">
        <Titulo className="text-[30px] leading-[38px] font-bold tracking-[-0.01em]">
          {cliente}
        </Titulo>
      </section>
    );
  }

  return (
    <>
      <section className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-[1_1_35rem]">
          <span className="text-base font-semibold tabular-nums">Reserva {numero}</span>
          <Titulo className="mt-3 text-4xl leading-11 font-bold tracking-[-0.01em]">
            {cliente}
          </Titulo>
        </div>
        <div className="flex flex-col items-end text-right">
          <LinhaConsulta
            consultadoEm={dados.consultadoEm}
            dadosDoSturAte={dados.dadosDoSturAte}
            atualizando={consulta.atualizando}
            aoAtualizar={consulta.aoAtualizar}
          />
        </div>
      </section>
      {consulta.falha && (
        <div className="mt-4">
          <FalhaAtualizar
            erro={consulta.falha}
            consultadoAs={formatarHora(dados.consultadoEm)}
            aoTentar={consulta.aoAtualizar}
          />
        </div>
      )}
    </>
  );
}
