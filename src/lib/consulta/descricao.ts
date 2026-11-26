/** Textos da tela que descrevem a consulta: títulos, filtros, carregando, nenhuma venda e erro. */

import { formatarDadosAte, formatarData, formatarDiaMes } from "@/lib/formatacao";
import { contarDias, somarDias } from "./atalhos-periodo";
import { CLASSIFICACOES, type Consulta, SITUACOES, type TipoData, temFiltro } from "./consulta";

type Numero = "singular" | "plural";

const PARTICIPIOS: Record<TipoData, [string, string]> = {
  emissao: ["emitida", "emitidas"],
  confirmacao: ["confirmada", "confirmadas"],
  alteracao: ["alterada", "alteradas"],
};

const ROTULOS_DA_DATA: Record<TipoData, string> = {
  emissao: "Emissão",
  confirmacao: "Confirmação",
  alteracao: "Alteração",
};

const CAMPOS_DA_DATA = {
  emissao: "dataEmissao",
  confirmacao: "dataConfirmacao",
  alteracao: "dataAlteracao",
} as const;

const NUMEROS_POR_EXTENSO = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
  "vinte",
  "vinte e um",
  "vinte e dois",
  "vinte e três",
  "vinte e quatro",
  "vinte e cinco",
  "vinte e seis",
  "vinte e sete",
  "vinte e oito",
  "vinte e nove",
  "trinta",
  "trinta e um",
]; // prettier-ignore

export function participio(tipo: TipoData, numero: Numero): string {
  return PARTICIPIOS[tipo][numero === "singular" ? 0 : 1];
}

export function rotuloDaData(tipo: TipoData): string {
  return ROTULOS_DA_DATA[tipo];
}

export function campoDaData(tipo: TipoData): "dataEmissao" | "dataConfirmacao" | "dataAlteracao" {
  return CAMPOS_DA_DATA[tipo];
}

function temPeriodo(c: Consulta): c is Consulta & { de: string; ate: string } {
  return c.de !== null && c.ate !== null;
}

/** `"de 17/11 a 24/11/2026"`; com anos diferentes, os dois anos. */
function periodoEmTexto(de: string, ate: string, comAnoFinal: boolean): string {
  if (de.slice(0, 4) !== ate.slice(0, 4)) return `de ${formatarData(de)} a ${formatarData(ate)}`;
  return `de ${formatarDiaMes(de)} a ${comAnoFinal ? formatarData(ate) : formatarDiaMes(ate)}`;
}

function titulo(c: Consulta, comAnoFinal: boolean): string {
  const periodo = temPeriodo(c) ? periodoEmTexto(c.de, c.ate, comAnoFinal) : null;
  if (c.reserva !== null) {
    const reserva = `Reserva ${c.reserva}`;
    return periodo ? `${reserva}, ${participio(c.tipoData, "singular")} ${periodo}` : reserva;
  }
  const vendas = `Vendas ${participio(c.tipoData, "plural")}`;
  return periodo ? `${vendas} ${periodo}` : vendas;
}

export function tituloConsulta(c: Consulta): string {
  return titulo(c, true);
}

export function tituloCurto(c: Consulta): string {
  return titulo(c, false);
}

function unir(itens: string[]): string {
  if (itens.length < 2) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function textosDoFiltro(c: Consulta): string[] {
  return [
    ...(["cliente", "fornecedor", "emissor"] as const).flatMap((campo) =>
      c[campo] === null ? [] : [`${campo} ${c[campo]}`],
    ),
  ];
}

export function descreverFiltros(c: Consulta): string {
  const situacoes = SITUACOES.filter((s) => c.situacao.includes(s.valor)).map((s) => s.plural);
  const produtos = CLASSIFICACOES.filter((p) => c.classificacao.includes(p.valor)).map((p) =>
    p.rotulo.toLowerCase(),
  );
  const partes = [
    ...(situacoes.length > 0 ? [unir(situacoes)] : []),
    ...(produtos.length > 0 ? [unir(produtos)] : []),
    ...textosDoFiltro(c),
  ];
  return partes.length === 0 ? "Sem filtros na consulta" : maiuscula(partes.join(", "));
}

export function resumoMarcados(c: Consulta): string {
  const situacoes = SITUACOES.filter((s) => c.situacao.includes(s.valor)).map((s) => s.rotulo);
  const produtos = CLASSIFICACOES.filter((p) => c.classificacao.includes(p.valor)).map(
    (p) => p.rotulo,
  );
  const textos = textosDoFiltro(c);
  const total = situacoes.length + produtos.length + textos.length;
  if (total === 0) return "nenhum marcado";
  return `${total} ${total === 1 ? "marcado" : "marcados"}: ${[...situacoes, ...produtos, ...textos].join(", ")}`;
}

export function textoCarregando(c: Consulta, segundos: number): string {
  const espera = `Pode levar até ${segundos} ${segundos === 1 ? "segundo" : "segundos"}.`;
  if (c.reserva !== null) {
    const periodo = temPeriodo(c)
      ? `, ${participio(c.tipoData, "singular")} ${periodoEmTexto(c.de, c.ate, true)},`
      : "";
    return `Consultando a reserva ${c.reserva}${periodo} na API do Stur. ${espera}`;
  }
  const vendas = `as vendas ${participio(c.tipoData, "plural")}`;
  const periodo = temPeriodo(c) ? ` ${periodoEmTexto(c.de, c.ate, true)}` : "";
  return `Consultando ${vendas}${periodo} na API do Stur. ${espera}`;
}

/** Consulta só pelo número: `texto` é o número como veio, que pode nem ser um número. */
export function textoSemVendasNumero(texto: string): string {
  return `Nenhuma venda com o número de reserva ${texto}. Verifique o número no Stur e consulte de novo.`;
}

export function textoSemVendas(c: Consulta): string {
  const filtros = temFiltro(c);
  if (c.reserva !== null) {
    if (!temPeriodo(c) && !filtros) return textoSemVendasNumero(String(c.reserva));
    const [onde, ajuste] = temPeriodo(c)
      ? filtros
        ? [" nesse período e com esses filtros", " ou mude o período ou os filtros"]
        : [" nesse período", " ou amplie o período"]
      : [" e esses filtros", " ou mude os filtros"];
    return `Nenhuma venda com o número de reserva ${c.reserva}${onde}. Verifique o número no Stur${ajuste} e consulte de novo.`;
  }
  const venda = `nenhuma venda ${participio(c.tipoData, "singular")}`;
  const quando = temPeriodo(c) ? ` ${periodoEmTexto(c.de, c.ate, true)}` : "";
  return filtros
    ? `A API do Stur não devolveu ${venda}${quando} com esses filtros. Verifique as datas e os filtros e consulte de novo.`
    : `A API do Stur não devolveu ${venda}${quando}. Verifique as datas e consulte de novo.`;
}

export function textoDadosAteSemVendas(c: Consulta, dadosAte: string | null): string | null {
  if (dadosAte === null) return null;
  const depois =
    c.reserva !== null ? "Uma reserva criada" : `Uma venda ${participio(c.tipoData, "singular")}`;
  return `Dados do Stur até ${formatarDadosAte(dadosAte)}. ${depois} depois disso ainda não aparece aqui.`;
}

/** 13b: só da consulta por período sem número, quando o período começa depois do dia da cópia. */
export function periodoAteCopia(
  c: Consulta,
  dadosAte: string | null,
): { de: string; ate: string; dias: number } | null {
  if (dadosAte === null || c.reserva !== null || !temPeriodo(c)) return null;
  const diaDaCopia = dadosAte.slice(0, 10);
  if (c.de <= diaDaCopia) return null;
  const dias = contarDias(c.de, c.ate);
  return { de: somarDias(diaDaCopia, -(dias - 1)), ate: diaDaCopia, dias };
}

export function textoPeriodoAteCopia(p: { de: string; ate: string; dias: number }): string {
  if (p.dias === 1) return `O mesmo dia, na data da cópia, é ${formatarDiaMes(p.ate)}.`;
  const dias = NUMEROS_POR_EXTENSO[p.dias] ?? String(p.dias);
  return `Os mesmos ${dias} dias, terminando na data da cópia, vão ${periodoEmTexto(p.de, p.ate, false)}.`;
}

/** O botão da 13b; com anos diferentes, o ano nos dois lados, como o título. */
export function rotuloConsultarAteCopia(p: { de: string; ate: string; dias: number }): string {
  return p.dias === 1
    ? `Consultar ${formatarDiaMes(p.ate)}`
    : `Consultar ${periodoEmTexto(p.de, p.ate, false)}`;
}

export function rodapeErro(c: Consulta, hora: string): string {
  if (c.reserva !== null) {
    const periodo = temPeriodo(c)
      ? `, ${participio(c.tipoData, "singular")} ${periodoEmTexto(c.de, c.ate, true)}`
      : "";
    return `A consulta foi do número ${c.reserva}${periodo}, às ${hora}.`;
  }
  const periodo = temPeriodo(c) ? ` ${periodoEmTexto(c.de, c.ate, true)}` : "";
  return `A consulta foi das vendas ${participio(c.tipoData, "plural")}${periodo}, às ${hora}.`;
}
