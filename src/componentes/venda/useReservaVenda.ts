"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { useConsultando } from "@/componentes/moldura/consultando";
import type { ReservaConsultada, VendaConsultada, VendaDaReserva } from "@/contrato/tipos";
import {
  consultarDadoCru,
  consultarReserva,
  consultarVenda,
  ErroDaConsulta,
} from "@/lib/api/cliente";
import {
  assinarPendentes,
  cancelarEmAndamento,
  consultaEmAndamento,
} from "@/lib/armazenamento/pendentes";
import { detalheRecenteDaReserva, registrarRecente } from "@/lib/armazenamento/recentes";
import { numeroDaReserva } from "@/lib/consulta/consulta";
import { enderecoDaReserva, enderecoDaVenda, type Rota } from "@/lib/venda/rota";

/** `chegouEm`: o instante, pelo relógio do navegador, em que o JSON chegou. */
export type DadoCru = {
  estado: "carregando" | "pronto" | "erro";
  texto?: string;
  chegouEm?: string;
  erro?: ErroDaConsulta;
};

export type EstadoVenda = {
  estado: "carregando" | "pronta" | "erro";
  dados?: VendaConsultada;
  erro?: ErroDaConsulta;
  dadoCru?: DadoCru;
};

export type FaseReservaVenda = "invalido" | "carregando" | "erro" | "sem-vendas" | "pronta";

export interface ReservaVenda {
  fase: FaseReservaVenda;
  reserva: ReservaConsultada | null;
  erro: ErroDaConsulta | null;
  /** Quando a chamada que falhou começou: vai no rodapé da tela 12. */
  tentadoAs: string | null;
  vendas: Map<number, EstadoVenda>;
  falhaAtualizar: ErroDaConsulta | null;
  atualizando: boolean;
  atualizar(): void;
  tentarDeNovo(): void;
  cancelar(): void;
  /** O JSON da venda, uma vez só: já pedido ou em andamento, não pede de novo; com erro, pede. */
  carregarDadoCru(id: number): void;
}

/** A primeira carga da página, pela reserva ou pela venda; com a reserva na memória, `ociosa`. */
type Carga = "ociosa" | "carregando" | "erro" | "invalido";

/** `primeira`: sem reserva na memória; `dentro`: outra venda da reserva; `atualizar`: o botão. */
type Modo = "primeira" | "dentro" | "atualizar";

interface Estado {
  geracao: number;
  reserva: ReservaConsultada | null;
  carga: Carga;
  erro: ErroDaConsulta | null;
  tentadoAs: string | null;
  vendas: Map<number, EstadoVenda>;
  atualizando: boolean;
  /** `alvo`: a venda que o Atualizar pediu, ou `null` para a reserva. */
  falha: { alvo: number | null; erro: ErroDaConsulta } | null;
}

type Acao =
  | { tipo: "recomecar"; geracao: number }
  | { tipo: "carregando-reserva"; geracao: number; tentadoAs: string }
  | { tipo: "carregando-venda"; geracao: number; id: number; tentadoAs: string; primeira: boolean }
  | { tipo: "atualizando"; geracao: number }
  | { tipo: "reserva-chegou"; geracao: number; resposta: ReservaConsultada }
  | { tipo: "venda-chegou"; geracao: number; id: number; dados: VendaConsultada; modo: Modo }
  | { tipo: "falhou"; geracao: number; id: number | null; erro: ErroDaConsulta; modo: Modo }
  | { tipo: "dado-cru"; geracao: number; id: number; dadoCru: DadoCru };

function inicial(geracao: number): Estado {
  return {
    geracao,
    reserva: null,
    carga: "ociosa",
    erro: null,
    tentadoAs: null,
    vendas: new Map(),
    atualizando: false,
    falha: null,
  };
}

function comVenda(vendas: Map<number, EstadoVenda>, id: number, venda: EstadoVenda) {
  return new Map(vendas).set(id, venda);
}

/** A venda traz a reserva junto; vale a resposta mais nova. */
function reservaDaVenda(dados: VendaConsultada): ReservaConsultada {
  return {
    numero: dados.reserva.numero,
    consultadoEm: dados.consultadoEm,
    dadosDoSturAte: dados.dadosDoSturAte,
    reserva: dados.reserva,
  };
}

function falhou(e: Estado, { id, erro, modo }: Extract<Acao, { tipo: "falhou" }>): Estado {
  if (modo === "atualizar") return { ...e, atualizando: false, falha: { alvo: id, erro } };
  if (modo === "primeira" && erro.tipo === "invalida") return { ...e, carga: "invalido" };
  const vendas = id === null ? e.vendas : comVenda(e.vendas, id, { estado: "erro", erro });
  if (modo === "dentro") return { ...e, vendas };
  // A venda que não é do número não é erro da consulta: a página mostra a decisão 21. Na chamada
  // da reserva (`id` nulo), é erro: ociosa, a entrada pediria a reserva de novo, sem fim.
  if (erro.tipo === "nao_encontrada" && id !== null) return { ...e, vendas, carga: "ociosa" };
  return { ...e, vendas, carga: "erro", erro };
}

function reduzir(e: Estado, acao: Acao): Estado {
  if (acao.tipo === "recomecar") return inicial(acao.geracao);
  if (acao.geracao !== e.geracao) return e; // resposta de antes do recomeço
  switch (acao.tipo) {
    case "carregando-reserva":
      return { ...e, carga: "carregando", erro: null, tentadoAs: acao.tentadoAs };
    case "carregando-venda":
      return {
        ...e,
        vendas: comVenda(e.vendas, acao.id, { estado: "carregando" }),
        tentadoAs: acao.tentadoAs,
        ...(acao.primeira ? { carga: "carregando" as const, erro: null } : {}),
      };
    case "atualizando":
      return { ...e, atualizando: true, falha: null };
    case "reserva-chegou":
      // As vendas guardadas saem: são pedidas de novo ao abrir.
      return {
        ...e,
        reserva: acao.resposta,
        carga: "ociosa",
        erro: null,
        vendas: new Map(),
        atualizando: false,
        falha: null,
      };
    case "venda-chegou": {
      const pronta: EstadoVenda = { estado: "pronta", dados: acao.dados };
      const atualizar = acao.modo === "atualizar";
      return {
        ...e,
        reserva: reservaDaVenda(acao.dados),
        carga: "ociosa",
        erro: null,
        vendas: atualizar ? new Map([[acao.id, pronta]]) : comVenda(e.vendas, acao.id, pronta),
        ...(atualizar ? { atualizando: false, falha: null } : {}),
      };
    }
    case "falhou":
      return falhou(e, acao);
    case "dado-cru": {
      // Só a venda pronta guarda o dado cru; a atualizada o perde e o pede de novo.
      const venda = e.vendas.get(acao.id);
      if (venda?.estado !== "pronta") return e;
      return { ...e, vendas: comVenda(e.vendas, acao.id, { ...venda, dadoCru: acao.dadoCru }) };
    }
  }
}

function comoErro(motivo: unknown): ErroDaConsulta {
  return motivo instanceof ErroDaConsulta
    ? motivo
    : new ErroDaConsulta("aplicacao", { causa: motivo });
}

function registrarReserva(numero: number, vendas: VendaDaReserva[]): void {
  if (vendas.length === 0) return; // reserva sem vendas não entra nas recentes
  registrarRecente(
    {
      endereco: enderecoDaReserva(numero),
      descricao: `Reserva ${numero}`,
      detalhe: detalheRecenteDaReserva(vendas),
    },
    new Date(),
  );
}

/**
 * As chamadas em si: só com a resposta em mãos, e se não foram abortadas, registram a recente da
 * reserva, na primeira carga (pela reserva ou pela venda). Quem as guarda na memória do módulo é
 * `consultaEmAndamento`, e o modo estrito reusa a mesma chamada.
 */
async function pedirReserva(
  numero: number,
  registrar: boolean,
  sinal: AbortSignal,
): Promise<ReservaConsultada> {
  const resposta = await consultarReserva(numero, { sinal });
  if (sinal.aborted) throw new ErroDaConsulta("cancelada");
  if (registrar) registrarReserva(numero, resposta.reserva.vendas);
  return resposta;
}

async function pedirVenda(
  numero: number,
  id: number,
  registrar: boolean,
  sinal: AbortSignal,
): Promise<VendaConsultada> {
  const dados = await consultarVenda(numero, id, { sinal });
  if (sinal.aborted) throw new ErroDaConsulta("cancelada");
  if (registrar) registrarReserva(numero, dados.reserva.vendas);
  return dados;
}

function situar(
  numero: number | null,
  rota: Rota | null,
  e: Estado,
): { fase: FaseReservaVenda; erro: ErroDaConsulta | null } {
  const carregando = { fase: "carregando", erro: null } as const;
  if (numero === null || rota === null || e.carga === "invalido") {
    return { fase: "invalido", erro: null };
  }
  const aberta = rota.tipo === "venda" ? e.vendas.get(rota.idreserva) : undefined;
  if (e.reserva === null) {
    if (e.carga === "erro") return { fase: "erro", erro: e.erro };
    if (aberta?.estado === "erro") return { fase: "erro", erro: aberta.erro ?? null };
    return carregando;
  }
  const lista = e.reserva.reserva.vendas;
  if (lista.length === 0) return { fase: "sem-vendas", erro: null };
  const [unica] = lista;
  if (lista.length === 1 && unica) {
    // A reserva de uma venda só é a venda: o `replace` para ela está a caminho.
    if (rota.tipo === "reserva") return carregando;
    if (rota.idreserva === unica.resumo.idreserva) {
      if (aberta?.estado === "erro") return { fase: "erro", erro: aberta.erro ?? null };
      if (aberta?.estado !== "pronta") return carregando;
    }
  }
  return { fase: "pronta", erro: null };
}

/**
 * O estado da reserva e das vendas, que fica no layout de `[numero]` enquanto o endereço troca
 * de venda, serviço ou dado cru (decisão 16): venda já carregada não é pedida de novo.
 */
export function useReservaVenda(numeroTexto: string, rota: Rota | null): ReservaVenda {
  const roteador = useRouter();
  const { definir } = useConsultando();
  const numero = numeroDaReserva(numeroTexto);
  const [estado, despachar] = useReducer(reduzir, 0, inicial);

  // O estado e a rota mais recentes, para os tratadores; a geração avança já no recomeço.
  const atual = useRef(estado);
  const rotaAtual = useRef(rota);
  const geracao = useRef(estado.geracao);
  useLayoutEffect(() => {
    atual.current = estado;
    rotaAtual.current = rota;
  });

  const carregarReserva = useCallback(
    (modo: Extract<Modo, "primeira" | "atualizar">) => {
      if (numero === null) return;
      const g = geracao.current;
      despachar(
        modo === "atualizar"
          ? { tipo: "atualizando", geracao: g }
          : { tipo: "carregando-reserva", geracao: g, tentadoAs: new Date().toISOString() },
      );
      consultaEmAndamento(enderecoDaReserva(numero), (sinal) =>
        pedirReserva(numero, modo === "primeira", sinal),
      ).then(
        (resposta) => despachar({ tipo: "reserva-chegou", geracao: g, resposta }),
        (motivo: unknown) => {
          const erro = comoErro(motivo);
          if (erro.tipo !== "cancelada")
            despachar({ tipo: "falhou", geracao: g, id: null, erro, modo });
        },
      );
    },
    [numero],
  );

  const carregarVenda = useCallback(
    (id: number, modo: Modo) => {
      if (numero === null) return;
      const g = geracao.current;
      despachar(
        modo === "atualizar"
          ? { tipo: "atualizando", geracao: g }
          : {
              tipo: "carregando-venda",
              geracao: g,
              id,
              tentadoAs: new Date().toISOString(),
              primeira: modo === "primeira",
            },
      );
      consultaEmAndamento(enderecoDaVenda(numero, id), (sinal) =>
        pedirVenda(numero, id, modo === "primeira", sinal),
      ).then(
        (dados) => despachar({ tipo: "venda-chegou", geracao: g, id, dados, modo }),
        (motivo: unknown) => {
          const erro = comoErro(motivo);
          if (erro.tipo !== "cancelada") despachar({ tipo: "falhou", geracao: g, id, erro, modo });
        },
      );
    },
    [numero],
  );

  // O `replace` para a venda única, uma vez por chegada a /reservas/n (o do Next não é síncrono).
  const substituidoPor = useRef<string | null>(null);
  useEffect(() => {
    if (rota?.tipo !== "reserva") substituidoPor.current = null;
  }, [rota]);

  // As regras de entrada (decisão 16). Idempotente: roda de novo a cada mudança do estado, e a
  // limpeza não aborta, porque o modo estrito monta duas vezes e reusa a mesma chamada.
  const { reserva, carga, vendas } = estado;
  useEffect(() => {
    if (numero === null || rota === null) return;
    if (reserva === null) {
      if (carga !== "ociosa") return;
      if (rota.tipo === "reserva") carregarReserva("primeira");
      else if (!vendas.has(rota.idreserva)) carregarVenda(rota.idreserva, "primeira");
      return;
    }
    const lista = reserva.reserva.vendas;
    if (rota.tipo === "reserva") {
      const [unica] = lista;
      const destino =
        unica && lista.length === 1 && enderecoDaVenda(numero, unica.resumo.idreserva);
      if (destino && substituidoPor.current !== destino) {
        substituidoPor.current = destino;
        roteador.replace(destino);
      }
      return;
    }
    const daReserva = lista.some((v) => v.resumo.idreserva === rota.idreserva);
    if (daReserva && !vendas.has(rota.idreserva)) carregarVenda(rota.idreserva, "dentro");
  }, [numero, rota, reserva, carga, vendas, carregarReserva, carregarVenda, roteador]);

  // A busca do topo pede uma consulta nova do número, mesmo com o endereço igual.
  useEffect(() => {
    if (numero === null) return;
    const chave = enderecoDaReserva(numero);
    return assinarPendentes((pedida) => {
      if (pedida !== chave) return;
      geracao.current += 1;
      despachar({ tipo: "recomecar", geracao: geracao.current });
      carregarReserva("primeira");
    });
  }, [numero, carregarReserva]);

  // O que está sendo pedido agora (geração e venda), para o modo estrito não pedir duas vezes.
  const dadoCruEmVoo = useRef(new Set<string>());
  const carregarDadoCru = useCallback(
    (id: number) => {
      if (numero === null) return;
      const guardado = atual.current.vendas.get(id);
      const situacao = guardado?.dadoCru?.estado;
      const g = geracao.current;
      const chave = `${g}:${id}`;
      if (guardado?.estado !== "pronta" || situacao === "carregando" || situacao === "pronto") {
        return;
      }
      if (dadoCruEmVoo.current.has(chave)) return;
      dadoCruEmVoo.current.add(chave);
      despachar({ tipo: "dado-cru", geracao: g, id, dadoCru: { estado: "carregando" } });
      consultarDadoCru(numero, id)
        .then(
          (texto): DadoCru => ({ estado: "pronto", texto, chegouEm: new Date().toISOString() }),
          (motivo: unknown): DadoCru => ({ estado: "erro", erro: comoErro(motivo) }),
        )
        .then((dadoCru) => {
          dadoCruEmVoo.current.delete(chave);
          despachar({ tipo: "dado-cru", geracao: g, id, dadoCru });
        });
    },
    [numero],
  );

  const { fase, erro } = situar(numero, rota, estado);
  const idAberta = rota?.tipo === "venda" ? rota.idreserva : null;
  const falhaAtualizar = estado.falha?.alvo === idAberta ? estado.falha.erro : null;

  // A faixa vale para tudo; o aria-busy do <main>, só para a primeira carga (a página em esqueleto).
  const carregando = fase === "carregando";
  const vendaDentro =
    fase === "pronta" && idAberta !== null && vendas.get(idAberta)?.estado === "carregando";
  const ativo = carregando || estado.atualizando || vendaDentro;
  useEffect(() => {
    if (!ativo) return;
    definir(true, { ocupado: carregando });
    return () => definir(false);
  }, [ativo, carregando, definir]);

  const atualizar = useCallback(() => {
    const e = atual.current;
    const r = rotaAtual.current;
    if (e.reserva === null || e.atualizando) return;
    if (r?.tipo !== "venda") {
      carregarReserva("atualizar");
      return;
    }
    if (e.vendas.get(r.idreserva)?.estado === "pronta") carregarVenda(r.idreserva, "atualizar");
  }, [carregarReserva, carregarVenda]);

  const tentarDeNovo = useCallback(() => {
    const r = rotaAtual.current;
    if (r === null) return;
    const primeira = atual.current.reserva === null;
    if (r.tipo === "venda") carregarVenda(r.idreserva, primeira ? "primeira" : "dentro");
    else if (primeira) carregarReserva("primeira");
  }, [carregarReserva, carregarVenda]);

  const cancelar = useCallback(() => {
    if (numero === null) return;
    const r = rotaAtual.current;
    cancelarEmAndamento(enderecoDaReserva(numero));
    if (r?.tipo === "venda") cancelarEmAndamento(enderecoDaVenda(numero, r.idreserva));
    roteador.push(`/?reserva=${numero}`);
  }, [numero, roteador]);

  return {
    fase,
    reserva,
    erro,
    tentadoAs: estado.tentadoAs,
    vendas,
    falhaAtualizar,
    atualizando: estado.atualizando,
    atualizar,
    tentarDeNovo,
    cancelar,
    carregarDadoCru,
  };
}
