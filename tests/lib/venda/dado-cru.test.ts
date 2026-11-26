import { buscarNoJson, linhasDoJson, tamanhoEmKb } from "@/lib/venda/dado-cru";

const TEXTO = [
  "{",
  '  "idreserva": 1001,',
  '  "nomecliente": "CLIENTE EXEMPLO LTDA",',
  '  "totalCliente": 150197.70,',
  '  "dtcancelamento": null,',
  '  "camposGerenciais": [],',
  '  "trechos": [',
  '    "ida, volta",',
  "    12",
  "  ],",
  '  "ação": true',
  "}",
].join("\n");

test("linhasDoJson mantém 150197.70 e a ordem das chaves do texto já indentado", () => {
  const linhas = linhasDoJson(TEXTO);
  expect(linhas).toHaveLength(12);
  expect(linhas.map((l) => l.n)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  const total = linhas[3];
  expect(total).toEqual({
    n: 4,
    recuo: "  ",
    chave: '"totalCliente"',
    separador: ": ",
    valor: "150197.70",
    tipo: "numero",
    fim: ",",
  });
  expect(linhas.map((l) => l.chave).filter((c) => c !== "")).toEqual([
    '"idreserva"',
    '"nomecliente"',
    '"totalCliente"',
    '"dtcancelamento"',
    '"camposGerenciais"',
    '"trechos"',
    '"ação"',
  ]);
});

test("linhasDoJson devolve o texto sem perder nada: juntar as partes refaz cada linha", () => {
  const linhas = linhasDoJson(TEXTO);
  const refeito = linhas.map((l) => l.recuo + l.chave + l.separador + l.valor + l.fim).join("\n");
  expect(refeito).toBe(TEXTO);
});

test("linhasDoJson classifica texto, número, literal e o resto", () => {
  const tipos = linhasDoJson(TEXTO).map((l) => l.tipo);
  expect(tipos).toEqual([
    "outro", // {
    "numero",
    "texto",
    "numero",
    "literal", // null
    "outro", // []
    "outro", // [
    "texto", // elemento da lista, com vírgula dentro do texto
    "numero",
    "outro", // ],
    "literal", // true
    "outro", // }
  ]);
  const elemento = linhasDoJson(TEXTO)[7];
  expect(elemento).toMatchObject({ chave: "", valor: '"ida, volta"', fim: "," });
});

test("linhasDoJson ignora a quebra de linha do fim, mas não uma linha vazia no meio", () => {
  expect(linhasDoJson("{\n}\n")).toHaveLength(2);
  expect(linhasDoJson("")).toEqual([]);
});

function achados(quantos: number) {
  const texto = [
    "{",
    ...Array.from({ length: quantos }, (_, i) => `  "campo${i}": "valor",`),
    '  "outro": 1',
    "}",
  ].join("\n");
  return linhasDoJson(texto);
}

test("buscarNoJson: 25 achados dizem '25 linhas; as 20 primeiras:' e guardam todos", () => {
  const { achadas, resumo } = buscarNoJson(achados(25), "valor");
  expect(resumo).toBe("25 linhas; as 20 primeiras:");
  expect(achadas).toHaveLength(25);
  expect(achadas[0]).toBe(2);
});

test("buscarNoJson: os textos de 0, 1 e algumas linhas", () => {
  const linhas = achados(3);
  expect(buscarNoJson(linhas, "não existe").resumo).toBe("Nenhuma linha com esse texto.");
  expect(buscarNoJson(linhas, "não existe").achadas).toEqual([]);
  expect(buscarNoJson(linhas, "campo1")).toEqual({ achadas: [3], resumo: "1 linha:" });
  expect(buscarNoJson(linhas, "valor").resumo).toBe("3 linhas:");
  expect(buscarNoJson(achados(20), "valor").resumo).toBe("20 linhas:");
});

test("buscarNoJson não diferencia maiúsculas nem acentos: AÇÃO acha acao", () => {
  const linhas = linhasDoJson('{\n  "acao": "reserva",\n  "outro": 1\n}');
  expect(buscarNoJson(linhas, "AÇÃO").achadas).toEqual([2]);
  expect(buscarNoJson(linhas, "RESERVA").achadas).toEqual([2]);
});

test("buscarNoJson procura na linha inteira, chave e valor, inclusive o número como texto", () => {
  const linhas = linhasDoJson(TEXTO);
  expect(buscarNoJson(linhas, "150197.70").achadas).toEqual([4]);
  expect(buscarNoJson(linhas, "totalcliente").achadas).toEqual([4]);
});

test("buscarNoJson com a busca vazia não acha nada e não escreve resumo", () => {
  expect(buscarNoJson(linhasDoJson(TEXTO), "  ")).toEqual({ achadas: [], resumo: "" });
});

test("tamanhoEmKb: bytes UTF-8 por 1.024, com uma casa e vírgula", () => {
  expect(tamanhoEmKb("a".repeat(6860))).toBe("6,7 KB");
  expect(tamanhoEmKb("a".repeat(1024))).toBe("1,0 KB");
  // "ç" tem 2 bytes em UTF-8.
  expect(tamanhoEmKb("ç".repeat(512))).toBe("1,0 KB");
  expect(tamanhoEmKb("")).toBe("0,0 KB");
});
