import type { Reserva, ResumoServico, ResumoVenda, VendaDaReserva } from "@/contrato/tipos";
import {
  contagemDasVendas,
  fraseReceitaNegativa,
  gruposDaTabela,
  linhaDaBarra,
  rotuloDoTotal,
  segundaLinha,
  textoDaProxima,
  textoDaVenda,
} from "@/lib/reserva/tabela";
import { origemDaVenda } from "@/lib/venda/cabecalho";
import { reserva, resumoVenda, vendaAgi } from "../../fabrica";

const HOJE = "2026-11-24";

function servico(campos?: Partial<ResumoServico>): ResumoServico {
  return {
    descricao: null,
    diarias: null,
    inicio: null,
    fim: null,
    quantidade: 1,
    rota: [],
    ...campos,
  };
}

/** A venda da reserva com o resumo e o serviço dados (posição 1). */
function venda(resumo: Partial<ResumoVenda>, extra?: Partial<VendaDaReserva>): VendaDaReserva {
  const [v] = reserva(90000001, [resumoVenda(resumo)]).reserva.vendas;
  if (!v) throw new Error("sem venda");
  return { ...v, ...extra };
}

/** A reserva com as vendas dadas, na ordem (a posição é a da lista). */
function comVendas(resumos: Partial<ResumoVenda>[], extras: Partial<VendaDaReserva>[] = []) {
  const r = reserva(
    90000001,
    resumos.map((c, i) => resumoVenda({ idreserva: 1001 + i, ...c })),
  ).reserva;
  return { ...r, vendas: r.vendas.map((v, i) => ({ ...v, ...extras[i] })) } satisfies Reserva;
}

describe("gruposDaTabela", () => {
  test("agrupa pela classificação, na ordem em que cada uma aparece primeiro", () => {
    const r = comVendas([
      { classificacao: "Aéreo" },
      { classificacao: "Hotelaria" },
      { classificacao: "AEREO" },
      { classificacao: "Diversos" },
      { classificacao: "Hotelaria" },
    ]);
    const grupos = gruposDaTabela(r);
    expect(grupos.map((g) => g.rotulo)).toEqual([
      "Aéreo · 2 vendas",
      "Hotelaria · 2 vendas",
      "Diversos · 1 venda",
    ]);
    expect(grupos.map((g) => g.vendas.map((v) => v.posicao))).toEqual([[1, 3], [2, 5], [4]]);
  });

  test("as canceladas vão num grupo 'Cancelada' no fim, fora do grupo da classificação", () => {
    const r = comVendas([
      { classificacao: "Aéreo" },
      { classificacao: "Diversos", situacao: "cancelada" },
      { classificacao: "Aéreo" },
      { classificacao: "Aéreo", situacao: "CANCELADA" },
    ]);
    const grupos = gruposDaTabela(r);
    expect(grupos.map((g) => g.rotulo)).toEqual(["Aéreo · 2 vendas", "Cancelada · 2 vendas"]);
    expect(grupos.at(-1)?.vendas.map((v) => v.posicao)).toEqual([2, 4]);
  });

  test("classificação fora da lista fica com o texto dela; sem classificação, 'Sem classificação'", () => {
    const r = comVendas([{ classificacao: " Cruzeiro " }, { classificacao: null }]);
    expect(gruposDaTabela(r).map((g) => g.rotulo)).toEqual([
      "Cruzeiro · 1 venda",
      "Sem classificação · 1 venda",
    ]);
  });
});

describe("segundaLinha (decisão 13)", () => {
  test("aéreo: os trajetos unidos por setas e ', sem datas' sem início", () => {
    const v = venda(
      { classificacao: "Aéreo" },
      { servico: servico({ rota: [["FOR", "FCO", "FOR"]] }) },
    );
    expect(segundaLinha(v)).toBe("FOR → FCO → FOR, sem datas");
  });

  test("rodoviário com dois trajetos e datas: separados por ' · ', sem o 'sem datas'", () => {
    const v = venda(
      { classificacao: "Rodoviário" },
      {
        servico: servico({
          rota: [
            ["FOR", "JPA"],
            ["JPA", "FOR"],
          ],
          inicio: "2026-11-15",
          fim: "2026-11-22",
        }),
      },
    );
    expect(segundaLinha(v)).toBe("FOR → JPA · JPA → FOR");
  });

  test("aéreo com a rota vazia não escreve nada", () => {
    const v = venda({ classificacao: "Aéreo" }, { servico: servico({ rota: [] }) });
    expect(segundaLinha(v)).toBe("");
  });

  test("hotelaria: período e diárias; sem diárias, só o período; uma ponta só, a data dela", () => {
    const periodo = { inicio: "2026-11-15T00:00:00", fim: "2026-11-22T00:00:00" };
    expect(segundaLinha(venda({}, { servico: servico({ ...periodo, diarias: 7 }) }))).toBe(
      "15/11 a 22/11/2026, 7 diárias",
    );
    expect(segundaLinha(venda({}, { servico: servico({ ...periodo, diarias: 1 }) }))).toBe(
      "15/11 a 22/11/2026, 1 diária",
    );
    expect(segundaLinha(venda({}, { servico: servico(periodo) }))).toBe("15/11 a 22/11/2026");
    expect(segundaLinha(venda({}, { servico: servico({ inicio: "2026-11-15" }) }))).toBe(
      "15/11/2026",
    );
  });

  test("locação: só o período; a data vazia do Stur conta como nula", () => {
    const v = venda(
      { classificacao: "Locação" },
      { servico: servico({ inicio: "2026-11-15", fim: "1899-12-30T00:00:00", diarias: 3 }) },
    );
    expect(segundaLinha(v)).toBe("15/11/2026");
  });

  test("diversos e pacote: a descrição ou a quantidade de serviços, e o período", () => {
    const periodo = { inicio: "2026-05-19", fim: "2026-05-22" };
    expect(
      segundaLinha(
        venda({ classificacao: "Diversos" }, { servico: servico({ ...periodo, quantidade: 14 }) }),
      ),
    ).toBe("14 serviços · 19/05 a 22/05/2026");
    expect(
      segundaLinha(
        venda(
          { classificacao: "Pacote" },
          { servico: servico({ descricao: "PACOTE EXEMPLO", quantidade: 3 }) },
        ),
      ),
    ).toBe("PACOTE EXEMPLO");
    expect(segundaLinha(venda({ classificacao: "Diversos" }, { servico: servico() }))).toBe(
      "1 serviço",
    );
  });

  test("sem serviço, a linha fica vazia", () => {
    expect(segundaLinha(venda({}))).toBe("");
  });

  test("sem cobrança ao cliente e sem custo entram no fim", () => {
    const comCusto = venda(
      { classificacao: "Diversos", totalCliente: "0.00", totalFornecedor: "490.00" },
      { servico: servico({ descricao: "TAXA EXEMPLO" }) },
    );
    expect(segundaLinha(comCusto)).toBe("TAXA EXEMPLO, sem cobrança ao cliente");
    const semCusto = venda(
      { classificacao: "Diversos", totalCliente: "100.00", totalFornecedor: "0.00" },
      { servico: servico({ descricao: "MARGEM EXEMPLO" }) },
    );
    expect(segundaLinha(semCusto)).toBe("MARGEM EXEMPLO, sem custo");
    const vazia = venda({ totalCliente: "0.00", totalFornecedor: "490.00" });
    expect(segundaLinha(vazia)).toBe("sem cobrança ao cliente");
  });
});

describe("fraseReceitaNegativa (decisão 14)", () => {
  test("no singular e no plural, só com as ativas de total do cliente zero e margem negativa", () => {
    const negativa = { totalCliente: "0.00", totalFornecedor: "490.00", margem: "-490.00" };
    expect(fraseReceitaNegativa(comVendas([{}, negativa]))).toBe(
      "1 venda tem receita negativa: custo lançado sem cobrança ao cliente.",
    );
    expect(fraseReceitaNegativa(comVendas([negativa, {}, negativa]))).toBe(
      "2 vendas têm receita negativa: custo lançado sem cobrança ao cliente.",
    );
  });

  test("sem venda assim, ou só na cancelada, ou com cobrança ao cliente: nada", () => {
    expect(fraseReceitaNegativa(comVendas([{}, {}]))).toBeNull();
    expect(
      fraseReceitaNegativa(
        comVendas([{}, { totalCliente: "0.00", margem: "-10.00", situacao: "cancelada" }]),
      ),
    ).toBeNull();
    expect(
      fraseReceitaNegativa(comVendas([{ totalCliente: "100.00", margem: "-10.00" }])),
    ).toBeNull();
  });
});

describe("textos da barra de troca", () => {
  test("a linha da venda: passageiro, fornecedor, valor e receita", () => {
    const v = venda({
      passageiros: ["ANA EXEMPLO"],
      fornecedor: "FORNECEDOR EXEMPLO",
      totalCliente: "6926.13",
      margem: "216.06",
    });
    expect(linhaDaBarra(v, HOJE)).toBe(
      "ANA EXEMPLO · FORNECEDOR EXEMPLO · R$ 6.926,13 · receita R$ 216,06",
    );
  });

  test("na cancelada, a data do cancelamento no lugar dos valores; sem passageiro, sem a parte", () => {
    const v = venda(
      { situacao: "cancelada", fornecedor: "FORNECEDOR EXEMPLO" },
      { dataCancelamento: "2026-06-30T10:00:00" },
    );
    expect(linhaDaBarra(v, HOJE)).toBe("FORNECEDOR EXEMPLO · cancelada em 30/06");
  });

  test("a venda e a próxima, com o produto e a cancelada", () => {
    const v = venda({ produto: "RAV EXEMPLO", situacao: "cancelada" }, { posicao: 2 });
    expect(textoDaVenda(v, 10)).toBe("venda 2 de 10, RAV EXEMPLO, cancelada");
    expect(textoDaProxima(v)).toBe("próxima: venda 2, RAV EXEMPLO, cancelada");
    expect(textoDaProxima(venda({ produto: null }, { posicao: 3 }))).toBe("próxima: venda 3");
  });

  test("a contagem das vendas, com as canceladas", () => {
    expect(contagemDasVendas(comVendas([{}, {}]))).toBe("2 vendas");
    expect(contagemDasVendas(comVendas([{}, { situacao: "cancelada" }, {}]))).toBe(
      "3 vendas, 1 cancelada",
    );
    expect(
      contagemDasVendas(comVendas([{ situacao: "cancelada" }, { situacao: "cancelada" }])),
    ).toBe("2 vendas, 2 canceladas");
  });
});

describe("rotuloDoTotal", () => {
  test("duas ou mais ativas, uma ativa e nenhuma", () => {
    expect(rotuloDoTotal(comVendas([{}, {}, { situacao: "cancelada" }]))).toBe(
      "Total das 2 vendas ativas",
    );
    expect(rotuloDoTotal(comVendas([{}, { situacao: "cancelada" }]))).toBe("Total da venda ativa");
    expect(
      rotuloDoTotal(comVendas([{ situacao: "cancelada" }, { situacao: "cancelada" }])),
    ).toBeNull();
  });
});

describe("origemDaVenda", () => {
  test("lançada direto, integração com o sistema e sem o nome", () => {
    expect(origemDaVenda(vendaAgi())).toBe("Lançada direto no Stur");
    expect(origemDaVenda(vendaAgi({ sistemaExterno: { sistema: "SISTEMA EXEMPLO" } }))).toBe(
      "Integração SISTEMA EXEMPLO",
    );
    expect(origemDaVenda(vendaAgi({ sistemaExterno: { idVenda: "123" } }))).toBe("Integração");
  });
});
