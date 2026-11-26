import type { VendaConsultada } from "@/contrato/tipos";
import {
  linhaDoIncentivo,
  textoCopiadoIncentivo,
  textoCopiadoReserva,
  textoCopiadoVenda,
} from "@/lib/venda/copia";
import {
  calculos,
  lancamento,
  pagamento,
  reserva,
  resumoVenda,
  servicoAgi,
  vendaAgi,
  vendaConsultada,
} from "../../fabrica";

const BASE = "https://exemplo.test";
const CONSULTADO = "2026-11-24T14:32:05.000001-03:00";

/** Uma venda de uma reserva de duas, como a IA 10.2, com dados de teste. */
function venda(campos?: Partial<VendaConsultada>): VendaConsultada {
  const r = reserva(90000001, [
    resumoVenda({ idreserva: 1001 }),
    resumoVenda({ idreserva: 1002, produto: "EVENTO", classificacao: "Diversos" }),
  ]);
  return vendaConsultada({
    venda: vendaAgi({
      idreserva: 1002,
      status: "fechada",
      nomeproduto: "EVENTO",
      classificacaoproduto: "Diversos",
      categoriaproduto: "Nacional",
      nomecliente: "CLIENTE EXEMPLO LTDA",
      totalCliente: "150197.72",
      totalFornecedor: "125877.74",
      margemLucroBruta: "24319.98",
      detalheItem: [
        servicoAgi({ nomePaxCompleto: "PASSAGEIRO EXEMPLO", cpf: "000.000.000-00" }),
        servicoAgi({ nomePaxCompleto: "OUTRO PASSAGEIRO", nomePax: "OUTRO P" }),
      ],
    }),
    calculos: calculos({ percentualLucro: "16.19" }),
    reserva: r.reserva,
    posicao: 2,
    consultadoEm: CONSULTADO,
    dadosDoSturAte: "2026-11-18T09:30:00",
    ...campos,
  });
}

const URL_DA_VENDA = `${BASE}/reservas/90000001/vendas/1002`;

test("o texto da venda, linha a linha, como na IA 10.2", () => {
  expect(textoCopiadoVenda(venda(), URL_DA_VENDA)).toBe(
    [
      "Consulta de reserva do Stur",
      URL_DA_VENDA,
      "Reserva 90000001 (venda 2 de 2)",
      "Produto: EVENTO (Diversos, Nacional). Situação: Fechada",
      "Cliente: CLIENTE EXEMPLO LTDA",
      "Total Cliente R$ 150.197,72. Total Fornecedor R$ 125.877,74. Margem R$ 24.319,98 (16,19%)",
      "Consultado na API em 24/11/2026 às 14:32",
      "Dados do Stur até 18/11, 09h30",
      "Id interno da venda: 1002",
      "",
      "O que diverge do Stur:",
    ].join("\n"),
  );
});

test("a classificação do produto, no texto copiado, é o rótulo com acento", () => {
  const dados = venda();
  const comAereo = { ...dados, venda: { ...dados.venda, classificacaoproduto: "Aereo" } };
  expect(textoCopiadoVenda(comAereo, URL_DA_VENDA)).toContain("Produto: EVENTO (Aéreo, Nacional).");
});

test("sem nome de passageiro, documento nem contato, salvo com o serviço aberto", () => {
  const texto = textoCopiadoVenda(venda(), URL_DA_VENDA);
  expect(texto).not.toContain("PASSAGEIRO");
  expect(texto).not.toContain("000.000.000-00");
  // O idreserva é a última linha antes da linha em aberto.
  expect(texto.split("\n").slice(-3)).toEqual([
    "Id interno da venda: 1002",
    "",
    "O que diverge do Stur:",
  ]);
});

test("com o serviço aberto entram a linha do serviço, o nome e o link do serviço", () => {
  const url = `${URL_DA_VENDA}/servicos/2`;
  const linhas = textoCopiadoVenda(venda(), url, 2).split("\n");
  expect(linhas[1]).toBe(url);
  expect(linhas[2]).toBe("Reserva 90000001 (venda 2 de 2)");
  expect(linhas[3]).toBe("Serviço 2 de 2: OUTRO PASSAGEIRO");
  expect(linhas[4]).toMatch(/^Produto: /);
});

test("serviço sem nome fica só com a posição, sem dado pessoal", () => {
  const sem = venda({
    venda: vendaAgi({ idreserva: 1002, detalheItem: [servicoAgi(), servicoAgi()] }),
  });
  expect(textoCopiadoVenda(sem, URL_DA_VENDA, 1).split("\n")[3]).toBe("Serviço 1 de 2");
});

test("percentual nulo e sem dadosDoSturAte (decisão 27)", () => {
  const texto = textoCopiadoVenda(
    venda({ calculos: calculos({ percentualLucro: null }), dadosDoSturAte: null }),
    URL_DA_VENDA,
  );
  expect(texto).toContain("Margem R$ 24.319,98 (% de lucro: não se aplica)");
  expect(texto).not.toContain("Dados do Stur até");
  expect(texto).toContain("Consultado na API em 24/11/2026 às 14:32\nId interno da venda: 1002");
});

test("reserva de uma venda só não diz a posição", () => {
  const uma = reserva(90000001, [resumoVenda({ idreserva: 1002 })]);
  const texto = textoCopiadoVenda(venda({ reserva: uma.reserva, posicao: 1 }), URL_DA_VENDA);
  expect(texto.split("\n")[2]).toBe("Reserva 90000001");
});

test("o texto da reserva, no layout da decisão 18, com 1 cancelada", () => {
  const r = reserva(
    90000001,
    [
      resumoVenda({ idreserva: 1001 }),
      resumoVenda({ idreserva: 1002 }),
      resumoVenda({ idreserva: 1003, situacao: "cancelada" }),
    ],
    {
      consultadoEm: CONSULTADO,
      dadosDoSturAte: "2026-11-18T09:30:00",
    },
  );
  r.reserva.totais.percentualLucro = "10.00";
  expect(textoCopiadoReserva(r, `${BASE}/reservas/90000001`)).toBe(
    [
      "Consulta de reserva do Stur",
      `${BASE}/reservas/90000001`,
      "Reserva 90000001 (3 vendas, 1 cancelada)",
      "Cliente: CLIENTE EXEMPLO LTDA",
      "Total Cliente R$ 2.000,00. Total Fornecedor R$ 1.800,00. Margem R$ 200,00 (10,00%)",
      "Consultado na API em 24/11/2026 às 14:32",
      "Dados do Stur até 18/11, 09h30",
      "",
      "O que diverge do Stur:",
    ].join("\n"),
  );
});

test("reserva com percentual nulo e sem dadosDoSturAte", () => {
  const r = reserva(90000001, [resumoVenda(), resumoVenda({ idreserva: 1002 })], {
    consultadoEm: CONSULTADO,
    dadosDoSturAte: null,
  });
  const texto = textoCopiadoReserva(r, `${BASE}/reservas/90000001`);
  expect(texto).toContain("Reserva 90000001 (2 vendas)");
  expect(texto).toContain("Margem R$ 200,00 (% de lucro: não se aplica)");
  expect(texto).not.toContain("Dados do Stur até");
});

function incentivo(campos?: Partial<VendaConsultada>): VendaConsultada {
  return venda({
    venda: vendaAgi({
      idreserva: 1002,
      nomefornec: "FORNECEDOR EXEMPLO",
      margemLucroBruta: "3698.14",
      pagamentos: [pagamento()],
    }),
    calculos: calculos({
      tipo: "incentivo",
      pagamentos: [
        lancamento({ ehCredito: true, situacao: "em_aberto", vencimento: "2026-11-11 00:00:00" }),
      ],
    }),
    ...campos,
  });
}

test("o texto do incentivo, com o selo e o vencimento do primeiro crédito", () => {
  expect(linhaDoIncentivo(incentivo())).toBe(
    "Incentivo de FORNECEDOR EXEMPLO, R$ 3.698,14, a vencer, vencimento 11/11/2026",
  );
  expect(textoCopiadoIncentivo(incentivo(), URL_DA_VENDA)).toBe(
    [
      "Consulta de reserva do Stur",
      URL_DA_VENDA,
      "Reserva 90000001 (venda 2 de 2)",
      "Incentivo de FORNECEDOR EXEMPLO, R$ 3.698,14, a vencer, vencimento 11/11/2026",
      "Consultado na API em 24/11/2026 às 14:32",
      "Dados do Stur até 18/11, 09h30",
      "Id interno da venda: 1002",
      "",
      "O que diverge do Stur:",
    ].join("\n"),
  );
});

test("incentivo sem crédito vale o primeiro pagamento; sem pagamento, só o valor", () => {
  const semCredito = incentivo({
    calculos: calculos({
      tipo: "incentivo",
      pagamentos: [lancamento({ situacao: "sem_saldo", vencimento: "2026-11-05 00:00:00" })],
    }),
  });
  expect(linhaDoIncentivo(semCredito)).toBe(
    "Incentivo de FORNECEDOR EXEMPLO, R$ 3.698,14, pago, vencimento 05/11/2026",
  );
  const semNada = incentivo({ calculos: calculos({ tipo: "incentivo", pagamentos: [] }) });
  expect(linhaDoIncentivo(semNada)).toBe("Incentivo de FORNECEDOR EXEMPLO, R$ 3.698,14");
});
