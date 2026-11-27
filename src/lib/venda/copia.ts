/**
 * Os textos de "Copiar para enviar" (IA 10.2; decisões 18 e 27): o endereço e um resumo para colar
 * numa mensagem, com a linha em aberto para a pessoa escrever a divergência. Sem documento nem
 * contato do passageiro (RF-08); o nome só entra com um serviço aberto.
 */

import type { ReservaConsultada, VendaConsultada } from "@/contrato/tipos";
import { rotuloDaClassificacao } from "@/lib/consulta/consulta";
import { maiuscula } from "@/lib/consulta/descricao";
import { ehDecimal } from "@/lib/decimal";
import {
  formatarDadosAte,
  formatarData,
  formatarMoeda,
  formatarPercentual,
} from "@/lib/formatacao";
import { contagemDasVendas } from "@/lib/reserva/tabela";
import { diaEmFortaleza, formatarInstante } from "@/lib/tempo";
import { preenchido } from "./campos";
import { lancamentoDoCredito, seloDoLancamento } from "./lancamentos";

const TITULO = "Consulta de reserva do Stur";
const EM_ABERTO = "O que diverge do Stur:";

function texto(valor: string | null | undefined): string | null {
  return valor !== null && valor !== undefined && valor.trim() !== "" ? valor.trim() : null;
}

/** "R$ 1.000,00"; o que não é decimal vira "—". */
function reais(valor: string | null | undefined): string {
  return valor !== null && valor !== undefined && ehDecimal(valor) ? formatarMoeda(valor) : "—";
}

/** "Margem R$ {z} ({p}%)", ou "(% de lucro: não se aplica)" com o percentual nulo (decisão 27). */
function margem(valor: string | null | undefined, percentual: string | null): string {
  const p = formatarPercentual(percentual);
  return `Margem ${reais(valor)} (${p ?? "% de lucro: não se aplica"})`;
}

function totais(
  cliente: string | null | undefined,
  fornecedor: string | null | undefined,
  lucro: string | null | undefined,
  percentual: string | null,
): string {
  return `Total Cliente ${reais(cliente)}. Total Fornecedor ${reais(fornecedor)}. ${margem(lucro, percentual)}`;
}

/** As duas linhas do fim, antes da linha em aberto. */
function datasDaConsulta(consultadoEm: string, dadosDoSturAte: string | null): string[] {
  return [
    `Consultado na API em ${formatarInstante(consultadoEm)}`,
    ...(dadosDoSturAte === null ? [] : [`Dados do Stur até ${formatarDadosAte(dadosDoSturAte)}`]),
  ];
}

/** O `idreserva` da venda; o contrato o manda sempre, e a posição na reserva é a segunda fonte. */
export function idDaVenda(dados: VendaConsultada): number {
  const id =
    dados.venda.idreserva ??
    dados.reserva.vendas.find((v) => v.posicao === dados.posicao)?.resumo.idreserva;
  if (id === undefined) throw new Error("Venda sem idreserva");
  return id;
}

function fim(dados: VendaConsultada): string[] {
  return [
    ...datasDaConsulta(dados.consultadoEm, dados.dadosDoSturAte),
    `Id interno da venda: ${idDaVenda(dados)}`,
    "",
    EM_ABERTO,
  ];
}

/** "Reserva {n}" e, com mais de uma venda na reserva, " (venda {k} de {n})". */
function linhaDaReserva(dados: VendaConsultada): string {
  const total = dados.reserva.vendas.length;
  const posicao = total > 1 ? ` (venda ${dados.posicao} de ${total})` : "";
  return `Reserva ${dados.reserva.numero}${posicao}`;
}

/** "Serviço {k} de {n}: {nomePaxCompleto}"; sem nome, só a posição. */
function linhaDoServico(dados: VendaConsultada, k: number): string {
  const servicos = dados.venda.detalheItem ?? [];
  const servico = servicos[k - 1];
  const nome = texto(servico?.nomePaxCompleto) ?? texto(servico?.nomePax);
  const doPassageiro = nome === null ? "" : `: ${nome}`;
  return `Serviço ${k} de ${servicos.length}${doPassageiro}`;
}

function linhaDoProduto(dados: VendaConsultada): string | null {
  const { venda } = dados;
  const produto = texto(venda.nomeproduto);
  const detalhe = [rotuloDaClassificacao(venda.classificacaoproduto), texto(venda.categoriaproduto)]
    .filter((p) => p !== null)
    .join(", ");
  const entreParenteses = detalhe === "" ? "" : ` (${detalhe})`;
  const situacao = texto(venda.status);
  const partes = [
    produto === null ? null : `Produto: ${produto}${entreParenteses}.`,
    situacao === null ? null : `Situação: ${maiuscula(situacao.toLowerCase())}`,
  ].filter((p) => p !== null);
  return partes.length === 0 ? null : partes.join(" ");
}

/**
 * A venda (IA 10.2). Com `servico` (o `k` do painel, de 1 a n), entram a linha do serviço, com o
 * nome do passageiro, e o `url` já deve ser o do serviço.
 */
export function textoCopiadoVenda(dados: VendaConsultada, url: string, servico?: number): string {
  const { venda, calculos } = dados;
  const cliente = texto(venda.nomecliente);
  return [
    TITULO,
    url,
    linhaDaReserva(dados),
    ...(servico === undefined ? [] : [linhaDoServico(dados, servico)]),
    linhaDoProduto(dados),
    cliente === null ? null : `Cliente: ${cliente}`,
    totais(
      venda.totalCliente,
      venda.totalFornecedor,
      venda.margemLucroBruta,
      calculos.percentualLucro,
    ),
    ...fim(dados),
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/**
 * "Incentivo de {fornecedor}, R$ {margem}, {selo do 1º crédito}, vencimento {data}": o selo sem a
 * data, que vem logo depois. Sem lançamento, só o fornecedor e o valor.
 */
export function linhaDoIncentivo(dados: VendaConsultada): string {
  const { venda } = dados;
  const alvo = lancamentoDoCredito(dados);
  const fornecedor = texto(venda.nomefornec);
  const deQuem = fornecedor === null ? "" : ` de ${fornecedor}`;
  const partes = [`Incentivo${deQuem}`, reais(venda.margemLucroBruta)];
  if (alvo !== null) {
    const hoje = diaEmFortaleza(dados.consultadoEm);
    const { rotulo } = seloDoLancamento({ ...alvo.l, vencimento: null }, "fornecedor", hoje);
    partes.push(`${rotulo.charAt(0).toLowerCase()}${rotulo.slice(1)}`);
    const { vencimento } = alvo.l;
    if (vencimento !== null && preenchido(vencimento, "vencimento")) {
      partes.push(`vencimento ${formatarData(vencimento)}`);
    }
  }
  return partes.join(", ");
}

export function textoCopiadoIncentivo(dados: VendaConsultada, url: string): string {
  return [TITULO, url, linhaDaReserva(dados), linhaDoIncentivo(dados), ...fim(dados)].join("\n");
}

/** A reserva sem venda aberta (decisão 18): o endereço da reserva e os totais das vendas ativas. */
export function textoCopiadoReserva(r: ReservaConsultada, url: string): string {
  const { reserva } = r;
  const cliente = reserva.vendas.map((v) => texto(v.resumo.cliente)).find((c) => c !== null);
  const { totais: t } = reserva;
  return [
    TITULO,
    url,
    `Reserva ${reserva.numero} (${contagemDasVendas(reserva)})`,
    cliente === undefined ? null : `Cliente: ${cliente}`,
    totais(t.totalCliente, t.totalFornecedor, t.margem, t.percentualLucro),
    ...datasDaConsulta(r.consultadoEm, r.dadosDoSturAte),
    "",
    EM_ABERTO,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
