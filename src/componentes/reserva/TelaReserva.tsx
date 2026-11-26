"use client";

import { useRouter } from "next/navigation";
import { EstadoErro } from "@/componentes/estados/EstadoErro";
import { FalhaAtualizar } from "@/componentes/estados/FalhaAtualizar";
import { LinhaStatus } from "@/componentes/estados/LinhaStatus";
import { CopiarDaReserva, CopiarDaVenda } from "@/componentes/venda/CopiarParaEnviar";
import { EsqueletoVenda } from "@/componentes/venda/EsqueletoVenda";
import { LinhaConsulta } from "@/componentes/venda/LinhaConsulta";
import type { EstadoVenda } from "@/componentes/venda/useReservaVenda";
import { type ConsultaDaVenda, Venda } from "@/componentes/venda/Venda";
import type { ReservaConsultada } from "@/contrato/tipos";
import type { ErroDaConsulta } from "@/lib/api/cliente";
import { useParametros } from "@/lib/api/parametros";
import { comTentarDeNovo, textosDoErro } from "@/lib/api/textos-erro";
import { contagemDasVendas } from "@/lib/reserva/tabela";
import { diaEmFortaleza, formatarHora } from "@/lib/tempo";
import { enderecoDaReserva } from "@/lib/venda/rota";
import { BarraDeTroca } from "./BarraDeTroca";
import { CabecalhoReserva } from "./CabecalhoReserva";
import { FinanceiroReserva } from "./FinanceiroReserva";
import { ID_DA_VENDA_ABERTA, TabelaVendas, useRolagemAteAVenda } from "./TabelaVendas";

export type VendaAberta = {
  idreserva: number;
  estado: EstadoVenda;
  aoTentar(): void;
};

/** 12c: "A venda {k} não abriu: {frase do erro}", e a sugestão de tentar só quando cabe. */
function mensagemDaVenda(k: number, erro: ErroDaConsulta, segundos: number): string {
  const frase = textosDoErro(erro.tipo).frase(segundos);
  const minuscula = `${frase.charAt(0).toLowerCase()}${frase.slice(1)}`;
  const tentar = comTentarDeNovo(erro.tipo) ? " Tente de novo em alguns minutos." : "";
  return `A venda ${k} não abriu: ${minuscula}${tentar}`;
}

/** A venda aberta logo abaixo da tabela: pronta, carregando (com a linha de status) ou com erro (12c). */
function VendaAbaixo({
  vendaAberta,
  numero,
  posicao,
  total,
  consulta,
}: Readonly<{
  vendaAberta: VendaAberta;
  numero: number;
  posicao: number;
  total: number;
  consulta: ConsultaDaVenda;
}>) {
  const roteador = useRouter();
  const { tempoLimiteSegundos } = useParametros();
  useRolagemAteAVenda(vendaAberta.idreserva);
  const { estado, erro, dados } = vendaAberta.estado;

  function conteudo() {
    if (estado === "pronta" && dados) {
      return <Venda dados={dados} naReserva nivelBase={2} consulta={consulta} />;
    }
    if (estado === "erro" && erro) {
      return (
        <EstadoErro
          erro={erro}
          nivelTitulo="h2"
          mensagem={mensagemDaVenda(posicao, erro, tempoLimiteSegundos)}
          aoTentar={vendaAberta.aoTentar}
          alterarHref={`/?reserva=${numero}`}
          acaoExtra={{
            rotulo: `Ver as ${total} vendas`,
            aoClicar: () => roteador.push(enderecoDaReserva(numero)),
          }}
        />
      );
    }
    return (
      <>
        <LinhaStatus
          texto={`Consultando a venda ${posicao} na API do Stur. Pode levar até ${tempoLimiteSegundos} segundos.`}
        />
        <EsqueletoVenda />
      </>
    );
  }

  return (
    <div
      id={ID_DA_VENDA_ABERTA}
      className="mt-8 scroll-mt-28 border-t-2 border-texto-principal pt-5"
    >
      {conteudo()}
    </div>
  );
}

/**
 * A reserva com duas ou mais vendas (IA 6.10): cabeçalho, Financeiro e "Vendas desta reserva".
 * Sem venda aberta, a tabela inteira; com uma, a faixa do Financeiro, a barra de troca presa no
 * topo e a venda logo abaixo. A linha da consulta mostra o `consultadoEm` da venda aberta, que é o
 * mais novo, e o Atualizar espera a venda aberta chegar. O "Copiar para enviar" é um só: copia a
 * venda aberta, quando ela já chegou, e a reserva nos outros casos (decisão 18).
 */
export function TelaReserva({
  dados,
  vendaAberta,
  consulta,
}: Readonly<{
  dados: ReservaConsultada;
  vendaAberta: VendaAberta | null;
  consulta: ConsultaDaVenda;
}>) {
  const { numero, vendas } = dados.reserva;
  const daVenda = vendaAberta?.estado.dados;
  const consultadoEm = daVenda?.consultadoEm ?? dados.consultadoEm;
  const dadosDoSturAte = daVenda ? daVenda.dadosDoSturAte : dados.dadosDoSturAte;
  const hoje = diaEmFortaleza(consultadoEm);
  // Com a venda aberta carregando ou com erro, o Atualizar não teria o que pedir.
  const esperandoVenda = vendaAberta !== null && vendaAberta.estado.estado !== "pronta";
  const posicao = vendas.find((v) => v.resumo.idreserva === vendaAberta?.idreserva)?.posicao;

  return (
    <>
      <CabecalhoReserva
        reserva={dados.reserva}
        hoje={hoje}
        acao={daVenda ? <CopiarDaVenda dados={daVenda} /> : <CopiarDaReserva dados={dados} />}
      >
        <LinhaConsulta
          consultadoEm={consultadoEm}
          dadosDoSturAte={dadosDoSturAte}
          atualizando={consulta.atualizando || esperandoVenda}
          aoAtualizar={consulta.aoAtualizar}
        />
      </CabecalhoReserva>
      {consulta.falha && (
        <div className="mt-4">
          <FalhaAtualizar
            erro={consulta.falha}
            consultadoAs={formatarHora(consultadoEm)}
            aoTentar={consulta.aoAtualizar}
          />
        </div>
      )}

      <FinanceiroReserva reserva={dados.reserva} hoje={hoje} vendaAberta={vendaAberta !== null} />

      {/* Uma seção só para a barra e a venda: a barra fica presa enquanto a venda rola. */}
      <section aria-labelledby="vendas-da-reserva" className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="vendas-da-reserva" className="text-xl leading-7 font-semibold">
            Vendas desta reserva
          </h2>
          <span className="text-sm text-texto-auxiliar tabular-nums">
            {contagemDasVendas(dados.reserva)}
          </span>
        </div>
        {vendaAberta === null || posicao === undefined ? (
          <TabelaVendas reserva={dados.reserva} hoje={hoje} />
        ) : (
          <>
            <BarraDeTroca reserva={dados.reserva} hoje={hoje} aberta={vendaAberta.idreserva} />
            <VendaAbaixo
              vendaAberta={vendaAberta}
              numero={numero}
              posicao={posicao}
              total={vendas.length}
              consulta={consulta}
            />
          </>
        )}
      </section>
    </>
  );
}
