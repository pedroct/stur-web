import type { VendaAgi } from "@/contrato/tipos";
import {
  CODIGOS_DO_STUR,
  fornecedoresDe,
  GRUPOS_MAIS_DETALHES,
  type Par,
  preenchido,
  valorDoCampo,
} from "@/lib/venda/campos";
import { servicoAgi, vendaAgi } from "../../fabrica";

function pares(grupos: { grupo: string; pares: Par[] }[], v: VendaAgi) {
  return grupos.flatMap((g) =>
    g.pares.flatMap((p) => {
      const valor = p.valor(v);
      return valor === null ? [] : [{ grupo: g.grupo, rotulo: p.rotulo(v), valor }];
    }),
  );
}

function valorDe(grupos: { grupo: string; pares: Par[] }[], v: VendaAgi, rotulo: string) {
  return pares(grupos, v).find((p) => p.rotulo === rotulo)?.valor;
}

test("preenchido", () => {
  expect(preenchido(0)).toBe(true);
  expect(preenchido(false)).toBe(true);
  expect(preenchido("")).toBe(false);
  expect(preenchido({})).toBe(false);
});

test("preenchido: nulo, ausente, lista vazia e valores", () => {
  expect(preenchido(null)).toBe(false);
  expect(preenchido(undefined)).toBe(false);
  expect(preenchido([])).toBe(false);
  expect(preenchido(["a"])).toBe(true);
  expect(preenchido({ a: null })).toBe(true);
  expect(preenchido("0.00")).toBe(true);
  expect(preenchido(" ")).toBe(true);
});

test("vazios do Stur", () => {
  expect(preenchido("1899-12-30T00:00:00")).toBe(false);
  expect(preenchido("1899-12-30T10:30:00")).toBe(true);
  expect(preenchido(0, "idreservavinculadafee")).toBe(false);
  expect(preenchido(0, "vlrTaxas")).toBe(true);
});

test("vazios do Stur nos campos de hora e nos de data", () => {
  expect(preenchido("1899-12-30 00:00:00", "detalheItem[].horaRetirada")).toBe(false);
  expect(preenchido("1899-12-30T00:00:00", "detalheItem[].horaDevolucao")).toBe(false);
  expect(preenchido("1899-12-30T16:59:00", "detalheItem[].horaDevolucao")).toBe(true);
  expect(preenchido("1899-12-30T16:59:00", "dtemissao")).toBe(false);
  expect(preenchido("1899-12-30", "detalheItem[].dtEntrada")).toBe(false);
  expect(preenchido("2026-11-20 00:00:00", "dtemissao")).toBe(true);
  expect(preenchido(1002, "idreservavinculadafee")).toBe(true);
});

test("valorDoCampo lê o caminho, com um índice por lista", () => {
  const v = vendaAgi({
    detalheItem: [
      servicoAgi({
        apartamentos: [
          { qtde: 1, tipoApartamento: "SGL" },
          { qtde: 2, tipoApartamento: "DBL" },
        ],
      }),
      servicoAgi({ nomePax: "SEGUNDO/PASSAGEIRO" }),
    ],
    sistemaExterno: { sistema: "SISTEMA EXEMPLO", idVenda: "X1", idSistema: 7 },
  });
  expect(valorDoCampo(v, "reserva")).toBe(90000001);
  expect(valorDoCampo(v, "detalheItem[].apartamentos[].qtde", [0, 1])).toBe(2);
  expect(valorDoCampo(v, "detalheItem[].nomePax", [1])).toBe("SEGUNDO/PASSAGEIRO");
  expect(valorDoCampo(v, "detalheItem[].apartamentos", [0])).toHaveLength(2);
  expect(valorDoCampo(v, "sistemaExterno.sistema")).toBe("SISTEMA EXEMPLO");
  expect(valorDoCampo(v, "trechos[].cia", [0])).toBeUndefined();
  expect(valorDoCampo(v, "detalheItem[].nomePax", [5])).toBeUndefined();
  expect(valorDoCampo(v, "detalheItem[].nomePax")).toBeUndefined();
  expect(valorDoCampo(vendaAgi(), "financeiroVinculado.contasPagar")).toBeUndefined();
});

test("fornecedoresDe: o fornecedor 2 diferente vem primeiro, com a operadora", () => {
  expect(fornecedoresDe("OPERADORA EXEMPLO", "HOTEL EXEMPLO")).toEqual({
    principal: "HOTEL EXEMPLO",
    operadora: "OPERADORA EXEMPLO",
  });
  expect(fornecedoresDe("FORNECEDOR EXEMPLO", "FORNECEDOR EXEMPLO")).toEqual({
    principal: "FORNECEDOR EXEMPLO",
    operadora: null,
  });
  expect(fornecedoresDe("FORNECEDOR EXEMPLO", null)).toEqual({
    principal: "FORNECEDOR EXEMPLO",
    operadora: null,
  });
});

test("mais detalhes: par sem valor some e rótulo condicional", () => {
  const v = vendaAgi({
    nomeSolicitante: "SOLICITANTE EXEMPLO",
    nomeAutorizador: null,
    dtcriacao: "2026-11-16 20:41:00",
    dtconfirmacao: "2026-11-16 20:41:00",
  });
  const lista = pares(GRUPOS_MAIS_DETALHES, v);
  expect(lista).toContainEqual({
    grupo: "Quem comprou",
    rotulo: "Solicitante",
    valor: "SOLICITANTE EXEMPLO",
  });
  expect(lista).toContainEqual({
    grupo: "Datas da venda",
    rotulo: "Criada e confirmada",
    valor: "16/11/2026 · 20h41",
  });
  const rotulos = lista.map((p) => p.rotulo);
  expect(rotulos).not.toContain("Confirmada");
  expect(rotulos).not.toContain("Coordenador");
  expect(rotulos).not.toContain("Última alteração");
});

test("mais detalhes: quem comprou", () => {
  const comGrupo = vendaAgi({ grupocliente: "GRUPO EXEMPLO" });
  expect(valorDe(GRUPOS_MAIS_DETALHES, comGrupo, "Cliente e grupo")).toBe(
    "CLIENTE EXEMPLO LTDA · GRUPO EXEMPLO",
  );
  expect(valorDe(GRUPOS_MAIS_DETALHES, vendaAgi(), "Cliente")).toBe("CLIENTE EXEMPLO LTDA");
  const dois = vendaAgi({
    nomeSolicitante: "SOLICITANTE EXEMPLO",
    nomeAutorizador: "AUTORIZADOR EXEMPLO",
  });
  expect(valorDe(GRUPOS_MAIS_DETALHES, dois, "Solicitante e autorizador")).toBe(
    "SOLICITANTE EXEMPLO · AUTORIZADOR EXEMPLO",
  );
  const proprio = vendaAgi({ nomeSolicitante: "Cliente Exemplo Ltda" });
  expect(valorDe(GRUPOS_MAIS_DETALHES, proprio, "Solicitante")).toBe("o próprio cliente");
  const soAutorizador = vendaAgi({ nomeAutorizador: "AUTORIZADOR EXEMPLO" });
  expect(valorDe(GRUPOS_MAIS_DETALHES, soAutorizador, "Autorizador")).toBe("AUTORIZADOR EXEMPLO");
});

test("mais detalhes: quem vendeu na A3", () => {
  const iguais = vendaAgi({
    nomeEmissor: "EMISSOR EXEMPLO",
    nomeCoordenador: "EMISSOR EXEMPLO",
    nomePromotor: "PROMOTOR EXEMPLO",
    nomeFilial: "FILIAL EXEMPLO",
    nomeCenctroCustos: "CENTRO EXEMPLO",
  });
  expect(
    pares(GRUPOS_MAIS_DETALHES, iguais).filter((p) => p.grupo === "Quem vendeu na A3"),
  ).toEqual([
    { grupo: "Quem vendeu na A3", rotulo: "Emissor e coordenador", valor: "EMISSOR EXEMPLO" },
    { grupo: "Quem vendeu na A3", rotulo: "Promotor", valor: "PROMOTOR EXEMPLO" },
    {
      grupo: "Quem vendeu na A3",
      rotulo: "Filial e centro de custo",
      valor: "FILIAL EXEMPLO · CENTRO EXEMPLO",
    },
  ]);
  const diferentes = vendaAgi({ nomeEmissor: "EMISSOR EXEMPLO", nomeCoordenador: "OUTRO EXEMPLO" });
  expect(valorDe(GRUPOS_MAIS_DETALHES, diferentes, "Emissor")).toBe("EMISSOR EXEMPLO");
  expect(valorDe(GRUPOS_MAIS_DETALHES, diferentes, "Coordenador")).toBe("OUTRO EXEMPLO");
});

test.each([
  ["Hotelaria", "Hotel"],
  ["Aéreo", "Companhia"],
  ["Rodoviário", "Empresa de ônibus"],
  ["Locação", "Locadora"],
  ["Pacote", "Fornecedor 2"],
])("mais detalhes: o fornecedor 2 de %s é %s, com a operadora antes", (classificacao, rotulo) => {
  const v = vendaAgi({
    classificacaoproduto: classificacao,
    nomefornec: "OPERADORA EXEMPLO",
    nomefornec2: "FORNECEDOR EXEMPLO",
  });
  expect(pares(GRUPOS_MAIS_DETALHES, v).filter((p) => p.grupo === "Fornecedores")).toEqual([
    { grupo: "Fornecedores", rotulo: "Operadora", valor: "OPERADORA EXEMPLO" },
    { grupo: "Fornecedores", rotulo, valor: "FORNECEDOR EXEMPLO" },
  ]);
});

test.each([
  ["Aéreo", "FORNECEDOR EXEMPLO", "Fornecedor e companhia"],
  ["Hotelaria", "FORNECEDOR EXEMPLO", "Hotel"],
  ["Diversos", "FORNECEDOR EXEMPLO", "Fornecedor"],
  ["Aéreo", null, "Fornecedor"],
])("mais detalhes: %s com o fornecedor 2 %s dá um par só, %s", (classificacao, f2, rotulo) => {
  const v = vendaAgi({ classificacaoproduto: classificacao, nomefornec2: f2 });
  expect(pares(GRUPOS_MAIS_DETALHES, v).filter((p) => p.grupo === "Fornecedores")).toEqual([
    { grupo: "Fornecedores", rotulo, valor: "FORNECEDOR EXEMPLO" },
  ]);
});

test("mais detalhes: integração e datas", () => {
  expect(valorDe(GRUPOS_MAIS_DETALHES, vendaAgi(), "Integração")).toBe(
    "nenhuma: lançada direto no Stur",
  );
  const integrada = vendaAgi({
    sistemaExterno: { sistema: "SISTEMA EXEMPLO", idVenda: "X-1", idSistema: 7 },
    dtcriacao: "2026-11-16 20:41:00",
    dtconfirmacao: "2026-11-17 08:05:00",
    dtalteracao: "2026-11-18 09:00:00",
  });
  expect(valorDe(GRUPOS_MAIS_DETALHES, integrada, "Integração")).toBe(
    "SISTEMA EXEMPLO, ID Venda: X-1",
  );
  expect(
    pares(GRUPOS_MAIS_DETALHES, integrada).filter((p) => p.grupo === "Datas da venda"),
  ).toEqual([
    { grupo: "Datas da venda", rotulo: "Criada no Stur", valor: "16/11/2026 · 20h41" },
    { grupo: "Datas da venda", rotulo: "Confirmada", valor: "17/11/2026 · 08h05" },
    { grupo: "Datas da venda", rotulo: "Última alteração", valor: "18/11/2026 · 09h00" },
  ]);
});

test("os pares de mais detalhes declaram campos do Anexo B, e os grupos são os dele", () => {
  expect(GRUPOS_MAIS_DETALHES.map((g) => g.grupo)).toEqual([
    "Quem comprou",
    "Quem vendeu na A3",
    "Fornecedores",
    "Origem da venda",
    "Datas da venda",
  ]);
  const integracao = GRUPOS_MAIS_DETALHES.flatMap((g) => g.pares).find((p) =>
    p.campos.includes("sistemaExterno.sistema"),
  );
  expect(integracao?.campos).toEqual(["sistemaExterno.sistema", "sistemaExterno.idVenda"]);
});

test("códigos do Stur", () => {
  const v = vendaAgi({
    idCliente: 11,
    idproduto: 22,
    idfornec: 33,
    idfornec2: 33,
    nomearquivo: "Reserva_EXEMPLO.json",
  });
  expect(pares(CODIGOS_DO_STUR, v)).toEqual([
    { grupo: "Códigos internos, para diagnóstico", rotulo: "Id interno da venda", valor: "1001" },
    {
      grupo: "Códigos internos, para diagnóstico",
      rotulo: "Cliente, produto e fornecedor",
      valor: "11 · 22 · 33",
    },
    {
      grupo: "Códigos internos, para diagnóstico",
      rotulo: "Arquivo de importação",
      valor: "Reserva_EXEMPLO.json",
    },
  ]);
  const dois = vendaAgi({ idCliente: 11, idproduto: 22, idfornec: 33, idfornec2: 44 });
  expect(valorDe(CODIGOS_DO_STUR, dois, "Cliente, produto e fornecedores")).toBe(
    "11 · 22 · 33 e 44",
  );
  expect(valorDe(CODIGOS_DO_STUR, vendaAgi(), "Arquivo de importação")).toBeUndefined();
});
