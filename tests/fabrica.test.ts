import openapi from "@/contrato/openapi.json";
import type { Classificacao } from "@/lib/consulta/consulta";
import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { preenchido, valorDoCampo } from "@/lib/venda/campos";
import {
  calculos,
  contaServico,
  lancamento,
  linha,
  pagamento,
  recebimento,
  reserva,
  resultado,
  resumoVenda,
  servicoAgi,
  trecho,
  vendaAgi,
  vendaCheia,
  vendaConsultada,
} from "./fabrica";

describe("resultado()", () => {
  test("resumo soma só as vendas a cliente não canceladas; incentivos ficam à parte", () => {
    const r = resultado([
      linha({ totalCliente: "1000.10", totalFornecedor: "900.00", margem: "100.10" }),
      linha({
        totalCliente: "500.20",
        totalFornecedor: "450.00",
        margem: "50.20",
        contaFecha: false,
      }),
      linha({
        totalCliente: "700.00",
        totalFornecedor: "600.00",
        margem: "100.00",
        situacao: "cancelada",
      }),
      linha({ tipo: "incentivo", totalCliente: "0.00", totalFornecedor: "0.00", margem: "30.05" }),
      linha({ tipo: "incentivo", margem: "99.00", situacao: "cancelada" }),
    ]);
    expect(r.resumo).toEqual({
      quantidade: 2,
      totalCliente: "1500.30",
      totalFornecedor: "1350.00",
      margem: "150.30",
      percentualLucro: null,
      naoFecham: 1,
      canceladas: 2,
      incentivos: {
        quantidade: 1,
        valor: "30.05",
        margemComIncentivos: "180.35",
        percentualComIncentivos: null,
      },
    });
  });

  test("sem vendas, tudo zerado", () => {
    expect(resultado([]).resumo).toMatchObject({
      quantidade: 0,
      totalCliente: "0.00",
      margem: "0.00",
      incentivos: { quantidade: 0, valor: "0.00", margemComIncentivos: "0.00" },
    });
  });

  test("o resumo informado pelo teste é mesclado campo a campo", () => {
    const r = resultado([linha()], {
      resumo: { percentualLucro: "10.00", incentivos: { percentualComIncentivos: "12.00" } },
    });
    expect(r.resumo.percentualLucro).toBe("10.00");
    expect(r.resumo.totalCliente).toBe("1000.00");
    expect(r.resumo.incentivos).toMatchObject({ quantidade: 0, percentualComIncentivos: "12.00" });
  });
});

describe("reserva()", () => {
  test("totais somam as vendas não canceladas e contam as canceladas", () => {
    const { reserva: r } = reserva(90000001, [
      resumoVenda({ totalCliente: "1000.10", totalFornecedor: "900.00", margem: "100.10" }),
      resumoVenda({ totalCliente: "0.20", totalFornecedor: "0.10", margem: "0.10" }),
      resumoVenda({
        totalCliente: "800.00",
        totalFornecedor: "700.00",
        margem: "100.00",
        situacao: "cancelada",
      }),
    ]);
    expect(r.totais).toEqual({
      quantidade: 3,
      quantidadeCanceladas: 1,
      totalCliente: "1000.30",
      totalFornecedor: "900.10",
      margem: "100.20",
      percentualLucro: null,
      aReceberCliente: "0.00",
      recebidoCliente: "0.00",
      aPagarFornecedor: "0.00",
      pagoFornecedor: "0.00",
      aReceberFornecedor: "0.00",
    });
    expect(r.vendas.map((v) => v.posicao)).toEqual([1, 2, 3]);
  });
});

test("reserva(): cada venda da reserva traz os campos do contrato 0.2.0 vazios", () => {
  const { reserva: r } = reserva(90000001, [resumoVenda()]);
  expect(r.vendas[0]).toMatchObject({
    servico: null,
    estadoServico: null,
    centroCusto: null,
    dataCancelamento: null,
  });
});

test("lancamento(): padrão e campos informados", () => {
  expect(lancamento()).toEqual({
    indice: 0,
    valorExibido: "1000.00",
    ehCredito: false,
    situacao: "sem_saldo",
    vencido: false,
    cartaoRepassado: false,
    descricaoForma: "Faturado",
    vencimento: "2026-11-20 00:00:00",
    documentos: [],
  });
  expect(lancamento({ indice: 2, vencido: true })).toMatchObject({ indice: 2, vencido: true });
});

describe("vendaAgi()", () => {
  test("venda fechada, com um serviço, um recebimento e um pagamento", () => {
    const v = vendaAgi();
    expect(v).toMatchObject({
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
    });
    expect(v.detalheItem).toEqual([servicoAgi()]);
    expect(v.recebimentos).toHaveLength(1);
    expect(v.recebimentos?.[0]).toMatchObject({ descricaoForma: "Faturado", valor: "1000.00" });
    expect(v.pagamentos).toHaveLength(1);
    expect(v.pagamentos?.[0]).toMatchObject({ descricaoForma: "Faturado", valor: "900.00" });
    expect(vendaAgi({ idreserva: 1002 }).idreserva).toBe(1002);
  });

  test.each([
    ["VendaAgi", () => vendaAgi()],
    ["ServicoAgi", () => servicoAgi()],
    ["RecebimentoAgi", () => vendaAgi().recebimentos?.[0]],
    ["PagamentoAgi", () => vendaAgi().pagamentos?.[0]],
    ["TrechoAgi", () => trecho()],
  ] as const)("%s traz todos os campos do contrato, e só eles", (nome, fazer) => {
    const esquemas = openapi.components.schemas as unknown as Record<
      string,
      { properties: Record<string, unknown> }
    >;
    expect(Object.keys(fazer() ?? {}).sort()).toEqual(
      Object.keys(esquemas[nome]?.properties ?? {}).sort(),
    );
  });

  test("o que não é do exemplo vem nulo ou vazio", () => {
    const v = vendaAgi();
    expect(v.atividade).toBeNull();
    expect(v.trechos).toEqual([]);
    expect(v.camposGerenciais).toEqual([]);
    expect(v.financeiroVinculado).toBeNull();
  });
});

test("trecho() e servicoAgi() aceitam campos", () => {
  expect(trecho({ voo: "0001" }).voo).toBe("0001");
  expect(servicoAgi({ qtde: 2 }).qtde).toBe(2);
});

test("contaServico(): tarifa nos dois lados e nada zerado", () => {
  const c = contaServico();
  expect(c.indice).toBe(0);
  expect(c.cliente.termos).toEqual([{ campo: "vlrTarifa", valor: "1000.00", efeito: "soma" }]);
  expect(c.fornecedor.termos).toEqual([{ campo: "vlrTarifap", valor: "900.00", efeito: "soma" }]);
  expect(c.cliente.zerados).toEqual([]);
  expect(c.fornecedor.zerados).toEqual([]);
  expect(c.margem).toBe("100.00");
  expect(contaServico({ indice: 1 }).indice).toBe(1);
});

test("calculos(): venda que fecha, com um lançamento de cada lado", () => {
  const c = calculos();
  expect(c.tipo).toBe("venda");
  expect(c.verificacao.fecha).toBe(true);
  expect(c.avisos).toEqual([]);
  expect(c.recebimentos).toEqual([lancamento()]);
  expect(c.pagamentos).toEqual([lancamento({ valorExibido: "900.00" })]);
  expect(c.servicos).toEqual([contaServico()]);
  expect(calculos({ tipo: "fee" }).tipo).toBe("fee");
});

test("vendaConsultada(): embrulha a venda e os cálculos da reserva", () => {
  const v = vendaConsultada();
  expect(v.venda.idreserva).toBe(1001);
  expect(v.venda).toEqual(vendaAgi());
  expect(v.calculos).toEqual(calculos());
  expect(v.reserva).toEqual(reserva(90000001, [resumoVenda()]).reserva);
  expect(v.posicao).toBe(1);
  expect(v.vinculos).toEqual({ fee: null, reembolsos: [] });
  expect(v.camposDesconhecidos).toEqual([]);
  expect(v.consultadoEm).toBe(reserva(90000001, []).consultadoEm);
  expect(v.dadosDoSturAte).toBe(reserva(90000001, []).dadosDoSturAte);
  expect(vendaConsultada({ posicao: 3 }).posicao).toBe(3);
});

test("recebimento() e pagamento() aceitam campos", () => {
  expect(recebimento({ valor: "1.00" }).valor).toBe("1.00");
  expect(pagamento({ forma: 2 }).forma).toBe(2);
  expect(vendaAgi().recebimentos).toEqual([recebimento()]);
  expect(vendaAgi().pagamentos).toEqual([pagamento()]);
});

describe("vendaCheia()", () => {
  const CLASSIFICACOES: Classificacao[] = [
    "aereo",
    "hotelaria",
    "rodoviario",
    "diversos",
    "locacao",
    "pacote",
  ];
  const FIXOS = new Set([
    "status",
    "classificacaoproduto",
    "nomeproduto",
    "categoriaproduto",
    "reserva",
    "idreserva",
    "recebimentos[].forma",
    "pagamentos[].forma",
    "recebimentos[].cartaoRepassadoAoFornecedor",
    "dtcancelamento",
  ]);

  /** Os índices de cada item das listas do caminho: `detalheItem[].apartamentos[]` dá [0,0], [0,1]… */
  function indicesDe(v: ReturnType<typeof vendaCheia>["venda"], caminho: string): number[][] {
    const partes = caminho.split("[]");
    let combinacoes: number[][] = [[]];
    for (let k = 0; k < partes.length - 1; k++) {
      const lista = partes.slice(0, k + 1).join("[]");
      combinacoes = combinacoes.flatMap((indices) => {
        const itens = valorDoCampo(v, lista, indices);
        return Array.isArray(itens) ? itens.map((_, i) => [...indices, i]) : [];
      });
    }
    return combinacoes;
  }

  test("hotelaria com dois serviços e sem trechos", () => {
    const v = vendaCheia("hotelaria", 2);
    expect(v.calculos.servicos.length === 2).toBe(true);
    expect(v.venda.detalheItem).toHaveLength(2);
    expect(v.venda.trechos).toEqual([]);
    expect(v.calculos.itinerario).toBeNull();
    expect(v.venda.detalheItem?.[1]?.apartamentos).toHaveLength(2);
  });

  test.each(CLASSIFICACOES)("%s: cada campo da classificação vem preenchido, e só eles", (cl) => {
    const v = vendaCheia(cl);
    for (const campo of CAMPOS_ANEXO_B) {
      if (campo.conteiner || FIXOS.has(campo.caminho)) continue;
      const esperado = campo.classes.includes(cl);
      const indices = indicesDe(v.venda, campo.caminho);
      const valores = indices.map((i) => valorDoCampo(v.venda, campo.caminho, i));
      if (esperado) {
        expect(valores.length, campo.caminho).toBeGreaterThan(0);
        for (const valor of valores)
          expect(preenchido(valor, campo.caminho), campo.caminho).toBe(true);
      } else {
        for (const valor of valores) {
          expect(preenchido(valor, campo.caminho), campo.caminho).toBe(false);
        }
      }
    }
  });

  test("campos fixos, sem valor de teste", () => {
    const { venda } = vendaCheia("aereo");
    expect(venda).toMatchObject({
      status: "FECHADA",
      classificacaoproduto: "Aéreo",
      nomeproduto: "BILHETE NACIONAL",
      categoriaproduto: "Nacional",
      reserva: 90000001,
      idreserva: 1001,
      dtcancelamento: null,
      idreservavinculadafee: 1002,
    });
    expect(venda.recebimentos?.map((r) => r.forma)).toEqual([1, 1]);
    expect(venda.recebimentos?.map((r) => r.cartaoRepassadoAoFornecedor)).toEqual([false, false]);
    expect(venda.pagamentos?.map((p) => p.forma)).toEqual([1, 2]);
    expect(vendaCheia("hotelaria").venda.idreservavinculadafee).toBeNull();
    expect(vendaCheia("locacao").venda.nomeproduto).toBe("CARRO NAC");
    expect(vendaCheia("pacote").venda.classificacaoproduto).toBe("Pacote");
  });

  test("valores de teste por formato e moeda estrangeira", () => {
    const { venda } = vendaCheia("locacao");
    const s = venda.detalheItem?.[0];
    expect(s?.horaRetirada).toBe("1899-12-30T16:59:00");
    expect(s?.siglaMoedaTarifa).toBe("US$");
    expect(s?.vlrCambio).toBe("5.1700");
    expect(venda.recebimentos?.[0]?.moedaOriginal).toBe("US$");
    expect(venda.dtcriacao).toBe("2026-11-20 10:30:00");
    expect(venda.dtemissao).toBe("2026-11-20 00:00:00");
    const i = CAMPOS_ANEXO_B.findIndex((c) => c.caminho === "nomecliente");
    expect(venda.nomecliente).toBe(`TESTE ${i}`);
    const t = CAMPOS_ANEXO_B.findIndex((c) => c.caminho === "totalCliente");
    expect(venda.totalCliente).toBe(`${100 + t}.45`);
  });

  test("os cálculos combinam com a venda", () => {
    const aereo = vendaCheia("aereo", 2);
    expect(aereo.venda.trechos).toHaveLength(2);
    expect(aereo.calculos.itinerario?.forma).toBe("com_horario");
    expect(aereo.calculos.estadoServico).toMatchObject({ estado: "concluido", base: "trechos" });
    expect(aereo.calculos.servicos.map((c) => c.indice)).toEqual([0, 1]);
    expect(aereo.calculos.servicos[0]?.cliente.conversao).toMatchObject({
      sigla: "US$",
      cambio: "5.1700",
    });
    expect(aereo.calculos.servicos[0]?.fornecedor.conversao).toMatchObject({ sigla: "US$" });
    expect(aereo.calculos.recebimentos).toHaveLength(2);
    expect(aereo.calculos.pagamentos.map((p) => p.ehCredito)).toEqual([false, true]);
    expect(aereo.calculos.pagamentos.every((p) => p.situacao === "sem_saldo")).toBe(true);
    expect(aereo.calculos.verificacao.fecha).toBe(true);
    expect(aereo.vinculos).toMatchObject({ fee: null });
    expect(aereo.vinculos.reembolsos).toHaveLength(2);
    expect(vendaCheia("hotelaria").calculos.estadoServico?.base).toBe("entrada_saida");
    expect(vendaCheia("locacao").calculos.estadoServico?.base).toBe("retirada_devolucao");
    expect(vendaCheia("pacote").calculos.estadoServico?.base).toBe("inicio_termino");
    expect(vendaCheia("pacote").vinculos.reembolsos).toEqual([]);
  });
});
