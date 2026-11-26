import type { ContaLado, ContaServico } from "@/contrato/tipos";
import {
  caminhosDaConta,
  efeitoDoTermo,
  fraseComissoes,
  frasesDeReferencia,
  fraseZerados,
  linhaDasTarifas,
  linhaDaTarifa,
  rotuloDoTermo,
  somarContas,
} from "@/lib/venda/conta";
import { contaServico, servicoAgi } from "../../fabrica";

function lado(campos: Partial<ContaLado> = {}): ContaLado {
  return {
    termos: [{ campo: "vlrTarifaTotal", valor: "1000.00", efeito: "soma" }],
    zerados: [],
    total: "1000.00",
    conversao: null,
    siglaComCambio1: null,
    ...campos,
  };
}

function conta(cliente: Partial<ContaLado>, fornecedor: Partial<ContaLado> = {}): ContaServico {
  return contaServico({
    cliente: lado(cliente),
    fornecedor: lado({
      termos: [{ campo: "vlrTarifaTotalp", valor: "900.00", efeito: "soma" }],
      total: "900.00",
      ...fornecedor,
    }),
  });
}

// --- efeito e rótulos (decisão 5; tabela da Task 7) ---

test("todo termo leva o efeito, nos dois lados", () => {
  expect(efeitoDoTermo("soma", "cliente")).toBe("soma ao total do cliente");
  expect(efeitoDoTermo("reduz", "cliente")).toBe("reduz o total do cliente");
  expect(efeitoDoTermo("soma", "fornecedor")).toBe("soma ao custo do fornecedor");
  expect(efeitoDoTermo("reduz", "fornecedor")).toBe("reduz o custo do fornecedor");
});

test("a comissão recebida leva o nome pela classificação e o percentual quando há", () => {
  const s = servicoAgi({ percComisRecebida: "13.0000" });
  expect(rotuloDoTermo("vlrComisRecebida", "fornecedor", "Hotelaria", s)).toBe(
    "Comissão do hotel, 13%",
  );
  expect(rotuloDoTermo("vlrComisRecebida", "fornecedor", "Locação", s)).toBe(
    "Comissão da locadora, 13%",
  );
  expect(rotuloDoTermo("vlrComisRecebida", "fornecedor", "Pacote", s)).toBe(
    "Comissão da operadora, 13%",
  );
  expect(rotuloDoTermo("vlrComisRecebida", "fornecedor", "Aéreo", servicoAgi())).toBe(
    "Comissão recebida",
  );
});

test("o percentual só entra preenchido e diferente de zero", () => {
  expect(rotuloDoTermo("vlrTaxas", "cliente", "Hotelaria", servicoAgi({ perTaxas: "10" }))).toBe(
    "Taxas, 10%",
  );
  expect(
    rotuloDoTermo("vlrTaxas", "cliente", "Hotelaria", servicoAgi({ perTaxas: "0.0000" })),
  ).toBe("Taxas");
  expect(rotuloDoTermo("vlrDescontoAcordo", "fornecedor", "Diversos", servicoAgi())).toBe("Acordo");
  expect(
    rotuloDoTermo("vlrDesconto", "cliente", "Diversos", servicoAgi({ perDesconto: "2.5" })),
  ).toBe("Desconto, 2,5%");
  expect(rotuloDoTermo("vlrTxDU", "cliente", "Aéreo", servicoAgi())).toBe("Taxa DU");
  expect(rotuloDoTermo("vlrFeePagar", "fornecedor", "Hotelaria", servicoAgi())).toBe("Fee a pagar");
});

// --- zerados (decisão 5) ---

test("os zerados dos dois lados numa frase, em minúsculas e sem repetir", () => {
  const c = conta(
    { zerados: ["vlrTaxas", "vlrTxExt", "vlrDesconto"] },
    { zerados: ["vlrTaxasP", "vlrTxExtP", "vlrDescontoAcordo", "vlrComisRecebida"] },
  );
  expect(fraseZerados(c, "Zerados")).toBe(
    "Zerados: taxas, extras, desconto, acordo e comissão recebida.",
  );
  expect(fraseZerados(c, "Zerados neste serviço")).toBe(
    "Zerados neste serviço: taxas, extras, desconto, acordo e comissão recebida.",
  );
  expect(fraseZerados(conta({}), "Zerados")).toBeNull();
});

// --- linha da tarifa (decisão 6) ---

test("com conversão, a tarifa na moeda de origem e o câmbio, com a data", () => {
  const cliente = lado({
    conversao: {
      sigla: "EUR",
      tarifaOrigem: "8240.73",
      cambio: "6.0300",
      dataCambio: "2026-05-24 00:00:00",
    },
  });
  const s = servicoAgi({ siglaMoedaTarifa: "EUR", vlrCambio: "6.0300" });
  expect(linhaDaTarifa("cliente", cliente, s, "Pacote")).toEqual({
    linhas: ["Tarifa EUR 8.240,73 × câmbio 6,0300 · de 24/05/2026"],
    nota: null,
  });
  const semData = lado({
    conversao: { sigla: "EUR", tarifaOrigem: "8240.73", cambio: "6.0300", dataCambio: null },
  });
  expect(linhaDaTarifa("cliente", semData, s, "Pacote").linhas).toEqual([
    "Tarifa EUR 8.240,73 × câmbio 6,0300",
  ]);
});

test("câmbio 1: a tarifa como real e a frase embaixo", () => {
  const s = servicoAgi({ siglaMoedaTarifap: "US$" });
  expect(linhaDaTarifa("fornecedor", lado({ siglaComCambio1: "US$" }), s, "Pacote")).toEqual({
    linhas: ["Tarifa"],
    nota: "Marcada em US$ no Stur, com câmbio 1,0000; contada como real.",
  });
});

test("BRL é real: a linha diz isso", () => {
  const s = servicoAgi({ siglaMoedaTarifa: " brl " });
  expect(linhaDaTarifa("cliente", lado(), s, "Diversos")).toEqual({
    linhas: ["Tarifa · em BRL, que é real"],
    nota: null,
  });
});

test("hotelaria: uma linha por apartamento, com a diária de cada lado", () => {
  const s = servicoAgi({
    apartamentos: [
      apto({ qtde: 1, qtdeDiarias: 2, vlrDiaria: "462.00", vlrDiariaP: "412.00" }),
      apto({ qtde: 2, qtdeDiarias: 1, vlrDiaria: "300.00", vlrDiariaP: "250.00" }),
    ],
  });
  expect(linhaDaTarifa("cliente", lado(), s, "Hotelaria").linhas).toEqual([
    "1 apto × 2 diárias × 462,00",
    "2 apto × 1 diária × 300,00",
  ]);
  expect(linhaDaTarifa("fornecedor", lado(), s, "Hotelaria").linhas).toEqual([
    "1 apto × 2 diárias × 412,00",
    "2 apto × 1 diária × 250,00",
  ]);
});

test("hotelaria com conversão: a diária na moeda de origem", () => {
  const s = servicoAgi({
    apartamentos: [apto({ qtde: 1, qtdeDiarias: 2, vlrDiaria: "411.50", vlrDiariaP: "400.00" })],
  });
  const cliente = lado({
    conversao: {
      sigla: "EUR",
      tarifaOrigem: "823.00",
      cambio: "6.0300",
      dataCambio: "2026-05-24 00:00:00",
    },
  });
  expect(linhaDaTarifa("cliente", cliente, s, "Hotelaria").linhas).toEqual([
    "1 apto × 2 diárias × EUR 411,50 × câmbio 6,0300 · de 24/05/2026",
  ]);
});

test("locação pelas diárias, quantidade maior que 1 pelo unitário, e o resto Tarifa", () => {
  const locacao = servicoAgi({ qtdeDiarias: 3, vlrTarifa: "120.00", vlrTarifap: "100.00" });
  expect(linhaDaTarifa("cliente", lado(), locacao, "Locação").linhas).toEqual([
    "3 diárias × 120,00",
  ]);
  expect(linhaDaTarifa("fornecedor", lado(), locacao, "Locação").linhas).toEqual([
    "3 diárias × 100,00",
  ]);
  const itens = servicoAgi({ qtde: 70, vlrTarifa: "70.00", vlrTarifap: "60.00" });
  expect(linhaDaTarifa("fornecedor", lado(), itens, "Diversos").linhas).toEqual(["70 × 60,00"]);
  expect(linhaDaTarifa("cliente", lado(), servicoAgi({ qtde: 1 }), "Aéreo").linhas).toEqual([
    "Tarifa",
  ]);
});

// --- comissões da equipe (decisão 7) ---

test("comissões da equipe: os valores somados dos serviços, só a parte maior que zero", () => {
  const contas = [contaServico(), contaServico({ indice: 1 })];
  const dois = [
    servicoAgi({ vlrComissaoEmissor: "10.00", vlrComissaoPromotor: "5.00" }),
    servicoAgi({ vlrComissaoEmissor: "2.50", vlrComissaoPromotor: "0.00" }),
  ];
  expect(fraseComissoes(contas, dois, "FECHADA")).toBe(
    "Comissão do emissor R$ 12,50 e do promotor R$ 5,00.",
  );
  const soEmissor = [servicoAgi({ vlrComissaoEmissor: "39.20", vlrComissaoPromotor: "0.00" })];
  expect(fraseComissoes([contaServico()], soEmissor, "FECHADA")).toBe(
    "Comissão do emissor R$ 39,20.",
  );
  const soPromotor = [servicoAgi({ vlrComissaoPromotor: "1.00" })];
  expect(fraseComissoes([contaServico()], soPromotor, "FECHADA")).toBe(
    "Comissão do promotor R$ 1,00.",
  );
});

test("comissões não apuradas, na reservada com o motivo, e nunca na cancelada", () => {
  const naoApurada = [contaServico({ comissoesNaoApuradas: true })];
  const zeradas = [servicoAgi({ vlrComissaoEmissor: "0.00", vlrComissaoPromotor: "0.00" })];
  expect(fraseComissoes(naoApurada, zeradas, "CONFIRMADA")).toBe(
    "Comissões da equipe ainda não apuradas.",
  );
  expect(fraseComissoes(naoApurada, zeradas, "reservada")).toBe(
    "Comissões da equipe ainda não apuradas, porque a venda está reservada.",
  );
  expect(fraseComissoes(naoApurada, zeradas, "CANCELADA")).toBe(
    "Nenhuma comissão da equipe lançada nesta venda.",
  );
  expect(fraseComissoes([contaServico()], zeradas, "FECHADA")).toBe(
    "Nenhuma comissão da equipe lançada nesta venda.",
  );
});

// --- referências (decisão 6) ---

test("tarifa cheia e diária de balcão viram frases, uma vez por valor diferente", () => {
  const s = servicoAgi({
    vlrTarifaCheia: "70.00",
    apartamentos: [
      apto({ vlrBalcao: "412.00" }),
      apto({ vlrBalcao: "412.00" }),
      apto({ vlrBalcao: "500.00" }),
    ],
  });
  expect(frasesDeReferencia(s).map((f) => f.texto)).toEqual([
    "Tarifa cheia informada no Stur: R$ 70,00, fora da conta.",
    "Diária de balcão informada: 412,00.",
    "Diária de balcão informada: 500,00.",
  ]);
  expect(frasesDeReferencia(servicoAgi())).toEqual([]);
});

// --- conta somada (decisão 23) ---

test("a soma dos serviços: termos de mesmo campo somados, só os diferentes de zero", () => {
  const um = conta(
    { zerados: ["vlrTaxas", "vlrTxExt"] },
    {
      termos: [
        { campo: "vlrTarifaTotalp", valor: "900.00", efeito: "soma" },
        { campo: "vlrComisRecebida", valor: "40.00", efeito: "reduz" },
      ],
      zerados: ["vlrTaxasP"],
      total: "860.00",
    },
  );
  const dois = conta(
    {
      termos: [
        { campo: "vlrTarifaTotal", valor: "500.00", efeito: "soma" },
        { campo: "vlrTaxas", valor: "5.00", efeito: "soma" },
      ],
      zerados: ["vlrTxExt"],
      total: "505.00",
    },
    {
      termos: [
        { campo: "vlrTarifaTotalp", valor: "400.00", efeito: "soma" },
        { campo: "vlrComisRecebida", valor: "10.00", efeito: "reduz" },
      ],
      zerados: ["vlrTaxasP"],
      total: "390.00",
    },
  );
  const soma = somarContas([um, dois]);
  expect(soma.cliente.termos).toEqual([
    { campo: "vlrTarifaTotal", valor: "1500.00", efeito: "soma" },
    { campo: "vlrTaxas", valor: "5.00", efeito: "soma" },
  ]);
  expect(soma.cliente.zerados).toEqual(["vlrTxExt"]);
  expect(soma.cliente.total).toBe("1505.00");
  expect(soma.fornecedor.termos).toEqual([
    { campo: "vlrTarifaTotalp", valor: "1300.00", efeito: "soma" },
    { campo: "vlrComisRecebida", valor: "50.00", efeito: "reduz" },
  ]);
  expect(soma.fornecedor.total).toBe("1250.00");
});

test("as tarifas somadas: as frases da conversão e do câmbio 1", () => {
  const convertida = conta({
    conversao: { sigla: "EUR", tarifaOrigem: "10.00", cambio: "6.0000", dataCambio: null },
  });
  const cambio1 = conta({ siglaComCambio1: "US$" });
  expect(linhaDasTarifas("cliente", [conta({}), conta({})])).toEqual({
    linhas: ["Tarifas"],
    nota: null,
  });
  expect(
    linhaDasTarifas("cliente", [convertida, cambio1, conta({ siglaComCambio1: "AED" })]),
  ).toEqual({
    linhas: ["Tarifas"],
    nota: "Tarifas convertidas pelo câmbio de cada serviço. Marcada em US$ e AED no Stur, com câmbio 1,0000; contada como real.",
  });
});

// --- o que a conta mostra (cobertura do Anexo B) ---

test("a conta diz quais campos mostra, pelo que veio", () => {
  const s = servicoAgi({
    perTaxas: "10",
    percComisRecebida: "0",
    vlrTarifaCheia: "1.00",
    apartamentos: [apto({ qtde: 1, qtdeDiarias: 2, vlrDiaria: "1.00", vlrDiariaP: "1.00" })],
  });
  const c = conta(
    { termos: [...lado().termos, { campo: "vlrTaxas", valor: "1.00", efeito: "soma" }] },
    {
      termos: [
        { campo: "vlrTarifaTotalp", valor: "900.00", efeito: "soma" },
        { campo: "vlrComisRecebida", valor: "1.00", efeito: "reduz" },
      ],
      zerados: ["vlrTxExtP"],
    },
  );
  const mostrados = caminhosDaConta(c, s, "Hotelaria");
  for (const caminho of [
    "detalheItem[].vlrTarifaTotal",
    "detalheItem[].vlrTaxas",
    "detalheItem[].perTaxas",
    "detalheItem[].vlrComisRecebida",
    "detalheItem[].vlrTxExtP",
    "detalheItem[].apartamentos[].vlrDiaria",
    "detalheItem[].apartamentos[].vlrDiariaP",
    "detalheItem[].vlrTarifaCheia",
  ]) {
    expect(mostrados).toContain(caminho);
  }
  // Percentual zero, sigla e câmbio sem conversão e unitário sem uso ficam para o grupo.
  for (const caminho of [
    "detalheItem[].percComisRecebida",
    "detalheItem[].siglaMoedaTarifa",
    "detalheItem[].vlrCambio",
    "detalheItem[].vlrTarifa",
  ]) {
    expect(mostrados).not.toContain(caminho);
  }
});

function apto(campos: Record<string, unknown>) {
  return {
    idTipoApto: null,
    qtde: null,
    qtdeDiarias: null,
    tipoApartamento: null,
    vlrBalcao: null,
    vlrDiaria: null,
    vlrDiariaP: null,
    ...campos,
  };
}
