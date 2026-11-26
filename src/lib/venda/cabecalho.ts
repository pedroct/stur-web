/** Textos do topo da venda: nome do produto, subtítulo, frase da receita e avisos (IA 6.2, 9.5). */

import type { AvisoApi, CalculosVenda, VendaAgi, Vinculos } from "@/contrato/tipos";
import { situacaoDe } from "@/lib/consulta/consulta";
import { maiuscula, unir } from "@/lib/consulta/descricao";
import { ehDecimal, ehNegativo, ehZero } from "@/lib/decimal";
import { formatarData } from "@/lib/formatacao";
import { normalizar } from "@/lib/textos";
import { fornecedoresDe, preenchido } from "./campos";
import { ABREVIACOES_DE_PRODUTO, ACENTOS_DE_PRODUTO } from "./parametros";
import { enderecoDaVenda } from "./rota";

export type AvisoDaTela = { tom: "atencao" | "info" | "neutro"; texto: string; link?: string };

function texto(valor: string | null | undefined): string | null {
  if (!preenchido(valor) || !valor) return null;
  return valor.trim() === "" ? null : valor.trim();
}

/** "HOTEL NAC" e "Nacional" dão "Hotel nacional" (decisão 24). */
export function nomeDoProduto(produto: string | null, categoria: string | null): string {
  const palavras = (produto ?? "").split(/\s+/).flatMap((palavra) => {
    if (palavra === "") return [];
    const chave = normalizar(palavra);
    const troca = ABREVIACOES_DE_PRODUTO[chave] ?? ACENTOS_DE_PRODUTO[chave];
    if (troca !== undefined) return troca === "" ? [] : [troca];
    return [palavra.toLowerCase()];
  });
  const cat = texto(categoria)?.toLowerCase() ?? null;
  if (cat !== null && !palavras.some((p) => normalizar(p) === normalizar(cat))) palavras.push(cat);
  return maiuscula(palavras.join(" "));
}

/** "{produto} ({classificação}) · {fornecedor2}, pela {fornecedor} · emitida em {data}". */
export function subtituloDaVenda(v: VendaAgi): string {
  const classificacao = texto(v.classificacaoproduto);
  const produto = nomeDoProduto(v.nomeproduto ?? null, v.categoriaproduto ?? null);
  const comClassificacao = classificacao === null ? produto : `${produto} (${classificacao})`;
  const { principal, operadora } = fornecedoresDe(texto(v.nomefornec), texto(v.nomefornec2));
  const fornecedor =
    principal !== null && operadora !== null ? `${principal}, pela ${operadora}` : principal;
  const emissao =
    preenchido(v.dtemissao, "dtemissao") && v.dtemissao
      ? `emitida em ${formatarData(v.dtemissao)}`
      : null;
  return [comClassificacao, fornecedor, emissao].filter((p) => p !== null && p !== "").join(" · ");
}

/** O selo da origem na venda aberta dentro da reserva: lançada direto ou a integração (telas 4 e 7). */
export function origemDaVenda(v: VendaAgi): string {
  const sistema = texto(v.sistemaExterno?.sistema);
  if (sistema !== null) return `Integração ${sistema}`;
  return texto(v.sistemaExterno?.idVenda) === null ? "Lançada direto no Stur" : "Integração";
}

/** "Incentivo pago pelo fornecedor à A3 · lançado em {data}" (tela 17). */
export function subtituloDoIncentivo(v: VendaAgi): string {
  const lancamento =
    preenchido(v.dtemissao, "dtemissao") && v.dtemissao
      ? `lançado em ${formatarData(v.dtemissao)}`
      : null;
  return ["Incentivo pago pelo fornecedor à A3", lancamento].filter((p) => p !== null).join(" · ");
}

/** A frase de apoio do incentivo: o Stur registra a própria A3 como cliente. */
export function apoioDoIncentivo(v: VendaAgi): string {
  const cliente = texto(v.nomecliente);
  return cliente === null
    ? "Não há venda a cliente."
    : `Não há venda a cliente: o Stur registra a própria ${cliente} como cliente.`;
}

/** Só um decimal conta: vazio (`""`, nulo) não é zero nem negativo, e não derruba a página. */
function decimal(valor: string | null | undefined): valor is string {
  return valor !== null && valor !== undefined && ehDecimal(valor);
}

function zero(valor: string | null | undefined): boolean {
  return decimal(valor) && ehZero(valor);
}

/** A frase do cartão Receita, só nos quatro casos de regra (decisão 4). */
export function fraseDaReceita(v: VendaAgi, c: CalculosVenda): string | null {
  const frases = [
    situacaoDe(v.status ?? null) === "cancelada"
      ? "fora dos totais, porque a venda está cancelada"
      : null,
    zero(v.totalCliente) && decimal(v.margemLucroBruta) && ehNegativo(v.margemLucroBruta)
      ? "custo sem cobrança ao cliente"
      : null,
    zero(v.totalFornecedor) ? "sem custo do fornecedor" : null,
    c.percentualLucro === null ? "% de lucro: não se aplica" : null,
  ].filter((f) => f !== null);
  return frases.length === 0 ? null : frases.join("; ");
}

const HORA = /^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/;

function textoDaCancelada(v: VendaAgi): string {
  const resto =
    "A consulta vale também para vendas canceladas. Os valores abaixo são os que ficaram no Stur, e esta venda fica fora dos totais da reserva e da consulta por período.";
  const data = v.dtcancelamento;
  if (!preenchido(data, "dtcancelamento") || !data) return `Venda cancelada no Stur. ${resto}`;
  const hora = HORA.exec(data);
  const quando = hora ? `${formatarData(data)}, às ${hora[1]}h${hora[2]}` : formatarData(data);
  return `Venda cancelada em ${quando}. ${resto}`;
}

function textoDoFee(vinculos: Vinculos): AvisoDaTela {
  const fee = vinculos.fee;
  if (fee === null) {
    return { tom: "info", texto: "Esta venda é o fee de uma venda que não está nesta reserva." };
  }
  const de = fee.produto === null ? "de outra venda" : `da venda de ${fee.produto}`;
  return {
    tom: "info",
    texto: `Esta venda é o fee ${de} desta mesma reserva.`,
    link: enderecoDaVenda(fee.numero, fee.idreserva),
  };
}

function avisoDaTela(a: AvisoApi, v: VendaAgi, vinculos: Vinculos): AvisoDaTela | null {
  const siglas = unir(a.siglas);
  switch (a.codigo) {
    case "conta_nao_fecha": // embaixo do Financeiro, com os números (IA 9.5)
    case "comissao_nao_apurada": // a frase das comissões já diz (decisão 7)
      return null;
    case "moeda_estrangeira":
      return {
        tom: "info",
        texto: `Esta venda tem tarifas em ${siglas}. A aplicação converte só a tarifa pelo câmbio de cada serviço; os demais valores já vêm em R$.`,
      };
    case "moeda_cambio_1":
      return {
        tom: "info",
        texto: `O Stur marca a tarifa desta venda em ${siglas} com câmbio 1,0000. A conta usa o valor como real, como os totais do Stur.`,
      };
    case "venda_fee":
      return textoDoFee(vinculos);
    case "venda_cancelada":
      return { tom: "neutro", texto: textoDaCancelada(v) };
    case "venda_reservada":
      return {
        tom: "info",
        texto:
          "Venda reservada, ainda sem confirmação no Stur. O Stur só gera os títulos a receber e a pagar e só apura as comissões quando a venda é confirmada. Até lá, os valores abaixo são os previstos.",
      };
    default: // código novo da API, que esta versão não conhece: sem aviso
      return null;
  }
}

const ORDEM_DO_TOM: Record<AvisoDaTela["tom"], number> = { atencao: 0, info: 1, neutro: 2 };

/** Os avisos do topo, na ordem da API, com informação antes de neutro. */
export function avisosDaVenda(v: VendaAgi, c: CalculosVenda, vinculos: Vinculos): AvisoDaTela[] {
  return c.avisos
    .map((a) => avisoDaTela(a, v, vinculos))
    .filter((a) => a !== null)
    .sort((a, b) => ORDEM_DO_TOM[a.tom] - ORDEM_DO_TOM[b.tom]);
}
