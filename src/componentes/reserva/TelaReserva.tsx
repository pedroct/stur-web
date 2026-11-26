"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { EstadoErro } from "@/componentes/estados/EstadoErro";
import { FalhaAtualizar } from "@/componentes/estados/FalhaAtualizar";
import { EsqueletoVenda } from "@/componentes/venda/EsqueletoVenda";
import { LinhaConsulta } from "@/componentes/venda/LinhaConsulta";
import type { EstadoVenda } from "@/componentes/venda/useReservaVenda";
import { type ConsultaDaVenda, Venda } from "@/componentes/venda/Venda";
import type { ReservaConsultada } from "@/contrato/tipos";
import { diaEmFortaleza, formatarHora } from "@/lib/tempo";
import { enderecoDaVenda } from "@/lib/venda/rota";
import { CabecalhoReserva } from "./CabecalhoReserva";
import { FinanceiroReserva } from "./FinanceiroReserva";

export type VendaAberta = {
  idreserva: number;
  estado: EstadoVenda;
  aoTentar(): void;
};

const LINK =
  "rounded-pequeno font-semibold text-texto-principal underline underline-offset-2 outline-0 hover:text-acao-primaria focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

/** Só o clique simples navega por aqui; com Ctrl, ⌘ ou Shift, o link abre como o navegador quiser. */
function cliqueSimples(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

function VendaAbaixo({
  vendaAberta,
  numero,
  consulta,
}: Readonly<{ vendaAberta: VendaAberta; numero: number; consulta: ConsultaDaVenda }>) {
  const { estado, erro, dados } = vendaAberta.estado;
  if (estado === "pronta" && dados) {
    return <Venda dados={dados} naReserva nivelBase={2} consulta={consulta} />;
  }
  if (estado === "erro" && erro) {
    return (
      <EstadoErro erro={erro} aoTentar={vendaAberta.aoTentar} alterarHref={`/?reserva=${numero}`} />
    );
  }
  return <EsqueletoVenda />;
}

/**
 * A reserva com duas ou mais vendas: cabeçalho, Financeiro e lançamentos (decisões 12 e 15). A
 * lista de vendas é a da casca, até a Task 11 trocá-la pela tabela. Com uma venda aberta, a linha
 * da consulta mostra o `consultadoEm` dela, que é o mais novo, e a venda vem embaixo.
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
  const roteador = useRouter();
  const { numero, vendas } = dados.reserva;
  const daVenda = vendaAberta?.estado.dados;
  const consultadoEm = daVenda?.consultadoEm ?? dados.consultadoEm;
  const dadosDoSturAte = daVenda ? daVenda.dadosDoSturAte : dados.dadosDoSturAte;
  const hoje = diaEmFortaleza(consultadoEm);

  return (
    <>
      <CabecalhoReserva reserva={dados.reserva} hoje={hoje}>
        <LinhaConsulta
          consultadoEm={consultadoEm}
          dadosDoSturAte={dadosDoSturAte}
          atualizando={consulta.atualizando}
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

      <ul className="mt-6 flex flex-col gap-2 text-sm leading-5">
        {vendas.map(({ resumo, posicao }) => {
          const href = enderecoDaVenda(numero, resumo.idreserva);
          const produto = resumo.produto ? ` · ${resumo.produto}` : "";
          const aberta = vendaAberta?.idreserva === resumo.idreserva;
          return (
            <li key={resumo.idreserva} className="flex min-h-alvo items-center">
              <Link
                href={href}
                aria-current={aberta ? "page" : undefined}
                className={LINK}
                onClick={(e) => {
                  if (!cliqueSimples(e)) return;
                  e.preventDefault();
                  roteador.push(href);
                }}
              >
                Venda {posicao} de {vendas.length}
                {produto}
              </Link>
            </li>
          );
        })}
      </ul>

      {vendaAberta && <VendaAbaixo vendaAberta={vendaAberta} numero={numero} consulta={consulta} />}
    </>
  );
}
