import type { AvisoApi, Vinculos } from "@/contrato/tipos";
import {
  avisosDaVenda,
  fraseDaReceita,
  nomeDoProduto,
  subtituloDaVenda,
} from "@/lib/venda/cabecalho";
import { calculos, vendaAgi } from "../../fabrica";

const SEM_VINCULOS: Vinculos = { fee: null, reembolsos: [] };

function avisos(...codigos: AvisoApi["codigo"][]): AvisoApi[] {
  return codigos.map((codigo) => ({ codigo, siglas: [] }));
}

test("nome do produto", () => {
  expect(subtituloDaVenda(vendaAgi()).startsWith("Hotel nacional (Hotelaria) ·")).toBe(true);
  expect(nomeDoProduto("HOTEL NAC", "Nacional")).toBe("Hotel nacional");
  expect(nomeDoProduto("PACOTE TER INT", "Internacional")).toBe("Pacote terrestre internacional");
  expect(nomeDoProduto("BILHETE NACIONAL", "Nacional")).toBe("Bilhete nacional");
});

test("nome do produto com acento, sem categoria e sem produto", () => {
  expect(nomeDoProduto("RODOVIARIO NAC", "Nacional")).toBe("Rodoviário nacional");
  expect(nomeDoProduto("SEGURO INT", "Internacional")).toBe("Seguro internacional");
  expect(nomeDoProduto("EVENTO", "Nacional")).toBe("Evento nacional");
  expect(nomeDoProduto("HOTEL NAC", null)).toBe("Hotel");
  expect(nomeDoProduto(null, "Nacional")).toBe("Nacional");
  expect(nomeDoProduto(null, null)).toBe("");
});

test("subtítulo com um fornecedor e com o fornecedor 2", () => {
  expect(subtituloDaVenda(vendaAgi())).toBe(
    "Hotel nacional (Hotelaria) · FORNECEDOR EXEMPLO · emitida em 17/11/2026",
  );
  expect(subtituloDaVenda(vendaAgi({ nomefornec2: "HOTEL EXEMPLO" }))).toBe(
    "Hotel nacional (Hotelaria) · HOTEL EXEMPLO, pela FORNECEDOR EXEMPLO · emitida em 17/11/2026",
  );
  expect(subtituloDaVenda(vendaAgi({ nomefornec2: "FORNECEDOR EXEMPLO", dtemissao: null }))).toBe(
    "Hotel nacional (Hotelaria) · FORNECEDOR EXEMPLO",
  );
});

test("receita com dois casos", () => {
  const v = vendaAgi({
    totalCliente: "0.00",
    margemLucroBruta: "-490.00",
    totalFornecedor: "490.00",
  });
  expect(fraseDaReceita(v, calculos({ percentualLucro: null }))).toBe(
    "custo sem cobrança ao cliente; % de lucro: não se aplica",
  );
});

test("receita: cancelada, sem custo e nenhum caso", () => {
  expect(fraseDaReceita(vendaAgi({ status: "CANCELADA" }), calculos())).toBe(
    "fora dos totais, porque a venda está cancelada",
  );
  expect(fraseDaReceita(vendaAgi({ totalFornecedor: "0.00" }), calculos())).toBe(
    "sem custo do fornecedor",
  );
  expect(fraseDaReceita(vendaAgi(), calculos())).toBeNull();
});

test("avisos na ordem", () => {
  const v = vendaAgi({ status: "CANCELADA", dtcancelamento: "2026-11-12 15:02:00" });
  const c = calculos({
    avisos: [
      { codigo: "conta_nao_fecha", siglas: [] },
      { codigo: "venda_cancelada", siglas: [] },
      { codigo: "moeda_cambio_1", siglas: ["US$"] },
    ],
  });
  expect(avisosDaVenda(v, c, SEM_VINCULOS)).toEqual([
    {
      tom: "info",
      texto:
        "O Stur marca a tarifa desta venda em US$ com câmbio 1,0000. A conta usa o valor como real, como os totais do Stur.",
    },
    {
      tom: "neutro",
      texto:
        "Venda cancelada em 12/11/2026, às 15h02. A consulta vale também para vendas canceladas. Os valores abaixo são os que ficaram no Stur, e esta venda fica fora dos totais da reserva e da consulta por período.",
    },
  ]);
});

test("cancelada sem data, comissão não apurada e conta que não fecha", () => {
  const c = calculos({
    avisos: avisos("venda_cancelada", "comissao_nao_apurada", "conta_nao_fecha"),
  });
  expect(avisosDaVenda(vendaAgi({ status: "CANCELADA" }), c, SEM_VINCULOS)).toEqual([
    {
      tom: "neutro",
      texto:
        "Venda cancelada no Stur. A consulta vale também para vendas canceladas. Os valores abaixo são os que ficaram no Stur, e esta venda fica fora dos totais da reserva e da consulta por período.",
    },
  ]);
});

test("moeda estrangeira e reservada", () => {
  const c = calculos({
    avisos: [
      { codigo: "moeda_estrangeira", siglas: ["US$", "EUR"] },
      { codigo: "venda_reservada", siglas: [] },
    ],
  });
  expect(avisosDaVenda(vendaAgi({ status: "RESERVADA" }), c, SEM_VINCULOS)).toEqual([
    {
      tom: "info",
      texto:
        "Esta venda tem tarifas em US$ e EUR. A aplicação converte só a tarifa pelo câmbio de cada serviço; os demais valores já vêm em R$.",
    },
    {
      tom: "info",
      texto:
        "Venda reservada, ainda sem confirmação no Stur. O Stur só gera os títulos a receber e a pagar e só apura as comissões quando a venda é confirmada. Até lá, os valores abaixo são os previstos.",
    },
  ]);
});

test("fee com a venda vinculada desta reserva, e sem ela", () => {
  const c = calculos({ tipo: "fee", avisos: avisos("venda_fee") });
  const vinculos: Vinculos = {
    fee: { idreserva: 1002, numero: 90000001, posicao: 2, quantidade: 2, produto: "BILHETE INT" },
    reembolsos: [],
  };
  expect(avisosDaVenda(vendaAgi(), c, vinculos)).toEqual([
    {
      tom: "info",
      texto: "Esta venda é o fee da venda de BILHETE INT desta mesma reserva.",
      link: "/reservas/90000001/vendas/1002",
    },
  ]);
  expect(avisosDaVenda(vendaAgi(), c, SEM_VINCULOS)).toEqual([
    { tom: "info", texto: "Esta venda é o fee de uma venda que não está nesta reserva." },
  ]);
});
