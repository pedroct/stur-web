import { apagarResultado, guardarResultado, lerResultado } from "@/lib/armazenamento/resultados";
import { linha, resultado } from "../../fabrica";

function cotaEstourada() {
  return new DOMException("cheio", "QuotaExceededError");
}

test("guarda e lê o resultado pela chave", () => {
  guardarResultado("/consulta?a", resultado([linha()]));
  expect(lerResultado("/consulta?a")?.vendas).toHaveLength(1);
  expect(lerResultado("/consulta?b")).toBeNull();
});

test("guarda só os 3 últimos", () => {
  ["a", "b", "c", "d"].forEach((k) => {
    guardarResultado(k, resultado([linha()]));
  });
  expect(lerResultado("a")).toBeNull();
  expect(sessionStorage.getItem("stur-web:resultado:a")).toBeNull();
  expect(lerResultado("d")).not.toBeNull();
});

test("guardar de novo a mesma chave não gasta uma das 3 vagas", () => {
  ["a", "b", "c"].forEach((k) => {
    guardarResultado(k, resultado([linha()]));
  });
  guardarResultado("c", resultado([linha(), linha()]));
  expect(lerResultado("a")).not.toBeNull();
  expect(lerResultado("c")?.vendas).toHaveLength(2);
});

test("cota estourada: apaga os outros e tenta de novo", () => {
  guardarResultado("velho", resultado([linha()]));
  const original = Storage.prototype.setItem;
  let falhas = 1;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    k: string,
    v: string,
  ) {
    if (k.startsWith("stur-web:resultado:novo") && falhas-- > 0) throw cotaEstourada();
    return original.call(this, k, v);
  });
  guardarResultado("novo", resultado([linha()]));
  expect(lerResultado("velho")).toBeNull();
  expect(sessionStorage.getItem("stur-web:resultado:novo")).not.toBeNull();
});

test("cota que não cabe de jeito nenhum: fica na memória, sem lançar", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw cotaEstourada();
  });
  expect(() => guardarResultado("x", resultado([linha()]))).not.toThrow();
  expect(lerResultado("x")?.vendas).toHaveLength(1);
});

test("sem sessionStorage: fica na memória, sem lançar", () => {
  const espiao = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
    throw new DOMException("bloqueado", "SecurityError");
  });
  try {
    expect(() => guardarResultado("x", resultado([linha()]))).not.toThrow();
    expect(lerResultado("x")?.vendas).toHaveLength(1);
    expect(() => apagarResultado("x")).not.toThrow();
    expect(lerResultado("x")).toBeNull();
  } finally {
    espiao.mockRestore();
  }
});

test("o que ficou só na memória some quando a mesma chave cabe no armazenamento", () => {
  const espiao = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw cotaEstourada();
  });
  guardarResultado("x", resultado([linha()]));
  espiao.mockRestore();
  guardarResultado("x", resultado([linha(), linha()]));
  expect(lerResultado("x")?.vendas).toHaveLength(2);
  apagarResultado("x");
  expect(lerResultado("x")).toBeNull();
});

test("apagar tira o resultado guardado e deixa os outros", () => {
  guardarResultado("a", resultado([linha()]));
  guardarResultado("b", resultado([linha()]));
  apagarResultado("a");
  expect(lerResultado("a")).toBeNull();
  expect(lerResultado("b")).not.toBeNull();
});

test("conteúdo inválido no armazenamento vale como ausente", () => {
  sessionStorage.setItem("stur-web:resultado:a", "{não é json");
  expect(lerResultado("a")).toBeNull();
});

test("índice inválido não impede de guardar", () => {
  sessionStorage.setItem("stur-web:resultados", "{não é json");
  guardarResultado("a", resultado([linha()]));
  expect(lerResultado("a")).not.toBeNull();
});
