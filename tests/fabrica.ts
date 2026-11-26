import type {
  CalculosVenda,
  ContaServico,
  ErroApi,
  EstadoServico,
  Itinerario,
  LancamentoCalculado,
  LinhaResultado,
  PagamentoAgi,
  Parametros,
  RecebimentoAgi,
  ReservaConsultada,
  ResultadoConsulta,
  ResumoIncentivos,
  ResumoResultado,
  ResumoVenda,
  ServicoAgi,
  TrechoAgi,
  VendaAgi,
  VendaConsultada,
} from "@/contrato/tipos";
import type { Classificacao } from "@/lib/consulta/consulta";
import { somarDecimais } from "@/lib/decimal";
import { CAMPOS_ANEXO_B, type CampoAnexo } from "@/lib/venda/anexo-b";

const DATA = "2026-11-17T10:00:00";

export function parametros(campos?: Partial<Parametros>): Parametros {
  return {
    periodoMaximoDias: 31,
    linhasPorPagina: 20,
    opcoesPorPagina: [20, 50, 100],
    tempoLimiteSegundos: 30,
    dadosDoSturAte: "2026-11-18T09:30:00",
    ...campos,
  };
}

export function resumoVenda(campos?: Partial<ResumoVenda>): ResumoVenda {
  return {
    numero: 90000001,
    idreserva: 1001,
    produto: "HOTEL NAC",
    classificacao: "Hotelaria",
    categoria: null,
    cliente: "CLIENTE EXEMPLO LTDA",
    fornecedor: "FORNECEDOR EXEMPLO",
    fornecedor2: null,
    emissor: "EMISSOR EXEMPLO",
    dataEmissao: DATA,
    dataConfirmacao: DATA,
    dataAlteracao: DATA,
    situacao: "fechada",
    totalCliente: "1000.00",
    totalFornecedor: "900.00",
    margem: "100.00",
    percentualLucro: "10.00",
    contaFecha: true,
    tipo: "venda",
    idVendaFee: null,
    passageiros: [],
    ...campos,
  };
}

export function linha(campos?: Partial<LinhaResultado>): LinhaResultado {
  return { ...resumoVenda(), vendasNoResultado: 1, fee: null, ...campos };
}

type CamposDoResultado = Partial<Omit<ResultadoConsulta, "resumo">> & {
  resumo?: Partial<Omit<ResumoResultado, "incentivos">> & {
    incentivos?: Partial<ResumoIncentivos>;
  };
};

// Como o `resumir_resultado` do backend: sem canceladas e sem incentivos; incentivos não cancelados
// à parte. Os percentuais ficam null (a fábrica não divide): o teste que precisa deles os informa.
function resumir(vendas: LinhaResultado[]): ResumoResultado {
  const ativas = vendas.filter((v) => v.situacao !== "cancelada");
  const clientes = ativas.filter((v) => v.tipo !== "incentivo");
  const incentivos = ativas.filter((v) => v.tipo === "incentivo");
  const margem = somarDecimais(clientes.map((v) => v.margem));
  const valor = somarDecimais(incentivos.map((v) => v.margem));
  return {
    quantidade: clientes.length,
    totalCliente: somarDecimais(clientes.map((v) => v.totalCliente)),
    totalFornecedor: somarDecimais(clientes.map((v) => v.totalFornecedor)),
    margem,
    percentualLucro: null,
    naoFecham: vendas.filter((v) => !v.contaFecha).length,
    canceladas: vendas.filter((v) => v.situacao === "cancelada").length,
    incentivos: {
      quantidade: incentivos.length,
      valor,
      margemComIncentivos: somarDecimais([margem, valor]),
      percentualComIncentivos: null,
    },
  };
}

export function resultado(vendas: LinhaResultado[], campos?: CamposDoResultado): ResultadoConsulta {
  const { resumo, ...resto } = campos ?? {};
  const padrao = resumir(vendas);
  return {
    consulta: {
      reserva: null,
      tipoData: "emissao",
      de: "2026-11-17",
      ate: "2026-11-24",
      situacao: [],
      classificacao: [],
      fornecedor: null,
      cliente: null,
      emissor: null,
      janelaLarga: false,
    },
    consultadoEm: "2026-11-24T22:58:13.123456-03:00",
    dadosDoSturAte: "2026-11-18T09:30:00",
    periodoPassaDaCopia: false,
    vendas,
    ...resto,
    resumo: { ...padrao, ...resumo, incentivos: { ...padrao.incentivos, ...resumo?.incentivos } },
  };
}

// percentualLucro null difere do backend, que calcula: o teste que precisa informa.
export function reserva(
  numero: number,
  resumos: ResumoVenda[],
  campos?: Partial<ReservaConsultada>,
): ReservaConsultada {
  const ativas = resumos.filter((r) => r.situacao !== "cancelada");
  return {
    numero,
    consultadoEm: "2026-11-24T22:48:05.000001-03:00",
    dadosDoSturAte: "2026-11-18T09:30:00",
    reserva: {
      numero,
      vendas: resumos.map((resumo, i) => ({
        resumo,
        posicao: i + 1,
        recebimentos: [],
        pagamentos: [],
        servico: null,
        estadoServico: null,
        centroCusto: null,
        dataCancelamento: null,
      })),
      totais: {
        quantidade: resumos.length,
        quantidadeCanceladas: resumos.filter((r) => r.situacao === "cancelada").length,
        totalCliente: somarDecimais(ativas.map((r) => r.totalCliente)),
        totalFornecedor: somarDecimais(ativas.map((r) => r.totalFornecedor)),
        margem: somarDecimais(ativas.map((r) => r.margem)),
        percentualLucro: null,
        aReceberCliente: "0.00",
        recebidoCliente: "0.00",
        aPagarFornecedor: "0.00",
        pagoFornecedor: "0.00",
        aReceberFornecedor: "0.00",
      },
    },
    ...campos,
  };
}

export function erroApi(
  codigo: string,
  mensagem = "Mensagem de teste.",
  detalhe?: unknown,
): ErroApi {
  return { codigo, mensagem, ...(detalhe === undefined ? {} : { detalhe }) };
}

/** Campos da AGI que a fábrica deixa nulos: o contrato os manda todos, vazios ou não. */
const NULOS_VENDA = [
  "atividade",
  "chaveimportacao",
  "destino",
  "dtalteracao",
  "dtalteracaovinculado",
  "dtcancelamento",
  "dtconfirmacao",
  "dtcriacao",
  "dtreabertura",
  "dtreativacao",
  "file",
  "financeiroVinculado",
  "grupocliente",
  "idAuxiliar",
  "idCentrocustos",
  "idCliente",
  "idDepSetCli",
  "idPromotor",
  "idcCustoCliente",
  "idemissor",
  "idfilial",
  "idfornec",
  "idfornec2",
  "idproduto",
  "idreservavinculadafee",
  "intinerario",
  "midiaOrigem",
  "nomeAutorizador",
  "nomeAuxiliar",
  "nomeCCustoCliente",
  "nomeCenctroCustos",
  "nomeCoordenador",
  "nomeDeptoSetorCli",
  "nomeEmissor",
  "nomeFilial",
  "nomePromotor",
  "nomeSolicitante",
  "nomearquivo",
  "nomefornec2",
  "projeto",
  "siglaCCustoCliente",
  "sistemaExterno",
  "situacaoFinanceiroRecebimento",
  "taxasAdministrativas",
  "taxasAdministrativasRepassadas",
  "tipoVenda",
  "tiporegistro",
  "totalAPagarCliente",
  "totalAPagarFornec",
  "totalAReceberCliente",
  "totalAReceberFornecedor",
  "totalPagoCliente",
  "totalPagoFornec",
  "totalRecebidoCliente",
  "totalRecebidoFornec",
];
const NULOS_SERVICO = [
  "acomodacoesePassageiros",
  "bilhete",
  "categHotel",
  "celularpax",
  "comisSobreTxEmb",
  "comisSobreTxEmbMoedaOriginal",
  "confirmadopor",
  "cpfPax",
  "datadeconfirmacao",
  "descricao",
  "descricaoSiglaTipoPax",
  "doctoPax",
  "dtCambio",
  "dtCambiop",
  "dtDevolucao",
  "dtEntrada",
  "dtInicio",
  "dtRetirada",
  "dtSaida",
  "dtTermino",
  "emailpax",
  "horaDevolucao",
  "horaRetirada",
  "id",
  "idPaisPassaporte",
  "localDevolucao",
  "localRetirada",
  "matriculaFunc",
  "motivoViagem",
  "nomePax",
  "nomePaxCompleto",
  "numeroOS",
  "numeroPassaporte",
  "numeroVC",
  "numeroViagem",
  "numerodeconfirmacao",
  "observacao",
  "observacaoInterna",
  "perDesconto",
  "perOverRep",
  "perTaxas",
  "perTaxasP",
  "percComisRecebida",
  "percComisRepassada",
  "percDescontoAcordo",
  "percTxFaturamento",
  "qtdeDiarias",
  "regime",
  "rotaProdutoFT",
  "siglaMoedaTarifa",
  "siglaMoedaTarifap",
  "siglaMoedaTaxaServico",
  "tipoViagem",
  "veiculo",
  "vlrApliRec",
  "vlrCambioTxServico",
  "vlrComirecMoedaOriginal",
  "vlrComisEmissorExterno",
  "vlrComisRecebida",
  "vlrComisRepassada",
  "vlrComisRepassadaMoedaOriginal",
  "vlrComissaoAuxiliar",
  "vlrComissaoCoordenador",
  "vlrComissaoEmissor",
  "vlrComissaoPromotor",
  "vlrCustoOperacional",
  "vlrDesconto",
  "vlrDescontoAcordo",
  "vlrDescontoAcordoMoedaOriginal",
  "vlrDescontoMoedaOriginal",
  "vlrFeePagar",
  "vlrFeePagarMoedaOriginal",
  "vlrOverRec",
  "vlrOverRecMoedaOriginal",
  "vlrOverRep",
  "vlrOverRepMoedaOriginal",
  "vlrTarCheio",
  "vlrTarCheiop",
  "vlrTarifaCheia",
  "vlrTarifaOficial",
  "vlrTarifaOficialTotal",
  "vlrTarifaOficialTotalp",
  "vlrTarifaOficialp",
  "vlrTarifaTotal",
  "vlrTarifaTotalp",
  "vlrTaxas",
  "vlrTaxasMoedaOriginal",
  "vlrTaxasP",
  "vlrTaxasPMoedaOriginal",
  "vlrTxDU",
  "vlrTxDUMoedaOriginal",
  "vlrTxDURepassada",
  "vlrTxDURepassadaMoedaOriginal",
  "vlrTxEmb",
  "vlrTxEmbp",
  "vlrTxEmbpMoedaOriginal",
  "vlrTxExt",
  "vlrTxExtMoedaOriginal",
  "vlrTxExtP",
  "vlrTxExtPMoedaOriginal",
  "vlrTxFaturamento",
  "vlrTxFaturamentoMoedaOriginal",
  "vlrTxServico",
  "vlrTxServicoMoedaOriginal",
];
const NULOS_RECEBIMENTO = [
  "cartaoRepassadoAoFornecedor",
  "descricaoCCustoCliente",
  "documentosFinanceiro",
  "ehsinal",
  "forma",
  "idPagante",
  "moedaOriginal",
  "nomePagante",
  "numNotaCredito",
  "numNotaDebito",
  "numRecebCartaoCredito",
  "numRecibo",
  "numeroCartaoMascarado",
  "siglaCCustoCliente",
  "uniqueid",
  "valorLiquido",
  "valorLiquidoMoedaOriginal",
  "valorMoedaOriginal",
  "vlrCambio",
  "vlrRetTarifa",
  "vlrRetTxDU",
  "vlrRetTxEmb",
  "vlrRetTxExtra",
  "vlrRetTxServ",
  "vlrTxAdministrativa",
  "vlrTxAdministrativaMoedaOriginal",
  "vlrTxAdministrativaRepassada",
  "vlrTxAdministrativaRepassadaMoedaOriginal",
];
const NULOS_PAGAMENTO = [
  "descricaoFormaPagamentoCartao",
  "documentosFinanceiro",
  "ehsinal",
  "forma",
  "idBenificiario",
  "moedaOriginal",
  "nomeBenificiario",
  "numeroCartaoMascarado",
  "qtParcelasCartao",
  "uniqueid",
  "valorLiquido",
  "valorLiquidoMoedaOriginal",
  "valorMoedaOriginal",
  "vlrCambio",
  "vlrTxAdministrativa",
  "vlrTxAdministrativaMoedaOriginal",
  "vlrTxAdministrativaRepassada",
  "vlrTxAdministrativaRepassadaMoedaOriginal",
];
const NULOS_TRECHO = [
  "cia",
  "classe",
  "conexao",
  "destino",
  "dtChegada",
  "dtPartida",
  "farebase",
  "localizador",
  "origem",
  "segmento",
  "status",
  "voo",
];

function nulos<T>(nomes: string[]): Partial<T> {
  return Object.fromEntries(nomes.map((nome) => [nome, null])) as Partial<T>;
}

export function lancamento(campos?: Partial<LancamentoCalculado>): LancamentoCalculado {
  return {
    indice: 0,
    valorExibido: "1000.00",
    ehCredito: false,
    situacao: "sem_saldo",
    vencido: false,
    cartaoRepassado: false,
    descricaoForma: "Faturado",
    vencimento: "2026-11-20 00:00:00",
    documentos: [],
    ...campos,
  };
}

export function trecho(campos?: Partial<TrechoAgi>): TrechoAgi {
  return { ...nulos<TrechoAgi>(NULOS_TRECHO), ...campos };
}

export function servicoAgi(campos?: Partial<ServicoAgi>): ServicoAgi {
  return {
    ...nulos<ServicoAgi>(NULOS_SERVICO),
    apartamentos: [],
    taxas: [],
    qtde: 1,
    vlrTarifa: "1000.00",
    vlrTarifap: "900.00",
    vlrCambio: "1",
    vlrCambiop: "1",
    ...campos,
  };
}

export function recebimento(campos?: Partial<RecebimentoAgi>): RecebimentoAgi {
  return {
    ...nulos<RecebimentoAgi>(NULOS_RECEBIMENTO),
    descricaoForma: "Faturado",
    dtVencto: "2026-11-20 00:00:00",
    valor: "1000.00",
    ...campos,
  };
}

export function pagamento(campos?: Partial<PagamentoAgi>): PagamentoAgi {
  return {
    ...nulos<PagamentoAgi>(NULOS_PAGAMENTO),
    descricaoForma: "Faturado",
    dtVencto: "2026-11-20 00:00:00",
    valor: "900.00",
    ...campos,
  };
}

export function vendaAgi(campos?: Partial<VendaAgi>): VendaAgi {
  return {
    ...nulos<VendaAgi>(NULOS_VENDA),
    status: "FECHADA",
    reserva: 90000001,
    idreserva: 1001,
    nomeproduto: "HOTEL NAC",
    classificacaoproduto: "Hotelaria",
    categoriaproduto: "Nacional",
    nomecliente: "CLIENTE EXEMPLO LTDA",
    nomefornec: "FORNECEDOR EXEMPLO",
    dtemissao: "2026-11-17 00:00:00",
    totalCliente: "1000.00",
    totalFornecedor: "900.00",
    margemLucroBruta: "100.00",
    camposGerenciais: [],
    detalheItem: [servicoAgi()],
    recebimentos: [recebimento()],
    pagamentos: [pagamento()],
    reembolsoVinculado: [],
    trechos: [],
    ...campos,
  };
}

export function contaServico(campos?: Partial<ContaServico>): ContaServico {
  return {
    indice: 0,
    cliente: {
      termos: [{ campo: "vlrTarifaTotal", valor: "1000.00", efeito: "soma" }],
      zerados: [],
      total: "1000.00",
      conversao: null,
      siglaComCambio1: null,
    },
    fornecedor: {
      termos: [{ campo: "vlrTarifaTotalp", valor: "900.00", efeito: "soma" }],
      zerados: [],
      total: "900.00",
      conversao: null,
      siglaComCambio1: null,
    },
    margem: "100.00",
    percentualLucro: "10.00",
    comissoesNaoApuradas: false,
    ...campos,
  };
}

export function calculos(campos?: Partial<CalculosVenda>): CalculosVenda {
  return {
    tipo: "venda",
    servicos: [contaServico()],
    totaisServicos: {
      cliente: "1000.00",
      fornecedor: "900.00",
      margem: "100.00",
      percentualLucro: "10.00",
    },
    verificacao: {
      fecha: true,
      tolerancia: "0.02",
      contas: [
        { conta: "cliente", calculado: "1000.00", api: "1000.00", diferenca: "0.00", fecha: true },
        { conta: "fornecedor", calculado: "900.00", api: "900.00", diferenca: "0.00", fecha: true },
        { conta: "margem", calculado: "100.00", api: "100.00", diferenca: "0.00", fecha: true },
      ],
    },
    avisos: [],
    recebimentos: [lancamento()],
    pagamentos: [lancamento({ valorExibido: "900.00" })],
    totalPagamentos: "900.00",
    diferencaPagamentosFornecedor: "0.00",
    percentualLucro: "10.00",
    estadoServico: null,
    itinerario: null,
    ...campos,
  };
}

export function vendaConsultada(campos?: Partial<VendaConsultada>): VendaConsultada {
  const base = reserva(90000001, [resumoVenda()]);
  return {
    venda: vendaAgi(),
    calculos: calculos(),
    reserva: base.reserva,
    posicao: 1,
    vinculos: { fee: null, reembolsos: [] },
    camposDesconhecidos: [],
    consultadoEm: base.consultadoEm,
    dadosDoSturAte: base.dadosDoSturAte,
    ...campos,
  };
}

// --- venda cheia: a base do teste do Anexo B (Task 9) ---

const PRODUTOS: Record<Classificacao, { classificacao: string; produto: string }> = {
  aereo: { classificacao: "Aéreo", produto: "BILHETE NACIONAL" },
  hotelaria: { classificacao: "Hotelaria", produto: "HOTEL NAC" },
  rodoviario: { classificacao: "Rodoviário", produto: "RODOVIARIO NAC" },
  diversos: { classificacao: "Diversos", produto: "SEGURO INT" },
  locacao: { classificacao: "Locação", produto: "CARRO NAC" },
  pacote: { classificacao: "Pacote", produto: "PACOTE TER INT" },
};

const BASE_DO_ESTADO: Record<Classificacao, EstadoServico["base"]> = {
  aereo: "trechos",
  rodoviario: "trechos",
  hotelaria: "entrada_saida",
  locacao: "retirada_devolucao",
  diversos: "inicio_termino",
  pacote: "inicio_termino",
};

const CAMPOS_DE_HORA = new Set(["detalheItem[].horaRetirada", "detalheItem[].horaDevolucao"]);
const CAMPOS_DE_MOEDA = new Set([
  "detalheItem[].siglaMoedaTarifa",
  "detalheItem[].siglaMoedaTarifap",
  "detalheItem[].siglaMoedaTaxaServico",
  "recebimentos[].moedaOriginal",
  "pagamentos[].moedaOriginal",
]);
/** Formato `inteiro` pelo nome (`id*`), mas texto no contrato. */
const INTEIROS_EM_TEXTO = new Set([
  "sistemaExterno.idVenda",
  "detalheItem[].id",
  "reembolsoVinculado[].idDetalheItem",
]);

const LOCAL = ["aeroporto", "cidade", "fusoHorario", "pais", "sigla"];
const TITULO = ["docto", "dtemissao", "id"];

type Objeto = Record<string, unknown>;

/** Itens e objetos vazios, com todas as chaves do contrato. */
const ITENS: Record<string, () => Objeto> = {
  trechos: () => ({ ...trecho() }),
  apartamentos: () =>
    nulos([
      "idTipoApto",
      "qtde",
      "qtdeDiarias",
      "tipoApartamento",
      "vlrBalcao",
      "vlrDiaria",
      "vlrDiariaP",
    ]),
  taxas: () => nulos(["descricaotaxa", "vlrCliente", "vlrFornec"]),
  recebimentos: () => ({ ...recebimento({ descricaoForma: null, dtVencto: null, valor: null }) }),
  pagamentos: () => ({ ...pagamento({ descricaoForma: null, dtVencto: null, valor: null }) }),
  reembolsoVinculado: () =>
    nulos(["id", "idDetalheItem", "idReservaVinculada", "nomePax", "numeroSR"]),
  contasPagar: () => nulos(TITULO),
  contasReceber: () => nulos(TITULO),
};
const OBJETOS: Record<string, () => Objeto> = {
  origem: () => nulos(LOCAL),
  destino: () => nulos(LOCAL),
  sistemaExterno: () => nulos(["idSistema", "idVenda", "sistema"]),
  financeiroVinculado: () => ({ contasPagar: [], contasReceber: [] }),
};

function servicoVazio(): Objeto {
  return {
    ...servicoAgi({
      qtde: null,
      vlrTarifa: null,
      vlrTarifap: null,
      vlrCambio: null,
      vlrCambiop: null,
    }),
  };
}

function valorDeTeste(c: CampoAnexo, i: number): unknown {
  if (CAMPOS_DE_HORA.has(c.caminho)) return "1899-12-30T16:59:00";
  if (CAMPOS_DE_MOEDA.has(c.caminho)) return "US$";
  switch (c.formato) {
    case "texto":
      return `TESTE ${i}`;
    case "dinheiro":
      return `${100 + i}.45`;
    case "percentual":
      return `${i}.5000`;
    case "cambio":
      return "5.1700";
    case "data":
      return "2026-11-20 00:00:00";
    case "dataHora":
      return "2026-11-20 10:30:00";
    case "hora":
      return "1899-12-30T16:59:00";
    case "inteiro":
      return INTEIROS_EM_TEXTO.has(c.caminho) ? String(i + 2) : i + 2;
    case "booleano":
      return true;
    case "lista":
      return [`TESTE ${i}`];
  }
}

/** Grava `valor` no caminho, em todo item das listas; lista vazia ganha 2 itens. */
function gravar(alvo: Objeto, partes: string[], valor: unknown): void {
  const [parte, ...resto] = partes;
  if (parte === undefined) return;
  if (resto.length === 0) {
    alvo[parte] = valor;
    return;
  }
  if (parte.endsWith("[]")) {
    const nome = parte.slice(0, -2);
    let itens = alvo[nome];
    if (!Array.isArray(itens) || itens.length === 0) {
      const item = ITENS[nome];
      if (item === undefined) throw new Error(`Lista sem item de teste: ${nome}`);
      itens = [item(), item()];
      alvo[nome] = itens;
    }
    for (const item of itens as Objeto[]) gravar(item, resto, valor);
    return;
  }
  let objeto = alvo[parte];
  if (objeto === null || typeof objeto !== "object") {
    const novo = OBJETOS[parte];
    if (novo === undefined) throw new Error(`Objeto sem base de teste: ${parte}`);
    objeto = novo();
    alvo[parte] = objeto;
  }
  gravar(objeto as Objeto, resto, valor);
}

/**
 * Uma venda com cada campo do Anexo B da classificação preenchido com um valor distinto (pelo
 * índice do campo), em moeda estrangeira, e os cálculos que combinam com ela. Os campos que nunca
 * vieram preenchidos na base ficam fora (as classes deles são vazias), a menos que
 * `nuncaPreenchidos` os peça (os fusos dos trechos dão dois trechos à venda).
 */
export function vendaCheia(
  classificacao: Classificacao,
  servicos = 1,
  { nuncaPreenchidos = false }: { nuncaPreenchidos?: boolean } = {},
): VendaConsultada {
  const venda: Objeto = {
    ...vendaAgi(),
    detalheItem: Array.from({ length: servicos }, servicoVazio),
    trechos: [],
    recebimentos: [],
    pagamentos: [],
    reembolsoVinculado: [],
  };
  CAMPOS_ANEXO_B.forEach((c, i) => {
    const nunca = nuncaPreenchidos && c.classes.length === 0;
    if (!c.conteiner && (nunca || c.classes.includes(classificacao))) {
      gravar(venda, c.caminho.split("."), valorDeTeste(c, i));
    }
  });

  const v = venda as VendaAgi;
  const { classificacao: texto, produto } = PRODUTOS[classificacao];
  const comFee = CAMPOS_ANEXO_B.some(
    (c) => c.caminho === "idreservavinculadafee" && c.classes.includes(classificacao),
  );
  Object.assign(v, {
    status: "FECHADA",
    classificacaoproduto: texto,
    nomeproduto: produto,
    categoriaproduto: "Nacional",
    reserva: 90000001,
    idreserva: 1001,
    dtcancelamento: null,
    idreservavinculadafee: comFee ? 1002 : null,
  });
  for (const r of v.recebimentos ?? [])
    Object.assign(r, { forma: 1, cartaoRepassadoAoFornecedor: false });
  for (const [k, p] of (v.pagamentos ?? []).entries()) p.forma = k === 1 ? 2 : 1;

  const recebimentos = (v.recebimentos ?? []).map((r, k) =>
    lancamento({
      indice: k,
      valorExibido: r.valor ?? "0.00",
      descricaoForma: r.descricaoForma ?? null,
      vencimento: r.dtVencto ?? null,
    }),
  );
  const pagamentos = (v.pagamentos ?? []).map((p, k) => {
    const credito = p.forma === 2;
    const valor = p.valor ?? "0.00";
    return lancamento({
      indice: k,
      ehCredito: credito,
      valorExibido: credito ? `-${valor}` : valor,
      descricaoForma: p.descricaoForma ?? null,
      vencimento: p.dtVencto ?? null,
    });
  });
  const contas = (v.detalheItem ?? []).map((s, k) => {
    const base = contaServico({ indice: k });
    const conversao = (tarifa: string | null | undefined, data: string | null | undefined) => ({
      sigla: "US$",
      cambio: "5.1700",
      dataCambio: data ?? null,
      tarifaOrigem: tarifa ?? "0.00",
    });
    return {
      ...base,
      cliente: { ...base.cliente, conversao: conversao(s.vlrTarifaTotal, s.dtCambio) },
      fornecedor: { ...base.fornecedor, conversao: conversao(s.vlrTarifaTotalp, s.dtCambiop) },
    };
  });
  const totais = {
    cliente: v.totalCliente ?? "0.00",
    fornecedor: v.totalFornecedor ?? "0.00",
    margem: v.margemLucroBruta ?? "0.00",
  };
  const totalPagamentos = somarDecimais(pagamentos.map((p) => p.valorExibido));
  // Como o backend, que monta o itinerário sempre que há trechos: sem datas fora do aéreo e do
  // rodoviário (só os fusos dos campos que nunca vieram preenchidos).
  const comHorario = classificacao === "aereo" || classificacao === "rodoviario";
  const itinerario: Itinerario | null =
    (v.trechos ?? []).length === 0
      ? null
      : {
          forma: comHorario ? "com_horario" : "sem_dados",
          trajetos: [{ trechos: [0, 1], esperas: [] }],
          estadias: [],
        };

  return vendaConsultada({
    venda: v,
    // Como o backend: "Dados do Stur até" é o `dtalteracaovinculado`, em ISO com `T`.
    dadosDoSturAte: v.dtalteracaovinculado?.replace(" ", "T") ?? null,
    calculos: calculos({
      servicos: contas,
      totaisServicos: { ...totais, percentualLucro: "10.00" },
      verificacao: {
        fecha: true,
        tolerancia: "0.02",
        contas: (["cliente", "fornecedor", "margem"] as const).map((conta) => ({
          conta,
          calculado: totais[conta],
          api: totais[conta],
          diferenca: "0.00",
          fecha: true,
        })),
      },
      avisos: [{ codigo: "moeda_estrangeira", siglas: ["US$"] }],
      recebimentos,
      pagamentos,
      totalPagamentos,
      diferencaPagamentosFornecedor: somarDecimais([totalPagamentos, `-${totais.fornecedor}`]),
      estadoServico: {
        estado: "concluido",
        inicio: "2026-11-20",
        fim: "2026-11-20",
        base: BASE_DO_ESTADO[classificacao],
      },
      itinerario,
    }),
    vinculos: {
      fee: null,
      reembolsos: (v.reembolsoVinculado ?? []).map((r) => ({
        id: r.id ?? null,
        nomePax: r.nomePax ?? null,
        numeroSR: r.numeroSR ?? null,
        venda: null,
      })),
    },
  });
}
