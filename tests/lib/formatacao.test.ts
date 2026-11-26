import {
  formatarDadosAte,
  formatarData,
  formatarDiaMes,
  formatarMoeda,
  formatarPercentual,
  formatarValor,
} from "@/lib/formatacao";

test.each([
  ["150197.72", "150.197,72"],
  ["-13620.74", "−13.620,74"],
  ["0", "0,00"],
  ["0.00", "0,00"],
  ["-0.001", "0,00"],
  ["1560.77", "1.560,77"],
  ["0.005", "0,01"],
  ["99999999999.99", "99.999.999.999,99"],
  ["1.005", "1,01"], // um float daria 1,00
  ["9007199254740993.45", "9.007.199.254.740.993,45"], // acima de 2^53, sem perder o último algarismo
])("formatarValor(%s) = %s", (entrada, saida) => expect(formatarValor(entrada)).toBe(saida));

test.each(["", "abc", "1,5", "1e3", " 1.5", "+1.5"])("formatarValor(%j) lança erro", (entrada) =>
  expect(() => formatarValor(entrada)).toThrow("Decimal inválido"));

test("moeda leva R$ e espaço comum", () =>
  expect(formatarMoeda("195108.01")).toBe("R$ 195.108,01"));

test("moeda negativa mantém o sinal de menos tipográfico", () =>
  expect(formatarMoeda("-209.58")).toBe("R$ −209,58"));

test("percentual com 2 casas, nulo fica nulo", () => {
  expect(formatarPercentual("12.6700")).toBe("12,67%");
  expect(formatarPercentual("-3.1")).toBe("−3,10%");
  expect(formatarPercentual(null)).toBeNull();
});

test("datas como vieram, com T ou espaço, e a data vazia do Stur", () => {
  expect(formatarData("2026-05-28T16:43:00")).toBe("28/05/2026");
  expect(formatarData("2026-05-28 16:43:00")).toBe("28/05/2026");
  expect(formatarData("2026-05-28")).toBe("28/05/2026");
  expect(formatarData("1899-12-30 00:00:00")).toBe("—");
  expect(formatarData("")).toBe("—");
  expect(formatarData(null)).toBe("—");
  expect(formatarDiaMes("2026-11-17")).toBe("17/11");
  expect(formatarDiaMes("1899-12-30T00:00:00")).toBe("—");
  expect(formatarDiaMes(null)).toBe("—");
  expect(formatarDadosAte("2026-11-18T09:30:00")).toBe("18/11, 09h30");
  expect(formatarDadosAte("1899-12-30T00:00:00")).toBe("—");
});
