import type {
  ErroApi,
  LinhaResultado,
  Parametros,
  ReservaConsultada,
  ResultadoConsulta,
  ResumoIncentivos,
  ResumoResultado,
  ResumoVenda,
} from "@/contrato/tipos";

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
  resumo?: Partial<ResumoResultado> & { incentivos?: Partial<ResumoIncentivos> };
};

// Totais fixos ("0.00") e quantidade = número de linhas: a Task 4 passa a somá-los.
export function resultado(vendas: LinhaResultado[], campos?: CamposDoResultado): ResultadoConsulta {
  const { resumo, ...resto } = campos ?? {};
  const padrao: ResumoResultado = {
    quantidade: vendas.length,
    totalCliente: "0.00",
    totalFornecedor: "0.00",
    margem: "0.00",
    percentualLucro: null,
    naoFecham: 0,
    canceladas: 0,
    incentivos: {
      quantidade: 0,
      valor: "0.00",
      margemComIncentivos: "0.00",
      percentualComIncentivos: null,
    },
  };
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
      })),
      totais: {
        quantidade: resumos.length,
        quantidadeCanceladas: resumos.filter((r) => r.situacao === "cancelada").length,
        totalCliente: "0.00",
        totalFornecedor: "0.00",
        margem: "0.00",
        percentualLucro: null,
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
