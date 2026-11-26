"use client";

import type { VendaConsultada } from "@/contrato/tipos";
import type { ErroDaConsulta } from "@/lib/api/cliente";
import { avisosDaVenda } from "@/lib/venda/cabecalho";
import { Avisos } from "./Avisos";
import { CabecalhoVenda } from "./CabecalhoVenda";
import { Financeiro } from "./Financeiro";

export type ConsultaDaVenda = {
  atualizando: boolean;
  aoAtualizar(): void;
  falha: ErroDaConsulta | null;
};

/**
 * A venda. Casca: as Tasks 6 a 9 a completam. Sozinha (`nivelBase` 1), o cabeçalho é o dela, com o
 * título em h1 e a linha da consulta; dentro da reserva (`naReserva`, `nivelBase` 2), o título
 * desce para h2 e a linha da consulta, com o Atualizar, fica na reserva, acima da lista (a Task 11
 * troca este título pelo cabeçalho da venda aberta).
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
  const numero = dados.reserva.numero;
  const cliente = dados.venda.nomecliente ?? `Reserva ${numero}`;
  // O Financeiro da venda de incentivo é outro: a Task 8 o monta no lugar deste.
  const comFinanceiro = dados.calculos.tipo !== "incentivo";

  return (
    <>
      {naReserva ? (
        <section className="mt-10">
          <h2 className="text-[30px] leading-[38px] font-bold tracking-[-0.01em]">{cliente}</h2>
        </section>
      ) : (
        <CabecalhoVenda dados={dados} consulta={consulta} />
      )}
      <Avisos lista={avisosDaVenda(dados.venda, dados.calculos, dados.vinculos)} />
      {comFinanceiro && <Financeiro dados={dados} nivelBase={nivelBase} />}
    </>
  );
}
