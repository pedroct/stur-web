/**
 * Linhas dos cartões do Financeiro (decisão 3): o selo e o texto de cada recebimento e pagamento.
 * Tipos de `lib`, sem React: o componente `Selo` traduz o nome do ícone.
 */

import type {
  Documento,
  LancamentoCalculado,
  PagamentoAgi,
  RecebimentoAgi,
  VendaConsultada,
} from "@/contrato/tipos";
import { formatarValor } from "@/lib/formatacao";
import { preenchido } from "./campos";
import { dataSolta } from "./datas";

export type SeloTexto = {
  tom: "sucesso" | "info" | "atencao" | "neutro" | "neutro-borda";
  icone: "check" | "info" | "relogio" | "calendario" | "x" | "cartao";
  rotulo: string;
};

function quando(vencimento: string | null, hoje: string): string | null {
  return preenchido(vencimento, "vencimento") && vencimento !== null
    ? dataSolta(vencimento, hoje)
    : null;
}

export function seloDoLancamento(
  l: LancamentoCalculado,
  lado: "cliente" | "fornecedor",
  hoje: string,
): SeloTexto {
  const recebe = lado === "cliente" || l.ehCredito;
  if (l.cartaoRepassado) return { tom: "neutro", icone: "cartao", rotulo: "Cartão do cliente" };
  switch (l.situacao) {
    case "previsto":
      return { tom: "neutro", icone: "relogio", rotulo: "Previsto" };
    case "sem_saldo":
      return { tom: "sucesso", icone: "check", rotulo: recebe ? "Recebido" : "Pago" };
    case "recebido_em_parte":
      return {
        tom: "atencao",
        icone: "relogio",
        rotulo: recebe ? "Recebido em parte" : "Pago em parte",
      };
    case "em_aberto": {
      const data = quando(l.vencimento, hoje);
      if (l.vencido) {
        return {
          tom: "atencao",
          icone: "relogio",
          rotulo: data === null ? "Em aberto" : `Em aberto, venceu em ${data}`,
        };
      }
      return {
        tom: "neutro-borda",
        icone: "calendario",
        rotulo: data === null ? "A vencer" : `A vencer em ${data}`,
      };
    }
  }
}

function textoDoDocumento(d: Documento): string {
  return d.tipo === "recibo" ? `recibo ${d.numero}` : d.numero;
}

/** Os documentos unidos por " · ", como na tela 4. */
export function textoDosDocumentos(d: Documento[]): string {
  return d.map(textoDoDocumento).join(" · ");
}

function textoSemSituacao(
  l: LancamentoCalculado,
  cru: RecebimentoAgi | PagamentoAgi,
  mostrarValor: boolean,
  fornecedor: string | null,
  hoje: string,
): string {
  if (l.cartaoRepassado) {
    const cartao = "numeroCartaoMascarado" in cru ? (cru.numeroCartaoMascarado ?? "") : "";
    const final = cartao.replace(/\D/g, "").slice(-4);
    const data = quando(cru.dtVencto ?? l.vencimento, hoje);
    return [
      final === "" ? "Cartão" : `Cartão final ${final}`,
      ` repassado para ${fornecedor ?? "o fornecedor"}`,
      data === null ? "" : ` em ${data}`,
    ].join("");
  }
  if (l.ehCredito) {
    const valor = cru.valor;
    return preenchido(valor) && valor !== null && valor !== undefined
      ? `Crédito de R$ ${formatarValor(valor)} a receber do fornecedor`
      : "Crédito a receber do fornecedor";
  }
  const partes = [
    l.descricaoForma?.trim().toLowerCase() ?? "",
    mostrarValor ? `R$ ${formatarValor(l.valorExibido)}` : "",
    textoDosDocumentos(l.documentos),
  ];
  return partes.filter((p) => p !== "").join(", ");
}

/** "{forma}{, R$ valor}{, documentos}"; o valor só quando o lado tem mais de um lançamento. */
export function textoDoLancamento(
  l: LancamentoCalculado,
  cru: RecebimentoAgi | PagamentoAgi,
  mostrarValor: boolean,
  fornecedor: string | null,
  hoje: string,
): string {
  const texto = textoSemSituacao(l, cru, mostrarValor, fornecedor, hoje);
  if (l.situacao !== "previsto" || l.cartaoRepassado) return texto;
  return texto === "" ? "título ainda não gerado" : `${texto}; título ainda não gerado`;
}

/** O vazio de um lado dos lançamentos (IA 9.3). */
export function fraseSemLancamentos(lado: "cliente" | "fornecedor"): string {
  return lado === "cliente"
    ? "A API não trouxe nenhuma forma de recebimento nesta venda."
    : "A API não trouxe nenhuma forma de pagamento ao fornecedor nesta venda.";
}

/** Com mais de dois lançamentos num lado, as duas tabelas entram; com menos, os cartões bastam (decisão 8). */
export function comTabelaDeLancamentos(recebimentos: number, pagamentos: number): boolean {
  return recebimentos > 2 || pagamentos > 2;
}

/**
 * No incentivo, o cartão Recebimento mostra um lançamento só, o crédito (ou o primeiro pagamento).
 * A tabela entra com mais de dois lançamentos num lado (decisão 8) e também quando há lançamento que
 * o cartão não mostra: um recebimento ou um segundo pagamento, que senão sumiria da tela (RF-04).
 */
export function incentivoComTabela(recebimentos: number, pagamentos: number): boolean {
  return comTabelaDeLancamentos(recebimentos, pagamentos) || recebimentos > 0 || pagamentos > 1;
}

/** O crédito do fornecedor na venda de incentivo; sem ele, o primeiro pagamento (decisão 18). */
export function lancamentoDoCredito(
  dados: VendaConsultada,
): { l: LancamentoCalculado; cru: PagamentoAgi } | null {
  const { pagamentos } = dados.calculos;
  const l = pagamentos.find((p) => p.ehCredito) ?? pagamentos[0];
  const cru = l === undefined ? undefined : dados.venda.pagamentos?.[l.indice];
  return l === undefined || cru === undefined ? null : { l, cru };
}
