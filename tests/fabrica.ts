import type {
  CalculosVenda,
  ContaServico,
  ErroApi,
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
import { somarDecimais } from "@/lib/decimal";

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

function recebimentoAgi(): RecebimentoAgi {
  return {
    ...nulos<RecebimentoAgi>(NULOS_RECEBIMENTO),
    descricaoForma: "Faturado",
    dtVencto: "2026-11-20 00:00:00",
    valor: "1000.00",
  };
}

function pagamentoAgi(): PagamentoAgi {
  return {
    ...nulos<PagamentoAgi>(NULOS_PAGAMENTO),
    descricaoForma: "Faturado",
    dtVencto: "2026-11-20 00:00:00",
    valor: "900.00",
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
    recebimentos: [recebimentoAgi()],
    pagamentos: [pagamentoAgi()],
    reembolsoVinculado: [],
    trechos: [],
    ...campos,
  };
}

export function contaServico(campos?: Partial<ContaServico>): ContaServico {
  return {
    indice: 0,
    cliente: {
      termos: [{ campo: "vlrTarifa", valor: "1000.00", efeito: "soma" }],
      zerados: [],
      total: "1000.00",
      conversao: null,
      siglaComCambio1: null,
    },
    fornecedor: {
      termos: [{ campo: "vlrTarifap", valor: "900.00", efeito: "soma" }],
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
