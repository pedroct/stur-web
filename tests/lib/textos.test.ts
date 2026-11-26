import { contem, normalizar } from "@/lib/textos";

test("normalizar tira acento, caixa e espaços repetidos, como o backend", () =>
  expect(normalizar("  Fundação   água ")).toBe("FUNDACAO AGUA"));

test("contem", () => {
  expect(contem("HOTEL SÃO  EXEMPLO", "sao exem")).toBe(true);
  expect(contem("HOTEL SÃO  EXEMPLO", "recife")).toBe(false);
  expect(contem(null, "x")).toBe(false);
  expect(contem(null, "")).toBe(true);
  expect(contem("CLIENTE EXEMPLO LTDA", "")).toBe(true);
  expect(contem("CLIENTE EXEMPLO LTDA", "   ")).toBe(true);
});
