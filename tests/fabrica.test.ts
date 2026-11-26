import { linha, reserva, resultado, resumoVenda } from "./fabrica";

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
    });
    expect(r.vendas.map((v) => v.posicao)).toEqual([1, 2, 3]);
  });
});
