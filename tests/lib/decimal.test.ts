import { compararDecimais, ehNegativo, ehZero, somarDecimais } from "@/lib/decimal";

test("soma exata em texto", () => {
  expect(somarDecimais(["0.10", "0.20"])).toBe("0.30");
  expect(somarDecimais(["10893.02", "-209.58", "0.00"])).toBe("10683.44");
  expect(somarDecimais(["1.5", "2.25"])).toBe("3.75");
  expect(somarDecimais([])).toBe("0.00");
});

test("resultado negativo e abaixo de 1 mantém zero e sinal", () => {
  expect(somarDecimais(["-0.30", "0.10"])).toBe("-0.20");
  expect(somarDecimais(["0.10", "-0.30", "0.20"])).toBe("0.00");
});

test("inteiros e casas variadas usam o maior número de casas", () => {
  expect(somarDecimais(["2", "3"])).toBe("5");
  expect(somarDecimais(["2", "0.0001"])).toBe("2.0001");
});

test("compararDecimais compara por sinal, parte inteira e casas, sem Number", () => {
  expect(compararDecimais("-0.01", "0.00")).toBe(-1);
  expect(compararDecimais("0.00", "-0.01")).toBe(1);
  expect(compararDecimais("1.50", "1.5")).toBe(0);
  expect(compararDecimais("-0.00", "0")).toBe(0);
  expect(compararDecimais("10.0001", "10")).toBe(1);
  expect(compararDecimais("9007199254740993.45", "9007199254740993.44")).toBe(1);
  expect(compararDecimais("-2", "-10")).toBe(1);
});

test("ehZero e ehNegativo: zero negativo é zero e não é negativo", () => {
  expect(ehZero("-0.00")).toBe(true);
  expect(ehZero("0.0000")).toBe(true);
  expect(ehZero("0.01")).toBe(false);
  expect(ehNegativo("-209.58")).toBe(true);
  expect(ehNegativo("-0.00")).toBe(false);
  expect(ehNegativo("209.58")).toBe(false);
});

test("decimal inválido lança erro", () => {
  expect(() => compararDecimais("1,5", "0")).toThrow("Decimal inválido");
  expect(() => ehZero("")).toThrow("Decimal inválido");
});
