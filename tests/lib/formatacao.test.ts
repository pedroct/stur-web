import {
  formatarCambio,
  formatarDadosAte,
  formatarData,
  formatarDataHora,
  formatarDiaMes,
  formatarHoraDoStur,
  formatarMoeda,
  formatarPercentual,
  formatarPercentualTermo,
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

test("câmbio com 4 casas", () => {
  expect(formatarCambio("6.03")).toBe("6,0300");
  expect(formatarCambio("1")).toBe("1,0000");
  expect(formatarCambio("5.123456")).toBe("5,1235");
});

test("percentual do termo: até 4 casas, sem zeros à direita", () => {
  expect(formatarPercentualTermo("13.0000")).toBe("13%");
  expect(formatarPercentualTermo("10.5")).toBe("10,5%");
  expect(formatarPercentualTermo("12.6789")).toBe("12,6789%");
  expect(formatarPercentualTermo("0.00")).toBe("0%");
  expect(formatarPercentualTermo("-3.10")).toBe("−3,1%");
});

test("data e hora como vieram, com T ou espaço, sem fuso", () => {
  expect(formatarDataHora("2026-11-16T20:41:00")).toBe("16/11/2026 · 20h41");
  expect(formatarDataHora("2026-11-16 20:41:00")).toBe("16/11/2026 · 20h41");
  expect(formatarDataHora("2026-11-16")).toBe("16/11/2026");
  expect(formatarDataHora("1899-12-30 00:00:00")).toBe("—");
  expect(formatarDataHora(null)).toBe("—");
});

test("hora dos campos de hora do Stur: a data 1899-12-30 não aparece", () => {
  expect(formatarHoraDoStur("1899-12-30T16:59:00")).toBe("16h59");
  expect(formatarHoraDoStur("1899-12-30 08:05:00")).toBe("08h05");
  expect(formatarHoraDoStur("")).toBe("—");
  expect(formatarHoraDoStur(null)).toBe("—");
});
