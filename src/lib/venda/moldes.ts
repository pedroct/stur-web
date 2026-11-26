/**
 * O que cada molde da venda mostra (Global Constraints, Cobertura do Anexo B). Cada task que faz
 * um molde declara aqui os caminhos dele, com o `naTela` que o teste do Anexo B procura; o resto
 * do grupo aparece pelo `GrupoDeCampos`, por `camposSemMolde`.
 */

import { maiuscula } from "@/lib/consulta/descricao";
import { CAMPOS_ANEXO_B, type CampoAnexo } from "./anexo-b";
import { nomeDoProduto } from "./cabecalho";

export type Molde =
  | "cabecalho"
  | "financeiro"
  | "lancamento"
  | "itinerario"
  | "hospedagem"
  | "veiculo"
  | "servicos"
  | "pessoa"
  | "conta"
  | "vinculos"
  | "mais-detalhes"
  | "codigos"
  | "incentivo";

/** `valor`: o valor formatado pela regra do `GrupoDeCampos`, passado por `transformar`. */
export type NaTela =
  | { tipo: "rotulo" | "coluna"; texto: string }
  | { tipo: "valor"; transformar?: (formatado: string) => string };

export type CampoDoMolde = { caminho: string; naTela: NaTela };

function valor(caminho: string, transformar?: (formatado: string) => string): CampoDoMolde {
  return { caminho, naTela: { tipo: "valor", transformar } };
}

function coluna(caminho: string, texto: string): CampoDoMolde {
  return { caminho, naTela: { tipo: "coluna", texto } };
}

/** Os caminhos que mostram o valor como veio, na ordem dada. */
function valores(...caminhos: string[]): CampoDoMolde[] {
  return caminhos.map((caminho) => valor(caminho));
}

/** O período "20/11 a 22/11/2026" só tem o ano no fim: o início aparece como dd/mm. */
const semAno = (formatado: string) => formatado.slice(0, 5);

const reais = (formatado: string) => `R$ ${formatado}`;

/** O que a venda de incentivo mostra no "Datas e nome no serviço", recolhido (tela 17). */
export const DATAS_E_NOME_NO_SERVICO = [
  "detalheItem[].dtInicio",
  "detalheItem[].dtTermino",
  "detalheItem[].nomePax",
  "detalheItem[].nomePaxCompleto",
];

function rotuloDoAnexo(caminho: string): CampoDoMolde {
  const campo = CAMPOS_ANEXO_B.find((c) => c.caminho === caminho);
  return { caminho, naTela: { tipo: "rotulo", texto: campo?.rotulo ?? caminho } };
}

export const MOLDES: Record<Molde, CampoDoMolde[]> = {
  // O cabeçalho junta vários campos em frases (o subtítulo, o selo da situação): cada um aparece
  // dentro do texto que o contém.
  cabecalho: [
    valor("reserva", (f) => `Reserva ${f}`),
    valor("status", (f) => `${maiuscula(f.trim().toLowerCase())} no Stur`),
    valor("nomeproduto", (f) => nomeDoProduto(f, null)),
    valor("classificacaoproduto", (f) => `(${f})`),
    valor("categoriaproduto", (f) => f.toLowerCase()),
    valor("nomecliente"),
    valor("dtemissao", (f) => `emitida em ${f}`),
    valor("nomefornec"),
    valor("dtalteracaovinculado", (f) => `Dados do Stur até ${f.replace(/\/\d{4} · /, ", ")}`),
  ],
  // Os cartões: o total, o saldo de cada lado e a margem, em reais.
  financeiro: [
    valor("totalCliente", reais),
    valor("totalFornecedor", reais),
    valor("margemLucroBruta", reais),
    valor("totalAReceberCliente", reais),
    valor("totalRecebidoCliente", reais),
    valor("totalAPagarFornec", reais),
    valor("totalPagoFornec", reais),
    valor("totalAReceberFornecedor", reais),
    valor("totalRecebidoFornec", reais),
    valor("taxasAdministrativas", reais),
  ],
  // O que a linha do cartão mostra: a forma em minúsculas e o valor. O vencimento só entra no selo
  // dos em aberto, e os documentos e o cartão saem de outros campos: eles ficam nos detalhes.
  lancamento: [
    valor("recebimentos[].descricaoForma", (f) => f.toLowerCase()),
    valor("recebimentos[].valor", reais),
    valor("pagamentos[].descricaoForma", (f) => f.toLowerCase()),
    valor("pagamentos[].valor", reais),
  ],
  // O itinerário: a frase mostra as cidades; a tabela, o resto. No rodoviário, a tabela não tem
  // voo, companhia, classe nem base tarifária, e esses campos vão para o grupo com o rótulo.
  itinerario: [
    ...valores(
      "trechos[].origem.sigla",
      "trechos[].origem.cidade",
      "trechos[].origem.aeroporto",
      "trechos[].destino.sigla",
      "trechos[].destino.cidade",
      "trechos[].destino.aeroporto",
      "trechos[].cia",
      "trechos[].voo",
      "trechos[].classe",
      "trechos[].farebase",
      "trechos[].localizador",
    ),
    coluna("trechos[].dtPartida", "Partida"),
    coluna("trechos[].dtChegada", "Chegada"),
  ],
  // O hotel, o período com as diárias e os pares do card; o resto do grupo vem pelo `GrupoDeCampos`.
  hospedagem: [
    valor("detalheItem[].dtEntrada", semAno),
    ...valores(
      "detalheItem[].dtSaida",
      "detalheItem[].categHotel",
      "detalheItem[].regime",
      "detalheItem[].acomodacoesePassageiros",
      "detalheItem[].apartamentos[].tipoApartamento",
      "detalheItem[].apartamentos[].qtdeDiarias",
      "detalheItem[].numerodeconfirmacao",
      "detalheItem[].numeroVC",
    ),
  ],
  veiculo: valores(
    "detalheItem[].veiculo",
    "detalheItem[].dtRetirada",
    "detalheItem[].horaRetirada",
    "detalheItem[].localRetirada",
    "detalheItem[].dtDevolucao",
    "detalheItem[].horaDevolucao",
    "detalheItem[].localDevolucao",
    "detalheItem[].qtdeDiarias",
    "detalheItem[].numerodeconfirmacao",
    "detalheItem[].numeroVC",
  ),
  // A tabela de Diversos e Pacote: a descrição leva a OS e a confirmação na segunda linha.
  servicos: [
    ...valores(
      "detalheItem[].descricao",
      "detalheItem[].dtInicio",
      "detalheItem[].dtTermino",
      "detalheItem[].numeroOS",
      "detalheItem[].numerodeconfirmacao",
    ),
    coluna("detalheItem[].qtde", "Qtde"),
  ],
  // A linha da pessoa; "Documentos e contato" e "Viagem corporativa" vêm pelo `GrupoDeCampos`.
  pessoa: valores(
    "detalheItem[].nomePax",
    "detalheItem[].nomePaxCompleto",
    "detalheItem[].descricaoSiglaTipoPax",
    "detalheItem[].bilhete",
  ),
  // A conta armada (Task 7; `lib/venda/conta.ts`): os termos e a tarifa pelo valor, os
  // percentuais no rótulo, a sigla, o câmbio e a data na linha da tarifa convertida, o unitário ou
  // a diária da linha e as frases de referência. O que ela não mostra de um serviço, pelo que veio
  // (`caminhosDaConta`), vai para o `GrupoDeCampos` do lado.
  conta: valores(
    "detalheItem[].siglaMoedaTarifa",
    "detalheItem[].vlrTarifa",
    "detalheItem[].dtCambio",
    "detalheItem[].vlrCambio",
    "detalheItem[].vlrTarifaTotal",
    "detalheItem[].perDesconto",
    "detalheItem[].vlrDesconto",
    "detalheItem[].perTaxas",
    "detalheItem[].vlrTaxas",
    "detalheItem[].vlrTxEmb",
    "detalheItem[].vlrTxDU",
    "detalheItem[].vlrTxExt",
    "detalheItem[].vlrTxServico",
    "detalheItem[].siglaMoedaTarifap",
    "detalheItem[].vlrTarifap",
    "detalheItem[].dtCambiop",
    "detalheItem[].vlrCambiop",
    "detalheItem[].vlrTarifaTotalp",
    "detalheItem[].percDescontoAcordo",
    "detalheItem[].vlrDescontoAcordo",
    "detalheItem[].perTaxasP",
    "detalheItem[].vlrTaxasP",
    "detalheItem[].vlrTxEmbp",
    "detalheItem[].vlrTxExtP",
    "detalheItem[].vlrFeePagar",
    "detalheItem[].vlrOverRec",
    "detalheItem[].percComisRecebida",
    "detalheItem[].vlrComisRecebida",
    "detalheItem[].vlrTxDURepassada",
    "detalheItem[].vlrOverRep",
    "detalheItem[].perOverRep",
    "detalheItem[].percComisRepassada",
    "detalheItem[].vlrComisRepassada",
    "detalheItem[].apartamentos[].vlrDiaria",
    "detalheItem[].apartamentos[].vlrDiariaP",
    "detalheItem[].apartamentos[].vlrBalcao",
    "detalheItem[].vlrTarifaCheia",
  ),
  vinculos: [],
  "mais-detalhes": [],
  codigos: [],
  // A venda de incentivo (Task 8; `componentes/venda/Incentivo.tsx`): o cabeçalho com a frase do
  // lançamento, os três cartões, a conta do Stur e o serviço lançado. O resto dos grupos aparece
  // pelo `GrupoDeCampos`.
  incentivo: [
    valor("nomefornec"),
    valor("nomecliente"),
    valor("dtemissao", (f) => `lançado em ${f}`),
    valor("totalCliente"),
    valor("totalFornecedor"),
    valor("margemLucroBruta", reais),
    valor("pagamentos[].valor", reais),
    valor("pagamentos[].dtVencto"),
    valor("detalheItem[].descricao"),
    valor("detalheItem[].observacao", (f) => `"${f}"`),
    valor("detalheItem[].vlrTarifaTotalp"),
    valor("detalheItem[].numeroOS"),
    ...DATAS_E_NOME_NO_SERVICO.map(rotuloDoAnexo),
  ],
};

/** Os campos do grupo que nenhum dos moldes declarou, na ordem do Anexo B, sem os contêineres. */
export function camposSemMolde(grupo: string, moldes: Molde[]): CampoAnexo[] {
  const declarados = new Set(moldes.flatMap((m) => MOLDES[m].map((c) => c.caminho)));
  return CAMPOS_ANEXO_B.filter(
    (c) => c.grupo === grupo && !c.conteiner && !declarados.has(c.caminho),
  );
}
