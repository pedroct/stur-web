/**
 * Textos da tabela das vendas da reserva e da barra de troca (IA 6.10; decisões 13 e 14; telas 4,
 * 6 e 7): os grupos pela classificação, a segunda linha de "Fornecedor e serviço", a frase da
 * receita negativa e o que a barra diz da venda aberta e da próxima.
 */

import type { Reserva, VendaDaReserva } from "@/contrato/tipos";
import { CLASSIFICACOES, classificacaoDe, situacaoDe } from "@/lib/consulta/consulta";
import { unir } from "@/lib/consulta/descricao";
import { ehDecimal, ehNegativo, ehZero } from "@/lib/decimal";
import { formatarMoeda } from "@/lib/formatacao";
import { normalizar } from "@/lib/textos";
import { fornecedoresDe, preenchido } from "@/lib/venda/campos";
import { dataSolta, periodoCurto } from "@/lib/venda/datas";
import { ativasDaReserva } from "./cabecalho";

export type GrupoDaTabela = { rotulo: string; vendas: VendaDaReserva[] };

function plural(n: number, singular: string, varias: string): string {
  return `${n} ${n === 1 ? singular : varias}`;
}

export function cancelada(v: VendaDaReserva): boolean {
  return situacaoDe(v.resumo.situacao) === "cancelada";
}

function nomeDaClassificacao(texto: string | null): string {
  const conhecida = CLASSIFICACOES.find((c) => c.valor === classificacaoDe(texto));
  if (conhecida) return conhecida.rotulo;
  const limpo = texto?.trim() ?? "";
  return limpo === "" ? "Sem classificação" : limpo;
}

/**
 * Os grupos pela classificação, na ordem em que cada uma aparece primeiro e, dentro do grupo, na
 * ordem de lançamento; as canceladas vão num grupo "Cancelada", no fim.
 */
export function gruposDaTabela(r: Reserva): GrupoDaTabela[] {
  const vendas = [...r.vendas].sort((a, b) => a.posicao - b.posicao);
  const grupos = new Map<string, { nome: string; vendas: VendaDaReserva[] }>();
  const canceladas: VendaDaReserva[] = [];
  for (const v of vendas) {
    if (cancelada(v)) {
      canceladas.push(v);
      continue;
    }
    const nome = nomeDaClassificacao(v.resumo.classificacao);
    const chave = normalizar(nome);
    const grupo = grupos.get(chave);
    if (grupo) grupo.vendas.push(v);
    else grupos.set(chave, { nome, vendas: [v] });
  }
  const lista = [...grupos.values()];
  if (canceladas.length > 0) lista.push({ nome: "Cancelada", vendas: canceladas });
  return lista.map(({ nome, vendas: doGrupo }) => ({
    rotulo: `${nome} · ${plural(doGrupo.length, "venda", "vendas")}`,
    vendas: doGrupo,
  }));
}

function dia(texto: string | null, campo: string): string | null {
  return texto !== null && preenchido(texto, campo) ? texto : null;
}

function zero(valor: string): boolean {
  return ehDecimal(valor) && ehZero(valor);
}

/** O serviço da venda pela classificação, sem as partes nulas. */
function servicoEmTexto(v: VendaDaReserva): string {
  const s = v.servico;
  if (s === null) return "";
  const inicio = dia(s.inicio, "inicio");
  const periodo = periodoCurto(inicio, dia(s.fim, "fim"));
  switch (classificacaoDe(v.resumo.classificacao)) {
    case "aereo":
    case "rodoviario": {
      const trajetos = s.rota.filter((t) => t.length > 0).map((t) => t.join(" → "));
      if (trajetos.length === 0) return "";
      return `${trajetos.join(" · ")}${inicio === null ? ", sem datas" : ""}`;
    }
    case "hotelaria": {
      const diarias = s.diarias === null ? null : plural(s.diarias, "diária", "diárias");
      return [periodo, diarias].filter((p) => p !== null).join(", ");
    }
    case "locacao":
      return periodo ?? "";
    default: {
      const descricao = s.descricao?.trim() || plural(s.quantidade, "serviço", "serviços");
      return [descricao, periodo].filter((p) => p !== null).join(" · ");
    }
  }
}

/** A segunda linha de "Fornecedor e serviço" (decisão 13). */
export function segundaLinha(v: VendaDaReserva): string {
  const { totalCliente, totalFornecedor } = v.resumo;
  const base = servicoEmTexto(v);
  let cobranca: string | null = null;
  if (zero(totalCliente) && !zero(totalFornecedor)) cobranca = "sem cobrança ao cliente";
  else if (zero(totalFornecedor) && !zero(totalCliente)) cobranca = "sem custo";
  if (cobranca === null) return base;
  return base === "" ? cobranca : `${base}, ${cobranca}`;
}

/** Embaixo da tabela, só quando há venda ativa com total do cliente zero e margem negativa. */
export function fraseReceitaNegativa(r: Reserva): string | null {
  const n = ativasDaReserva(r).filter(
    ({ resumo }) =>
      zero(resumo.totalCliente) && ehDecimal(resumo.margem) && ehNegativo(resumo.margem),
  ).length;
  if (n === 0) return null;
  const sujeito = n === 1 ? "1 venda tem" : `${n} vendas têm`;
  return `${sujeito} receita negativa: custo lançado sem cobrança ao cliente.`;
}

/** O rodapé da tabela: "Total das {k} vendas ativas", "Total da venda ativa" ou, sem ativas, nada. */
export function rotuloDoTotal(r: Reserva): string | null {
  const k = ativasDaReserva(r).length;
  if (k === 0) return null;
  return k === 1 ? "Total da venda ativa" : `Total das ${k} vendas ativas`;
}

/** Os passageiros da venda, sem repetir. */
export function passageirosDaVenda(v: VendaDaReserva): string {
  const nomes = v.resumo.passageiros.map((p) => p.trim()).filter((p) => p !== "");
  return unir([...new Set(nomes)]);
}

/** A coluna Passageiro só aparece quando as vendas têm passageiros diferentes (IA 6.10). */
export function passageirosDiferem(r: Reserva): boolean {
  return new Set(r.vendas.map(passageirosDaVenda)).size > 1;
}

/** O fornecedor que a tabela e a barra mostram: o da companhia ou do hotel, pela regra do resultado. */
export function fornecedorDaVenda(v: VendaDaReserva): string | null {
  return fornecedoresDe(v.resumo.fornecedor, v.resumo.fornecedor2).principal;
}

/** "Cancelada em 30/06", ou só "Cancelada" sem a data. */
export function seloDaCancelada(v: VendaDaReserva, hoje: string): string {
  const quando = dia(v.dataCancelamento, "dtcancelamento");
  return quando === null ? "Cancelada" : `Cancelada em ${dataSolta(quando, hoje)}`;
}

/** "{passageiro} · {fornecedor} · R$ {cliente} · receita R$ {receita}"; na cancelada, a data dela. */
export function linhaDaBarra(v: VendaDaReserva, hoje: string): string {
  const valores = cancelada(v)
    ? [seloDaCancelada(v, hoje).toLowerCase()]
    : [formatarMoeda(v.resumo.totalCliente), `receita ${formatarMoeda(v.resumo.margem)}`];
  return [passageirosDaVenda(v), fornecedorDaVenda(v) ?? "", ...valores]
    .filter((p) => p !== "")
    .join(" · ");
}

function produtoECancelada(v: VendaDaReserva): string {
  const produto = v.resumo.produto?.trim();
  return `${produto ? `, ${produto}` : ""}${cancelada(v) ? ", cancelada" : ""}`;
}

/** "venda 2 de 10, RAV INTERNACIONAL, cancelada": o rótulo das setas da barra (IA 10.1). */
export function textoDaVenda(v: VendaDaReserva, total: number): string {
  return `venda ${v.posicao} de ${total}${produtoECancelada(v)}`;
}

/** "próxima: venda 2, RAV INTERNACIONAL, cancelada". */
export function textoDaProxima(v: VendaDaReserva): string {
  return `próxima: venda ${v.posicao}${produtoECancelada(v)}`;
}

/** "10 vendas, 1 cancelada" (IA 10.3), ao lado do título da seção. */
export function contagemDasVendas(r: Reserva): string {
  const total = plural(r.vendas.length, "venda", "vendas");
  const n = r.vendas.filter(cancelada).length;
  return n === 0 ? total : `${total}, ${plural(n, "cancelada", "canceladas")}`;
}
