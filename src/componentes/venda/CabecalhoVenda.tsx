import type { LucideIcon } from "lucide-react";
import { Calendar, Check, Clock, Info } from "lucide-react";
import type { ReactNode } from "react";
import { dadosDoSeloTexto, Selo } from "@/componentes/comum/Selo";
import { FalhaAtualizar } from "@/componentes/estados/FalhaAtualizar";
import type { EstadoServico, VendaConsultada } from "@/contrato/tipos";
import { situacaoDe } from "@/lib/consulta/consulta";
import { formatarDadosAte } from "@/lib/formatacao";
import { diaEmFortaleza, formatarHora } from "@/lib/tempo";
import {
  apoioDoIncentivo,
  origemDaVenda,
  subtituloDaVenda,
  subtituloDoIncentivo,
} from "@/lib/venda/cabecalho";
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
 * O que o cabeçalho da venda mostra do grupo além do título e do subtítulo: no incentivo, o apoio
 * e o resto da Identificação (produto, classificação e categoria), como pares da seção 1 (RF-04).
 */
function ApoioDoIncentivo({ dados }: Readonly<{ dados: VendaConsultada }>) {
  const { venda, calculos } = dados;
  return (
    <>
      <p className="mt-1 text-[13px] leading-5 text-texto-auxiliar">{apoioDoIncentivo(venda)}</p>
      <RestoDoGrupo
        grupo="Identificação da venda"
        campos={camposSemMolde("Identificação da venda", ["incentivo"])}
        venda={venda}
        calculos={calculos}
        indices={[]}
        nivel={3}
      />
    </>
  );
}

/**
 * A venda aberta dentro da reserva (IA 6.10; telas 4, 6 e 7): os selos da situação e da origem, o
 * h2 "Venda {k} · {produto}" e o subtítulo. O cliente e a reserva já estão no h1 da página; aqui
 * ficam numa linha à direita, com "Dados do Stur até …" da venda, para a seção 1 inteira estar no
 * cabeçalho da venda (critério 8). O Atualizar e a falha ficam na reserva; as ações vão embaixo
 * dessa linha.
 */
function CabecalhoNaReserva({
  dados,
  acaoPrincipal,
  acaoSecundaria,
}: Readonly<{
  dados: VendaConsultada;
  acaoPrincipal?: ReactNode;
  acaoSecundaria?: ReactNode;
}>) {
  const { venda, calculos } = dados;
  const situacao = seloTextoDaSituacao(venda.status ?? null);
  const dadosDaSituacao = situacao === null ? null : dadosDoSeloTexto(situacao);
  const incentivo = calculos.tipo === "incentivo";
  const produto = venda.nomeproduto?.trim();
  const quem = (incentivo ? venda.nomefornec : venda.nomecliente)?.trim();
  return (
    <section
      data-anexo-secao="1"
      className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4"
    >
      <div className="min-w-0 flex-[1_1_35rem]">
        <div className="flex flex-wrap items-center gap-2">
          {incentivo && (
            <Selo tom="info" icone={Info}>
              Incentivo de fornecedor
            </Selo>
          )}
          {dadosDaSituacao !== null && (
            <Selo {...dadosDaSituacao}>{dadosDaSituacao.texto} no Stur</Selo>
          )}
          <Selo tom="neutro" icone={Info}>
            {origemDaVenda(venda)}
          </Selo>
        </div>
        {/* O foco volta para cá ao fechar um painel que veio por link (decisão 20). */}
        <h2
          data-titulo-venda
          tabIndex={-1}
          className="mt-2.5 text-[26px] leading-[34px] font-bold tracking-[-0.01em] outline-0"
        >
          Venda {dados.posicao}
          {produto ? ` · ${produto}` : ""}
        </h2>
        <p className="mt-0.5 text-base leading-6 text-texto-auxiliar">
          {incentivo ? subtituloDoIncentivo(venda) : subtituloDaVenda(venda)}
        </p>
        {incentivo && <ApoioDoIncentivo dados={dados} />}
      </div>
      <div className="flex flex-col items-end gap-1 text-right text-[13px] leading-5 text-texto-auxiliar tabular-nums">
        <p>
          Reserva {dados.reserva.numero}
          {quem ? ` · ${quem}` : ""}
        </p>
        {dados.dadosDoSturAte !== null && (
          <p>Dados do Stur até {formatarDadosAte(dados.dadosDoSturAte)}</p>
        )}
        {acaoPrincipal}
        {acaoSecundaria}
      </div>
    </section>
  );
}

/**
 * O topo da venda sozinha (IA 6.2; tela 3): reserva, os dois selos, o cliente em h1, o subtítulo,
 * a frase do estado e, à direita, as ações e a linha da consulta. Dentro da reserva
 * (`naReserva`), vale o `CabecalhoNaReserva`.
 */
export function CabecalhoVenda({
  dados,
  consulta,
  acaoPrincipal,
  acaoSecundaria,
  naReserva = false,
}: Readonly<{
  dados: VendaConsultada;
  consulta: ConsultaDaVenda;
  acaoPrincipal?: ReactNode;
  acaoSecundaria?: ReactNode;
  naReserva?: boolean;
}>) {
  if (naReserva) {
    return (
      <CabecalhoNaReserva
        dados={dados}
        acaoPrincipal={acaoPrincipal}
        acaoSecundaria={acaoSecundaria}
      />
    );
  }
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
          {incentivo && <ApoioDoIncentivo dados={dados} />}
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
