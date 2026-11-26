"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EstadoErro } from "@/componentes/estados/EstadoErro";
import { LinhaStatus } from "@/componentes/estados/LinhaStatus";
import { NenhumaVenda } from "@/componentes/estados/NenhumaVenda";
import { Caminho } from "@/componentes/moldura/Caminho";
import { useConsultando } from "@/componentes/moldura/consultando";
import type { ReservaConsultada } from "@/contrato/tipos";
import { consultarReserva, ErroDaConsulta } from "@/lib/api/cliente";
import { useParametros } from "@/lib/api/parametros";
import { cancelarEmAndamento, consultaEmAndamento } from "@/lib/armazenamento/pendentes";
import { detalheRecenteDaReserva, registrarRecente } from "@/lib/armazenamento/recentes";
import { CONSULTA_VAZIA, numeroDaReserva } from "@/lib/consulta/consulta";
import {
  rodapeErro,
  textoCarregando,
  textoDadosAteSemVendas,
  textoSemVendas,
  textoSemVendasNumero,
} from "@/lib/consulta/descricao";
import { formatarHora } from "@/lib/tempo";
import { numeroDaRota, ReservaProvisoria } from "./ReservaProvisoria";

type Situacao =
  | { tipo: "carregando" }
  | { tipo: "vazio"; resposta: ReservaConsultada }
  | { tipo: "recusado" }
  | { tipo: "erro"; erro: ErroDaConsulta; tentadoAs: string }
  | { tipo: "varias-vendas" };

const CARREGANDO: Situacao = { tipo: "carregando" };

/**
 * A chamada em si: só com a resposta em mãos, e se não foi abortada, registra a recente (reserva
 * sem vendas não entra). Quem a guarda na memória do módulo é `consultaEmAndamento`.
 */
async function iniciar(numero: number, sinal: AbortSignal): Promise<ReservaConsultada> {
  const resposta = await consultarReserva(numero, { sinal });
  if (sinal.aborted) throw new ErroDaConsulta("cancelada");
  const { vendas } = resposta.reserva;
  if (vendas.length > 0) {
    registrarRecente(
      {
        endereco: `/reservas/${numero}`,
        descricao: `Reserva ${numero}`,
        detalhe: detalheRecenteDaReserva(vendas),
      },
      new Date(),
    );
  }
  return resposta;
}

function comoErro(motivo: unknown): ErroDaConsulta {
  return motivo instanceof ErroDaConsulta
    ? motivo
    : new ErroDaConsulta("aplicacao", { causa: motivo });
}

/** Texto sem algarismos, ou número que o backend recusa (422): a tela 13, sem "Consultado às". */
function NumeroRecusado({
  numeroTexto,
  alterarHref,
}: Readonly<{
  numeroTexto: string;
  alterarHref: string;
}>) {
  return (
    <NenhumaVenda
      caminho={[{ rotulo: `Reserva ${numeroTexto}` }]}
      mensagem={textoSemVendasNumero(numeroTexto)}
      complemento={null}
      alterarHref={alterarHref}
    />
  );
}

/**
 * `/reservas/{número}`: a regra única de entrada por número (P7). Nenhuma venda, tela 13; uma,
 * abre a venda no lugar desta página; duas ou mais, a reserva (provisória até o plano 3).
 */
export function PaginaReserva({ numeroTexto }: Readonly<{ numeroTexto: string }>) {
  const roteador = useRouter();
  const { definir } = useConsultando();
  const { tempoLimiteSegundos } = useParametros();
  const numero = numeroDaReserva(numeroTexto);
  const [situacao, setSituacao] = useState<Situacao>(CARREGANDO);
  // Cada chamada acompanhada e cada desmontagem avançam a vez: respostas de uma vez antiga são ignoradas.
  const vez = useRef(0);

  const consultar = useCallback(
    (n: number) => {
      const minhaVez = ++vez.current;
      const tentadoAs = new Date().toISOString();
      setSituacao(CARREGANDO);
      consultaEmAndamento(`/reservas/${n}`, (sinal) => iniciar(n, sinal)).then(
        (resposta) => {
          if (minhaVez !== vez.current) return;
          const { vendas } = resposta.reserva;
          const [unica] = vendas;
          if (vendas.length === 0) setSituacao({ tipo: "vazio", resposta });
          else if (vendas.length === 1 && unica)
            roteador.replace(`/reservas/${n}/vendas/${unica.resumo.idreserva}`);
          else setSituacao({ tipo: "varias-vendas" });
        },
        (error: unknown) => {
          const erro = comoErro(error);
          if (erro.tipo === "cancelada" || minhaVez !== vez.current) return;
          setSituacao(
            erro.tipo === "invalida" ? { tipo: "recusado" } : { tipo: "erro", erro, tentadoAs },
          );
        },
      );
    },
    [roteador],
  );

  // A limpeza não aborta: o modo estrito monta duas vezes e a segunda montagem reusa a chamada.
  useEffect(() => {
    if (numero !== null) consultar(numero);
    return () => {
      vez.current += 1;
    };
  }, [numero, consultar]);

  const carregando = numero !== null && situacao.tipo === "carregando";
  useEffect(() => {
    if (!carregando) return;
    definir(true);
    return () => definir(false);
  }, [carregando, definir]);

  const alterarHref = `/?reserva=${numero ?? encodeURIComponent(numeroTexto)}`;
  if (numero === null)
    return <NumeroRecusado numeroTexto={numeroTexto} alterarHref={alterarHref} />;

  const niveis = [{ rotulo: `Reserva ${numeroTexto}` }];
  const consulta = { ...CONSULTA_VAZIA, reserva: numero };

  switch (situacao.tipo) {
    case "carregando":
      return (
        <>
          <Caminho niveis={niveis} />
          <div className="mt-4">
            <LinhaStatus
              texto={textoCarregando(consulta, tempoLimiteSegundos)}
              aoCancelar={() => {
                cancelarEmAndamento(`/reservas/${numero}`);
                roteador.push(alterarHref);
              }}
            />
          </div>
        </>
      );
    case "vazio":
      return (
        <NenhumaVenda
          caminho={niveis}
          mensagem={textoSemVendas(consulta)}
          complemento={textoDadosAteSemVendas(consulta, situacao.resposta.dadosDoSturAte)}
          alterarHref={alterarHref}
          consultadoAs={formatarHora(situacao.resposta.consultadoEm)}
        />
      );
    case "recusado":
      return <NumeroRecusado numeroTexto={numeroTexto} alterarHref={alterarHref} />;
    case "erro":
      return (
        <>
          <Caminho niveis={niveis} />
          <EstadoErro
            erro={situacao.erro}
            rodape={rodapeErro(consulta, formatarHora(situacao.tentadoAs))}
            aoTentar={() => consultar(numero)}
            alterarHref={alterarHref}
          />
        </>
      );
    case "varias-vendas":
      return <ReservaProvisoria numero={numeroTexto} />;
  }
}

/** A rota `/reservas/[numero]`: no Next 16 o `params` da página é uma promessa; o cliente usa o hook. */
export function PaginaReservaDaRota() {
  const { numero } = useParams<{ numero: string }>();
  return <PaginaReserva numeroTexto={numeroDaRota(numero)} />;
}
