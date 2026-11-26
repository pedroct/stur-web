/**
 * Recebimentos e pagamentos da reserva numa tabela só (decisão 11) e as frases do Financeiro da
 * reserva (decisão 15). Os valores já vêm calculados pelo backend; só se somam textos decimais.
 */

import type { LancamentoCalculado, Reserva, VendaDaReserva } from "@/contrato/tipos";
import { compararDecimais, somarDecimais } from "@/lib/decimal";
import { formatarMoeda } from "@/lib/formatacao";
import { fornecedoresDe, preenchido } from "@/lib/venda/campos";
import { type SeloTexto, seloDoLancamento, textoDosDocumentos } from "@/lib/venda/lancamentos";
import { ativasDaReserva } from "./cabecalho";

type Lado = "cliente" | "fornecedor";

export type LinhaLancamentoReserva = {
  chave: string;
  lado: Lado;
  /** A posição da venda na reserva ("venda k"). */
  venda: number;
  rotulo: string;
  documento: string;
  vencimento: string | null;
  /** Decimal em texto, sempre positivo (o crédito vem com o sinal tirado). */
  valor: string;
  selo: SeloTexto;
};

type Candidata = {
  l: LancamentoCalculado;
  lado: Lado;
  venda: VendaDaReserva;
  forma: string | null;
};

function forma(l: LancamentoCalculado): string | null {
  const texto = l.descricaoForma?.trim().toLowerCase() ?? "";
  return texto === "" ? null : texto;
}

function candidatas(v: VendaDaReserva): Candidata[] {
  const de = (lista: LancamentoCalculado[], lado: Lado): Candidata[] =>
    lista.map((l) => ({ l, lado, venda: v, forma: forma(l) }));
  return [...de(v.recebimentos, "cliente"), ...de(v.pagamentos, "fornecedor")];
}

/** Do mesmo lado, forma, vencimento e situação, e só seguidos: viram uma linha. O crédito nunca. */
function mesmaLinha(a: Candidata, b: Candidata): boolean {
  return (
    !a.l.ehCredito &&
    !b.l.ehCredito &&
    a.venda.posicao === b.venda.posicao &&
    a.lado === b.lado &&
    a.forma === b.forma &&
    a.l.vencimento === b.l.vencimento &&
    a.l.situacao === b.l.situacao &&
    a.l.vencido === b.l.vencido &&
    a.l.cartaoRepassado === b.l.cartaoRepassado
  );
}

function rotuloDaLinha(c: Candidata): string {
  const k = c.venda.posicao;
  if (c.l.ehCredito) return `Crédito do fornecedor (venda ${k})`;
  if (c.lado === "cliente") {
    return `A receber do cliente${c.forma === null ? "" : `, ${c.forma}`} (venda ${k})`;
  }
  const { principal } = fornecedoresDe(c.venda.resumo.fornecedor, c.venda.resumo.fornecedor2);
  return `A pagar ${principal === null ? "ao fornecedor" : `a ${principal}`}${
    c.forma === null ? "" : `, ${c.forma}`
  } (venda ${k})`;
}

function documentoDaLinha(grupo: Candidata[]): string {
  const [primeiro] = grupo;
  const ultimo = grupo.at(-1);
  if (!primeiro || !ultimo) return "";
  if (grupo.length === 1) return textoDosDocumentos(primeiro.l.documentos);
  const de = primeiro.l.documentos[0]?.numero;
  const ate = ultimo.l.documentos[0]?.numero;
  const ordens = `${grupo.length} ordens`;
  return de !== undefined && ate !== undefined ? `${de} a ${ate}, ${ordens}` : ordens;
}

function valorPositivo(l: LancamentoCalculado): string {
  return l.ehCredito && l.valorExibido.startsWith("-") ? l.valorExibido.slice(1) : l.valorExibido;
}

/** As linhas da tabela: venda por venda, recebimentos e depois pagamentos, só das vendas ativas. */
export function linhasDaReserva(r: Reserva, hoje: string): LinhaLancamentoReserva[] {
  const todas = ativasDaReserva(r)
    .toSorted((a, b) => a.posicao - b.posicao)
    .flatMap(candidatas);
  const grupos = todas.reduce<Candidata[][]>((acc, c) => {
    const ultimo = acc.at(-1);
    const anterior = ultimo?.at(-1);
    if (ultimo && anterior && mesmaLinha(anterior, c)) ultimo.push(c);
    else acc.push([c]);
    return acc;
  }, []);
  return grupos.flatMap((grupo) => {
    const primeiro = grupo[0];
    if (!primeiro) return [];
    const { l, lado, venda } = primeiro;
    return [
      {
        chave: `${venda.posicao}-${lado}-${l.indice}`,
        lado,
        venda: venda.posicao,
        rotulo: rotuloDaLinha(primeiro),
        documento: documentoDaLinha(grupo),
        vencimento: preenchido(l.vencimento, "vencimento") ? l.vencimento : null,
        valor: somarDecimais(grupo.map((c) => valorPositivo(c.l))),
        selo: seloDoLancamento(l, lado, hoje),
      },
    ];
  });
}

/** O vazio da tabela (IA 9.3): as canceladas ficam fora dela, então o texto fala das ativas. */
export function fraseSemLancamentosDaReserva(r: Reserva): string {
  const ativas = ativasDaReserva(r).length;
  if (ativas === 0) return "Sem vendas ativas, não há recebimentos nem pagamentos a mostrar.";
  if (ativas === 1) return "A venda ativa não tem forma de recebimento nem de pagamento.";
  return "Nenhuma das vendas ativas tem forma de recebimento ou de pagamento.";
}

function vendasAtivas(k: number): string {
  if (k === 0) return "nenhuma venda ativa";
  return k === 1 ? "1 venda ativa" : `${k} vendas ativas`;
}

/** "Financeiro das {k} vendas ativas" quando há canceladas; senão, "Financeiro da reserva". */
export function tituloDoFinanceiro(r: Reserva): string {
  const ativas = ativasDaReserva(r).length;
  if (ativas === r.vendas.length || ativas === 0) return "Financeiro da reserva";
  return ativas === 1 ? "Financeiro da venda ativa" : `Financeiro das ${ativas} vendas ativas`;
}

/** O rótulo do cartão Cliente: "Cliente · {k} vendas ativas". */
export function rotuloDoCliente(r: Reserva): string {
  return `Cliente · ${vendasAtivas(ativasDaReserva(r).length)}`;
}

/** O texto do cartão Receita. */
export function fraseDaReceita(r: Reserva): string {
  const k = ativasDaReserva(r).length;
  if (k === 0) return "sem vendas ativas";
  return k === 1 ? "somada da venda ativa" : `somada das ${k} vendas ativas`;
}

function maiorQueZero(valor: string): boolean {
  return compararDecimais(valor, "0") === 1;
}

/** "R$ {a receber}, {n} vencidos" ou "nada a receber". */
export function fraseDoCliente(r: Reserva): string {
  const { aReceberCliente } = r.totais;
  if (!maiorQueZero(aReceberCliente)) return "nada a receber";
  const vencidos = ativasDaReserva(r)
    .flatMap((v) => v.recebimentos)
    .filter((l) => l.vencido).length;
  const sufixo = vencidos === 0 ? "" : `, ${vencidos} ${vencidos === 1 ? "vencido" : "vencidos"}`;
  return `${formatarMoeda(aReceberCliente)} a receber${sufixo}`;
}

/** "R$ {a pagar} a pagar · R$ {a receber} a receber do fornecedor", só o que passa de zero. */
export function fraseDoFornecedor(r: Reserva): string {
  const { aPagarFornecedor, aReceberFornecedor } = r.totais;
  const partes = [
    maiorQueZero(aPagarFornecedor) ? `${formatarMoeda(aPagarFornecedor)} a pagar` : "",
    maiorQueZero(aReceberFornecedor)
      ? `${formatarMoeda(aReceberFornecedor)} a receber do fornecedor`
      : "",
  ].filter((p) => p !== "");
  return partes.length === 0 ? "nada a pagar" : partes.join(" · ");
}

/** A frase de baixo da tela 4, com os saldos pelos totais das vendas. */
export function fraseDaSituacao(r: Reserva): string {
  const { recebidoCliente, totalCliente, pagoFornecedor, aReceberFornecedor } = r.totais;
  const credito = maiorQueZero(aReceberFornecedor)
    ? ` e ${formatarMoeda(aReceberFornecedor)} a receber do fornecedor`
    : "";
  return `A situação vem dos totais das vendas: recebido ${formatarMoeda(recebidoCliente)} de ${formatarMoeda(totalCliente)}, pago ${formatarMoeda(pagoFornecedor)}${credito}. A data de baixa de cada título fica no financeiro do Stur. Um valor em aberto pode já ter sido pago sem baixa.`;
}
