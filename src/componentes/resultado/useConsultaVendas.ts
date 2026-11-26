"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useConsultando } from "@/componentes/moldura/consultando";
import type { ResultadoConsulta } from "@/contrato/tipos";
import { consultarVendas, ErroDaConsulta } from "@/lib/api/cliente";
import {
  cancelarEmAndamento,
  consultaEmAndamento,
  emAndamento,
  temPendente,
} from "@/lib/armazenamento/pendentes";
import { detalheRecenteDoPeriodo, registrarRecente } from "@/lib/armazenamento/recentes";
import { apagarResultado, guardarResultado, lerResultado } from "@/lib/armazenamento/resultados";
import { type Consulta, chaveConsulta, escreverConsulta, soNumero } from "@/lib/consulta/consulta";
import { tituloConsulta } from "@/lib/consulta/descricao";

export type EstadoDaConsulta =
  | "formulario-link"
  | "carregando"
  | "resultado"
  | "vazio"
  | "erro"
  | "invalida";

interface Situacao {
  /** `null` só antes da montagem: o armazenamento é lido depois dela, antes da pintura. */
  estado: EstadoDaConsulta | null;
  resultado: ResultadoConsulta | null;
  erro: ErroDaConsulta | null;
  atualizando: boolean;
  falhaAtualizar: ErroDaConsulta | null;
  tentadoAs: string | null;
}

export interface ConsultaVendas extends Situacao {
  consultar(): void;
  atualizar(): void;
  cancelar(): void;
}

const NADA: Situacao = {
  estado: null,
  resultado: null,
  erro: null,
  atualizando: false,
  falhaAtualizar: null,
  tentadoAs: null,
};

/**
 * A chamada em si, a mesma para consultar e atualizar: só com a resposta em mãos, e se não foi
 * abortada, guarda o resultado e registra a recente. Resposta vazia não é guardada e apaga o que
 * houver (Atualizar que volta vazio; recarregar mostra o 1c).
 */
async function iniciar(
  c: Consulta,
  chave: string,
  atualizar: boolean,
  sinal: AbortSignal,
): Promise<ResultadoConsulta> {
  const r = await consultarVendas(c, { sinal, atualizar });
  if (sinal.aborted) throw new ErroDaConsulta("cancelada");
  if (r.vendas.length === 0) {
    apagarResultado(chave);
    return r;
  }
  guardarResultado(chave, r);
  registrarRecente(
    {
      endereco: chave,
      descricao: tituloConsulta(c),
      detalhe: detalheRecenteDoPeriodo(r.vendas.length),
    },
    new Date(),
  );
  return r;
}

function comoErro(motivo: unknown): ErroDaConsulta {
  return motivo instanceof ErroDaConsulta
    ? motivo
    : new ErroDaConsulta("aplicacao", { causa: motivo });
}

/**
 * Os estados da consulta por período (decisões 1, 2 e 13 do plano 2). Só consulta com pedido
 * explícito ou chamada em andamento para a chave; com o resultado guardado, mostra-o; sem nada,
 * o formulário 1c. A busca do topo quem esconde é o próprio formulário, ao montar.
 */
export function useConsultaVendas(c: Consulta): ConsultaVendas {
  const roteador = useRouter();
  const { definir } = useConsultando();
  const chave = chaveConsulta(c);
  const [situacao, setSituacao] = useState<Situacao>(NADA);

  // A consulta mais recente, para o efeito depender só da chave (refinar muda o endereço, não a chave).
  const consultaAtual = useRef(c);
  // Cada chamada acompanhada e cada desmontagem avançam a vez: respostas de uma vez antiga são ignoradas.
  const vez = useRef(0);

  useLayoutEffect(() => {
    consultaAtual.current = c;
  });

  const acompanhar = useCallback((chaveDaVez: string, atualizar: boolean) => {
    const consulta = consultaAtual.current;
    const minhaVez = ++vez.current;
    const tentadoAs = new Date().toISOString();
    setSituacao((atual) =>
      atualizar
        ? { ...atual, atualizando: true, falhaAtualizar: null, tentadoAs }
        : { ...NADA, estado: "carregando", tentadoAs },
    );
    consultaEmAndamento(atualizar ? `${chaveDaVez}#atualizar` : chaveDaVez, (sinal) =>
      iniciar(consulta, chaveDaVez, atualizar, sinal),
    ).then(
      (r) => {
        if (minhaVez !== vez.current) return;
        setSituacao({
          ...NADA,
          estado: r.vendas.length === 0 ? "vazio" : "resultado",
          resultado: r,
          tentadoAs,
        });
      },
      (motivo: unknown) => {
        const erro = comoErro(motivo);
        if (erro.tipo === "cancelada" || minhaVez !== vez.current) return;
        if (atualizar) {
          setSituacao((atual) => ({ ...atual, atualizando: false, falhaAtualizar: erro }));
          return;
        }
        setSituacao({
          ...NADA,
          estado: erro.tipo === "invalida" ? "invalida" : "erro",
          erro,
          tentadoAs,
        });
      },
    );
  }, []);

  // Regras 1 a 4, de novo a cada chave. A limpeza não aborta: o modo estrito monta duas vezes e a
  // segunda montagem reusa a mesma chamada.
  useLayoutEffect(() => {
    const consulta = consultaAtual.current;
    if (soNumero(consulta)) {
      setSituacao(NADA);
      roteador.replace(`/reservas/${consulta.reserva}`);
    } else if (temPendente(chave) || emAndamento(chave)) {
      acompanhar(chave, false);
    } else {
      const guardado = lerResultado(chave);
      setSituacao(
        guardado
          ? { ...NADA, estado: "resultado", resultado: guardado }
          : { ...NADA, estado: "formulario-link" },
      );
    }
    return () => {
      vez.current += 1;
    };
  }, [chave, roteador, acompanhar]);

  // A faixa vale para os dois; o aria-busy do <main>, só para o carregando inicial (B5).
  const carregando = situacao.estado === "carregando";
  const ativo = carregando || situacao.atualizando;
  useEffect(() => {
    if (!ativo) return;
    definir(true, { ocupado: carregando });
    return () => definir(false);
  }, [ativo, carregando, definir]);

  const consultar = useCallback(() => acompanhar(chave, false), [acompanhar, chave]);
  const atualizar = useCallback(() => acompanhar(chave, true), [acompanhar, chave]);
  const cancelar = useCallback(() => {
    cancelarEmAndamento(chave);
    roteador.push(`/?${escreverConsulta(consultaAtual.current)}`);
  }, [chave, roteador]);

  return { ...situacao, consultar, atualizar, cancelar };
}
