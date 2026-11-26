/**
 * Refinamentos do resultado: filtram no navegador as vendas que já vieram da API, sem nova
 * chamada. Vivem no endereço com o prefixo `f.` (a busca é `q`), para não se misturarem com
 * os parâmetros da consulta.
 */

import type { LinhaResultado } from "@/contrato/tipos";
import {
  CLASSIFICACOES,
  type Classificacao,
  classificacaoDe,
  SITUACOES,
  type Situacao,
  situacaoDe,
} from "@/lib/consulta/consulta";
import { somarDecimais } from "@/lib/decimal";
import { contem } from "@/lib/textos";

export interface Refinamentos {
  q: string;
  situacao: Situacao[];
  produto: Classificacao[];
  cliente: string | null;
  fornecedor: string | null;
  emissor: string | null;
  soNaoFecham: boolean;
}

export const REFINAMENTOS_VAZIOS: Refinamentos = {
  q: "",
  situacao: [],
  produto: [],
  cliente: null,
  fornecedor: null,
  emissor: null,
  soNaoFecham: false,
};

function textoOuNulo(texto: string | null): string | null {
  const aparado = texto?.trim() ?? "";
  return aparado === "" ? null : aparado;
}

function lista<T extends string>(texto: string | null, validos: readonly T[]): T[] {
  const pedidos = new Set((texto ?? "").split(",").map((v) => v.trim()));
  return validos.filter((v) => pedidos.has(v));
}

export function lerRefinamentos(p: URLSearchParams): Refinamentos {
  return {
    q: p.get("q") ?? "",
    situacao: lista(
      p.get("f.situacao"),
      SITUACOES.map((s) => s.valor),
    ),
    produto: lista(
      p.get("f.produto"),
      CLASSIFICACOES.map((c) => c.valor),
    ),
    cliente: textoOuNulo(p.get("f.cliente")),
    fornecedor: textoOuNulo(p.get("f.fornecedor")),
    emissor: textoOuNulo(p.get("f.emissor")),
    soNaoFecham: p.get("f.contas") === "nao-fecham",
  };
}

/** Só os refinamentos, sem `?`. A vírgula das listas é literal; os nomes vão codificados. */
export function escreverRefinamentos(r: Refinamentos): string {
  const partes: [string, string][] = [];
  if (r.q.trim() !== "") partes.push(["q", encodeURIComponent(r.q)]);
  const situacoes = SITUACOES.filter((s) => r.situacao.includes(s.valor));
  if (situacoes.length > 0) {
    partes.push(["f.situacao", situacoes.map((s) => s.valor).join(",")]);
  }
  const produtos = CLASSIFICACOES.filter((c) => r.produto.includes(c.valor));
  if (produtos.length > 0) partes.push(["f.produto", produtos.map((c) => c.valor).join(",")]);
  for (const campo of ["cliente", "fornecedor", "emissor"] as const) {
    const texto = textoOuNulo(r[campo]);
    if (texto !== null) partes.push([`f.${campo}`, encodeURIComponent(texto)]);
  }
  if (r.soNaoFecham) partes.push(["f.contas", "nao-fecham"]);
  return partes.map(([nome, valor]) => `${nome}=${valor}`).join("&");
}

export function temRefinamento(r: Refinamentos): boolean {
  return escreverRefinamentos(r) !== "";
}

/** Mantém a ordem recebida. */
export function refinar(vendas: LinhaResultado[], r: Refinamentos): LinhaResultado[] {
  return vendas.filter((v) => {
    if (r.q.trim() !== "") {
      const procuradas = [v.fornecedor, v.fornecedor2, v.cliente, v.emissor, v.produto];
      if (!contem(String(v.numero), r.q) && !procuradas.some((t) => contem(t, r.q))) return false;
    }
    if (r.situacao.length > 0) {
      const situacao = situacaoDe(v.situacao);
      if (situacao === null || !r.situacao.includes(situacao)) return false;
    }
    if (r.produto.length > 0) {
      const produto = classificacaoDe(v.classificacao);
      if (produto === null || !r.produto.includes(produto)) return false;
    }
    if (r.cliente !== null && v.cliente !== r.cliente) return false;
    if (r.fornecedor !== null && v.fornecedor !== r.fornecedor && v.fornecedor2 !== r.fornecedor) {
      return false;
    }
    if (r.emissor !== null && v.emissor !== r.emissor) return false;
    return !(r.soNaoFecham && v.contaFecha);
  });
}

export interface OpcoesContadas {
  situacao: [Situacao, number][];
  produto: [Classificacao, number][];
  cliente: [string, number][];
  fornecedor: [string, number][];
  emissor: [string, number][];
  total: number;
  naoFecham: number;
}

function contar<T>(valores: (T | null)[]): Map<T, number> {
  const contagem = new Map<T, number>();
  for (const valor of valores) {
    if (valor !== null) contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
  }
  return contagem;
}

function alfabetica(contagem: Map<string, number>): [string, number][] {
  return [...contagem].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
}

function naOrdem<T extends string>(contagem: Map<T, number>, ordem: readonly T[]): [T, number][] {
  return ordem.flatMap((valor): [T, number][] => {
    const n = contagem.get(valor);
    return n === undefined ? [] : [[valor, n]];
  });
}

/** Contagem no resultado inteiro (não no refinado), só das opções presentes. */
export function contarOpcoes(vendas: LinhaResultado[]): OpcoesContadas {
  const situacoes = contar(vendas.map((v) => situacaoDe(v.situacao)));
  const produtos = contar(vendas.map((v) => classificacaoDe(v.classificacao)));
  // O fornecedor 2 igual ao 1 conta uma vez na venda.
  const fornecedores = contar(vendas.flatMap((v) => [...new Set([v.fornecedor, v.fornecedor2])]));
  return {
    situacao: naOrdem(
      situacoes,
      SITUACOES.map((s) => s.valor),
    ),
    produto: naOrdem(
      produtos,
      CLASSIFICACOES.map((c) => c.valor),
    ),
    cliente: alfabetica(contar(vendas.map((v) => v.cliente))),
    fornecedor: alfabetica(fornecedores),
    emissor: alfabetica(contar(vendas.map((v) => v.emissor))),
    total: vendas.length,
    naoFecham: vendas.filter((v) => !v.contaFecha).length,
  };
}

/** Quantidade de todas as linhas; os totais não levam canceladas nem incentivos. */
export function somarVisiveis(vendas: LinhaResultado[]): {
  quantidade: number;
  totalCliente: string;
  margem: string;
} {
  const somaveis = vendas.filter(
    (v) => situacaoDe(v.situacao) !== "cancelada" && v.tipo !== "incentivo",
  );
  return {
    quantidade: vendas.length,
    totalCliente: somarDecimais(somaveis.map((v) => v.totalCliente)),
    margem: somarDecimais(somaveis.map((v) => v.margem)),
  };
}

/** Rótulos no singular; cada valor conta 1; a busca (`q`) não conta. */
export function resumoRefinamentos(r: Refinamentos): string {
  const marcados = [
    ...SITUACOES.filter((s) => r.situacao.includes(s.valor)).map((s) => s.rotulo),
    ...CLASSIFICACOES.filter((c) => r.produto.includes(c.valor)).map((c) => c.rotulo),
    ...(r.cliente === null ? [] : [`cliente ${r.cliente}`]),
    ...(r.fornecedor === null ? [] : [`fornecedor ${r.fornecedor}`]),
    ...(r.emissor === null ? [] : [`emissor ${r.emissor}`]),
    ...(r.soNaoFecham ? ["só as que não fecham"] : []),
  ];
  if (marcados.length === 0) return "nenhum marcado";
  return `${marcados.length} ${marcados.length === 1 ? "marcado" : "marcados"}: ${marcados.join(", ")}`;
}
