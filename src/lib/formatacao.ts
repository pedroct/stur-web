/**
 * Valores, percentuais e datas no padrão brasileiro. Dinheiro e percentual chegam como texto
 * decimal e seguem como texto até o `Intl.NumberFormat` (nada passa por `Number`).
 */

import { ehDecimal } from "@/lib/decimal";

const NUMERO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "negative", // sem sinal no zero negativo ("−0,00")
});

const CAMBIO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const PERCENTUAL_TERMO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
  signDisplay: "negative",
});

const SEM_DATA = "—";
const DATA_VAZIA_DO_STUR = "1899-12-30";
const DATA = /^(\d{4})-(\d{2})-(\d{2})/;
const DATA_HORA = /^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/;

/** `"-13620.74"` vira `"−13.620,74"` (menos U+2212). Texto que não é decimal lança `Error`. */
export function formatarValor(texto: string): string {
  if (!ehDecimal(texto)) throw new Error(`Decimal inválido: ${texto}`);
  return NUMERO.format(texto as Intl.StringNumericLiteral).replace("-", "−");
}

/** `"195108.01"` vira `"R$ 195.108,01"` (espaço comum). */
export function formatarMoeda(texto: string): string {
  return `R$ ${formatarValor(texto)}`;
}

/** `"12.6700"` vira `"12,67%"`; nulo fica nulo. */
export function formatarPercentual(texto: string | null): string | null {
  return texto === null ? null : `${formatarValor(texto)}%`;
}

function dataDoTexto(texto: string | null): RegExpExecArray | null {
  if (!texto || texto.startsWith(DATA_VAZIA_DO_STUR)) return null;
  return DATA.exec(texto);
}

/** `"2026-05-28T16:43:00"` vira `"28/05/2026"`; ausente, vazio e a data vazia do Stur viram `"—"`. */
export function formatarData(texto: string | null): string {
  const d = dataDoTexto(texto);
  return d ? `${d[3]}/${d[2]}/${d[1]}` : SEM_DATA;
}

/** `"2026-11-17"` vira `"17/11"`; mesmas regras de `formatarData`. */
export function formatarDiaMes(texto: string | null): string {
  const d = dataDoTexto(texto);
  return d ? `${d[3]}/${d[2]}` : SEM_DATA;
}

/** `"2026-11-18T09:30:00"` vira `"18/11, 09h30"`: texto local da API, sem conversão de fuso. */
export function formatarDadosAte(texto: string): string {
  if (dataDoTexto(texto) === null) return SEM_DATA;
  const hora = DATA_HORA.exec(texto);
  return hora ? `${formatarDiaMes(texto)}, ${hora[1]}h${hora[2]}` : formatarDiaMes(texto);
}

/** `"6.03"` vira `"6,0300"`. */
export function formatarCambio(texto: string): string {
  if (!ehDecimal(texto)) throw new Error(`Decimal inválido: ${texto}`);
  return CAMBIO.format(texto as Intl.StringNumericLiteral);
}

/** `"13.0000"` vira `"13%"` e `"10.5"` vira `"10,5%"`: até 4 casas, sem zeros à direita. */
export function formatarPercentualTermo(texto: string): string {
  if (!ehDecimal(texto)) throw new Error(`Decimal inválido: ${texto}`);
  return `${PERCENTUAL_TERMO.format(texto as Intl.StringNumericLiteral).replace("-", "−")}%`;
}

/** `"2026-11-16T20:41:00"` vira `"16/11/2026 · 20h41"`: texto local da AGI, sem fuso. */
export function formatarDataHora(texto: string | null): string {
  const hora = DATA_HORA.exec(texto ?? "");
  return dataDoTexto(texto) && hora
    ? `${formatarData(texto)} · ${hora[1]}h${hora[2]}`
    : formatarData(texto);
}

/** `"1899-12-30T16:59:00"` vira `"16h59"`: nos campos de hora a data vazia do Stur é só o dia base. */
export function formatarHoraDoStur(texto: string | null): string {
  const hora = DATA_HORA.exec(texto ?? "");
  return hora ? `${hora[1]}h${hora[2]}` : SEM_DATA;
}
