import { somarDecimais } from "@/lib/decimal";

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
