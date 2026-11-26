import {
  contarOpcoes,
  escreverRefinamentos,
  lerRefinamentos,
  REFINAMENTOS_VAZIOS,
  refinar,
  resumoRefinamentos,
  somarVisiveis,
  temRefinamento,
} from "@/lib/resultado/refinar";
import { linha } from "../../fabrica";

const vendas = [
  linha({
    numero: 90000001,
    idreserva: 1001,
    situacao: "reservada",
    classificacao: "Hotelaria",
    cliente: "CLIENTE EXEMPLO LTDA",
    fornecedor: "OPERADORA EXEMPLO",
    fornecedor2: "HOTEL EXEMPLO",
    totalCliente: "100.00",
    margem: "10.00",
  }),
  linha({
    numero: 90000002,
    idreserva: 1002,
    situacao: "cancelada",
    classificacao: "Aéreo",
    cliente: "FUNDAÇÃO EXEMPLO",
    fornecedor: "CIA EXEMPLO",
    fornecedor2: "CIA EXEMPLO",
    totalCliente: "50.00",
    margem: "5.00",
    contaFecha: false,
  }),
  linha({
    numero: 90000003,
    idreserva: 1003,
    tipo: "incentivo",
    produto: "INCENTIVO",
    classificacao: "Outra",
    cliente: null,
    fornecedor: "FORNECEDOR EXEMPLO",
    totalCliente: "0.00",
    margem: "30.00",
  }),
];

const ids = (lista: typeof vendas) => lista.map((v) => v.idreserva);

test("busca sem acento acha cliente com acento", () =>
  expect(ids(refinar(vendas, { ...REFINAMENTOS_VAZIOS, q: "fundacao" }))).toEqual([1002]));

test("busca acha pelo número, pelo fornecedor 2, pelo emissor e pelo produto", () => {
  expect(ids(refinar(vendas, { ...REFINAMENTOS_VAZIOS, q: "90000003" }))).toEqual([1003]);
  expect(ids(refinar(vendas, { ...REFINAMENTOS_VAZIOS, q: "hotel exemplo" }))).toEqual([1001]);
  expect(ids(refinar(vendas, { ...REFINAMENTOS_VAZIOS, q: "incentivo" }))).toEqual([1003]);
  expect(refinar(vendas, { ...REFINAMENTOS_VAZIOS, q: "emissor exemplo" })).toHaveLength(3);
});

test("situação e produto pelo texto da API", () => {
  expect(ids(refinar(vendas, { ...REFINAMENTOS_VAZIOS, situacao: ["cancelada"] }))).toEqual([1002]);
  expect(ids(refinar(vendas, { ...REFINAMENTOS_VAZIOS, produto: ["aereo"] }))).toEqual([1002]);
});

test("fornecedor escolhido acha a operadora e o fornecedor 2", () => {
  expect(refinar(vendas, { ...REFINAMENTOS_VAZIOS, fornecedor: "HOTEL EXEMPLO" })).toHaveLength(1);
  expect(refinar(vendas, { ...REFINAMENTOS_VAZIOS, fornecedor: "OPERADORA EXEMPLO" })).toHaveLength(
    1,
  );
});

test("cliente e emissor escolhidos casam por igualdade exata, e os filtros se combinam", () => {
  expect(ids(refinar(vendas, { ...REFINAMENTOS_VAZIOS, cliente: "CLIENTE EXEMPLO LTDA" }))).toEqual(
    [1001],
  );
  expect(refinar(vendas, { ...REFINAMENTOS_VAZIOS, cliente: "CLIENTE EXEMPLO" })).toEqual([]);
  expect(refinar(vendas, { ...REFINAMENTOS_VAZIOS, emissor: "EMISSOR EXEMPLO" })).toHaveLength(3);
  expect(
    refinar(vendas, { ...REFINAMENTOS_VAZIOS, emissor: "EMISSOR EXEMPLO", produto: ["hotelaria"] }),
  ).toHaveLength(1);
});

test("só as que não fecham", () =>
  expect(ids(refinar(vendas, { ...REFINAMENTOS_VAZIOS, soNaoFecham: true }))).toEqual([1002]));

test("sem refinamento devolve tudo na mesma ordem", () =>
  expect(ids(refinar(vendas, REFINAMENTOS_VAZIOS))).toEqual([1001, 1002, 1003]));

test("contagens do resultado inteiro, sem repetir fornecedor igual e sem pílula para o desconhecido", () => {
  const o = contarOpcoes(vendas);
  expect(o.fornecedor).toEqual([
    ["CIA EXEMPLO", 1],
    ["FORNECEDOR EXEMPLO", 1],
    ["HOTEL EXEMPLO", 1],
    ["OPERADORA EXEMPLO", 1],
  ]);
  expect(o.produto).toEqual([
    ["aereo", 1],
    ["hotelaria", 1],
  ]);
  expect(o.naoFecham).toBe(1);
  expect(o.total).toBe(3);
});

test("contagens: situação na ordem do Stur, nomes em ordem alfabética, sem nome vazio", () => {
  const o = contarOpcoes(vendas);
  expect(o.situacao).toEqual([
    ["reservada", 1],
    ["fechada", 1],
    ["cancelada", 1],
  ]);
  expect(o.cliente).toEqual([
    ["CLIENTE EXEMPLO LTDA", 1],
    ["FUNDAÇÃO EXEMPLO", 1],
  ]);
  expect(contarOpcoes([linha({ situacao: "estranha" })]).situacao).toEqual([]);
  const ordem = contarOpcoes([
    linha({ emissor: "ÁGATA EXEMPLO" }),
    linha({ emissor: "ZELIA EXEMPLO" }),
    linha({ emissor: "BEATRIZ EXEMPLO" }),
    linha({ emissor: "BEATRIZ EXEMPLO" }),
  ]);
  expect(ordem.emissor).toEqual([
    ["ÁGATA EXEMPLO", 1],
    ["BEATRIZ EXEMPLO", 2],
    ["ZELIA EXEMPLO", 1],
  ]);
});

test("soma das visíveis sem canceladas e sem incentivos", () =>
  expect(somarVisiveis(vendas)).toEqual({
    quantidade: 3,
    totalCliente: "100.00",
    margem: "10.00",
  }));

test("refinamentos no endereço, com o prefixo f. e vírgula literal", () => {
  const texto = escreverRefinamentos({
    ...REFINAMENTOS_VAZIOS,
    q: "GAMA",
    situacao: ["reservada", "fechada"],
    produto: ["hotelaria"],
    soNaoFecham: true,
  });
  expect(texto).toBe("q=GAMA&f.situacao=reservada,fechada&f.produto=hotelaria&f.contas=nao-fecham");
  expect(lerRefinamentos(new URLSearchParams(texto))).toMatchObject({
    q: "GAMA",
    situacao: ["reservada", "fechada"],
    produto: ["hotelaria"],
    soNaoFecham: true,
  });
});

test("nomes escolhidos vão e voltam pelo endereço, na ordem do brief", () => {
  const r = {
    ...REFINAMENTOS_VAZIOS,
    cliente: "FUNDAÇÃO EXEMPLO",
    fornecedor: "CIA, EXEMPLO",
    emissor: "EMISSOR EXEMPLO",
  };
  const texto = escreverRefinamentos(r);
  expect(texto.split("&").map((p) => p.split("=")[0])).toEqual([
    "f.cliente",
    "f.fornecedor",
    "f.emissor",
  ]);
  expect(lerRefinamentos(new URLSearchParams(texto))).toEqual(r);
});

test("lerRefinamentos ignora valores inválidos e sem nada vale vazio", () => {
  expect(lerRefinamentos(new URLSearchParams(""))).toEqual(REFINAMENTOS_VAZIOS);
  expect(
    lerRefinamentos(
      new URLSearchParams(
        "f.situacao=reservada,xis&f.produto=nada&f.contas=outra&f.cliente=%20%20&pagina=2",
      ),
    ),
  ).toEqual({ ...REFINAMENTOS_VAZIOS, situacao: ["reservada"] });
  expect(escreverRefinamentos(REFINAMENTOS_VAZIOS)).toBe("");
});

test("temRefinamento", () => {
  expect(temRefinamento(REFINAMENTOS_VAZIOS)).toBe(false);
  expect(temRefinamento({ ...REFINAMENTOS_VAZIOS, q: "x" })).toBe(true);
  expect(temRefinamento({ ...REFINAMENTOS_VAZIOS, soNaoFecham: true })).toBe(true);
  expect(temRefinamento({ ...REFINAMENTOS_VAZIOS, emissor: "EMISSOR EXEMPLO" })).toBe(true);
});

test("resumo dos refinamentos", () => {
  expect(resumoRefinamentos(REFINAMENTOS_VAZIOS)).toBe("nenhum marcado");
  expect(resumoRefinamentos({ ...REFINAMENTOS_VAZIOS, q: "x" })).toBe("nenhum marcado");
  expect(
    resumoRefinamentos({
      ...REFINAMENTOS_VAZIOS,
      q: "x",
      produto: ["hotelaria"],
      cliente: "GAMA",
      soNaoFecham: true,
    }),
  ).toBe("3 marcados: Hotelaria, cliente GAMA, só as que não fecham");
  expect(
    resumoRefinamentos({
      ...REFINAMENTOS_VAZIOS,
      situacao: ["reservada"],
      fornecedor: "F",
      emissor: "E",
    }),
  ).toBe("3 marcados: Reservada, fornecedor F, emissor E");
  expect(resumoRefinamentos({ ...REFINAMENTOS_VAZIOS, soNaoFecham: true })).toBe(
    "1 marcado: só as que não fecham",
  );
});
