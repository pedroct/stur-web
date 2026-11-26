"use client";

import type { VendaConsultada } from "@/contrato/tipos";
import type { ErroDaConsulta } from "@/lib/api/cliente";
import { classificacaoDe } from "@/lib/consulta/consulta";
import { avisosDaVenda } from "@/lib/venda/cabecalho";
import { caminhosDaConta } from "@/lib/venda/conta";
import { primeiroLocalizador } from "@/lib/venda/itinerario";
import { Avisos } from "./Avisos";
import { BlocoConta, GruposDoServico } from "./BlocoConta";
import { CabecalhoVenda } from "./CabecalhoVenda";
import { ConteudoDoProduto } from "./ConteudoDoProduto";
import { Financeiro } from "./Financeiro";
import type { NivelDeTitulo } from "./GrupoDeCampos";
import { Incentivo } from "./Incentivo";
import { Pessoa } from "./Pessoa";

export type ConsultaDaVenda = {
  atualizando: boolean;
  aoAtualizar(): void;
  falha: ErroDaConsulta | null;
};

/**
 * A venda. Casca: a Task 9 a completa (o conteúdo do produto, a pessoa e a conta já estão
 * aqui). Sozinha (`nivelBase` 1), o cabeçalho é o dela, com o título em h1 e a linha da consulta;
 * dentro da reserva (`naReserva`, `nivelBase` 2), o título desce para h2 e a linha da consulta,
 * com o Atualizar, fica na reserva, acima da lista (a Task 11 troca este título pelo cabeçalho da
 * venda aberta, que mantém o `data-titulo-venda`).
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
  const { venda, calculos } = dados;
  const numero = dados.reserva.numero;
  const cliente = venda.nomecliente ?? `Reserva ${numero}`;
  // A venda de incentivo tem o `Incentivo` no lugar do Financeiro, do conteúdo do produto, da
  // pessoa e da conta (tela 17).
  const comFinanceiro = calculos.tipo !== "incentivo";
  // Com um serviço só, a pessoa e os grupos da seção 5 ficam na página; com vários, no painel de
  // cada serviço, e a conta da página é a soma (decisões 22 e 23).
  const servicos = venda.detalheItem ?? [];
  const [servico] = servicos;
  const [conta] = calculos.servicos;
  const umServico = servicos.length === 1;
  const classificacao = venda.classificacaoproduto ?? null;
  const classe = classificacaoDe(classificacao) ?? "";
  // O card da hospedagem e o do veículo já trazem a pessoa como par.
  const cardComPessoa = ["hotelaria", "locacao"].includes(classe);
  // A observação do serviço único de Diversos e Pacote já está embaixo da tabela.
  const naPagina =
    umServico && servico !== undefined && conta !== undefined
      ? new Set([
          ...caminhosDaConta(conta, servico, classificacao),
          ...(["diversos", "pacote"].includes(classe) ? ["detalheItem[].observacao"] : []),
        ])
      : null;

  return (
    <>
      {naReserva ? (
        <section className="mt-10">
          <h2
            data-titulo-venda
            tabIndex={-1}
            className="text-[30px] leading-[38px] font-bold tracking-[-0.01em] outline-0"
          >
            {cliente}
          </h2>
        </section>
      ) : (
        <CabecalhoVenda dados={dados} consulta={consulta} />
      )}
      <Avisos lista={avisosDaVenda(venda, calculos, dados.vinculos)} />
      {!comFinanceiro && <Incentivo dados={dados} nivelBase={nivelBase} />}
      {comFinanceiro && <Financeiro dados={dados} nivelBase={nivelBase} />}
      {comFinanceiro && <ConteudoDoProduto dados={dados} nivelBase={nivelBase} />}
      {comFinanceiro && umServico && (
        <Pessoa
          venda={venda}
          indice={0}
          classificacao={classificacao}
          localizador={primeiroLocalizador(venda.trechos ?? [])}
          nivel={(nivelBase + 2) as NivelDeTitulo}
          semLinha={cardComPessoa}
        />
      )}
      {comFinanceiro && (
        <BlocoConta
          contas={calculos.servicos}
          servicos={servicos}
          classificacao={classificacao}
          situacao={venda.status ?? null}
          venda={venda}
          nivelBase={nivelBase}
        />
      )}
      {comFinanceiro && naPagina !== null && conta !== undefined && (
        <GruposDoServico
          venda={venda}
          calculos={calculos}
          indice={conta.indice}
          nivel={(nivelBase + 2) as NivelDeTitulo}
          excluir={naPagina}
        />
      )}
    </>
  );
}
