"use client";

import type { VendaConsultada } from "@/contrato/tipos";
import type { ErroDaConsulta } from "@/lib/api/cliente";
import { classificacaoDe } from "@/lib/consulta/consulta";
import { avisosDaVenda } from "@/lib/venda/cabecalho";
import { primeiroLocalizador } from "@/lib/venda/itinerario";
import { Avisos } from "./Avisos";
import { CabecalhoVenda } from "./CabecalhoVenda";
import { ConteudoDoProduto } from "./ConteudoDoProduto";
import { Financeiro } from "./Financeiro";
import type { NivelDeTitulo } from "./GrupoDeCampos";
import { Pessoa } from "./Pessoa";

export type ConsultaDaVenda = {
  atualizando: boolean;
  aoAtualizar(): void;
  falha: ErroDaConsulta | null;
};

/**
 * A venda. Casca: as Tasks 7 a 9 a completam (o conteúdo do produto e a pessoa já estão aqui).
 * Sozinha (`nivelBase` 1), o cabeçalho é o dela, com o título em h1 e a linha da consulta; dentro
 * da reserva (`naReserva`, `nivelBase` 2), o título
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
  // O Financeiro e o conteúdo da venda de incentivo são outros: a Task 8 os monta no lugar destes.
  const comFinanceiro = dados.calculos.tipo !== "incentivo";
  // Com um serviço só, a pessoa fica na página; com vários, no painel de cada serviço (decisão 22).
  const umServico = (dados.venda.detalheItem ?? []).length === 1;
  const classificacao = dados.venda.classificacaoproduto ?? null;
  // O card da hospedagem e o do veículo já trazem a pessoa como par.
  const cardComPessoa = ["hotelaria", "locacao"].includes(classificacaoDe(classificacao) ?? "");

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
      {comFinanceiro && <ConteudoDoProduto dados={dados} nivelBase={nivelBase} />}
      {comFinanceiro && umServico && (
        <Pessoa
          venda={dados.venda}
          indice={0}
          classificacao={classificacao}
          localizador={primeiroLocalizador(dados.venda.trechos ?? [])}
          nivel={(nivelBase + 2) as NivelDeTitulo}
          semLinha={cardComPessoa}
        />
      )}
    </>
  );
}
