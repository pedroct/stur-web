/**
 * A conta armada de um serviço (IA 6.6; decisões 5, 6, 7 e 23): os rótulos e o efeito de cada
 * termo, a linha da tarifa, as frases dos zerados, das comissões e das referências, a soma dos
 * serviços e os campos do Anexo B que a conta mostra (o resto vai para o `GrupoDeCampos`).
 */

import type { ContaLado, ContaServico, ServicoAgi, TermoConta } from "@/contrato/tipos";
import { classificacaoDe, situacaoDe } from "@/lib/consulta/consulta";
import { unir } from "@/lib/consulta/descricao";
import { compararDecimais, ehDecimal, ehZero, somarDecimais } from "@/lib/decimal";
import {
  formatarCambio,
  formatarData,
  formatarMoeda,
  formatarPercentualTermo,
  formatarValor,
} from "@/lib/formatacao";
import { preenchido } from "./campos";

export type Lado = "cliente" | "fornecedor";

/** Os campos de cada lado que formam a linha da tarifa. */
const CAMPOS_DO_LADO = {
  cliente: {
    tarifa: "vlrTarifaTotal",
    unitario: "vlrTarifa",
    diaria: "vlrDiaria",
    sigla: "siglaMoedaTarifa",
    cambio: "vlrCambio",
    data: "dtCambio",
  },
  fornecedor: {
    tarifa: "vlrTarifaTotalp",
    unitario: "vlrTarifap",
    diaria: "vlrDiariaP",
    sigla: "siglaMoedaTarifap",
    cambio: "vlrCambiop",
    data: "dtCambiop",
  },
} as const;

type CampoDoPercentual =
  | "perTaxas"
  | "perDesconto"
  | "perOverRep"
  | "percComisRepassada"
  | "perTaxasP"
  | "percDescontoAcordo"
  | "percComisRecebida";

type Termo = { rotulo: string; percentual?: CampoDoPercentual };

const TERMOS: Record<Lado, Record<string, Termo>> = {
  cliente: {
    vlrTarifaTotal: { rotulo: "Tarifa" },
    vlrTaxas: { rotulo: "Taxas", percentual: "perTaxas" },
    vlrTxExt: { rotulo: "Extras" },
    vlrTxServico: { rotulo: "Taxa de serviço" },
    vlrTxEmb: { rotulo: "Taxa de embarque" },
    vlrTxDU: { rotulo: "Taxa DU" },
    vlrDesconto: { rotulo: "Desconto", percentual: "perDesconto" },
    vlrTxDURepassada: { rotulo: "DU repassada" },
    vlrOverRep: { rotulo: "Over repassado", percentual: "perOverRep" },
    vlrComisRepassada: { rotulo: "Comissão repassada", percentual: "percComisRepassada" },
  },
  fornecedor: {
    vlrTarifaTotalp: { rotulo: "Tarifa" },
    vlrTaxasP: { rotulo: "Taxas", percentual: "perTaxasP" },
    vlrTxExtP: { rotulo: "Extras" },
    vlrTxEmbp: { rotulo: "Taxa de embarque" },
    vlrFeePagar: { rotulo: "Fee a pagar" },
    vlrDescontoAcordo: { rotulo: "Acordo", percentual: "percDescontoAcordo" },
    vlrOverRec: { rotulo: "Over recebido" },
    vlrComisRecebida: { rotulo: "Comissão recebida", percentual: "percComisRecebida" },
  },
};

const COMISSAO_RECEBIDA: Record<string, string> = {
  hotelaria: "Comissão do hotel",
  locacao: "Comissão da locadora",
  pacote: "Comissão da operadora",
};

function decimal(valor: unknown): valor is string {
  return typeof valor === "string" && ehDecimal(valor);
}

function maiorQueZero(valor: string): boolean {
  return compararDecimais(valor, "0") > 0;
}

export function efeitoDoTermo(efeito: TermoConta["efeito"], lado: Lado): string {
  const conta = lado === "cliente" ? "ao total do cliente" : "ao custo do fornecedor";
  if (efeito === "soma") return `soma ${conta}`;
  return lado === "cliente" ? "reduz o total do cliente" : "reduz o custo do fornecedor";
}

/** O rótulo sem o percentual; é também o nome do termo nos zerados (`nomeNaFrase`). */
function rotuloBase(campo: string, lado: Lado, classificacao: string | null): string {
  if (lado === "fornecedor" && campo === "vlrComisRecebida") {
    return COMISSAO_RECEBIDA[classificacaoDe(classificacao) ?? ""] ?? "Comissão recebida";
  }
  return TERMOS[lado][campo]?.rotulo ?? "Outro valor";
}

/** O percentual do termo, formatado, quando o campo dele está preenchido e diferente de zero. */
function percentualDoTermo(campo: string, lado: Lado, servico: ServicoAgi): string | null {
  const nome = TERMOS[lado][campo]?.percentual;
  const valor = nome === undefined ? null : servico[nome];
  if (!decimal(valor) || ehZero(valor)) return null;
  return formatarPercentualTermo(valor);
}

/** "Taxas, 10%" (tabela da Task 7). A tarifa tem a linha própria (`linhaDaTarifa`). */
export function rotuloDoTermo(
  campo: string,
  lado: Lado,
  classificacao: string | null,
  servico: ServicoAgi,
): string {
  const rotulo = rotuloBase(campo, lado, classificacao);
  const percentual = percentualDoTermo(campo, lado, servico);
  return percentual === null ? rotulo : `${rotulo}, ${percentual}`;
}

/** O rótulo do termo somado: o percentual só entra quando é o mesmo em todos os serviços. */
export function rotuloDoTermoSomado(
  campo: string,
  lado: Lado,
  classificacao: string | null,
  servicos: ServicoAgi[],
): string {
  const rotulo = rotuloBase(campo, lado, classificacao);
  const percentuais = new Set(servicos.map((s) => percentualDoTermo(campo, lado, s)));
  const [unico] = percentuais;
  return percentuais.size === 1 && unico !== null && unico !== undefined
    ? `${rotulo}, ${unico}`
    : rotulo;
}

export function ehTarifa(campo: string, lado: Lado): boolean {
  return campo === CAMPOS_DO_LADO[lado].tarifa;
}

type Apartamento = NonNullable<ServicoAgi["apartamentos"]>[number];

function diarias(n: number): string {
  return `${n} ${n === 1 ? "diária" : "diárias"}`;
}

/** As partes da linha antes da conversão; `null` quando o serviço não tem a forma dela. */
function partesDaTarifa(
  lado: Lado,
  servico: ServicoAgi,
  classificacao: string | null,
): { linhas: (unitario: (valor: string) => string) => string[]; caminhos: string[] } | null {
  const campos = CAMPOS_DO_LADO[lado];
  const classe = classificacaoDe(classificacao);
  const apartamentos = servico.apartamentos ?? [];
  const completo = (a: Apartamento) =>
    typeof a.qtde === "number" && typeof a.qtdeDiarias === "number" && decimal(a[campos.diaria]);
  if (classe === "hotelaria" && apartamentos.length > 0 && apartamentos.every(completo)) {
    return {
      linhas: (unitario) =>
        apartamentos.map(
          (a) =>
            `${a.qtde} apto × ${diarias(a.qtdeDiarias ?? 0)} × ${unitario(String(a[campos.diaria]))}`,
        ),
      caminhos: [`detalheItem[].apartamentos[].${campos.diaria}`],
    };
  }
  const valor = servico[campos.unitario];
  if (!decimal(valor)) return null;
  const caminhos = [`detalheItem[].${campos.unitario}`];
  if (classe === "locacao" && typeof servico.qtdeDiarias === "number") {
    const n = servico.qtdeDiarias;
    return { linhas: (unitario) => [`${diarias(n)} × ${unitario(valor)}`], caminhos };
  }
  if (typeof servico.qtde === "number" && servico.qtde > 1) {
    const n = servico.qtde;
    return { linhas: (unitario) => [`${n} × ${unitario(valor)}`], caminhos };
  }
  return null;
}

function ehBrl(sigla: string | null | undefined): boolean {
  return typeof sigla === "string" && sigla.replace(/\s/g, "").toUpperCase() === "BRL";
}

function fraseDoCambio1(siglas: string[]): string {
  return `Marcada em ${unir(siglas)} no Stur, com câmbio ${formatarCambio("1")}; contada como real.`;
}

/**
 * A linha da tarifa de um lado (decisão 6): uma por apartamento na hotelaria, as diárias da
 * locação, a quantidade, ou "Tarifa". Com conversão, o unitário vem na moeda de origem e a linha
 * leva o câmbio e a data dele; com câmbio 1, a nota embaixo; com BRL, "em BRL, que é real".
 */
export function linhaDaTarifa(
  lado: Lado,
  conta: ContaLado,
  servico: ServicoAgi,
  classificacao: string | null,
): { linhas: string[]; nota: string | null } {
  const conversao = conta.conversao;
  const partes = partesDaTarifa(lado, servico, classificacao);
  let linhas: string[];
  if (conversao === null) {
    linhas = partes?.linhas(formatarValor) ?? ["Tarifa"];
    if (ehBrl(servico[CAMPOS_DO_LADO[lado].sigla])) {
      linhas = linhas.map((l) => `${l} · em BRL, que é real`);
    }
  } else {
    const data = preenchido(conversao.dataCambio, `detalheItem[].${CAMPOS_DO_LADO[lado].data}`)
      ? ` · de ${formatarData(conversao.dataCambio)}`
      : "";
    const cambio = ` × câmbio ${formatarCambio(conversao.cambio)}${data}`;
    const naOrigem = (valor: string) => `${conversao.sigla} ${formatarValor(valor)}`;
    const base = partes?.linhas(naOrigem) ?? [`Tarifa ${naOrigem(conversao.tarifaOrigem)}`];
    linhas = base.map((l) => `${l}${cambio}`);
  }
  const sigla = conta.siglaComCambio1;
  return { linhas, nota: sigla === null ? null : fraseDoCambio1([sigla.trim()]) };
}

/** A linha das tarifas somadas (decisão 23), com as frases da conversão e do câmbio 1. */
export function linhaDasTarifas(
  lado: Lado,
  contas: ContaServico[],
): { linhas: string[]; nota: string | null } {
  const lados = contas.map((c) => c[lado]);
  const siglas = [
    ...new Set(
      lados.flatMap((l) => (l.siglaComCambio1 === null ? [] : [l.siglaComCambio1.trim()])),
    ),
  ];
  const frases = [
    ...(lados.some((l) => l.conversao !== null)
      ? ["Tarifas convertidas pelo câmbio de cada serviço."]
      : []),
    ...(siglas.length > 0 ? [fraseDoCambio1(siglas)] : []),
  ];
  return { linhas: ["Tarifas"], nota: frases.length === 0 ? null : frases.join(" ") };
}

/** O nome do termo no meio da frase: só a primeira letra desce, e a sigla fica ("taxa DU"). */
function nomeNaFrase(rotulo: string): string {
  const [palavra = ""] = rotulo.split(" ");
  if (palavra.length > 1 && palavra === palavra.toUpperCase()) return rotulo;
  return rotulo.charAt(0).toLowerCase() + rotulo.slice(1);
}

/**
 * Os campos zerados de cada lado que entram na frase dos zerados: o termo é zero nos dois lados em
 * que existe. Um zero do cliente com o mesmo termo diferente de zero no fornecedor ("Taxas") fica
 * fora da frase e vai para o grupo da conta, como os outros campos dela.
 */
export function zeradosDaFrase(
  conta: ContaServico,
  classificacao: string | null,
): Record<Lado, string[]> {
  const comValor = new Set(
    (["cliente", "fornecedor"] as const).flatMap((lado) =>
      conta[lado].termos.map((t) => rotuloBase(t.campo, lado, classificacao)),
    ),
  );
  const doLado = (lado: Lado) =>
    conta[lado].zerados.filter((c) => !comValor.has(rotuloBase(c, lado, classificacao)));
  return { cliente: doLado("cliente"), fornecedor: doLado("fornecedor") };
}

/** "Zerados: desconto, extras e acordo." (decisão 5): os dois lados, sem repetir. */
export function fraseZerados(
  conta: ContaServico,
  prefixo: "Zerados" | "Zerados neste serviço",
  classificacao: string | null,
): string | null {
  const zerados = zeradosDaFrase(conta, classificacao);
  const nomes = [
    ...new Set(
      (["cliente", "fornecedor"] as const).flatMap((lado) =>
        zerados[lado].map((c) => nomeNaFrase(rotuloBase(c, lado, classificacao))),
      ),
    ),
  ];
  return nomes.length === 0 ? null : `${prefixo}: ${unir(nomes)}.`;
}

function somaDoCampo(servicos: ServicoAgi[], campo: "vlrComissaoEmissor" | "vlrComissaoPromotor") {
  return somarDecimais(servicos.flatMap((s) => (decimal(s[campo]) ? [s[campo]] : [])));
}

/** As comissões da equipe numa frase (decisão 7). */
export function fraseComissoes(
  contas: ContaServico[],
  servicos: ServicoAgi[],
  situacao: string | null,
): string {
  const emissor = somaDoCampo(servicos, "vlrComissaoEmissor");
  const promotor = somaDoCampo(servicos, "vlrComissaoPromotor");
  const frases: string[] = [];
  if (maiorQueZero(emissor) && maiorQueZero(promotor)) {
    frases.push(
      `Comissão do emissor ${formatarMoeda(emissor)} e do promotor ${formatarMoeda(promotor)}.`,
    );
  } else if (maiorQueZero(emissor)) {
    frases.push(`Comissão do emissor ${formatarMoeda(emissor)}.`);
  } else if (maiorQueZero(promotor)) {
    frases.push(`Comissão do promotor ${formatarMoeda(promotor)}.`);
  }
  const estado = situacaoDe(situacao);
  if (estado !== "cancelada" && contas.some((c) => c.comissoesNaoApuradas)) {
    frases.push(
      estado === "reservada"
        ? "Comissões da equipe ainda não apuradas, porque a venda está reservada."
        : "Comissões da equipe ainda não apuradas.",
    );
  }
  return frases.length === 0 ? "Nenhuma comissão da equipe lançada nesta venda." : frases.join(" ");
}

/** Uma frase de referência e o campo do Anexo B que ela mostra. */
export type FraseDeReferencia = { texto: string; caminho: string };

/** A tarifa cheia e a diária de balcão (decisão 6), uma vez por valor diferente. */
export function frasesDeReferencia(servico: ServicoAgi): FraseDeReferencia[] {
  const frases: FraseDeReferencia[] = [];
  const cheia = servico.vlrTarifaCheia;
  if (decimal(cheia) && preenchido(cheia)) {
    frases.push({
      texto: `Tarifa cheia informada no Stur: ${formatarMoeda(cheia)}, fora da conta.`,
      caminho: "detalheItem[].vlrTarifaCheia",
    });
  }
  const vistos: string[] = [];
  for (const a of servico.apartamentos ?? []) {
    const balcao = a.vlrBalcao;
    if (!decimal(balcao) || vistos.some((v) => compararDecimais(v, balcao) === 0)) continue;
    vistos.push(balcao);
    frases.push({
      texto: `Diária de balcão informada: ${formatarValor(balcao)}.`,
      caminho: "detalheItem[].apartamentos[].vlrBalcao",
    });
  }
  return frases;
}

function somarLado(lados: ContaLado[]): ContaLado {
  const ordem: TermoConta[] = [];
  const valores = new Map<string, string[]>();
  for (const termo of lados.flatMap((l) => l.termos)) {
    if (!valores.has(termo.campo)) ordem.push(termo);
    valores.set(termo.campo, [...(valores.get(termo.campo) ?? []), termo.valor]);
  }
  const termos = ordem.flatMap((t, i) => {
    const valor = somarDecimais(valores.get(t.campo) ?? []);
    // A tarifa nunca sai, como no backend; os outros só com a soma diferente de zero.
    return i === 0 || !ehZero(valor) ? [{ ...t, valor }] : [];
  });
  const [primeiro, ...outros] = lados;
  const zerados = (primeiro?.zerados ?? []).filter((c) =>
    outros.every((l) => l.zerados.includes(c)),
  );
  return {
    termos,
    zerados,
    total: somarDecimais(lados.map((l) => l.total)),
    conversao: null,
    siglaComCambio1: null,
  };
}

/**
 * A conta da venda com vários serviços (decisão 23): os termos de mesmo campo somados, só as
 * somas diferentes de zero, e os zerados que são zerados em todos os serviços.
 */
export function somarContas(contas: ContaServico[]): ContaServico {
  return {
    indice: 0,
    cliente: somarLado(contas.map((c) => c.cliente)),
    fornecedor: somarLado(contas.map((c) => c.fornecedor)),
    margem: somarDecimais(contas.map((c) => c.margem)),
    percentualLucro: null,
    comissoesNaoApuradas: contas.some((c) => c.comissoesNaoApuradas),
  };
}

/**
 * Os caminhos do Anexo B que a conta de um serviço mostra, pelo que veio: os termos (com o
 * percentual, quando ele entra no rótulo), os zerados pelo nome, a sigla, o câmbio e a data da
 * conversão, o unitário ou a diária da linha da tarifa e as referências. O resto dos grupos "Conta
 * do cliente" e "Conta do fornecedor" vai para o `GrupoDeCampos`.
 */
export function caminhosDaConta(
  conta: ContaServico,
  servico: ServicoAgi,
  classificacao: string | null,
): Set<string> {
  const caminhos = new Set<string>();
  const campo = (nome: string) => caminhos.add(`detalheItem[].${nome}`);
  for (const lado of ["cliente", "fornecedor"] as const) {
    const contaDoLado = conta[lado];
    const campos = CAMPOS_DO_LADO[lado];
    const partes = partesDaTarifa(lado, servico, classificacao);
    for (const termo of contaDoLado.termos) {
      // Convertida numa linha de unitário ou diária, a tarifa de origem não aparece: só o termo
      // em reais, e o campo fica para o grupo.
      const tarifaNaOrigem = ehTarifa(termo.campo, lado) && contaDoLado.conversao !== null;
      if (!tarifaNaOrigem || partes === null) campo(termo.campo);
      const percentual = TERMOS[lado][termo.campo]?.percentual;
      if (percentual && percentualDoTermo(termo.campo, lado, servico) !== null) campo(percentual);
    }
    for (const zerado of zeradosDaFrase(conta, classificacao)[lado]) campo(zerado);
    if (contaDoLado.conversao !== null) {
      campo(campos.sigla);
      campo(campos.cambio);
      if (preenchido(contaDoLado.conversao.dataCambio, `detalheItem[].${campos.data}`)) {
        campo(campos.data);
      }
    } else if (contaDoLado.siglaComCambio1 !== null) {
      campo(campos.sigla);
      campo(campos.cambio);
    } else if (ehBrl(servico[campos.sigla])) {
      campo(campos.sigla);
    }
    for (const c of partes?.caminhos ?? []) caminhos.add(c);
  }
  for (const frase of frasesDeReferencia(servico)) caminhos.add(frase.caminho);
  return caminhos;
}
