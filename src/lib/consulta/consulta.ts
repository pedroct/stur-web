/**
 * A consulta como a pessoa a pede: lida e escrita no endereço (IA 2), validada com as mesmas
 * regras e mensagens do backend (`dominio/consulta.py`) e comparada com o texto da API.
 */

import type { ConsultaEcoada } from "@/contrato/tipos";
import { normalizar } from "@/lib/textos";
import { contarDias, partesDoDia } from "./atalhos-periodo";

export type TipoData = ConsultaEcoada["tipoData"];
export type Situacao = ConsultaEcoada["situacao"][number];
export type Classificacao = ConsultaEcoada["classificacao"][number];

export interface Consulta {
  reserva: number | null;
  tipoData: TipoData;
  de: string | null;
  ate: string | null;
  situacao: Situacao[];
  classificacao: Classificacao[];
  fornecedor: string | null;
  cliente: string | null;
  emissor: string | null;
}

export const CONSULTA_VAZIA: Consulta = {
  reserva: null,
  tipoData: "emissao",
  de: null,
  ate: null,
  situacao: [],
  classificacao: [],
  fornecedor: null,
  cliente: null,
  emissor: null,
};

export const SITUACOES: { valor: Situacao; rotulo: string; plural: string }[] = [
  { valor: "reservada", rotulo: "Reservada", plural: "reservadas" },
  { valor: "confirmada", rotulo: "Confirmada", plural: "confirmadas" },
  { valor: "fechada", rotulo: "Fechada", plural: "fechadas" },
  { valor: "cancelada", rotulo: "Cancelada", plural: "canceladas" },
];

export const CLASSIFICACOES: { valor: Classificacao; rotulo: string }[] = [
  { valor: "aereo", rotulo: "Aéreo" },
  { valor: "hotelaria", rotulo: "Hotelaria" },
  { valor: "rodoviario", rotulo: "Rodoviário" },
  { valor: "locacao", rotulo: "Locação" },
  { valor: "diversos", rotulo: "Diversos" },
  { valor: "pacote", rotulo: "Pacote" },
];

export const TIPOS_DE_DATA: readonly TipoData[] = ["emissao", "confirmacao", "alteracao"];

export function situacaoDe(textoDaApi: string | null): Situacao | null {
  if (textoDaApi === null) return null;
  const procurado = normalizar(textoDaApi);
  return SITUACOES.find((s) => normalizar(s.rotulo) === procurado)?.valor ?? null;
}

export function classificacaoDe(textoDaApi: string | null): Classificacao | null {
  if (textoDaApi === null) return null;
  const procurado = normalizar(textoDaApi);
  return CLASSIFICACOES.find((c) => normalizar(c.rotulo) === procurado)?.valor ?? null;
}

/** Tira pontos, hífens e espaços de quem cola; sobram de 1 a 15 algarismos ou nada. */
export function numeroDaReserva(texto: string): number | null {
  const algarismos = texto.replace(/[.\-\s]/g, "");
  return /^\d{1,15}$/.test(algarismos) ? Number(algarismos) : null;
}

function diaValido(texto: string | null): string | null {
  if (texto === null || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const [ano, mes, dia] = partesDoDia(texto);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
    ? texto
    : null;
}

export function textoOuNulo(texto: string | null): string | null {
  const aparado = texto?.trim() ?? "";
  return aparado === "" ? null : aparado;
}

export function lista<T extends string>(texto: string | null, validos: readonly T[]): T[] {
  const pedidos = new Set((texto ?? "").split(",").map((v) => v.trim()));
  return validos.filter((v) => pedidos.has(v));
}

export function lerConsulta(p: URLSearchParams): Consulta {
  const reserva = p.get("reserva");
  const tipoData = p.get("data");
  return {
    reserva: reserva === null ? null : numeroDaReserva(reserva),
    tipoData: TIPOS_DE_DATA.find((t) => t === tipoData) ?? "emissao",
    de: diaValido(p.get("de")),
    ate: diaValido(p.get("ate")),
    situacao: lista(
      p.get("situacao"),
      SITUACOES.map((s) => s.valor),
    ),
    classificacao: lista(
      p.get("produto"),
      CLASSIFICACOES.map((c) => c.valor),
    ),
    fornecedor: textoOuNulo(p.get("fornecedor")),
    cliente: textoOuNulo(p.get("cliente")),
    emissor: textoOuNulo(p.get("emissor")),
  };
}

/** Sem `?`. A vírgula das listas é literal: `URLSearchParams.toString()` a escreveria como `%2C`. */
export function escreverConsulta(c: Consulta): string {
  const partes: [string, string][] = [];
  if (c.reserva !== null) partes.push(["reserva", String(c.reserva)]);
  if (c.de !== null || c.ate !== null) partes.push(["data", c.tipoData]);
  if (c.de !== null) partes.push(["de", c.de]);
  if (c.ate !== null) partes.push(["ate", c.ate]);
  const situacoes = SITUACOES.filter((s) => c.situacao.includes(s.valor));
  if (situacoes.length > 0) partes.push(["situacao", situacoes.map((s) => s.valor).join(",")]);
  const produtos = CLASSIFICACOES.filter((p) => c.classificacao.includes(p.valor));
  if (produtos.length > 0) partes.push(["produto", produtos.map((p) => p.valor).join(",")]);
  for (const campo of ["fornecedor", "cliente", "emissor"] as const) {
    const texto = textoOuNulo(c[campo]);
    if (texto !== null) partes.push([campo, texto]);
  }
  return partes
    .map(([nome, valor]) => `${nome}=${valor.split(",").map(encodeURIComponent).join(",")}`)
    .join("&");
}

export function chaveConsulta(c: Consulta): string {
  return `/consulta?${escreverConsulta(c)}`;
}

export function temFiltro(c: Consulta): boolean {
  return (
    c.situacao.length > 0 ||
    c.classificacao.length > 0 ||
    textoOuNulo(c.fornecedor) !== null ||
    textoOuNulo(c.cliente) !== null ||
    textoOuNulo(c.emissor) !== null
  );
}

/** Só o número: sem período e sem filtro (decisão 13). */
export function soNumero(c: Consulta): boolean {
  return c.reserva !== null && c.de === null && c.ate === null && !temFiltro(c);
}

export function validarConsulta(
  c: Consulta,
  periodoMaximoDias: number,
): { campo: "reserva" | "de" | "ate"; mensagem: string } | null {
  if (c.reserva === null && c.de === null && c.ate === null) {
    return {
      campo: "reserva",
      mensagem: "Digite o número da reserva, escolha um período ou os dois.",
    };
  }
  if ((c.de === null) !== (c.ate === null)) {
    return {
      campo: c.ate === null ? "ate" : "de",
      mensagem: "Preencha as duas datas do período.",
    };
  }
  if (c.de === null || c.ate === null) return null;
  if (c.ate < c.de) return { campo: "ate", mensagem: "A data final é anterior à inicial." };
  if (c.reserva === null && contarDias(c.de, c.ate) > periodoMaximoDias) {
    return {
      campo: "de",
      mensagem: `Sem número de reserva, o período vai até ${periodoMaximoDias} dias. Diminua o período ou informe o número.`,
    };
  }
  return null;
}
