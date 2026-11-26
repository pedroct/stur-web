import type { LucideIcon } from "lucide-react";
import { Calendar, Check, Clock, Info } from "lucide-react";
import type { ReactNode } from "react";
import { dadosDoSeloTexto, Selo } from "@/componentes/comum/Selo";
import { FalhaAtualizar } from "@/componentes/estados/FalhaAtualizar";
import type { EstadoServico, VendaConsultada } from "@/contrato/tipos";
import { situacaoDe } from "@/lib/consulta/consulta";
import { diaEmFortaleza, formatarHora } from "@/lib/tempo";
import { apoioDoIncentivo, subtituloDaVenda, subtituloDoIncentivo } from "@/lib/venda/cabecalho";
import { fraseDoEstado, textoDoEstado } from "@/lib/venda/estado";
import { camposSemMolde } from "@/lib/venda/moldes";
import { seloTextoDaSituacao } from "@/lib/venda/situacao";
import { LinhaConsulta } from "./LinhaConsulta";
import { RestoDoGrupo } from "./produto-comum";
import type { ConsultaDaVenda } from "./Venda";

const ICONE_DO_ESTADO: Record<EstadoServico["estado"], LucideIcon> = {
  a_acontecer: Calendar,
  em_andamento: Clock,
  concluido: Check,
};

function SeloDoEstado({ dados }: Readonly<{ dados: VendaConsultada }>) {
  const { venda, calculos } = dados;
  const estado = calculos.estadoServico;
  if (estado === null || situacaoDe(venda.status ?? null) === "cancelada") return null;
  const texto = textoDoEstado(
    estado,
    venda.classificacaoproduto ?? null,
    venda.nomeproduto ?? null,
    diaEmFortaleza(dados.consultadoEm),
  );
  return (
    <Selo tom="neutro" icone={ICONE_DO_ESTADO[estado.estado]}>
      {texto}
    </Selo>
  );
}

/**
 * O topo da venda sozinha (IA 6.2; tela 3): reserva, os dois selos, o cliente em h1, o subtítulo,
 * a frase do estado e, à direita, as ações e a linha da consulta. Dentro da reserva, a Task 11
 * troca este cabeçalho pelo da venda aberta.
 */
export function CabecalhoVenda({
  dados,
  consulta,
  acaoPrincipal,
  acaoSecundaria,
}: Readonly<{
  dados: VendaConsultada;
  consulta: ConsultaDaVenda;
  acaoPrincipal?: ReactNode;
  acaoSecundaria?: ReactNode;
}>) {
  const { venda, calculos } = dados;
  const situacao = seloTextoDaSituacao(venda.status ?? null);
  const dadosDaSituacao = situacao === null ? null : dadosDoSeloTexto(situacao);
  const estado = calculos.estadoServico;
  const incentivo = calculos.tipo === "incentivo";
  const mostraEstado =
    !incentivo && estado !== null && situacaoDe(venda.status ?? null) !== "cancelada";

  return (
    <>
      <section
        data-anexo-secao="1"
        className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
      >
        <div className="min-w-0 flex-[1_1_35rem]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold tabular-nums">
              Reserva {dados.reserva.numero}
            </span>
            {incentivo && (
              <Selo tom="info" icone={Info}>
                Incentivo de fornecedor
              </Selo>
            )}
            {dadosDaSituacao !== null && (
              <Selo {...dadosDaSituacao}>{dadosDaSituacao.texto} no Stur</Selo>
            )}
            {!incentivo && <SeloDoEstado dados={dados} />}
          </div>
          {/* O foco volta para cá ao fechar um painel que veio por link (decisão 20). */}
          <h1
            data-titulo-venda
            tabIndex={-1}
            className="mt-3 text-4xl leading-11 font-bold tracking-[-0.01em] outline-0"
          >
            {(incentivo ? venda.nomefornec : venda.nomecliente) ??
              `Reserva ${dados.reserva.numero}`}
          </h1>
          <p className="mt-1.5 text-base leading-6 text-texto-auxiliar">
            {incentivo ? subtituloDoIncentivo(venda) : subtituloDaVenda(venda)}
          </p>
          {incentivo && (
            <p className="mt-1 text-[13px] leading-5 text-texto-auxiliar">
              {apoioDoIncentivo(venda)}
            </p>
          )}
          {incentivo && (
            // O que o cabeçalho do incentivo não escreve do grupo (produto, classificação e
            // categoria), como pares da seção 1 (RF-04).
            <RestoDoGrupo
              grupo="Identificação da venda"
              campos={camposSemMolde("Identificação da venda", ["incentivo"])}
              venda={venda}
              calculos={calculos}
              indices={[]}
              nivel={3}
            />
          )}
          {mostraEstado && (
            <p className="mt-1 text-[13px] leading-5 text-texto-auxiliar">
              {fraseDoEstado(estado, venda.classificacaoproduto ?? null, venda.nomeproduto ?? null)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          {acaoPrincipal}
          <LinhaConsulta
            consultadoEm={dados.consultadoEm}
            dadosDoSturAte={dados.dadosDoSturAte}
            atualizando={consulta.atualizando}
            aoAtualizar={consulta.aoAtualizar}
          />
          {acaoSecundaria}
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
