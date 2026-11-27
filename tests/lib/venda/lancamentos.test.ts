import type { LancamentoCalculado } from "@/contrato/tipos";
import {
  comTabelaDeLancamentos,
  fraseSemLancamentos,
  incentivoComTabela,
  type SeloTexto,
  seloDoLancamento,
  textoDoLancamento,
  textoDosDocumentos,
} from "@/lib/venda/lancamentos";
import { lancamento, pagamento, recebimento } from "../../fabrica";

const HOJE = "2026-11-24";

test.each<[string, LancamentoCalculado, "cliente" | "fornecedor", SeloTexto]>([
  [
    "cartão repassado, antes da situação",
    lancamento({ cartaoRepassado: true, situacao: "em_aberto", vencido: true }),
    "cliente",
    { tom: "neutro", icone: "cartao", rotulo: "Cartão do cliente" },
  ],
  [
    "previsto",
    lancamento({ situacao: "previsto" }),
    "cliente",
    { tom: "neutro", icone: "relogio", rotulo: "Previsto" },
  ],
  [
    "sem saldo no cliente",
    lancamento({ situacao: "sem_saldo" }),
    "cliente",
    { tom: "sucesso", icone: "check", rotulo: "Recebido" },
  ],
  [
    "sem saldo no fornecedor",
    lancamento({ situacao: "sem_saldo" }),
    "fornecedor",
    { tom: "sucesso", icone: "check", rotulo: "Pago" },
  ],
  [
    "sem saldo no crédito do fornecedor",
    lancamento({ situacao: "sem_saldo", ehCredito: true }),
    "fornecedor",
    { tom: "sucesso", icone: "check", rotulo: "Recebido" },
  ],
  [
    "em aberto e vencido",
    lancamento({ situacao: "em_aberto", vencido: true, vencimento: "2026-11-17 00:00:00" }),
    "cliente",
    { tom: "atencao", icone: "relogio", rotulo: "Em aberto, venceu em 17/11" },
  ],
  [
    "em aberto, a vencer",
    lancamento({ situacao: "em_aberto", vencido: false, vencimento: "2026-12-07 00:00:00" }),
    "cliente",
    { tom: "neutro-borda", icone: "calendario", rotulo: "A vencer em 07/12" },
  ],
  [
    "em aberto, a vencer no ano seguinte",
    lancamento({ situacao: "em_aberto", vencido: false, vencimento: "2027-01-07 00:00:00" }),
    "fornecedor",
    { tom: "neutro-borda", icone: "calendario", rotulo: "A vencer em 07/01/2027" },
  ],
  [
    "recebido em parte",
    lancamento({ situacao: "recebido_em_parte" }),
    "cliente",
    { tom: "atencao", icone: "relogio", rotulo: "Recebido em parte" },
  ],
  [
    "pago em parte",
    lancamento({ situacao: "recebido_em_parte" }),
    "fornecedor",
    { tom: "atencao", icone: "relogio", rotulo: "Pago em parte" },
  ],
])("selo %s", (_caso, l, lado, selo) => {
  expect(seloDoLancamento(l, lado, HOJE)).toEqual(selo);
});

test("dois recebimentos levam o valor", () => {
  const cash = lancamento({
    descricaoForma: "Cash",
    valorExibido: "224.00",
    situacao: "em_aberto",
    vencido: true,
    vencimento: "2026-11-17 00:00:00",
    documentos: [{ tipo: "recibo", numero: "RC1" }],
  });
  const faturado = lancamento({
    indice: 1,
    descricaoForma: "Faturado",
    valorExibido: "700.01",
    situacao: "em_aberto",
    vencido: false,
    vencimento: "2026-12-07 00:00:00",
    documentos: [{ tipo: "outro", numero: "ND1" }],
  });
  expect(textoDoLancamento(cash, recebimento(), true, null, HOJE)).toBe(
    "cash, R$ 224,00, recibo RC1",
  );
  expect(textoDoLancamento(faturado, recebimento(), true, null, HOJE)).toBe(
    "faturado, R$ 700,01, ND1",
  );
  expect(seloDoLancamento(cash, "cliente", HOJE).rotulo).toBe("Em aberto, venceu em 17/11");
  expect(seloDoLancamento(faturado, "cliente", HOJE).rotulo).toBe("A vencer em 07/12");
});

test("um lançamento só não leva o valor", () => {
  expect(textoDoLancamento(lancamento(), recebimento(), false, null, HOJE)).toBe("faturado");
});

test("cartão repassado", () => {
  const cru = recebimento({
    numeroCartaoMascarado: "************7934",
    dtVencto: "2026-10-20 00:00:00",
    cartaoRepassadoAoFornecedor: true,
  });
  expect(
    textoDoLancamento(lancamento({ cartaoRepassado: true }), cru, true, "AEREA EXEMPLO", HOJE),
  ).toBe("Cartão final 7934 repassado para AEREA EXEMPLO em 20/10");
});

test("crédito do fornecedor, com o valor como veio", () => {
  const credito = lancamento({ ehCredito: true, valorExibido: "-150.00" });
  expect(
    textoDoLancamento(credito, pagamento({ valor: "150.00" }), false, "FORNECEDOR EXEMPLO", HOJE),
  ).toBe("Crédito de R$ 150,00 a receber do fornecedor");
});

test("previsto termina com o título ainda não gerado", () => {
  const previsto = lancamento({ situacao: "previsto" });
  expect(textoDoLancamento(previsto, recebimento(), false, null, HOJE)).toBe(
    "faturado; título ainda não gerado",
  );
});

test("documentos unidos por ponto, o recibo com o nome", () => {
  expect(
    textoDosDocumentos([
      { tipo: "recibo", numero: "RC1" },
      { tipo: "nota_debito", numero: "ND1" },
      { tipo: "outro", numero: "OS1" },
    ]),
  ).toBe("recibo RC1 · ND1 · OS1");
  expect(textoDosDocumentos([])).toBe("");
});

test("fraseSemLancamentos é a de vazio da IA 9.3, por lado", () => {
  expect(fraseSemLancamentos("cliente")).toBe(
    "A API não trouxe nenhuma forma de recebimento nesta venda.",
  );
  expect(fraseSemLancamentos("fornecedor")).toBe(
    "A API não trouxe nenhuma forma de pagamento ao fornecedor nesta venda.",
  );
});

test("a tabela de lançamentos: com mais de dois num lado; no incentivo, também com o que o cartão não mostra", () => {
  expect(comTabelaDeLancamentos(2, 2)).toBe(false);
  expect(comTabelaDeLancamentos(3, 0)).toBe(true);
  expect(comTabelaDeLancamentos(0, 3)).toBe(true);
  // O cartão Recebimento do incentivo mostra só o crédito (ou o primeiro pagamento).
  expect(incentivoComTabela(0, 1)).toBe(false);
  expect(incentivoComTabela(0, 0)).toBe(false);
  expect(incentivoComTabela(0, 2)).toBe(true);
  expect(incentivoComTabela(1, 1)).toBe(true);
  expect(incentivoComTabela(0, 3)).toBe(true);
});
